import { useLocalSearchParams } from 'expo-router';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '../firebase/firebase'; // adjust path if needed

export default function Linecheck() {
  const { formId } = useLocalSearchParams<{ formId: string }>();
  const [values, setValues] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState<{ title: string; items: { id: string; label: string }[] }>({
    title: '',
    items: [],
  });

  // Load form from Firebase
  useEffect(() => {
    if (!formId) return;

    const formRef = ref(db, `Forms/Locations/Test/${formId}`);
    get(formRef).then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        // convert array of labels to items with unique ids
        const items = data.data.map((label: string, idx: number) => ({
          id: `${formId}-${idx}`,
          label,
        }));
        setFormData({ title: data.title, items });
      }
    });
  }, [formId]);

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <View style={styles.title}>{formData.title}</View>

        <View style={styles.table}>
          {formData.items.map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.label}>{item.label}</Text>
              <TextInput
                placeholder="°F"
                keyboardType="numeric"
                style={styles.input}
                value={values[item.id] || ''}
                onChangeText={(text) => {
                  let cleaned = text.replace(/[^0-9]/g, '');
                  let num = parseInt(cleaned, 10);
                  if (!isNaN(num) && num > 300) cleaned = '300';
                  setValues((prev) => ({ ...prev, [item.id]: cleaned }));
                }}
              />
            </View>
          ))}
        </View>

        <View style={styles.submitContainer}>
          <Pressable style={styles.submitButton}>
            <Text style={styles.submitText}>Submit</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export const unstable_settings = {
    initialRouteName: 'forms/[formId]', // optional, but good practice
  };
  
  export const options = {
    headerShown: false, // <-- this hides the top bar
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
