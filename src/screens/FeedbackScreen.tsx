import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquareHeart, Check, AlertCircle } from 'lucide-react-native';
import { submitFeedback } from '../services/emailPrefs';
import { BACKEND_BASE } from '../services/api';

const SUPPORT = 'info@0waste.co.in';

function goHome(navigation: any) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign('/');
    return;
  }
  if (navigation?.canGoBack?.()) navigation.goBack();
  else navigation?.navigate?.('App');
}

export function FeedbackScreen({ route, navigation }: any) {
  const token: string | undefined = route?.params?.token;
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'form' | 'sending' | 'done' | 'error'>('form');

  const send = async () => {
    if (score == null) return;
    setState('sending');
    try {
      await submitFeedback(token || '', score, comment.trim());
      setState('done');
    } catch (e) {
      setState('error');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <View style={styles.headerIconBox}>
              <MessageSquareHeart size={22} color="white" />
            </View>
            <Text style={styles.brand}>KarmaVerse</Text>
            <Text style={styles.headerTitle}>Share your feedback</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {state === 'done' ? (
          <View style={styles.centerCard}>
            <View style={styles.tick}><Check size={30} color="#16a34a" /></View>
            <Text style={styles.doneTitle}>Thank you!</Text>
            <Text style={styles.doneText}>Your feedback goes straight to our team. Every response is read by a real person.</Text>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => goHome(navigation)} activeOpacity={0.8}>
              <Text style={styles.ghostBtnText}>Back to KarmaVerse</Text>
            </TouchableOpacity>
          </View>
        ) : state === 'error' ? (
          <View style={styles.centerCard}>
            <View style={[styles.tick, styles.tickErr]}><AlertCircle size={30} color="#dc2626" /></View>
            <Text style={styles.doneTitle}>Couldn't send that</Text>
            <Text style={styles.doneText}>Something went wrong on our end. Please try again in a moment, or email us at {SUPPORT}.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setState('form')} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.q}>How likely are you to recommend KarmaVerse?</Text>
            <Text style={styles.sub}>0 = not at all, 10 = absolutely. It takes 20 seconds.</Text>

            <View style={styles.npsRow}>
              {Array.from({ length: 11 }, (_, i) => i).map((n) => {
                const on = score === n;
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.npsBtn, on && styles.npsBtnOn]}
                    onPress={() => setScore(n)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.npsText, on && styles.npsTextOn]}>{n}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.endsRow}>
              <Text style={styles.endText}>Not likely</Text>
              <Text style={styles.endText}>Very likely</Text>
            </View>

            <Text style={styles.label}>Anything you'd like us to know? <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.textarea}
              placeholder="What's working, what isn't, what you'd love to see next…"
              placeholderTextColor="#94a3b8"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (score == null || state === 'sending') && styles.primaryBtnDisabled]}
              onPress={send}
              disabled={score == null || state === 'sending'}
              activeOpacity={0.85}
            >
              {state === 'sending'
                ? <ActivityIndicator color="white" />
                : <Text style={styles.primaryBtnText}>Submit feedback</Text>}
            </TouchableOpacity>
            <Text style={styles.fine}>Linked to your account via the email link — you won't be asked to sign in.</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerInner: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, maxWidth: 640, width: '100%', alignSelf: 'center' },
  headerIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  brand: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4 },
  headerTitle: { color: 'white', fontSize: 26, fontWeight: '900', letterSpacing: 0.2 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60, maxWidth: 640, width: '100%', alignSelf: 'center' },

  q: { fontSize: 20, fontWeight: '800', color: '#0f172a', lineHeight: 27 },
  sub: { fontSize: 14, color: '#64748b', marginTop: 6, marginBottom: 18 },

  npsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  npsBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  npsBtnOn: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  npsText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  npsTextOn: { color: 'white' },
  endsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 22 },
  endText: { fontSize: 12, color: '#94a3b8' },

  label: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 9 },
  optional: { fontWeight: '500', color: '#94a3b8' },
  textarea: { minHeight: 96, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 14, color: '#0f172a', backgroundColor: 'white' },

  primaryBtn: { marginTop: 18, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  primaryBtnDisabled: { backgroundColor: '#9cccb0' },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  fine: { fontSize: 12, color: '#94a3b8', marginTop: 14, textAlign: 'center' },

  centerCard: { alignItems: 'center', paddingTop: 24 },
  tick: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e7f4ec', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  tickErr: { backgroundColor: '#fdecec' },
  doneTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  doneText: { fontSize: 14.5, color: '#64748b', textAlign: 'center', lineHeight: 22, maxWidth: 340 },
  ghostBtn: { marginTop: 22, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 24 },
  ghostBtnText: { color: '#15803d', fontSize: 14.5, fontWeight: '800' },
});
