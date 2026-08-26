import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { MapPin, ChevronDown, X, Search } from 'lucide-react-native';
import { INDIA_STATES, INDIA_STATES_CITIES } from '../../data/indiaStatesCities';

const OTHER = 'Other';

// "delhi" / "NEW delhi" -> "Delhi" / "New Delhi"
const titleCase = (s: string) =>
  s.trim().toLowerCase().replace(/\b([a-z])/g, (_, c) => c.toUpperCase());

// A pick-list field that opens a searchable modal. Used for both State and City.
function Dropdown({ value, placeholder, options, onSelect, disabled }: {
  value: string; placeholder: string; options: string[]; onSelect: (v: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim();
  // Case-insensitive contains-match; "Other" is never shown while searching (the
  // "Use ..." row below replaces it so the user can always enter a value not in the list).
  const filtered = q
    ? options.filter((o) => o !== OTHER && o.toLowerCase().includes(q.toLowerCase()))
    : options;
  const hasExact = options.some((o) => o.toLowerCase() === q.toLowerCase());
  return (
    <>
      <TouchableOpacity
        style={[s.field, disabled && s.fieldDisabled]}
        activeOpacity={0.8}
        disabled={disabled}
        onPress={() => { setQuery(''); setOpen(true); }}
      >
        <Text style={[s.fieldText, !value && s.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
        <ChevronDown size={18} color="#94a3b8" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={s.searchRow}>
              <Search size={16} color="#94a3b8" />
              <TextInput
                style={s.searchInput}
                placeholder="Search..."
                placeholderTextColor="#94a3b8"
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="words"
              />
            </View>
            <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
              {filtered.map((o) => (
                <TouchableOpacity key={o} style={s.option} onPress={() => { onSelect(o); setOpen(false); }}>
                  <Text style={[s.optionText, value === o && s.optionActive]}>{o}</Text>
                </TouchableOpacity>
              ))}
              {/* Let the user commit whatever they typed when it isn't in the list
                  (e.g. a city we don't have) — no dead end. */}
              {q.length > 0 && !hasExact && (
                <TouchableOpacity style={s.option} onPress={() => { onSelect(titleCase(q)); setOpen(false); }}>
                  <Text style={[s.optionText, s.optionActive]}>Use "{titleCase(q)}"</Text>
                </TouchableOpacity>
              )}
              {filtered.length === 0 && q.length === 0 && <Text style={s.empty}>No matches</Text>}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// State -> City cascading fields, both required. Picking "Other" (or typing a state
// not in the list) swaps the dropdown for a free-text input. Edit-mode values that
// aren't in the static list are shown via the "Other" input, not a blank dropdown.
export function StateCityFields({ state, city, setState, setCity }: {
  state: string; city: string; setState: (v: string) => void; setCity: (v: string) => void;
}) {
  const [stateOther, setStateOther] = useState(() => !!state && !INDIA_STATES.includes(state));
  const [cityOther, setCityOther] = useState(false);

  useEffect(() => {
    if (state && !INDIA_STATES.includes(state)) { setStateOther(true); setCityOther(true); }
  }, [state]);
  useEffect(() => {
    const list = state && INDIA_STATES_CITIES[state] ? INDIA_STATES_CITIES[state] : [];
    if (city && list.length && !list.includes(city)) setCityOther(true);
  }, [state, city]);

  const stateOptions = [...INDIA_STATES, OTHER];
  const cityList = state && INDIA_STATES_CITIES[state] ? INDIA_STATES_CITIES[state] : [];
  const cityOptions = [...cityList, OTHER];

  const onStateSelect = (v: string) => {
    if (v === OTHER) { setStateOther(true); setState(''); setCityOther(true); }
    else { setStateOther(false); setState(v); setCityOther(false); }
    setCity(''); // city always resets when the state changes
  };
  const onCitySelect = (v: string) => {
    if (v === OTHER) { setCityOther(true); setCity(''); }
    else { setCityOther(false); setCity(v); }
  };

  return (
    <>
      <View style={s.section}>
        <View style={s.labelRow}><MapPin size={18} color="#0f172a" /><Text style={s.label}>State</Text></View>
        {stateOther ? (
          <TextInput style={s.input} placeholder="Enter your state" placeholderTextColor="#94a3b8" value={state} onChangeText={setState} autoCapitalize="words" />
        ) : (
          <Dropdown value={state} placeholder="Select state" options={stateOptions} onSelect={onStateSelect} />
        )}
      </View>

      <View style={s.section}>
        <View style={s.labelRow}><MapPin size={18} color="#0f172a" /><Text style={s.label}>City</Text></View>
        {cityOther ? (
          <TextInput style={s.input} placeholder="Enter your city" placeholderTextColor="#94a3b8" value={city} onChangeText={setCity} autoCapitalize="words" />
        ) : (
          <Dropdown
            value={city}
            placeholder={state ? 'Select city' : 'Select state first'}
            options={cityOptions}
            onSelect={onCitySelect}
            disabled={!state}
          />
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  section: { marginBottom: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { fontSize: 15, fontWeight: '700', color: '#0f172a' },

  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 16, height: 52 },
  fieldDisabled: { opacity: 0.5 },
  fieldText: { flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '600' },
  placeholder: { color: '#94a3b8', fontWeight: '500' },

  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 16, height: 52, fontSize: 15, color: '#0f172a', fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 28, maxWidth: 560, width: '100%', alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  option: { paddingVertical: 13, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  optionText: { fontSize: 15, color: '#334155', fontWeight: '600' },
  optionActive: { color: '#15803d', fontWeight: '800' },
  empty: { textAlign: 'center', color: '#94a3b8', paddingVertical: 20, fontWeight: '600' },
});
