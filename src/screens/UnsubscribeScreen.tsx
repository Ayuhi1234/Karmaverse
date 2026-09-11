import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MailX, Check, AlertCircle, Sprout } from 'lucide-react-native';
import { unsubscribeAll, resubscribe } from '../services/emailPrefs';

const SUPPORT = 'info@0waste.co.in';

function goHome(navigation: any) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') { window.location.assign('/'); return; }
  if (navigation?.canGoBack?.()) navigation.goBack();
  else navigation?.navigate?.('App');
}

export function UnsubscribeScreen({ route, navigation }: any) {
  const token: string | undefined = route?.params?.token;
  const [state, setState] = useState<'working' | 'done' | 'error' | 'resubscribed'>('working');
  const [busy, setBusy] = useState(false);

  // One-click: the email link IS the action — opt the recipient out on open.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await unsubscribeAll(token || '');
        if (alive) setState('done');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const doResubscribe = async () => {
    setBusy(true);
    try { await resubscribe(token || ''); setState('resubscribed'); }
    catch { setState('error'); }
    finally { setBusy(false); }
  };

  const retry = async () => {
    setState('working');
    try { await unsubscribeAll(token || ''); setState('done'); }
    catch { setState('error'); }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <View style={styles.headerIconBox}><MailX size={22} color="white" /></View>
            <Text style={styles.brand}>KarmaVerse</Text>
            <Text style={styles.headerTitle}>Email preferences</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {state === 'working' && (
          <View style={styles.centerCard}>
            <ActivityIndicator size="large" color="#16a34a" />
            <Text style={styles.workText}>Updating your preferences…</Text>
          </View>
        )}

        {state === 'done' && (
          <View style={styles.centerCard}>
            <View style={styles.tick}><Check size={30} color="#16a34a" /></View>
            <Text style={styles.doneTitle}>You've been unsubscribed</Text>
            <Text style={styles.doneText}>You won't receive marketing emails from KarmaVerse any more.</Text>
            <Text style={styles.fine}>You'll still get essential emails about your bookings, coins and account — those aren't marketing.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('EmailPreferences', { token })} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Choose what I get instead</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={doResubscribe} disabled={busy} activeOpacity={0.8}>
              {busy ? <ActivityIndicator color="#15803d" /> : <Text style={styles.ghostBtnText}>Re-subscribe</Text>}
            </TouchableOpacity>
          </View>
        )}

        {state === 'resubscribed' && (
          <View style={styles.centerCard}>
            <View style={styles.tick}><Sprout size={30} color="#16a34a" /></View>
            <Text style={styles.doneTitle}>You're back</Text>
            <Text style={styles.doneText}>Welcome back — you'll receive KarmaVerse updates again.</Text>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => goHome(navigation)} activeOpacity={0.8}>
              <Text style={styles.ghostBtnText}>Back to KarmaVerse</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'error' && (
          <View style={styles.centerCard}>
            <View style={[styles.tick, styles.tickErr]}><AlertCircle size={30} color="#dc2626" /></View>
            <Text style={styles.doneTitle}>Something went wrong</Text>
            <Text style={styles.doneText}>We couldn't update your preferences just now. Please try again, or email us at {SUPPORT} and we'll take care of it.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={retry} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerInner: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, maxWidth: 560, width: '100%', alignSelf: 'center' },
  headerIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  brand: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4 },
  headerTitle: { color: 'white', fontSize: 26, fontWeight: '900', letterSpacing: 0.2 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 34, paddingBottom: 60, maxWidth: 560, width: '100%', alignSelf: 'center' },

  centerCard: { alignItems: 'center' },
  workText: { marginTop: 16, fontSize: 14.5, color: '#64748b', fontWeight: '600' },
  tick: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e7f4ec', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  tickErr: { backgroundColor: '#fdecec' },
  doneTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  doneText: { fontSize: 14.5, color: '#64748b', textAlign: 'center', lineHeight: 22, maxWidth: 360 },
  fine: { fontSize: 12.5, color: '#94a3b8', marginTop: 14, textAlign: 'center', lineHeight: 19, maxWidth: 360 },

  primaryBtn: { marginTop: 24, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center', alignSelf: 'stretch' },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  ghostBtn: { marginTop: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 24, alignItems: 'center', alignSelf: 'stretch' },
  ghostBtnText: { color: '#15803d', fontSize: 14.5, fontWeight: '800' },
});
