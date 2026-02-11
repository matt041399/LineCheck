import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { get, push, ref, set } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth, db } from '../firebase/firebase';

type FieldType = 'temperature' | 'date';

interface Line {
  type: FieldType;
  label: string;
  description: string;
  min: string;
  max: string;
}

export default function AddForm() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [userLocations, setUserLocations] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>([
    { type: 'temperature', label: '', description: '', min: '', max: '' },
  ]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = ref(db, `Users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          const locations = userData.location || [];
          setUserLocations(locations);
          if (locations.length > 0) {
            setSelectedLocation(locations[0]);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { type: 'temperature', label: '', description: '', min: '', max: '' },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChangeLine = (
    index: number,
    field: keyof Line,
    value: string
  ) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'type' && value === 'date') {
      updated[index].min = '';
      updated[index].max = '';
    }

    setLines(updated);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('Please enter a form title');
      return;
    }

    if (!selectedLocation) {
      alert('Please select a location');
      return;
    }

    if (lines.some((l) => !l.label.trim())) {
      alert('All fields must have a label');
      return;
    }

    const fieldsObject = lines.reduce<Record<string, any>>((acc, line) => {
      const id = `field_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      acc[id] = {
        type: line.type,
        label: line.label,
        description: line.description || '',
        min: line.type === 'temperature' ? Number(line.min) : null,
        max: line.type === 'temperature' ? Number(line.max) : null,
      };

      return acc;
    }, {});

    const formsRef = ref(db, `Forms/Locations/${selectedLocation}`);
    const newFormRef = push(formsRef);

    await set(newFormRef, {
      title,
      fields: fieldsObject,
      createdAt: Date.now(),
    });

    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Create New Form</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Form Details</Text>
          
          <Text style={styles.inputLabel}>Location</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedLocation}
              onValueChange={setSelectedLocation}
              style={styles.picker}
            >
              {userLocations.map((loc) => (
                <Picker.Item key={loc} label={loc} value={loc} />
              ))}
            </Picker>
          </View>

          <Text style={styles.inputLabel}>Form Title</Text>
          <TextInput
            placeholder="Enter form title"
            value={title}
            onChangeText={setTitle}
            style={styles.titleInput}
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Form Fields</Text>

          {lines.map((line, idx) => (
            <View key={idx} style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldNumber}>Field {idx + 1}</Text>
                {lines.length > 1 && (
                  <Pressable onPress={() => handleRemoveLine(idx)} style={styles.removeButton}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                )}
              </View>

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={line.type}
                  onValueChange={(value) => handleChangeLine(idx, 'type', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Temperature" value="temperature" />
                  <Picker.Item label="Date" value="date" />
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Label</Text>
              <TextInput
                placeholder="Field label"
                value={line.label}
                onChangeText={(text) => handleChangeLine(idx, 'label', text)}
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                placeholder="Field description"
                value={line.description}
                onChangeText={(text) => handleChangeLine(idx, 'description', text)}
                style={styles.input}
              />

              {line.type === 'temperature' && (
                <View style={styles.rangeRow}>
                  <View style={styles.rangeItem}>
                    <Text style={styles.inputLabel}>Min Temp</Text>
                    <TextInput
                      placeholder="Min"
                      keyboardType="numeric"
                      value={line.min}
                      onChangeText={(text) =>
                        handleChangeLine(idx, 'min', text.replace(/[^0-9]/g, ''))
                      }
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.rangeItem}>
                    <Text style={styles.inputLabel}>Max Temp</Text>
                    <TextInput
                      placeholder="Max"
                      keyboardType="numeric"
                      value={line.max}
                      onChangeText={(text) =>
                        handleChangeLine(idx, 'max', text.replace(/[^0-9]/g, ''))
                      }
                      style={styles.input}
                    />
                  </View>
                </View>
              )}
            </View>
          ))}

          <Pressable onPress={handleAddLine} style={styles.addButton}>
            <Text style={styles.addText}>+ Add Field</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleSubmit} style={styles.submitButton}>
          <Text style={styles.submitText}>Create Form</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: '5%',
    paddingTop: '5%',
    paddingBottom: '3%',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 16,
    color: '#2196f3',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: '5%',
    paddingBottom: '10%',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
    marginTop: 8,
  },
  pickerContainer: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  titleInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  fieldCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fieldNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  removeButton: {
    backgroundColor: '#e53935',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  rangeItem: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#2196f3',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  addText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});