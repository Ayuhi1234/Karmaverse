import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Leaf, CheckCircle2 } from 'lucide-react-native';
import { carbonService, CarbonAssessment, CarbonCategoryKey, CARBON_CATEGORY_ORDER, CarbonApiNotReadyError } from '../services/carbon';
import { CARBON_CATEGORIES, formatKg, formatDate, showCarbonError } from '../utils/carbon';
import { showAlert } from '../utils/alert';

type Step = 'intro' | number | 'calculating' | 'result';
const EMPTY_ANSWERS = CARBON_CATEGORY_ORDER.reduce((acc, k) => ({ ...acc, [k]: '' }), {} as Record<CarbonCategoryKey, string>);
const TOTAL = CARBON_CATEGORY_ORDER.length; // always 6, fixed order

// One screen with steps, the same way QuizScreen runs its states. Header and
// progress track follow the quiz; the answer box and buttons follow FeedbackScreen.
export function CarbonAssessmentScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('intro');
  const [answers, setAnswers] = useState<Record<CarbonCategoryKey, string>>(EMPTY_ANSWERS);
  const [result, setResult] = useState<CarbonAssessment | null>(null);
  const allowLeave = useRef(false);

  const hasAnswers = Object.values(answers).some((a) => a.trim().length > 0);

  // Confirm before leaving (close button, Android back, browser back) with typed answers.
  // TODO(backend): answers are not saved as you go yet, so they are lost on exit.
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e: any) => {
      if (allowLeave.current || !hasAnswers || step === 'result') return;
      e.preventDefault();
      showAlert('Leave assessment?', 'Your answers on this screen will be lost.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => { allowLeave.current = true; navigation.dispatch(e.data.action); } },
      ]);
    });
  }, [navigation, hasAnswers, step]);

  const close = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('CarbonFootprint'));

  const calculate = async () => {
    setStep('calculating');
    try {
      const saved = await carbonService.submitAssessment(answers);
      setResult(saved);
      setStep('result');
    } catch (error) {
      showCarbonError("Couldn't calculate your footprint", error);
      setStep(TOTAL - 1); // back to the last question, answers intact
      if (!(error instanceof CarbonApiNotReadyError)) console.error('Carbon assessment error:', error);
    }
  };

  const qIndex = typeof step === 'number' ? step : -1;
  const key = qIndex >= 0 ? CARBON_CATEGORY_ORDER[qIndex] : null;
  const cat = key ? CARBON_CATEGORIES[key] : null;
  const answer = key ? answers[key] : '';
  const canContinue = answer.trim().length >= 2;
  const progressPct = qIndex >= 0 ? (qIndex / TOTAL) * 100 : step === 'calculating' || step === 'result' ? 100 : 0;

  const top = result?.categories.reduce<{ key: CarbonCategoryKey; kgCo2e: number } | null>(
    (best, c) => (c.kgCo2e > (best?.kgCo2e ?? 0) ? c : best), null,
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <LinearGradient colors={['#064e3b', '#166534']} style={styles.topBg} />

      {/* Header — same as the quiz */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={close} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Close assessment">
          <X size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carbon footprint</Text>
        <View style={{ width: 42 }} />
      </View>

      {step !== 'intro' && (
        <>
          <View style={styles.progressTrack} accessible accessibilityLabel={qIndex >= 0 ? `Question ${qIndex + 1} of ${TOTAL}` : 'All questions answered'}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          {qIndex >= 0 && (
            <View style={styles.metaRow}>
              <Text style={styles.qCounter}>Question {qIndex + 1} of {TOTAL}</Text>
            </View>
          )}
        </>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {step === 'intro' && (
            <View style={styles.card}>
              <View style={styles.introIcon}><Leaf size={28} color="#16a34a" /></View>
              <Text style={styles.title}>Calculate my footprint</Text>
              <Text style={styles.body}>
                Your carbon footprint is the greenhouse gas your daily life adds to the air, measured in kg CO₂e.
                Answer 6 quick questions in your own words — rough guesses are fine.
              </Text>

              <View style={styles.catGrid}>
                {CARBON_CATEGORY_ORDER.map((k) => {
                  const c = CARBON_CATEGORIES[k];
                  return (
                    <View key={k} style={styles.catCell}>
                      <View style={[styles.catTile, { backgroundColor: c.bg }]}><c.Icon size={18} color={c.color} /></View>
                      <Text style={styles.catLabel}>{c.label}</Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.fine}>6 questions · about 3 minutes</Text>
              <Text style={styles.fine}>
                AI only reads your answers. Your footprint is worked out with fixed formulas and standard conversion factors.
              </Text>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(0)} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.primaryBtnText}>Let's start</Text>
              </TouchableOpacity>
            </View>
          )}

          {cat && key && (
            <View style={styles.card}>
              <View style={styles.catChip}>
                <View style={[styles.catTile, { backgroundColor: cat.bg }]}><cat.Icon size={18} color={cat.color} /></View>
                <Text style={[styles.catChipText, { color: cat.color }]}>{cat.label}</Text>
              </View>
              <Text style={styles.question} accessibilityRole="header">{cat.question}</Text>
              <Text style={styles.body}>{cat.support}</Text>

              <TextInput
                key={key}
                style={styles.textarea}
                placeholder={cat.placeholder}
                placeholderTextColor="#94a3b8"
                value={answer}
                onChangeText={(t) => setAnswers((prev) => ({ ...prev, [key]: t }))}
                multiline
                maxLength={500}
                textAlignVertical="top"
                accessibilityLabel={cat.question}
                accessibilityHint="Answer in your own words"
                autoFocus={Platform.OS === 'web'}
              />
              <Text style={styles.hint}>Rough is fine — write it however you like.</Text>

              <TouchableOpacity
                style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
                onPress={qIndex === TOTAL - 1 ? calculate : () => setStep(qIndex + 1)}
                disabled={!canContinue}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canContinue }}
              >
                <Text style={styles.primaryBtnText}>{qIndex === TOTAL - 1 ? 'Calculate my footprint' : 'Continue'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep(qIndex === 0 ? 'intro' : qIndex - 1)} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.ghostBtnText}>Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'calculating' && (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]} accessibilityLiveRegion="polite">
              <ActivityIndicator size="large" color="#16a34a" accessibilityLabel="Calculating" />
              <Text style={[styles.title, { marginTop: 16, textAlign: 'center' }]}>Calculating your footprint…</Text>
              <Text style={[styles.body, { textAlign: 'center' }]}>Reading your answers and applying standard conversion factors.</Text>
            </View>
          )}

          {step === 'result' && result && (
            <View style={[styles.card, { alignItems: 'center' }]}>
              <View style={styles.tick}><CheckCircle2 size={30} color="#16a34a" /></View>
              <Text style={styles.resultLabel}>Your carbon footprint</Text>
              <Text style={styles.resultValue}>{formatKg(result.totalKgPerMonth)}</Text>
              <Text style={styles.resultUnit}>kg CO₂e / month</Text>
              {top && (
                <Text style={[styles.body, { textAlign: 'center', marginTop: 12 }]}>
                  Your biggest source is <Text style={{ fontWeight: '800', color: '#0f172a' }}>{CARBON_CATEGORIES[top.key].label.toLowerCase()}</Text> — {formatKg(top.kgCo2e)} kg.
                </Text>
              )}
              <Text style={styles.fine}>
                Calculated {formatDate(result.createdAt)}{result.factorVersion ? ` · conversion factors v${result.factorVersion}` : ''}
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, { alignSelf: 'stretch' }]}
                onPress={() => { allowLeave.current = true; navigation.replace('CarbonJourney'); }}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>View my journey</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ghostBtn, { alignSelf: 'stretch' }]} onPress={() => { allowLeave.current = true; close(); }} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.ghostBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 280, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: 'white' },
  closeBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },

  progressTrack: { marginHorizontal: 20, height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden', maxWidth: 760, width: '100%', alignSelf: 'center' },
  progressFill: { height: '100%', backgroundColor: '#86efac', borderRadius: 3 },
  metaRow: { paddingHorizontal: 20, marginTop: 10, maxWidth: 800, width: '100%', alignSelf: 'center' },
  qCounter: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },

  scroll: { paddingBottom: 40 },
  card: { marginHorizontal: 16, marginTop: 20, backgroundColor: 'white', borderRadius: 24, padding: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, maxWidth: 600, width: '100%', alignSelf: 'center' },

  introIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: '#bbf7d0' },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  body: { fontSize: 14, color: '#64748b', lineHeight: 21 },
  fine: { fontSize: 12, color: '#94a3b8', marginTop: 12, textAlign: 'center' },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 18, rowGap: 14 },
  catCell: { width: '33.33%', alignItems: 'center', gap: 6 },
  catTile: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },

  catChip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  catChipText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  question: { fontSize: 20, fontWeight: '800', color: '#0f172a', lineHeight: 27, marginBottom: 6 },
  textarea: { minHeight: 120, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 15, color: '#0f172a', backgroundColor: 'white', marginTop: 16 },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 8 },

  primaryBtn: { marginTop: 18, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  primaryBtnDisabled: { backgroundColor: '#9cccb0' },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  ghostBtn: { marginTop: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  ghostBtnText: { color: '#15803d', fontSize: 14.5, fontWeight: '800' },

  tick: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e7f4ec', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  resultLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  resultValue: { fontSize: 44, fontWeight: '900', color: '#0f172a', letterSpacing: -1, marginTop: 4 },
  resultUnit: { fontSize: 13, fontWeight: '600', color: '#64748b' },
});
