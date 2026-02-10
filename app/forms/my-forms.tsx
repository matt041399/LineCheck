import { useRouter } from 'expo-router';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../firebase/firebase';

interface Form {
  id: string;
  title: string;
  data: string[];
}

export default function MyForms() {
  const [forms, setForms] = useState<Form[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchUserAndForms() {
      if (!auth.currentUser) return;

      const uid = auth.currentUser.uid;
      const userRef = ref(db, `Users/${uid}`);
      const userSnapshot = await get(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        setIsAdmin(userData.isAdmin ?? false);
      }

      // Fetch forms for the user's location
      const location = userSnapshot.exists() ? userSnapshot.val().location : 'Test';
      const formsRef = ref(db, `Forms/Locations/${location}`);
      const formsSnapshot = await get(formsRef);

      if (formsSnapshot.exists()) {
        const formsData = formsSnapshot.val();
        const formsArray: Form[] = Object.keys(formsData).map((formId) => ({
          id: formId,
          title: formsData[formId].title,
          data: formsData[formId].fields,
        }));
        setForms(formsArray);
      }
    }

    fetchUserAndForms();
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
                pathname: '/forms/[formId]',
                params: { formId: form.id },
              } as any)
            }
          >
            <Text style={styles.formText}>{form.title}</Text>
          </Pressable>

          {/* Edit form — ADMIN ONLY */}
          {isAdmin && (
            <Pressable
              style={styles.editButton}
              onPress={() =>
                router.push({
                  pathname: '/forms/edit/[formId]',
                  params: { formId: form.id },
                } as any)
              }
            >
              <Text style={styles.editText}>✏️</Text>
            </Pressable>
          )}
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
