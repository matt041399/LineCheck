import { useRouter } from 'expo-router';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { db } from '../firebase/firebase';

interface Form {
  id: string;
  title: string;
  data: string[];
}

export default function MyForms() {
  const [forms, setForms] = useState<Form[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchForms() {
      const location = 'Test'; // hard-coded for now
      const locationRef = ref(db, `Forms/Locations/${location}`);
      const snapshot = await get(locationRef);

      if (snapshot.exists()) {
        const formsData = snapshot.val();
        // formsData keys are the form IDs
        const formsArray: Form[] = Object.keys(formsData).map((formId) => ({
          id: formId,
          title: formsData[formId].title,
          data: formsData[formId].data,
        }));
        setForms(formsArray);
      }
    }

    fetchForms();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Forms</Text>
      {forms.map((form) => (
        <Pressable
          key={form.id}
          style={styles.formButton}
          onPress={() => 
            router.push({
                pathname: '/forms/[formId]',
                params: { formId: form.id },
              } as any)}              
        >
          <Text style={styles.formText}>{form.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  formButton: {
    padding: 16,
    backgroundColor: '#4caf50',
    borderRadius: 8,
    marginVertical: 8,
    width: '90%',
    alignItems: 'center',
  },
  formText: { color: 'white', fontSize: 18 },
});
