import { router, useLocalSearchParams } from 'expo-router';
import { get, ref, set } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '../firebase/firebase';

type FieldType = 'temperature' | 'date';

interface Field {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  min: number | null;
  max: number | null;
}

interface FormData {
  title: string;
  fields: Field[];
}

export default function Linecheck() {
  const { formId } = useLocalSearchParams<{ formId: string }>();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    title: '',
    fields: [],
  });

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const getTodayMMDD = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}-${dd}`;
  };

  const isValidMMDD = (value: string) => {
    if (!/^\d{2}-\d{2}$/.test(value)) return false;

    const [mm, dd] = value.split('-').map(Number);

    if (mm < 1 || mm > 12) return false;

    const year = new Date().getFullYear();
    const daysInMonth = new Date(year, mm, 0).getDate();

    return dd >= 1 && dd <= daysInMonth;
  };


  const handleSubmit = async () => {
    if (!formId) return;

    const location = 'Test';
    const today = getTodayDate();
    const baseKey = `${today}-${location}-${formData.title}`;

    const locationRef = ref(db, `CompletedForms/${location}`);
    const snapshot = await get(locationRef);

    let submissionKey = baseKey;

    if (snapshot.exists()) {
      const existingKeys = Object.keys(snapshot.val());
      const count = existingKeys.filter((k) =>
        k.startsWith(baseKey)
      ).length;

      if (count > 0) {
        submissionKey = `${baseKey} (${count + 1})`;
      }
    }

    const missing = formData.fields.some(
      (field) => !values[field.id]
    );

    if (missing) {
      alert('Please fill out all fields before submitting.');
      return;
    }

    const hasInvalidDate = formData.fields.some(
      (field) =>
        field.type === 'date' &&
        !isValidMMDD(values[field.id])
    );
    
    if (hasInvalidDate) {
      alert('Please fix invalid dates before submitting.');
      return;
    }
    

    const entries = formData.fields.reduce<Record<string, any>>(
      (acc, field) => {
        acc[field.id] = {
          label: field.label,
          type: field.type,
          value:
            field.type === 'temperature'
              ? Number(values[field.id])
              : values[field.id],
          min: field.min,
          max: field.max,
        };
        return acc;
      },
      {}
    );

    await set(
      ref(db, `CompletedForms/${location}/${submissionKey}`),
      {
        formId,
        title: formData.title,
        location,
        submittedAt: Date.now(),
        entries,
      }
    );

    router.push('../forms/completed-forms');
  };

  useEffect(() => {
    if (!formId) return;

    const formRef = ref(db, `Forms/Locations/Test/${formId}`);

    get(formRef).then((snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.val();

      const fields: Field[] = Object.entries(data.fields).map(
        ([id, field]: any) => ({
          id,
          type: field.type,
          label: field.label,
          description: field.description,
          min: field.min ?? null,
          max: field.max ?? null,
        })
      );

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
              <View style={styles.labelContainer}>
                <Text style={styles.label}>{field.label}</Text>
                {field.description && (
                  <Text style={styles.description}>
                    {field.description}
                  </Text>
                )}
                {field.type === 'temperature' && (
                  <Text style={styles.range}>
                    ({field.min}–{field.max})
                  </Text>
                )}
              </View>

              {field.type === 'temperature' ? (
                <TextInput
                  placeholder="°F"
                  keyboardType="numeric"
                  style={styles.input}
                  value={values[field.id] || ''}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '');
                    setValues((prev) => ({
                      ...prev,
                      [field.id]: cleaned,
                    }));
                  }}
                />
              ) : (
                <View style={styles.dateContainer}>
                  <TextInput
                    placeholder="MM-DD"
                    value={values[field.id] || ''}
                    style={styles.dateInput}
                    keyboardType="numeric"
                    maxLength={5}
                    onChangeText={(text) => {
                      let cleaned = text.replace(/[^0-9]/g, '');

                      if (cleaned.length >= 3) {
                        cleaned = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}`;
                      }

                      setValues((prev) => ({
                        ...prev,
                        [field.id]: cleaned,
                      }));

                      if (cleaned.length === 5) {
                        setErrors((prev) => ({
                          ...prev,
                          [field.id]: isValidMMDD(cleaned)
                            ? ''
                            : 'Invalid date',
                        }));
                      } else {
                        setErrors((prev) => ({
                          ...prev,
                          [field.id]: '',
                        }));
                      }
                    }}

                  />
                  {errors[field.id] ? (
                    <Text style={{ color: 'red', fontSize: 12 }}>
                      {errors[field.id]}
                    </Text>
                  ) : null}

                </View>
              )}
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
    paddingVertical: 8,
  },
  labelContainer: {
    width: '70%',
    paddingLeft: 8,
  },
  label: {
    fontSize: 22,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  range: {
    fontSize: 14,
    color: '#333',
  },
  input: {
    width: '30%',
    borderLeftWidth: 1,
    borderColor: '#ccc',
    textAlign: 'center',
    fontSize: 18,
    paddingHorizontal: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '30%',
    borderLeftWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 4,
  },
  dateInput: {
    flex: 1,
    fontSize: 18,
    textAlign: 'center',
  },
  calendarButton: {
    paddingHorizontal: 6,
  },
  title: {
    fontSize: 28,
    paddingBottom: 12,
  },
  submitContainer: {
    width: '20%',
    paddingTop: 16,
  },
  submitButton: {
    backgroundColor: 'green',
    borderRadius: 50,
    paddingVertical: 8,
    alignItems: 'center',
  },
  submitText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
