import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SlidersHorizontal, Check, AlertCircle } from 'lucide-react-native';
import { getPreferences, savePreferences, EmailPrefs, DEFAULT_PREFS, PREF_META } from '../services/emailPrefs';

const SUPPORT = 'info@0waste.co.in';

function goHome(navigation: any) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') { window.location.assign('/'); return; }
  if (navigation?.canGoBack?.()) navigation.goBack();
  else navigation?.navigate?.('App');
}

export function EmailPreferencesScreen({ route, navigation }: any) {
  const token: string | undefined = route?.params?.token;
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [prefs, setPrefs] = useState<EmailPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getPreferences(token || '');
        if (!alive) return;
        setEmail(res.email);
        setPrefs(res.prefs);
        setState('ready');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const allOff = Object.values(prefs).every((v) => !v);
  const setOne = (key: keyof EmailPrefs, value: boolean) => {
    setSaved(false);
    setPrefs((p) => ({ ...p, [key]: value }));
  };
  const toggleAllOff = (unsubAll: boolean) => {
    setSaved(false);
    if (unsubAll) setPrefs({ newsletter: false, quiz: false, impact: false, offers: false, seasonal: false });
    else setPrefs(DEFAULT_PREFS);
  };

  const save = async () => {
    setSaving(true);
    try { await savePreferences(token || '', prefs); setSaved(true); }
    catch { setState('error'); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <View style={styles.headerIconBox}><SlidersHorizontal size={22} color="white" /></View>
            <Text style={styles.brand}>KarmaVerse</Text>
            <Text style={styles.headerTitle}>Your email preferences</Text>
            {!!email && <Text style={styles.headerSub}>{email}</Text>}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {state === 'loading' && (
          <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /><Text style={styles.workText}>Loading your preferences…</Text></View>
        )}

        {state === 'error' && (
          <View style={styles.center}>
            <View style={styles.tickErr}><AlertCircle size={30} color="#dc2626" /></View>
            <Text style={styles.doneTitle}>Something went wrong</Text>
            <Text style={styles.doneText}>We couldn't load your preferences. Please try again, or email us at {SUPPORT}.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => { setState('loading'); navigation.replace('EmailPreferences', { token }); }} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'ready' && (
          <>
            <Text style={styles.lead}>Choose what lands in your inbox. Turn off anything you'd rather not receive.</Text>

            {PREF_META.map((m) => (
              <View key={m.key} style={styles.pref}>
                <View style={styles.prefText}>
                  <Text style={styles.prefTitle}>{m.title}</Text>
                  <Text style={styles.prefSub}>{m.subtitle}</Text>
                </View>
                <Switch
                  value={prefs[m.key]}
                  onValueChange={(v) => setOne(m.key, v)}
                  trackColor={{ false: '#cbd5e1', true: '#16a34a' }}
                  thumbColor="#ffffff"
                  ios_backgroundColor="#cbd5e1"
                />
              </View>
            ))}

            <View style={styles.allRow}>
              <View style={styles.prefText}>
                <Text style={styles.prefTitle}>Unsubscribe from all marketing</Text>
                <Text style={styles.prefSub}>Keeps only essential booking & account emails.</Text>
              </View>
              <Switch
                value={allOff}
                onValueChange={toggleAllOff}
                trackColor={{ false: '#cbd5e1', true: '#dc2626' }}
                thumbColor="#ffffff"
                ios_backgroundColor="#cbd5e1"
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Save preferences</Text>}
            </TouchableOpacity>

            {saved && (
              <View style={styles.savedRow}>
                <Check size={16} color="#15803d" />
                <Text style={styles.savedText}>Preferences saved</Text>
              </View>
            )}

            <TouchableOpacity style={styles.ghostBtn} onPress={() => goHome(navigation)} activeOpacity={0.8}>
              <Text style={styles.ghostBtnText}>Back to KarmaVerse</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerInner: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, maxWidth: 620, width: '100%', alignSelf: 'center' },
  headerIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  brand: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4 },
  headerTitle: { color: 'white', fontSize: 26, fontWeight: '900', letterSpacing: 0.2 },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13.5, fontWeight: '600', marginTop: 6 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 60, maxWidth: 620, width: '100%', alignSelf: 'center' },

  lead: { fontSize: 14.5, color: '#475569', lineHeight: 22, marginBottom: 12 },

  pref: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  prefText: { flex: 1, minWidth: 0 },
  prefTitle: { fontSize: 14.5, fontWeight: '700', color: '#0f172a' },
  prefSub: { fontSize: 12.5, color: '#64748b', marginTop: 2, lineHeight: 18 },

  allRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#cbd5e1', borderStyle: 'dashed' },

  primaryBtn: { marginTop: 22, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 15, alignItems: 'center', alignSelf: 'stretch' },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  savedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  savedText: { color: '#15803d', fontSize: 13.5, fontWeight: '700' },
  ghostBtn: { marginTop: 14, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingVertical: 13, alignItems: 'center', alignSelf: 'stretch' },
  ghostBtnText: { color: '#15803d', fontSize: 14.5, fontWeight: '800' },

  center: { alignItems: 'center', paddingTop: 40 },
  workText: { marginTop: 16, fontSize: 14.5, color: '#64748b', fontWeight: '600' },
  tickErr: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fdecec', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  doneTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  doneText: { fontSize: 14.5, color: '#64748b', textAlign: 'center', lineHeight: 22, maxWidth: 360 },
});
