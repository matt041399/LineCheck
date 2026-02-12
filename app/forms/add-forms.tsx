import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { get, push, ref, set } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as XLSX from 'xlsx';
import { auth, db } from '../firebase/firebase';

type FieldType = 'temperature' | 'date' | 'section';

interface Line {
  type: FieldType;
  label: string;
  description: string;
  min: string;
  max: string;
}

export default function AddForm() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [userLocations, setUserLocations] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>([
    { type: 'temperature', label: '', description: '', min: '', max: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/users/signin');
        return;
      }
      const userRef = ref(db, `Users/${user.uid}`);
      const userSnap = await get(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.val();
        const locations = userData.location || [];
        setUserLocations(locations);
        if (locations.length > 0) setSelectedLocation(locations[0]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddLine = () =>
    setLines((prev) => [...prev, { type: 'temperature', label: '', description: '', min: '', max: '' }]);

  const handleAddSection = () =>
    setLines((prev) => [...prev, { type: 'section', label: '', description: '', min: '', max: '' }]);

  const handleRemoveLine = (index: number) =>
    setLines((prev) => prev.filter((_, i) => i !== index));

  const handleChangeLine = (index: number, field: keyof Line, value: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'type' && (value === 'date' || value === 'section')) {
      updated[index].min = '';
      updated[index].max = '';
    }
    setLines(updated);
  };

  // ─── Excel Upload ─────────────────────────────────────────────────────────────
  const handleExcelUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target?.result, { type: 'binary', cellStyles: true });

          const sheetName =
            workbook.SheetNames.find((n) => n.toLowerCase().includes('line check')) ||
            workbook.SheetNames[0];

          parseSheet(workbook.Sheets[sheetName], workbook.Sheets[sheetName]['!merges'] || []);
        } catch (err) {
          Alert.alert('Error', 'Could not parse the Excel file.');
        }
      };

      reader.readAsBinaryString(blob);
    } catch {
      Alert.alert('Error', 'Could not open the file picker.');
    }
  };

  /**
   * HOW WE DETECT SECTIONS (verified against actual .xlsx structure):
   *
   * Section headers (e.g. "Omelette/ Pancake/ FT Station", "Meat Grill") are
   * merged across ALL FIVE columns A–E on that row.
   * Regular field rows only have D:E merges (the corrective action column).
   *
   * So: if a row's cell A is part of an A:E merge → it's a section header.
   *     Otherwise → it's a regular field (temperature or date).
   *
   * Temperature vs Date:
   *   - col B says "Record Temp"  → temperature
   *   - text contains [min*-max*] → temperature (extract those values)
   *   - everything else           → date (Nutella, Pesto, Water, etc.)
   */
  const parseSheet = (ws: XLSX.WorkSheet, merges: XLSX.Range[]) => {
    // Build a set of row numbers that are A:E full-row merges = section headers
    // XLSX uses 0-based row/col in the merges array
    const sectionRows = new Set<number>();
    for (const m of merges) {
      if (m.s.c === 0 && m.e.c === 4) {   // col A (0) through col E (4)
        sectionRows.add(m.s.r);            // 0-based row index
      }
    }

    const parsed: Line[] = [];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

    for (let r = 6; r <= range.e.r; r++) {   // row 7 onward (0-indexed = 6)
      const cellA = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      const cellB = ws[XLSX.utils.encode_cell({ r, c: 1 })];

      if (!cellA?.v) continue;
      const rawText = String(cellA.v).trim();
      if (!rawText) continue;

      // ── Section header: full-row A:E merge ───────────────────────────────
      if (sectionRows.has(r)) {
        parsed.push({ type: 'section', label: rawText, description: '', min: '', max: '' });
        continue;
      }

      // ── Temperature: "Record Temp" in col B OR [min*-max*] in text ────────
      const colBText      = cellB?.v ? String(cellB.v).toLowerCase() : '';
      const hasRecordTemp = colBText.includes('temp');
      const rangeMatch    = rawText.match(/\[(\d+)\*?-(\d+)\*?\]/);
      const isTemp        = hasRecordTemp || !!rangeMatch;

      const min = isTemp && rangeMatch ? rangeMatch[1] : '';
      const max = isTemp && rangeMatch ? rangeMatch[2] : '';

      // ── Clean label: strip [LDIR][...] and long description after " - " ───
      let label = rawText
        .replace(/\[LDIR\][^\]]*\]\s*/gi, '')
        .replace(/\[.*?\]/g, '')
        .replace(/ - .*/s, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!label) label = rawText.split('[')[0].split(' - ')[0].trim();

      const descMatch   = rawText.match(/ - (.+)/s);
      const description = descMatch
        ? descMatch[1].replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim()
        : '';

      // ── Date: everything else ─────────────────────────────────────────────
      parsed.push({ type: isTemp ? 'temperature' : 'date', label, description, min, max });
    }

    if (parsed.length === 0) {
      Alert.alert('No Data', 'No rows found. Check that you selected the right sheet.');
      return;
    }

    setLines(parsed);

    const sections = parsed.filter((l) => l.type === 'section').length;
    const temps    = parsed.filter((l) => l.type === 'temperature').length;
    const dates    = parsed.filter((l) => l.type === 'date').length;
    Alert.alert(
      'Import Complete ✅',
      `${parsed.length} rows imported:\n• ${sections} section headers\n• ${temps} temperature fields\n• ${dates} date fields\n\nReview below and adjust anything before saving.`
    );
  };

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Guard: prevent double-taps
    if (submitting) return;

    if (!title.trim())     { Alert.alert('Missing Title', 'Please enter a form title.'); return; }
    if (!selectedLocation) { Alert.alert('Missing Location', 'Please select a location.'); return; }

    const dataLines = lines.filter((l) => l.type !== 'section');
    if (dataLines.some((l) => !l.label.trim())) {
      Alert.alert('Incomplete Fields', 'All fields must have a label.');
      return;
    }

    setSubmitting(true);

    try {
      const ts                                  = Date.now();
      const sectionsObject: Record<string, any> = {};
      const fieldsObject:   Record<string, any> = {};
      let order = 1;

      lines.forEach((line) => {
        const uid = `${ts}_${Math.random().toString(36).slice(2)}`;
        if (line.type === 'section') {
          sectionsObject[`section_${uid}`] = { title: line.label, order, type: 'section' };
        } else {
          fieldsObject[`field_${uid}`] = {
            type:        line.type,
            label:       line.label,
            description: line.description || '',
            min:  line.type === 'temperature' ? (Number(line.min) || null) : null,
            max:  line.type === 'temperature' ? (Number(line.max) || null) : null,
            order,
          };
        }
        order++;
      });

      const newGroupRef = push(ref(db, 'FormGroups'));
      const formGroupId = newGroupRef.key!;

      await set(newGroupRef, {
        title,
        sections: sectionsObject,
        fields:   fieldsObject,
        assignedLocations: [selectedLocation],
        createdAt: ts,
      });

      const newFormRef = push(ref(db, `Forms/${selectedLocation}`));
      await set(newFormRef, { formGroupId, customizations: {} });

      setSubmitting(false);
      Alert.alert(
        'Form Created ✅',
        `"${title}" has been saved to ${selectedLocation}.`,
        [{ text: 'OK', onPress: () => router.replace('/forms/my-forms') }]
      );
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Something went wrong saving the form. Please try again.');
      setSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Create New Form</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Form Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Form Details</Text>
          <Text style={styles.label}>Form Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2301 Line Check"
            value={title}
            onChangeText={setTitle}
            editable={!submitting}
          />
          <Text style={styles.label}>Location</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={selectedLocation}
              onValueChange={setSelectedLocation}
              enabled={!submitting}
            >
              {userLocations.map((loc) => (
                <Picker.Item key={loc} label={loc} value={loc} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Excel Import */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Import from Excel</Text>
          <Pressable onPress={handleExcelUpload} style={styles.uploadButton} disabled={submitting}>
            <Text style={styles.uploadText}>📄  Upload Excel File</Text>
          </Pressable>
          <Text style={styles.hint}>
            Full-row merged cells → section headers · "Record Temp" or [min-max] → temperature · Everything else → date
          </Text>
        </View>

        {/* Fields list */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fields ({lines.length} total)</Text>

          {lines.map((line, idx) => (
            <View key={idx} style={[styles.fieldCard, line.type === 'section' && styles.sectionCard]}>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldBadge}>
                  {line.type === 'section' ? '📂 Section' : line.type === 'temperature' ? '🌡️ Temp' : '📅 Date'}
                </Text>
                <Pressable onPress={() => handleRemoveLine(idx)} style={styles.removeBtn} disabled={submitting}>
                  <Text style={styles.removeTxt}>✕</Text>
                </Pressable>
              </View>

              <Text style={styles.label}>Type</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={line.type}
                  onValueChange={(v) => handleChangeLine(idx, 'type', v)}
                  enabled={!submitting}
                >
                  <Picker.Item label="Temperature"    value="temperature" />
                  <Picker.Item label="Date"           value="date" />
                  <Picker.Item label="Section Header" value="section" />
                </Picker>
              </View>

              <Text style={styles.label}>{line.type === 'section' ? 'Section Name' : 'Label'}</Text>
              <TextInput
                style={styles.input}
                placeholder={line.type === 'section' ? 'e.g. Grill Station' : 'e.g. FT Batter'}
                value={line.label}
                onChangeText={(v) => handleChangeLine(idx, 'label', v)}
                editable={!submitting}
              />

              {line.type !== 'section' && (
                <>
                  <Text style={styles.label}>Description (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder='e.g. 4" 1/6 pan, kept on ice'
                    value={line.description}
                    onChangeText={(v) => handleChangeLine(idx, 'description', v)}
                    editable={!submitting}
                  />
                </>
              )}

              {line.type === 'temperature' && (
                <View style={styles.rangeRow}>
                  <View style={styles.rangeItem}>
                    <Text style={styles.label}>Min °F</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="33"
                      keyboardType="numeric"
                      value={line.min}
                      onChangeText={(v) => handleChangeLine(idx, 'min', v.replace(/[^0-9]/g, ''))}
                      editable={!submitting}
                    />
                  </View>
                  <View style={styles.rangeItem}>
                    <Text style={styles.label}>Max °F</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="38"
                      keyboardType="numeric"
                      value={line.max}
                      onChangeText={(v) => handleChangeLine(idx, 'max', v.replace(/[^0-9]/g, ''))}
                      editable={!submitting}
                    />
                  </View>
                </View>
              )}
            </View>
          ))}

          <View style={styles.addRow}>
            <Pressable style={[styles.addBtn, { backgroundColor: '#2196f3' }]} onPress={handleAddLine} disabled={submitting}>
              <Text style={styles.addTxt}>+ Field</Text>
            </Pressable>
            <Pressable style={[styles.addBtn, { backgroundColor: '#ff9800' }]} onPress={handleAddSection} disabled={submitting}>
              <Text style={styles.addTxt}>+ Section</Text>
            </Pressable>
          </View>
        </View>

        {/* Submit */}
        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <View style={styles.submitLoading}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={[styles.submitTxt, { marginLeft: 10 }]}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.submitTxt}>Create Form</Text>
          )}
        </Pressable>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f5f5f5' },
  header:        { paddingHorizontal: '5%', paddingTop: '5%', paddingBottom: '3%', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  backButton:    { marginBottom: 8 },
  backText:      { fontSize: 16, color: '#2196f3', fontWeight: '500' },
  headerTitle:   { fontSize: 24, fontWeight: 'bold', color: '#333' },
  scrollView:    { flex: 1 },
  scrollContent: { padding: '5%', paddingBottom: '10%' },

  card:      { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#e0e0e0' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 12 },

  label:      { fontSize: 13, fontWeight: '500', color: '#666', marginTop: 12, marginBottom: 5 },
  input:      { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15, color: '#333' },
  pickerWrap: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' },

  uploadButton: { backgroundColor: '#2196f3', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  uploadText:   { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint:         { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18 },

  fieldCard:   { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  sectionCard: { backgroundColor: '#fff8e1', borderColor: '#ff9800', borderLeftWidth: 4 },
  fieldRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  fieldBadge:  { fontSize: 14, fontWeight: '600', color: '#333' },
  removeBtn:   { backgroundColor: '#e53935', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  removeTxt:   { color: '#fff', fontSize: 13, fontWeight: '700' },

  rangeRow:  { flexDirection: 'row', gap: 12, marginTop: 4 },
  rangeItem: { flex: 1 },

  addRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  addBtn: { flex: 1, padding: 13, borderRadius: 8, alignItems: 'center' },
  addTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },

  submitBtn:         { backgroundColor: '#4caf50', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  submitBtnDisabled: { backgroundColor: '#a5d6a7', shadowOpacity: 0 },
  submitLoading:     { flexDirection: 'row', alignItems: 'center' },
  submitTxt:         { color: '#fff', fontSize: 18, fontWeight: '600' },
});