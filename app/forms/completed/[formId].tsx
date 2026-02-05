import { useLocalSearchParams } from 'expo-router';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const { formId } = useLocalSearchParams<{ formId: string }>();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!formId) return;

    const locationKey = 'Test'; // hard-coded for now
    const submissionRef = ref(db, `CompletedForms/${locationKey}/${formId}`);

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
      setLocation(data.location);
      setSubmittedAt(data.submittedAt);
      setEntries(loadedEntries);
      setLoading(false);
    });
  }, [formId]);

  const isPass = (entry: Entry) => {
    if (entry.type === 'temperature') {
      // only check min/max if they are numbers
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
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          {location} • {submittedAt && new Date(submittedAt).toLocaleString()}
        </Text>

        <View style={styles.table}>
          {entries.map((entry) => {
            const pass = isPass(entry);

            return (
              <View key={entry.id} style={styles.row}>
                <View style={styles.labelCol}>
                  <Text style={styles.label}>{entry.label}</Text>
                  {entry.type === 'temperature' && (
                    <Text style={styles.range}>
                      Acceptable: {entry.min}–{entry.max}
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.valueCol,
                    pass ? styles.pass : styles.fail,
                  ]}
                >
                  <Text style={styles.value}>{entry.value}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

export const options = {
  headerShown: false,
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#333',
    padding: 20,
    alignItems: 'center',
  },
  card: {
    width: '95%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  meta: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  table: {
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  labelCol: {
    flex: 3,
  },
  label: {
    fontSize: 18,
    fontWeight: '500',
  },
  range: {
    fontSize: 14,
    color: '#666',
  },
  valueCol: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  pass: {
    backgroundColor: '#4caf50',
  },
  fail: {
    backgroundColor: '#e53935',
  },
});
