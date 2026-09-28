import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Leaf, Info, History, ChevronLeft, ChevronRight, Clock, X, Target, Sprout, Bus, Utensils, Zap, Recycle, Bike,
  Lightbulb, Cloud, Plus,
} from 'lucide-react-native';
import { WebFooter } from '../components/shared/WebFooter';
import { carbonService, CarbonSummary, CarbonActivity, CarbonCategoryKey, LoggableActivity } from '../services/carbon';
import { showAlert } from '../utils/alert';
import { CARBON_LEVELS, carbonLevelFor, formatKg } from '../utils/carbonLevels';

// One entry per breakdown category — the fixed display order of the section.
const CATEGORIES: Record<CarbonCategoryKey, { label: string; Icon: typeof Leaf; color: string; bg: string; direction: 'save' | 'emit' }> = {
  transport: { label: 'Transport', Icon: Bus, color: '#0ea5e9', bg: '#f0f9ff', direction: 'emit' },
  food: { label: 'Food', Icon: Utensils, color: '#d97706', bg: '#fffbeb', direction: 'emit' },
  energy: { label: 'Energy', Icon: Zap, color: '#7c3aed', bg: '#f5f3ff', direction: 'emit' },
  waste: { label: 'Waste recycled', Icon: Recycle, color: '#16a34a', bg: '#f0fdf4', direction: 'save' },
};
const CATEGORY_ORDER: CarbonCategoryKey[] = ['transport', 'food', 'energy', 'waste'];

// Fallback tip for the biggest emitting category, used when the backend sends none.
const TIPS: Partial<Record<CarbonCategoryKey, { title: string; body: string }>> = {
  transport: { title: 'Transport is your biggest source', body: 'Try the metro or bus twice this week and log it here.' },
  food: { title: 'Food is your biggest source', body: 'Swap in one more plant-based meal this week.' },
  energy: { title: 'Energy is your biggest source', body: 'Set the AC to 24 °C or higher and switch appliances off at the plug.' },
};

const LOG_OPTIONS: { type: LoggableActivity; title: string; meta: string; Icon: typeof Leaf; color: string; bg: string }[] = [
  { type: 'public_transport', title: 'Took public transport', meta: 'Metro, bus or shared auto instead of driving', Icon: Bus, color: '#0ea5e9', bg: '#f0f9ff' },
  { type: 'cycle_walk', title: 'Walked or cycled', meta: 'A short trip without a vehicle', Icon: Bike, color: '#16a34a', bg: '#f0fdf4' },
  { type: 'plant_based_meal', title: 'Had a plant-based meal', meta: 'Dal, sabzi, salad — no meat', Icon: Utensils, color: '#d97706', bg: '#fffbeb' },
  { type: 'energy_saving', title: 'Saved energy at home', meta: 'AC at 24 °C+, lights and plugs off', Icon: Zap, color: '#7c3aed', bg: '#f5f3ff' },
];

