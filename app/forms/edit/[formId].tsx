import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { get, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '../../firebase/firebase';

interface FormRow {
  id: string;
  type: 'temperature' | 'date';
  label: string;
  description: string;
  min: string;
  max: string;
}

export default function EditForm() {
  const { formId, location } = useLocalSearchParams<{ formId: string; location: string }>();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [rows, setRows] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!formId || !location) return;

    const formRef = ref(db, `Forms/Locations/${location}/${formId}`);

    get(formRef).then((snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.val();
      setTitle(data.title ?? '');

      const loadedRows: FormRow[] = data.fields
        ? Object.entries<any>(data.fields).map(([fieldId, field]) => ({
            id: fieldId,
            type: field.type ?? 'temperature',
            label: field.label ?? '',
            description: field.description ?? '',
            min: field.min?.toString() ?? '',
            max: field.max?.toString() ?? '',
          }))
        : [];

      setRows(loadedRows);
      setLoading(false);
    });
  }, [formId, location]);

  const addRow = () => {
    const newId = `field_${Date.now()}`;
    setRows((prev) => [
      ...prev,
      { id: newId, type: 'temperature', label: '', description: '', min: '', max: '' },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (
    id: string,
    field: keyof FormRow,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const saveForm = async () => {
    if (!formId || !location) return;

    const fieldsObject = rows.reduce<Record<string, any>>((acc, row) => {
      acc[row.id] = {
        type: row.type,
        label: row.label,
        description: row.description,
        min: row.type === 'temperature' ? Number(row.min) : null,
        max: row.type === 'temperature' ? Number(row.max) : null,
      };
      return acc;
    }, {});

    const formRef = ref(db, `Forms/Locations/${location}/${formId}`);

    await update(formRef, {
      title,
      fields: fieldsObject,
    });

    router.back();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Loading…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Form</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Form Title</Text>
          <TextInput
            placeholder="Enter form title"
            value={title}
            onChangeText={setTitle}
            style={styles.titleInput}
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Form Fields</Text>
          
          {rows.map((row, index) => (
            <View key={row.id} style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldNumber}>Field {index + 1}</Text>
                <Pressable onPress={() => removeRow(row.id)} style={styles.removeButton}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={row.type}
                  onValueChange={(val) => updateRow(row.id, 'type', val)}
                  style={styles.picker}
                >
                  <Picker.Item label="Temperature" value="temperature" />
                  <Picker.Item label="Date" value="date" />
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Label</Text>
              <TextInput
                placeholder="Field label"
                value={row.label}
                onChangeText={(v) => updateRow(row.id, 'label', v)}
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                placeholder="Field description"
                value={row.description}
                onChangeText={(v) => updateRow(row.id, 'description', v)}
                style={styles.input}
              />

              {row.type === 'temperature' && (
                <>
                  <View style={styles.rangeRow}>
                    <View style={styles.rangeItem}>
                      <Text style={styles.inputLabel}>Min Temp</Text>
                      <TextInput
                        placeholder="Min"
                        keyboardType="numeric"
                        value={row.min}
                        onChangeText={(v) =>
                          updateRow(row.id, 'min', v.replace(/[^0-9]/g, ''))
                        }
                        style={styles.input}
                      />
                    </View>
                    <View style={styles.rangeItem}>
                      <Text style={styles.inputLabel}>Max Temp</Text>
                      <TextInput
                        placeholder="Max"
                        keyboardType="numeric"
                        value={row.max}
                        onChangeText={(v) =>
                          updateRow(row.id, 'max', v.replace(/[^0-9]/g, ''))
                        }
                        style={styles.input}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          ))}

          <Pressable onPress={addRow} style={styles.addButton}>
            <Text style={styles.addText}>+ Add Field</Text>
          </Pressable>
        </View>

        <Pressable onPress={saveForm} style={styles.saveButton}>
          <Text style={styles.saveText}>Save Changes</Text>
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
    color: '#4caf50',
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
    marginTop: 8,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
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
  saveButton: {
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
  saveText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});