import { useLocalSearchParams, useRouter } from 'expo-router';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { db } from '../../firebase/firebase';

interface Entry {
  id: string;
  label: string;
  type: 'temperature' | 'date';
  value: number | string;
  min?: number | null;
  max?: number | null;
}

export default function CompletedFormView() {
  const { formId, location } = useLocalSearchParams<{ formId: string; location: string }>();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!formId || !location) return;

    const submissionRef = ref(db, `CompletedForms/${location}/${formId}`);

    get(submissionRef).then((snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.val();

      const loadedEntries: Entry[] = data.entries
        ? Object.entries<any>(data.entries).map(([id, entry]) => ({
            id,
            label: entry.label,
            type: entry.type,
            value: entry.value,
            min: entry.min ?? null,
            max: entry.max ?? null,
          }))
        : [];

      setTitle(data.title);
      setSubmittedAt(data.submittedAt);
      setEntries(loadedEntries);
      setLoading(false);
    });
  }, [formId, location]);

  const isPass = (entry: Entry) => {
    if (entry.type === 'temperature') {
      return (
        typeof entry.value === 'number' &&
        typeof entry.min === 'number' &&
        typeof entry.max === 'number' &&
        entry.value >= entry.min &&
        entry.value <= entry.max
      );
    } else if (entry.type === 'date') {
      if (typeof entry.value !== 'string') return false;
  
      const [mm, dd] = entry.value.split('-').map(Number);
      const today = new Date();
      const entryDate = new Date(today.getFullYear(), mm - 1, dd);
  
      return entryDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }
  
    return false;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Loading…</Text>
        </View>
      </View>
    );
  }

  const passedCount = entries.filter(isPass).length;
  const totalCount = entries.length;
  const allPassed = passedCount === totalCount;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>
          {submittedAt && new Date(submittedAt).toLocaleDateString()}
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statusCard, allPassed ? styles.statusPass : styles.statusFail]}>
          <Text style={styles.statusTitle}>
            {allPassed ? '✓ All Checks Passed' : '⚠ Some Checks Failed'}
          </Text>
          <Text style={styles.statusSubtitle}>
            {passedCount} of {totalCount} items within range
          </Text>
        </View>

        <View style={styles.resultsCard}>
          <Text style={styles.sectionTitle}>Results</Text>
          
          {entries.map((entry) => {
            const pass = isPass(entry);

            return (
              <View key={entry.id} style={styles.entryContainer}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryLabel}>{entry.label}</Text>
                  <View style={[styles.statusBadge, pass ? styles.passBadge : styles.failBadge]}>
                    <Text style={styles.statusBadgeText}>
                      {pass ? 'PASS' : 'FAIL'}
                    </Text>
                  </View>
                </View>

                {entry.type === 'temperature' && (
                  <Text style={styles.entryRange}>
                    Acceptable range: {entry.min}°F - {entry.max}°F
                  </Text>
                )}

                <View style={styles.valueContainer}>
                  <Text style={styles.valueLabel}>Recorded Value:</Text>
                  <Text style={styles.valueText}>
                    {entry.type === 'temperature' ? `${entry.value}°F` : entry.value}
                  </Text>
                </View>
              </View>
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
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 16,
    color: '#4caf50',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: '5%',
    paddingBottom: '10%',
  },
  statusCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusPass: {
    backgroundColor: '#4caf50',
  },
  statusFail: {
    backgroundColor: '#ff9800',
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  resultsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  entryContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  passBadge: {
    backgroundColor: '#4caf50',
  },
  failBadge: {
    backgroundColor: '#e53935',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  entryRange: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  valueLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  valueText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});