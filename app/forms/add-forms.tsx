import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { push, ref, set } from 'firebase/database';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '../firebase/firebase';

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
  const [lines, setLines] = useState<Line[]>([
    { type: 'temperature', label: '', description: '', min: '', max: '' },
  ]);

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

    // Clear min/max when switching to date
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

    const formsRef = ref(db, 'Forms/Locations/Test');
    const newFormRef = push(formsRef);

    await set(newFormRef, {
      title,
      fields: fieldsObject,
      createdAt: Date.now(),
    });

    router.push(`/forms/${newFormRef.key}`);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.titleInput}
        placeholder="Form Title"
        value={title}
        onChangeText={setTitle}
      />

      {lines.map((line, idx) => (
        <View key={idx} style={styles.row}>
          {/* Type */}
          <Picker
            selectedValue={line.type}
            style={styles.picker}
            onValueChange={(value) =>
              handleChangeLine(idx, 'type', value)
            }
          >
            <Picker.Item label="Temperature" value="temperature" />
            <Picker.Item label="Date" value="date" />
          </Picker>

          {/* Label */}
          <TextInput
            style={styles.input}
            placeholder="Label"
            value={line.label}
            onChangeText={(text) =>
              handleChangeLine(idx, 'label', text)
            }
          />

          {/* Description */}
          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            value={line.description}
            onChangeText={(text) =>
              handleChangeLine(idx, 'description', text)
            }
          />

          {/* Min / Max only for temperature */}
          {line.type === 'temperature' && (
            <>
              <TextInput
                style={styles.rangeInput}
                placeholder="Min"
                keyboardType="numeric"
                value={line.min}
                onChangeText={(text) =>
                  handleChangeLine(idx, 'min', text.replace(/[^0-9]/g, ''))
                }
              />
              <TextInput
                style={styles.rangeInput}
                placeholder="Max"
                keyboardType="numeric"
                value={line.max}
                onChangeText={(text) =>
                  handleChangeLine(idx, 'max', text.replace(/[^0-9]/g, ''))
                }
              />
            </>
          )}

          <Pressable onPress={() => handleRemoveLine(idx)}>
            <Text style={styles.removeBtn}>−</Text>
          </Pressable>
        </View>
      ))}

      <Pressable onPress={handleAddLine}>
        <Text style={styles.addBtn}>+ Add Field</Text>
      </Pressable>

      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>Create Form</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  titleInput: {
    fontSize: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 16,
  },
  row: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
  },
  picker: {
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 6,
    marginBottom: 6,
  },
  rangeInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 6,
    marginBottom: 6,
  },
  removeBtn: {
    color: 'red',
    fontSize: 20,
    textAlign: 'right',
  },
  addBtn: {
    fontSize: 18,
    color: 'blue',
    marginVertical: 16,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: 'green',
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