const GOAL_OPTIONS = [5, 10, 20];

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export function CarbonFootprintScreen({ navigation }: any) {
  const [summary, setSummary] = useState<CarbonSummary | null>(null);
  const [activities, setActivities] = useState<CarbonActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [logging, setLogging] = useState<LoggableActivity | null>(null);
  const [savingGoal, setSavingGoal] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const activityY = useRef(0);

  const fetchData = async () => {
    try {
      const [summaryData, activityData] = await Promise.all([
        carbonService.getSummary().catch(() => null),
        carbonService.getActivities().catch(() => [] as CarbonActivity[]),
      ]);
      setSummary(summaryData);
      setActivities(Array.isArray(activityData) ? activityData : []);
    } catch (error) {
      console.error('Carbon fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchData);
    fetchData();
    return unsubscribe;
  }, [navigation]);

  const totalSaved = summary?.totalSavedKg ?? 0;
  const monthSaved = summary?.monthSavedKg ?? 0;
  const monthEmitted = summary?.monthEmittedKg ?? 0;
  const net = monthSaved - monthEmitted;
  const level = carbonLevelFor(totalSaved, summary?.level);
  const nextLevel = CARBON_LEVELS.find((l) => l.level === level.level + 1);

  // Breakdown rows in fixed order; a category the backend omits shows as 0 kg.
  const rows = CATEGORY_ORDER.map((key) => {
    const found = summary?.categories?.find((c) => c.key === key);
    return {
      key,
      ...CATEGORIES[key],
      kg: found?.kgCo2e ?? 0,
      direction: found?.direction ?? CATEGORIES[key].direction,
      meta: found?.meta,
    };
  });
  const maxKg = Math.max(...rows.map((r) => r.kg), 0);
  const topEmitter = rows
    .filter((r) => r.direction === 'emit' && r.kg > 0)
    .sort((a, b) => b.kg - a.kg)[0];
  const tip = summary?.tip ?? (topEmitter ? TIPS[topEmitter.key] : undefined);
  const hasBreakdown = rows.some((r) => r.kg > 0);

  const handleLog = async (type: LoggableActivity) => {
    if (logging) return;
    setLogging(type);
    try {
      await carbonService.logActivity(type);
      setLogModalVisible(false);
      showAlert('Activity logged', 'Nice one! Your CO₂ savings are updated.');
      await fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      showAlert("Couldn't log activity", msg || 'Please try again.');
    } finally {
      setLogging(null);
    }
  };

  const handleGoal = async (percent: number) => {
    if (savingGoal !== null) return;
    setSavingGoal(percent);
    try {
      await carbonService.setGoal(percent);
      setGoalModalVisible(false);
      showAlert('Goal set', `We'll help you cut this month's footprint by ${percent}%.`);
      await fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      showAlert("Couldn't set goal", msg || 'Please try again.');
    } finally {
      setSavingGoal(null);
    }
  };

  const goSchedulePickup = () => {
    setLogModalVisible(false);
    navigation.navigate('SchedulePickup');
  };

  const scrollToActivity = () => scrollRef.current?.scrollTo({ y: activityY.current, animated: true });

  return (
    <View style={{ flex: 1, backgroundColor: '#f0fdf6' }}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 0 : 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — same gradient, padding and radius as Wallet / Dashboard */}
        <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App'))}
                activeOpacity={0.8}
                accessibilityLabel="Go back"
              >
                <ChevronLeft size={22} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={2}>My carbon footprint</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setLevelModalVisible(true)} activeOpacity={0.8} accessibilityLabel="About levels">
                <Info size={18} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={scrollToActivity} activeOpacity={0.8} accessibilityLabel="Recent activity">
                <History size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Glass card */}
          <View style={styles.heroCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>CO₂ saved</Text>
              <TouchableOpacity style={styles.levelPill} onPress={() => setLevelModalVisible(true)} activeOpacity={0.8}>
                <View style={[styles.levelDot, { backgroundColor: level.color }]} />
                <Text style={styles.levelText}>{level.name} · Level {level.level}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bigRow}>
              <Leaf size={40} color="#86efac" />
              <View>
                <Text style={styles.bigValue}>{formatKg(totalSaved)}</Text>
                <Text style={styles.unitTag} numberOfLines={1}>kg CO₂e</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.colsRow}>
              <View style={styles.col}>
                <View style={styles.colLabelRow}>
                  <Leaf size={13} color="#86efac" />
                  <Text style={styles.colLabel}>Saved this month</Text>
                </View>
                <Text style={styles.colValue}>{formatKg(monthSaved)} kg</Text>
                <Text style={styles.colSub}>
                  {(summary?.monthActions ?? 0).toLocaleString()} green {summary?.monthActions === 1 ? 'action' : 'actions'}
                </Text>
              </View>
              <View style={styles.colDivider} />
              <View style={styles.col}>
                <View style={styles.colLabelRow}>
                  <Cloud size={13} color="#fcd34d" />
                  <Text style={styles.colLabel}>Emitted this month</Text>
                </View>
                <Text style={styles.colValue}>{formatKg(monthEmitted)} kg</Text>
                <Text style={styles.colSub}>
                  {net >= 0 ? `Net saving ${formatKg(net)} kg` : `Net ${formatKg(-net)} kg emitted`}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Tip banner — backend tip, else a tip for the biggest emitting category */}
        {!isLoading && tip && (
          <View style={styles.tipBanner}>
            <Lightbulb size={20} color="#0ea5e9" />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipText}>{tip.body}</Text>
            </View>
            <TouchableOpacity style={styles.tipBtn} onPress={() => setLogModalVisible(true)} activeOpacity={0.8}>
              <Text style={styles.tipBtnText}>Log it</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={() => setLogModalVisible(true)} activeOpacity={0.8}>
            <Plus size={18} color="#16a34a" />
            <Text style={[styles.actionLabel, { color: '#16a34a' }]} numberOfLines={1}>Log activity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAmber]} onPress={() => setGoalModalVisible(true)} activeOpacity={0.8}>
            <Target size={18} color="#d97706" />
            <Text style={[styles.actionLabel, { color: '#d97706' }]} numberOfLines={1}>Set goal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnRed]}
            onPress={() => navigation.navigate('App', { screen: 'Store' })}
            activeOpacity={0.8}
          >
            <Sprout size={18} color="#e11d48" />
            <Text style={[styles.actionLabel, { color: '#e11d48' }]} numberOfLines={1}>Offset</Text>
          </TouchableOpacity>
        </View>

        {/* Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Where it comes from</Text>
          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color="#16a34a" />
              <Text style={{ color: '#64748b', marginTop: 12 }}>Loading…</Text>
            </View>
          ) : !hasBreakdown ? (
            <View style={styles.stateBox}>
              <Leaf size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No footprint data yet.</Text>
              <Text style={styles.emptyHint}>Log an activity to start tracking your CO₂.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {rows.map((r) => {
                const saves = r.direction === 'save';
                const valueColor = saves ? '#16a34a' : r.key === topEmitter?.key ? '#e11d48' : '#d97706';
                const width = maxKg > 0 ? `${Math.max((r.kg / maxKg) * 100, r.kg > 0 ? 4 : 0)}%` : '0%';
                return (
                  <View key={r.key} style={styles.rowCard}>
                    <View style={[styles.iconTile, { backgroundColor: r.bg }]}>
                      <r.Icon size={20} color={r.color} />
                    </View>
                    <View style={styles.rowContent}>
                      <Text style={styles.rowTitle}>{r.label}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: width as any, backgroundColor: r.color }]} />
                      </View>
                      <Text style={styles.rowMeta}>{r.meta || (saves ? 'Saved this month' : 'Emitted this month')}</Text>
                    </View>
                    <Text style={[styles.rowValue, { color: valueColor }]}>
                      {saves && r.kg > 0 ? '-' : ''}{formatKg(r.kg)} kg
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Recent activity */}
        <View style={styles.section} onLayout={(e) => { activityY.current = e.nativeEvent.layout.y; }}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color="#16a34a" />
              <Text style={{ color: '#64748b', marginTop: 12 }}>Loading…</Text>
            </View>
          ) : activities.length === 0 ? (
            <View style={styles.stateBox}>
              <History size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No activity yet.</Text>
              <Text style={styles.emptyHint}>Log a green action to see it here.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {activities.map((a) => {
                const cat = CATEGORIES[a.category] ?? CATEGORIES.waste;
                const saves = a.direction === 'save';
                return (
                  <View key={a._id} style={styles.rowCard}>
                    <View style={[styles.iconTile, { backgroundColor: cat.bg }]}>
                      <cat.Icon size={20} color={cat.color} />
                    </View>
                    <View style={styles.rowContent}>
                      <Text style={styles.rowTitle}>{a.title}</Text>
                      <View style={styles.timeRow}>
                        <Clock size={12} color="#9ca3af" />
                        <Text style={styles.rowMeta}>{formatDate(a.createdAt)}</Text>
                      </View>
                    </View>
                    <Text style={[styles.rowValue, { color: saves ? '#16a34a' : '#e11d48' }]}>
                      {saves ? '-' : '+'}{formatKg(a.kgCo2e)} kg
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>

      {/* Level explainer */}
      <Modal visible={levelModalVisible} transparent animationType="fade" onRequestClose={() => setLevelModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLevelModalVisible(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>Carbon saver levels</Text>
              <TouchableOpacity onPress={() => setLevelModalVisible(false)} activeOpacity={0.8} accessibilityLabel="Close">
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetHint}>
              Every green action you log and every pickup you recycle adds to your CO₂ saved. Save more to level up.
            </Text>
            <View style={{ marginTop: 14 }}>
              {CARBON_LEVELS.map((l) => {
                const active = l.level === level.level;
                return (
                  <View key={l.name} style={[styles.levelRow, active && { backgroundColor: l.bg, borderColor: l.color }]}>
                    <View style={[styles.levelRowDot, { backgroundColor: l.color }]} />
                    <Text style={[styles.levelName, active && { color: l.color }]}>{l.name}</Text>
                    <Text style={styles.levelRange}>{l.range}</Text>
                    <Text style={[styles.levelValue, active && { color: l.color }]}>Lv {l.level}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.levelFooter}>
              {nextLevel
                ? `You've saved ${formatKg(totalSaved)} kg · ${formatKg(Math.max(nextLevel.minKg - totalSaved, 0))} kg to ${nextLevel.name}.`
                : `You've saved ${formatKg(totalSaved)} kg · top level reached!`}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Log activity */}
      <Modal visible={logModalVisible} transparent animationType="fade" onRequestClose={() => setLogModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLogModalVisible(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Log a green activity</Text>
            <Text style={styles.sheetHint}>Pick what you did today. We'll work out the CO₂ you saved.</Text>

            {LOG_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.type}
                style={styles.option}
                onPress={() => handleLog(o.type)}
                activeOpacity={0.8}
                disabled={logging !== null}
              >
                <View style={[styles.optionIcon, { backgroundColor: o.bg }]}><o.Icon size={22} color={o.color} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>{o.title}</Text>
                  <Text style={styles.optionMeta}>{o.meta}</Text>
                </View>
                {logging === o.type ? <ActivityIndicator size="small" color="#16a34a" /> : <ChevronRight size={20} color="#94a3b8" />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.option} onPress={goSchedulePickup} activeOpacity={0.8} disabled={logging !== null}>
              <View style={[styles.optionIcon, { backgroundColor: '#f0fdf4' }]}><Recycle size={22} color="#16a34a" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionName}>Recycled waste</Text>
                <Text style={styles.optionMeta}>Schedule a pickup — it's logged for you</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Set goal */}
      <Modal visible={goalModalVisible} transparent animationType="fade" onRequestClose={() => setGoalModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setGoalModalVisible(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Set a monthly goal</Text>
            <Text style={styles.sheetHint}>Choose how much to cut your footprint this month, compared with last month.</Text>

            {GOAL_OPTIONS.map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.option}
                onPress={() => handleGoal(p)}
                activeOpacity={0.8}
                disabled={savingGoal !== null}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#fffbeb' }]}><Target size={22} color="#d97706" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>Cut {p}%</Text>
                  <Text style={styles.optionMeta}>{p === 5 ? 'A gentle start' : p === 10 ? 'A steady push' : 'A big stretch'}</Text>
                </View>
                {savingGoal === p ? <ActivityIndicator size="small" color="#d97706" /> : <ChevronRight size={20} color="#94a3b8" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf6' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, maxWidth: 800, width: '100%', alignSelf: 'center', gap: 10 },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headerTitle: { fontSize: 26, lineHeight: 30, fontWeight: '900', color: 'white', flexShrink: 1 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  heroCard: {
    borderRadius: 24, padding: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    maxWidth: 800, width: '100%', alignSelf: 'center',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  levelPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 6 },
  levelDot: { width: 7, height: 7, borderRadius: 4 },
  levelText: { color: 'white', fontSize: 11, fontWeight: '800' },
  bigRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigValue: { fontSize: 44, fontWeight: '900', color: 'white', letterSpacing: -1 },
  unitTag: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 0.3, marginTop: -2, flexShrink: 0 },
  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 16 },

  colsRow: { flexDirection: 'row', alignItems: 'stretch' },
  col: { flex: 1 },
  colDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 14 },
  colLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  colLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  colValue: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  colSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600', marginTop: 4 },

  tipBanner: {
    marginTop: 16, marginHorizontal: 16, padding: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd',
    maxWidth: 800, width: '100%', alignSelf: 'center',
  },
  tipTitle: { color: '#0369a1', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  tipText: { color: '#0c4a6e', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  tipBtn: { backgroundColor: '#0ea5e9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, minWidth: 76, alignItems: 'center' },
  tipBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },

  actionRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 100, borderWidth: 1.5, backgroundColor: 'white' },
  actionBtnGreen: { borderColor: '#86efac' },
  actionBtnAmber: { borderColor: '#fcd34d' },
  actionBtnRed: { borderColor: '#fda4af' },
  actionLabel: { fontWeight: '800', fontSize: 13, flexShrink: 1 },

  section: { paddingHorizontal: 16, marginTop: 28, maxWidth: 800, width: '100%', alignSelf: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  stateBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { color: '#94a3b8', marginTop: 12, fontWeight: '600' },
  emptyHint: { color: '#cbd5e1', fontSize: 12, marginTop: 4 },

  list: { gap: 10, marginBottom: 4 },
  rowCard: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  iconTile: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1, marginLeft: 12, marginRight: 10 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 3 },
  rowMeta: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  rowValue: { fontSize: 15, fontWeight: '900' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#f1f5f9', marginTop: 3, marginBottom: 5, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },

  // Modals — web: centred dialog; native: bottom sheet (same as Wallet)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: 'center', padding: Platform.OS === 'web' ? 20 : 0 },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    padding: 22, paddingBottom: Platform.OS === 'web' ? 22 : 34,
    maxWidth: 560, width: '100%', alignSelf: 'center',
  },
  sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 16 },
  sheetTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  sheetHint: { fontSize: 12.5, color: '#64748b', fontWeight: '600', lineHeight: 18, marginTop: 6 },

  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', backgroundColor: '#fbfdff', marginTop: 12 },
  optionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionName: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  optionMeta: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  levelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', gap: 10 },
  levelRowDot: { width: 9, height: 9, borderRadius: 5 },
  levelName: { fontSize: 14, fontWeight: '800', color: '#0f172a', width: 78 },
  levelRange: { fontSize: 12, color: '#94a3b8', fontWeight: '600', flex: 1 },
  levelValue: { fontSize: 14, fontWeight: '900', color: '#334155' },
  levelFooter: { fontSize: 12.5, color: '#15803d', fontWeight: '700', marginTop: 14, textAlign: 'center' },
});
