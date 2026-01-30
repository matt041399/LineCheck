import { useRouter } from 'expo-router';
import { push, ref, set } from 'firebase/database';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '../firebase/firebase';

export default function AddForm() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [lines, setLines] = useState<{ label: string; min: string; max: string }[]>([
    { label: '', min: '', max: '' },
  ]);

  const handleAddLine = () => {
    setLines([...lines, { label: '', min: '', max: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    const newLines = [...lines];
    newLines.splice(index, 1);
    setLines(newLines);
  };

  const handleChangeLine = (index: number, field: 'label' | 'min' | 'max', value: string) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const handleSubmit = async () => {
    try {
      if (!title) return alert('Please enter a form title');

      const formDataToSave = {
        title,
        data: lines.map(line => line.label),
        ranges: lines.map(line => ({ min: line.min, max: line.max })),
      };

      const formsRef = ref(db, 'Forms/Locations/Test');
      const newFormRef = push(formsRef);
      await set(newFormRef, formDataToSave);

      router.push(`/forms/${newFormRef.key}`);
    } catch (error) {
      console.error('Error saving form:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Form Title */}
      <TextInput
        style={styles.titleInput}
        placeholder="Form Title"
        value={title}
        onChangeText={setTitle}
      />

      {/* Dynamic lines */}
      {lines.map((line, idx) => (
        <View key={idx} style={styles.row}>
          <TextInput
            style={styles.lineInput}
            placeholder="Label"
            value={line.label}
            onChangeText={(text) => handleChangeLine(idx, 'label', text)}
          />
          <TextInput
            style={styles.rangeInput}
            placeholder="Min"
            keyboardType="numeric"
            value={line.min}
            onChangeText={(text) => handleChangeLine(idx, 'min', text)}
          />
          <TextInput
            style={styles.rangeInput}
            placeholder="Max"
            keyboardType="numeric"
            value={line.max}
            onChangeText={(text) => handleChangeLine(idx, 'max', text)}
          />
          <Pressable onPress={() => handleRemoveLine(idx)}>
            <Text style={styles.removeBtn}>-</Text>
          </Pressable>
        </View>
      ))}

      <Pressable onPress={handleAddLine}>
        <Text style={styles.addBtn}>+ Add Line</Text>
      </Pressable>

      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>Submit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', backgroundColor: '#f5f5f5' },
  titleInput: { width: '90%', fontSize: 20, borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  lineInput: { flex: 2, borderWidth: 1, borderColor: '#ccc', padding: 6, marginRight: 4 },
  rangeInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 6, marginRight: 4 },
  removeBtn: { fontSize: 24, color: 'red', paddingHorizontal: 6 },
  addBtn: { fontSize: 18, color: 'blue', marginBottom: 16 },
  submitButton: { backgroundColor: 'green', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  submitText: { color: 'white', fontSize: 18, fontWeight: '600' },
});
