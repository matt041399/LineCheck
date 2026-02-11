import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../firebase/firebase';

interface Form {
  id: string;
  title: string;
  location: string;
  data: string[];
}

const IS_ADMIN = true; //change later after users are added

export default function MyForms() {
  const [forms, setForms] = useState<Form[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = ref(db, `Users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          const userLocations = userData.location || [];
          
          // Fetch forms from all user locations
          const allForms: Form[] = [];
          
          for (const location of userLocations) {
            const locationRef = ref(db, `Forms/Locations/${location}`);
            const locationSnapshot = await get(locationRef);
            
            if (locationSnapshot.exists()) {
              const formsData = locationSnapshot.val();
              Object.keys(formsData).forEach((formId) => {
                allForms.push({
                  id: formId,
                  title: formsData[formId].title,
                  location: location,
                  data: formsData[formId].fields,
                });
              });
            }
          }
          
          setForms(allForms);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Forms</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsContainer}>
          {forms.map((form) => (
            <View key={`${form.location}-${form.id}`} style={styles.cardWrapper}>
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/forms/[formId]',
                    params: { formId: form.id, location: form.location },
                  } as any)
                }
              >
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{form.title}</Text>
                  <Text style={styles.cardLocation}>{form.location}</Text>
                </View>
                
                <View style={styles.cardArrow}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </Pressable>

              {IS_ADMIN && (
                <Pressable
                  style={styles.editButton}
                  onPress={() =>
                    router.push({
                      pathname: '/forms/edit/[formId]',
                      params: { formId: form.id, location: form.location },
                    } as any)
                  }
                >
                  <Text style={styles.editText}>✏️</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
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
  },
  cardsContainer: {
    gap: 16,
  },
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardLocation: {
    fontSize: 14,
    color: '#666',
  },
  cardArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editText: {
    fontSize: 22,
  },
});