import { useLocalSearchParams, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { get, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth, db } from '../../firebase/firebase';

interface FormRow {
  id: string;
  type: 'temperature' | 'date' | 'section';
  label: string;
  description: string;
  min: string;
  max: string;
  order: number;
  hidden: boolean;
}

export default function EditForm() {
  const { formId, location } = useLocalSearchParams<{ formId: string; location: string }>();
  const router = useRouter();

  const [title, setTitle]           = useState('');
  const [rows, setRows]             = useState<FormRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [formGroupId, setFormGroupId] = useState('');

  // Locations this admin has access to that also use this formGroup
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  // Which locations the admin wants to apply these edits to
  const [selectedLocations, setSelectedLocations]   = useState<string[]>([]);

  useEffect(() => {
    if (!formId || !location) return;

    onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/users/signin'); return; }

      // Get user's accessible locations
      const userSnap = await get(ref(db, `Users/${user.uid}`));
      const userLocs: string[] = userSnap.exists() ? (userSnap.val().location || []) : [];

      // Load the form reference
      const formSnap = await get(ref(db, `Forms/${location}/${formId}`));
      if (!formSnap.exists()) return;

      const formData   = formSnap.val();
      const groupId    = formData.formGroupId;
      const customizations = formData.customizations || {};
      setFormGroupId(groupId);

      // Find which of the user's locations also have this formGroup
      const locationsWithForm: string[] = [];
      for (const loc of userLocs) {
        const locSnap = await get(ref(db, `Forms/${loc}`));
        if (!locSnap.exists()) continue;
        const locForms = locSnap.val();
        const hasForm  = Object.values<any>(locForms).some((f) => f.formGroupId === groupId);
        if (hasForm) locationsWithForm.push(loc);
      }

      setAvailableLocations(locationsWithForm);
      setSelectedLocations([location]); // default: only current location checked

      // Load FormGroup
      const groupSnap = await get(ref(db, `FormGroups/${groupId}`));
      if (!groupSnap.exists()) return;

      const formGroup = groupSnap.val();
      setTitle(formGroup.title ?? '');

      const loadedRows: FormRow[] = [];

      if (formGroup.sections) {
        Object.entries<any>(formGroup.sections).forEach(([id, section]) => {
          loadedRows.push({
            id,
            type: 'section',
            label: section.title ?? '',
            description: '',
            min: '', max: '',
            order: section.order ?? 0,
            hidden: false,
          });
        });
      }

      if (formGroup.fields) {
        Object.entries<any>(formGroup.fields).forEach(([fieldId, field]) => {
          const custom = customizations[fieldId] || {};
          loadedRows.push({
            id: fieldId,
            type: field.type ?? 'temperature',
            label: field.label ?? '',
            description: field.description ?? '',
            min:  (custom.min ?? field.min)?.toString() ?? '',
            max:  (custom.max ?? field.max)?.toString() ?? '',
            order: field.order ?? 0,
            hidden: custom.hidden || false,
          });
        });
      }

      loadedRows.sort((a, b) => a.order - b.order);
      setRows(loadedRows);
      setLoading(false);
    });
  }, [formId, location]);

  const updateRow = (id: string, field: keyof FormRow, value: any) => {
    setRows((prev) => prev.map((row) => row.id === id ? { ...row, [field]: value } : row));
  };

  const toggleLocation = (loc: string) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const saveForm = async () => {
    if (saving) return;
    if (selectedLocations.length === 0) {
      Alert.alert('No Locations', 'Please select at least one location to apply changes to.');
      return;
    }

    setSaving(true);

    try {
      // Build customizations object from current row state
      const customizations: Record<string, any> = {};

      rows.forEach((row) => {
        if (row.type === 'section') return;
        const custom: any = {};
        if (row.type === 'temperature') {
          if (row.min) custom.min = Number(row.min);
          if (row.max) custom.max = Number(row.max);
        }
        if (row.hidden) custom.hidden = true;
        if (Object.keys(custom).length > 0) customizations[row.id] = custom;
      });

      // Apply to each selected location that has this form
      const updates: Promise<void>[] = [];

      for (const loc of selectedLocations) {
        // Find the formId for this formGroup in this location
        const locSnap = await get(ref(db, `Forms/${loc}`));
        if (!locSnap.exists()) continue;

        const locForms = locSnap.val();
        const matchEntry = Object.entries<any>(locForms).find(
          ([, f]) => f.formGroupId === formGroupId
        );

        if (!matchEntry) continue;
        const [locFormId] = matchEntry;

        updates.push(
          update(ref(db, `Forms/${loc}/${locFormId}`), { customizations })
        );
      }

      await Promise.all(updates);

      setSaving(false);
      Alert.alert(
        'Saved ✅',
        `Changes applied to: ${selectedLocations.join(', ')}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not save changes. Please try again.');
      setSaving(false);
    }
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Form</Text>
        <Text style={styles.headerSubtitle}>{title}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Apply-to locations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Apply Changes To</Text>
          <Text style={styles.cardHint}>
            Select which locations these edits should affect. Only locations you have access to that use this form are shown.
          </Text>

          {availableLocations.map((loc) => {
            const checked = selectedLocations.includes(loc);
            return (
              <Pressable
                key={loc}
                style={styles.checkRow}
                onPress={() => toggleLocation(loc)}
              >
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>{loc}</Text>
                {loc === location && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>current</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Fields */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fields</Text>
          <Text style={styles.cardHint}>
            You can hide fields or change temperature ranges for the selected locations.
          </Text>

          {rows.map((row) => {
            if (row.type === 'section') {
              return (
                <View key={row.id} style={styles.sectionRow}>
                  <Text style={styles.sectionText}>📂 {row.label}</Text>
                </View>
              );
            }

            return (
              <View key={row.id} style={[styles.fieldCard, row.hidden && styles.fieldCardHidden]}>
                <View style={styles.fieldHeader}>
                  <Text style={styles.fieldLabel} numberOfLines={2}>{row.label}</Text>
                  <Pressable
                    onPress={() => updateRow(row.id, 'hidden', !row.hidden)}
                    style={[styles.visibilityBtn, row.hidden && styles.visibilityBtnHidden]}
                  >
                    <Text style={styles.visibilityBtnText}>
                      {row.hidden ? '🚫 Hidden' : '👁️ Visible'}
                    </Text>
                  </Pressable>
                </View>

                {!row.hidden && row.type === 'temperature' && (
                  <View style={styles.rangeRow}>
                    <View style={styles.rangeItem}>
                      <Text style={styles.rangeLabel}>Min °F</Text>
                      <TextInput
                        style={styles.rangeInput}
                        placeholder="Min"
                        keyboardType="numeric"
                        value={row.min}
                        onChangeText={(v) => updateRow(row.id, 'min', v.replace(/[^0-9]/g, ''))}
                        editable={!saving}
                      />
                    </View>
                    <View style={styles.rangeItem}>
                      <Text style={styles.rangeLabel}>Max °F</Text>
                      <TextInput
                        style={styles.rangeInput}
                        placeholder="Max"
                        keyboardType="numeric"
                        value={row.max}
                        onChangeText={(v) => updateRow(row.id, 'max', v.replace(/[^0-9]/g, ''))}
                        editable={!saving}
                      />
                    </View>
                  </View>
                )}

                {!row.hidden && row.type === 'date' && (
                  <Text style={styles.dateNote}>Date field — no range needed</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Save */}
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveForm}
          disabled={saving}
        >
          {saving ? (
            <View style={styles.savingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={[styles.saveText, { marginLeft: 10 }]}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.saveText}>Save Changes</Text>
          )}
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f5f5f5' },
  header:         { paddingHorizontal: '5%', paddingTop: '5%', paddingBottom: '3%', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  backButton:     { marginBottom: 8 },
  backText:       { fontSize: 16, color: '#4caf50', fontWeight: '500' },
  headerTitle:    { fontSize: 24, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 14, color: '#888', marginTop: 2 },

  scrollView:    { flex: 1 },
  scrollContent: { padding: '5%', paddingBottom: '10%' },

  card:      { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#e0e0e0' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 6 },
  cardHint:  { fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 19 },

  // Location checkboxes
  checkRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  checkbox:     { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#ccc', marginRight: 14, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  checkmark:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkLabel:   { fontSize: 16, color: '#333', fontWeight: '500', flex: 1 },
  currentBadge: { backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  currentBadgeText: { fontSize: 11, color: '#1976d2', fontWeight: '600' },

  // Section row
  sectionRow: { backgroundColor: '#f0f4f0', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#4caf50' },
  sectionText:{ fontSize: 15, fontWeight: '700', color: '#333' },

  // Field card
  fieldCard:       { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  fieldCardHidden: { opacity: 0.5, borderStyle: 'dashed' },
  fieldHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  fieldLabel:      { fontSize: 15, fontWeight: '600', color: '#333', flex: 1 },

  visibilityBtn:       { backgroundColor: '#e8f5e9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#a5d6a7' },
  visibilityBtnHidden: { backgroundColor: '#fce4ec', borderColor: '#f48fb1' },
  visibilityBtnText:   { fontSize: 13, fontWeight: '600', color: '#333' },

  rangeRow:   { flexDirection: 'row', gap: 12, marginTop: 12 },
  rangeItem:  { flex: 1 },
  rangeLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  rangeInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 15, textAlign: 'center', color: '#333' },
  dateNote:   { fontSize: 13, color: '#aaa', marginTop: 10, fontStyle: 'italic' },

  saveButton:         { backgroundColor: '#4caf50', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  saveButtonDisabled: { backgroundColor: '#a5d6a7', shadowOpacity: 0 },
  savingRow:          { flexDirection: 'row', alignItems: 'center' },
  saveText:           { color: '#fff', fontSize: 18, fontWeight: '600' },
});