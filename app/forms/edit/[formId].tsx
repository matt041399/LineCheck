import { useLocalSearchParams, useRouter } from 'expo-router';
import { get, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '../../firebase/firebase';

interface FormRow {
  id: string;
  label: string;
  min: string;
  max: string;
}

export default function EditForm() {
  const { formId } = useLocalSearchParams<{ formId: string }>();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [rows, setRows] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);

  /** -------- Load Existing Form -------- */
  useEffect(() => {
    if (!formId) return;

    const formRef = ref(db, `Forms/Locations/Test/${formId}`);

    get(formRef).then((snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.val();
      setTitle(data.title ?? '');

      const loadedRows: FormRow[] = data.fields
        ? Object.entries<any>(data.fields).map(([fieldId, field]) => ({
            id: fieldId,
            label: field.label ?? '',
            min: field.min?.toString() ?? '',
            max: field.max?.toString() ?? '',
          }))
        : [];

      setRows(loadedRows);
      setLoading(false);
    });
  }, [formId]);

  /** -------- Row Helpers -------- */
  const addRow = () => {
    const newId = `field_${Date.now()}`;
    setRows((prev) => [
      ...prev,
      { id: newId, label: '', min: '', max: '' },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof FormRow, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  /** -------- Save -------- */
  const saveForm = async () => {
    if (!formId) return;

    const fieldsObject = rows.reduce<Record<string, any>>((acc, row) => {
      acc[row.id] = {
        label: row.label,
        min: Number(row.min),
        max: Number(row.max),
      };
      return acc;
    }, {});

    const formRef = ref(db, `Forms/Locations/Test/${formId}`);

    await update(formRef, {
      title,
      fields: fieldsObject,
    });

    router.back();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  /** -------- UI -------- */
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.header}>Edit Form</Text>
        <Text style={styles.header}></Text>
        <Text style={styles.header}>Form Title</Text>
        <TextInput
          placeholder="Form Title"
          value={title}
          onChangeText={setTitle}
          style={styles.titleInput}
        />
        <View style={styles.headerRow}>
  <Text style={[styles.headerText, styles.labelCol]}>Label</Text>
  <Text style={[styles.headerText, styles.numCol]}>Min</Text>
  <Text style={[styles.headerText, styles.numCol]}>Max</Text>
  <View style={styles.deleteSpacer} />
</View>

        {rows.map((row) => (
          <View key={row.id} style={styles.row}>
            <TextInput
              placeholder="Label"
              value={row.label}
              onChangeText={(v) => updateRow(row.id, 'label', v)}
              style={styles.labelInput}
            />

            <TextInput
              placeholder="Min"
              keyboardType="numeric"
              value={row.min}
              onChangeText={(v) =>
                updateRow(row.id, 'min', v.replace(/[^0-9]/g, ''))
              }
              style={styles.numInput}
            />

            <TextInput
              placeholder="Max"
              keyboardType="numeric"
              value={row.max}
              onChangeText={(v) =>
                updateRow(row.id, 'max', v.replace(/[^0-9]/g, ''))
              }
              style={styles.numInput}
            />

            <Pressable onPress={() => removeRow(row.id)}>
              <Text style={styles.remove}>−</Text>
            </Pressable>
          </View>
        ))}

        <Pressable onPress={addRow} style={styles.addButton}>
          <Text style={styles.addText}>+ Add Line</Text>
        </Pressable>

        <Pressable onPress={saveForm} style={styles.saveButton}>
          <Text style={styles.saveText}>Save Changes</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** -------- Styles -------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333',
    alignItems: 'center',
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  
  labelCol: {
    flex: 2,          
  },
  
  numCol: {
    flex: 1,          
  },
  
  deleteSpacer: {
    width: 24,        
  },  
  card: {
    width: '90%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    fontSize: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelInput: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginRight: 4,
  },
  numInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginHorizontal: 4,
    textAlign: 'center',
  },
  remove: {
    fontSize: 22,
    color: 'red',
    paddingHorizontal: 8,
  },
  addButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  addText: {
    color: '#007aff',
    fontSize: 16,
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: 'green',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
