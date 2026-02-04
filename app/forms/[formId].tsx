import { router, useLocalSearchParams } from 'expo-router';
import { get, ref, set } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '../firebase/firebase';


interface Field {
  id: string;
  label: string;
  min: number;
  max: number;
}

interface FormData {
  title: string;
  fields: Field[];
}

export default function Linecheck() {
  const { formId } = useLocalSearchParams<{ formId: string }>();

  const [values, setValues] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    title: '',
    fields: [],
  });

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    if (!formId) return;
  
    const location = 'Test';
    const today = getTodayDate();
  
    const submissionKey = `${today}-${location}-${formData.title}`;
  
    const completedRef = ref(
      db,
      `CompletedForms/${location}/${submissionKey}`
    );

    const missing = formData.fields.some(
      (field) => !values[field.id]
    );
    
    if (missing) {
      alert('Please fill out all fields before submitting.');
      return;
    }
    
    const entries = formData.fields.reduce<Record<string, any>>((acc, field) => {
      acc[field.id] = {
        label: field.label,
        value: Number(values[field.id]),
        min: field.min,
        max: field.max,
      };
      return acc;
    }, {});
    
  
    await set(completedRef, {
      formId,
      title: formData.title,
      location,
      submittedAt: Date.now(),
      entries,
    });
  
    router.push('../forms/completed-forms')
  };
  
  

  useEffect(() => {
    if (!formId) return;

    const formRef = ref(db, `Forms/Locations/Test/${formId}`);

    get(formRef).then((snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.val();

      const fields: Field[] = data.fields
        ? Object.entries(data.fields).map(([id, field]: any) => ({
            id,
            label: field.label,
            min: field.min,
            max: field.max,
          }))
        : [];

      setFormData({
        title: data.title,
        fields,
      });
    });
  }, [formId]);

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <Text style={styles.title}>{formData.title}</Text>

        <View style={styles.table}>
          {formData.fields.map((field) => (
            <View key={field.id} style={styles.row}>
              <Text style={styles.label}>
                {field.label} ({field.min}–{field.max})
              </Text>

              <TextInput
                placeholder="°F"
                keyboardType="numeric"
                style={styles.input}
                value={values[field.id] || ''}
                onChangeText={(text) => {
                  let cleaned = text.replace(/[^0-9]/g, '');
                  setValues((prev) => ({
                    ...prev,
                    [field.id]: cleaned,
                  }));
                }}
              />
            </View>
          ))}
        </View>

        <View style={styles.submitContainer}>
          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitText}>Submit</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export const options = {
  headerShown: false,
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333',
    alignItems: 'center',
    paddingTop: 24,
  },
  background: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 10,
    borderWidth: 1,
    borderColor: 'black',
    alignItems: 'center',
    height: '100%',
  },
  table: {
    width: '100%',
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'black',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'black',
    paddingVertical: '2%',
  },
  label: {
    width: '75%',
    fontSize: 24,
    textAlign: 'center',
    paddingLeft: '3%',
  },
  input: {
    width: '25%',
    height: '100%',
    borderLeftWidth: 1,
    borderColor: '#ccc',
    textAlign: 'center',
    fontSize: 24,
    paddingHorizontal: '5%',
  },
  title: {
    width: '25%',
    fontSize: 28,
    textAlign: 'center',
    paddingBottom: '2%',
    paddingTop: '2%',
  },
  submitContainer: {
    width: '15%',
    textAlign: 'center',
    paddingTop: '2%',
  },
  submitButton: {
    width: '100%',
    backgroundColor: 'green',
    borderWidth: 1,
    borderColor: 'blue',
    borderRadius: 50,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});
