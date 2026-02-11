import { router, useLocalSearchParams } from 'expo-router';
import { get, ref, set } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const { formId, location } = useLocalSearchParams<{ formId: string; location: string }>();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    title: '',
    fields: [],
  });

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const isValidMMDD = (value: string) => {
    if (!/^\d{2}-\d{2}$/.test(value)) return false;

    const [mm, dd] = value.split('-').map(Number);

    if (mm < 1 || mm > 12) return false;

    const year = new Date().getFullYear();
    const daysInMonth = new Date(year, mm, 0).getDate();

    return dd >= 1 && dd <= daysInMonth;
  };

  const handleSubmit = async () => {
    if (!formId || !location) return;

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
    if (!formId || !location) return;

    const formRef = ref(db, `Forms/Locations/${location}/${formId}`);

    get(formRef).then((snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.val();

      const fields: Field[] = Object.entries(data.fields).map(
        ([id, field]: any) => ({
          id,
          type: field.type || 'temperature',
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
  }, [formId, location]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{formData.title}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          {formData.fields.map((field) => (
            <View key={field.id} style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                {field.description && (
                  <Text style={styles.fieldDescription}>{field.description}</Text>
                )}
                {field.type === 'temperature' && field.min !== null && field.max !== null && (
                  <Text style={styles.fieldRange}>
                    Range: {field.min}°F - {field.max}°F
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                {field.type === 'temperature' ? (
                  <TextInput
                    placeholder="Enter temperature"
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
                  <View>
                    <TextInput
                      placeholder="MM-DD"
                      value={values[field.id] || ''}
                      style={[
                        styles.input,
                        errors[field.id] && styles.inputError
                      ]}
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
                      <Text style={styles.errorText}>{errors[field.id]}</Text>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        <Pressable style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Submit Form</Text>
        </Pressable>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: '5%',
    paddingBottom: '10%',
  },
  formCard: {
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
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fieldHeader: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  fieldDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  fieldRange: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
  },
  inputContainer: {
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#e53935',
  },
  errorText: {
    color: '#e53935',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});