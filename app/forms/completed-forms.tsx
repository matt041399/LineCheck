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

export default function CompletedForms() {
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
          
          // Fetch completed forms from all user locations
          const allForms: Form[] = [];
          
          for (const location of userLocations) {
            const locationRef = ref(db, `CompletedForms/${location}`);
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

  // Parse the form ID to extract date and title
  const parseFormId = (id: string) => {
    const parts = id.split('-');
    if (parts.length >= 4) {
      const date = `${parts[0]}-${parts[1]}-${parts[2]}`;
      const rest = parts.slice(3).join('-');
      return { date, name: rest };
    }
    return { date: 'Unknown', name: id };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Completed Forms</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsContainer}>
          {forms.map((form) => {
            const { date, name } = parseFormId(form.id);
            
            return (
              <Pressable
                key={`${form.location}-${form.id}`}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/forms/completed/[formId]',
                    params: { formId: form.id, location: form.location },
                  } as any)
                }
              >
                <View style={styles.cardHeader}>
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>{date}</Text>
                  </View>
                  <View style={styles.locationBadge}>
                    <Text style={styles.locationText}>{form.location}</Text>
                  </View>
                </View>
                
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {name}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.viewText}>View Details</Text>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </Pressable>
            );
          })}
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateContainer: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  locationBadge: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  locationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
  },
  arrowText: {
    fontSize: 18,
    color: '#4caf50',
    fontWeight: 'bold',
  },
});