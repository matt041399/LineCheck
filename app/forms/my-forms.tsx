import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { get, ref, remove } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../firebase/firebase';

interface Form {
  id: string;
  title: string;
  location: string;
  formGroupId: string;
}

export default function MyForms() {
  const [forms, setForms] = useState<Form[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [userLocations, setUserLocations] = useState<string[]>([]);
  const router = useRouter();

  const fetchForms = async (uid: string) => {
    const userRef = ref(db, `Users/${uid}`);
    const userSnap = await get(userRef);
    if (!userSnap.exists()) { setLoading(false); return; }

    const userData = userSnap.val();
    const locations: string[] = userData.location || [];
    setIsAdmin(userData.isAdmin || false);
    setUserLocations(locations);

    const allForms: Form[] = [];

    for (const location of locations) {
      const locationRef = ref(db, `Forms/${location}`);
      const snapshot = await get(locationRef);
      if (!snapshot.exists()) continue;

      const locationForms = snapshot.val();
      for (const [formId, formData] of Object.entries<any>(locationForms)) {
        const formGroupRef = ref(db, `FormGroups/${formData.formGroupId}`);
        const formGroupSnap = await get(formGroupRef);
        if (!formGroupSnap.exists()) continue;

        allForms.push({
          id: formId,
          title: formGroupSnap.val().title,
          location,
          formGroupId: formData.formGroupId,
        });
      }
    }

    setForms(allForms);
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) { router.replace('/users/signin'); return; }
      fetchForms(user.uid);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = (form: Form) => {
    Alert.alert(
      'Delete Form',
      `Are you sure you want to delete "${form.title}" from ${form.location}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove the location-specific form reference
              await remove(ref(db, `Forms/${form.location}/${form.id}`));

              // Check if any other location still uses this formGroup
              const allLocationsSnap = await get(ref(db, 'Forms'));
              let stillInUse = false;
              if (allLocationsSnap.exists()) {
                const allLocations = allLocationsSnap.val();
                for (const loc of Object.values<any>(allLocations)) {
                  for (const f of Object.values<any>(loc)) {
                    if (f.formGroupId === form.formGroupId) {
                      stillInUse = true;
                      break;
                    }
                  }
                  if (stillInUse) break;
                }
              }

              // If no location uses it anymore, also remove the FormGroup template
              if (!stillInUse) {
                await remove(ref(db, `FormGroups/${form.formGroupId}`));
              }

              setForms((prev) => prev.filter(
                (f) => !(f.id === form.id && f.location === form.location)
              ));
              Alert.alert('Deleted', `"${form.title}" has been removed from ${form.location}.`);
            } catch (err) {
              Alert.alert('Error', 'Could not delete the form. Please try again.');
            }
          },
        },
      ]
    );
  };

  const filteredForms = selectedLocation === 'All'
    ? forms
    : forms.filter((f) => f.location === selectedLocation);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Forms</Text>
      </View>

      {/* Location Filter */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['All', ...userLocations].map((loc) => (
            <Pressable
              key={loc}
              onPress={() => setSelectedLocation(loc)}
              style={[styles.filterChip, selectedLocation === loc && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, selectedLocation === loc && styles.filterChipTextActive]}>
                {loc}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Forms List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {filteredForms.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No forms for this location</Text>
          </View>
        )}

        {filteredForms.map((form) => (
          <View key={`${form.location}-${form.id}`} style={styles.formCard}>
            {/* Main pressable area */}
            <Pressable
              style={styles.formButton}
              onPress={() =>
                router.push({
                  pathname: '/forms/[formId]',
                  params: { formId: form.id, location: form.location },
                } as any)
              }
            >
              <Text style={styles.formTitle}>{form.title}</Text>
              <View style={styles.locationBadge}>
                <Text style={styles.badgeText}>{form.location}</Text>
              </View>
            </Pressable>

            {/* Admin actions */}
            {isAdmin && (
              <View style={styles.adminRow}>
                <Pressable
                  style={styles.editButton}
                  onPress={() =>
                    router.push({
                      pathname: '/forms/edit/[formId]',
                      params: { formId: form.id, location: form.location },
                    } as any)
                  }
                >
                  <Text style={styles.editText}>✏️  Edit</Text>
                </Pressable>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDelete(form)}
                >
                  <Text style={styles.deleteText}>🗑️  Delete</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f5f5f5' },
  header:     { paddingHorizontal: '5%', paddingTop: '5%', paddingBottom: '3%', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  backButton: { marginBottom: 8 },
  backText:   { fontSize: 16, color: '#4caf50', fontWeight: '500' },
  headerTitle:{ fontSize: 24, fontWeight: 'bold', color: '#333' },

  filterBar:    { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingVertical: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  filterChip:   { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e0e0e0' },
  filterChipActive:     { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  filterChipText:       { fontSize: 14, color: '#666', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },

  scrollView:    { flex: 1 },
  scrollContent: { padding: '5%', paddingBottom: '10%' },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  formButton: { padding: 20 },
  formTitle:  { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  locationBadge: { alignSelf: 'flex-start', backgroundColor: '#e3f2fd', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText:     { color: '#1976d2', fontSize: 12, fontWeight: '600' },

  adminRow:     { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  editButton:   { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#fff8e1', borderRightWidth: 1, borderRightColor: '#f0f0f0' },
  editText:     { color: '#f57c00', fontSize: 15, fontWeight: '600' },
  deleteButton: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#fff5f5' },
  deleteText:   { color: '#e53935', fontSize: 15, fontWeight: '600' },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyText:  { fontSize: 16, color: '#aaa' },
});