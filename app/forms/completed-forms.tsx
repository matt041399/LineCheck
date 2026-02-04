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

const IS_ADMIN = true;//change later after users are added




export default function MyForms() {
  const [forms, setForms] = useState<Form[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchForms() {
      const location = 'Test'; // hard-coded for now
      const locationRef = ref(db, `CompletedForms/${location}`);
      const snapshot = await get(locationRef);

      if (snapshot.exists()) {
        const formsData = snapshot.val();
        const formsArray: Form[] = Object.keys(formsData).map((formId) => ({
          id: formId,
          title: formsData[formId].title,
          data: formsData[formId].fields,
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
  <View key={form.id} style={styles.row}>
    {/* View form */}
    <Pressable
      style={styles.formButton}
      onPress={() =>
        router.push({
          pathname: '/forms/completed/[formId]',
          params: { formId: form.id },
        } as any)
      }
    >
      <Text style={styles.formText}>{form.id}</Text>
    </Pressable>
  </View>
))}

    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginVertical: 6,
  },

  formButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#4caf50',
    borderRadius: 8,
    alignItems: 'center',
  },

  formText: {
    color: 'white',
    fontSize: 18,
  },

  editButton: {
    marginLeft: 10,
    padding: 16,
    backgroundColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  editText: {
    fontSize: 18,
  },
});
