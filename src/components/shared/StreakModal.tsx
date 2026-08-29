import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Check } from 'lucide-react-native';
import { StatModal } from './StatModal';

const MILESTONES = [3, 7, 14, 30, 60, 100];
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Celebration popup for the Day streak card. Shows the current streak, this
// week's activity (last N consecutive days lit, derived from the streak count),
// progress to the next milestone and how to keep the streak alive.
export function StreakModal({ visible, onClose, streak }: { visible: boolean; onClose: () => void; streak: number; }) {
  const next = MILESTONES.find(m => m > streak) ?? null;
  const prev = [...MILESTONES].reverse().find(m => m <= streak) ?? 0;
  const progress = next ? Math.max(0, Math.min(1, (streak - prev) / (next - prev))) : 1;
  const daysToNext = next ? next - streak : 0;

  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const offset = 6 - i;
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    return { label: WD[d.getDay()], active: offset < streak, isToday: offset === 0 };
  });

  return (
    <StatModal visible={visible} onClose={onClose} title="Your streak">
      <LinearGradient colors={['#fb923c', '#f97316', '#ea580c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={s.heroGlow} pointerEvents="none" />
        <View style={s.flameCircle}><Flame size={28} color="#fff" fill="#fde68a" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.streakNum}>{streak} {streak === 1 ? 'day' : 'days'}</Text>
          <Text style={s.streakSub}>{streak > 0 ? 'Keep the fire going!' : 'Start your streak today 🔥'}</Text>
        </View>
      </LinearGradient>

      <View style={s.weekRow}>
        {week.map((d, i) => (
          <View key={i} style={s.weekCol}>
            <View style={[s.dot, d.active ? s.dotActive : s.dotIdle, d.isToday && s.dotToday]}>
              {d.active && <Flame size={14} color="#fff" fill="#fff" />}
            </View>
            <Text style={s.weekLabel}>{d.label}</Text>
          </View>
        ))}
      </View>

      {next ? (
        <View style={s.progressWrap}>
          <View style={s.progressHead}>
            <Text style={s.progressText}>{daysToNext} more {daysToNext === 1 ? 'day' : 'days'} to your {next}-day badge</Text>
            <Text style={s.progressGoal}>{streak}/{next}</Text>
          </View>
          <View style={s.track}>
            <LinearGradient colors={['#fbbf24', '#f97316']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.fill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      ) : (
        <Text style={s.maxed}>🏆 Legendary! You've hit the top streak milestone.</Text>
      )}

      <View style={s.chips}>
        {MILESTONES.map(m => {
          const done = streak >= m;
          return (
            <View key={m} style={[s.chip, done && s.chipDone]}>
              {done && <Check size={11} color="#ea580c" strokeWidth={3} />}
              <Text style={[s.chipText, done && s.chipTextDone]}>{m}d</Text>
            </View>
          );
        })}
      </View>

      <Text style={s.tip}>Open the app daily and do one green action — schedule a pickup or play the eco quiz — to keep your streak alive.</Text>
    </StatModal>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 18, marginBottom: 18, overflow: 'hidden' },
  heroGlow: { position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.18)' },
  flameCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  streakNum: { fontSize: 26, fontWeight: '900', color: '#ffffff', letterSpacing: -0.5 },
  streakSub: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.92)', marginTop: 2 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  weekCol: { alignItems: 'center', gap: 6 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: '#fb923c' },
  dotIdle: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  dotToday: { borderWidth: 2, borderColor: '#ea580c' },
  weekLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  progressWrap: { marginBottom: 16 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressText: { fontSize: 12.5, fontWeight: '700', color: '#ea580c', flex: 1 },
  progressGoal: { fontSize: 12.5, fontWeight: '800', color: '#94a3b8' },
  track: { height: 8, borderRadius: 4, backgroundColor: '#fff2e6', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  maxed: { fontSize: 13, fontWeight: '700', color: '#16a34a', marginBottom: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9' },
  chipDone: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74' },
  chipText: { fontSize: 12, fontWeight: '800', color: '#94a3b8' },
  chipTextDone: { color: '#ea580c' },
  tip: { fontSize: 12, fontWeight: '500', color: '#64748b', lineHeight: 18 },
});
