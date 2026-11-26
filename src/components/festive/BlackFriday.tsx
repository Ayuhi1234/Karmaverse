import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';
import { ArrowRight } from 'lucide-react-native';
import { BF_GOLD, bfAccent, bfCopy } from '../../utils/blackFriday';
import { useTheme } from '../../theme';


export function BFTicker({ style }: { style?: object }) {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!w) return;
    x.setValue(0);
    const loop = Animated.loop(Animated.timing(x, { toValue: -w, duration: w * 28, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [w, x]);
  const row = (key: string, onLayout?: (e: any) => void) => (
    <View key={key} style={s.tickRow} onLayout={onLayout}>
      {bfCopy().ticker.map((t) => (
        <Text key={t} style={s.tickText}>{t.toUpperCase()}<Text style={s.tickSep}>   /   </Text></Text>
      ))}
    </View>
  );
  return (
    <View style={[s.ticker, { backgroundColor: bfAccent() }, style]} accessibilityLabel={bfCopy().ticker.join(', ')}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
        {row('a', (e) => setW(e.nativeEvent.layout.width))}
        {row('b')}
        {row('c')}
      </Animated.View>
    </View>
  );
}

function useLoop(duration: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduce) => {
      if (!alive || reduce) return;
      loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
      loop.start();
    });
    return () => { alive = false; loop?.stop(); };
  }, [v, duration]);
  return v;
}


// Two rows of large, faint "BLACK FRIDAY" drifting in opposite directions behind header content.
export function BFHeaderWatermark() {
  const t = useLoop(30000);
  const [w, setW] = useState(0);
  const row = (key: string, top: any, dir: 1 | -1) => (
    <Animated.View key={key} style={[s.wmRow, { top, transform: [{ translateX: w ? t.interpolate({ inputRange: [0, 1], outputRange: dir === 1 ? [0, -w] : [-w, 0] }) : 0 }] }]}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Text key={i} numberOfLines={1} style={s.wmText} onLayout={i === 0 && key === 'a' ? (e) => setW(e.nativeEvent.layout.width) : undefined}>{bfCopy().watermark}</Text>
      ))}
    </Animated.View>
  );
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} aria-hidden>
      {row('a', '6%', 1)}
      {row('b', '52%', -1)}
    </View>
  );
}

// Circular text that turns slowly around a fixed centre, like a spinning stamp.
export function BFSpinRing({ size, text, color, fontSize, children }: { size: number; text: string; color: string; fontSize: number; children?: React.ReactNode }) {
  const t = useLoop(16000);
  const id = useMemo(() => 'bfring' + Math.random().toString(36).slice(2, 8), []);
  const r = size / 2 - fontSize * 0.95;
  const c = size / 2;
  const d = `M ${c},${c} m -${r},0 a ${r},${r} 0 1,1 ${2 * r},0 a ${r},${r} 0 1,1 -${2 * r},0`;
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
        <Svg width={size} height={size}>
          <Defs><Path id={id} d={d} /></Defs>
          <SvgText fill={color} fontSize={fontSize} fontWeight="900" letterSpacing={fontSize * 0.18}>
            <TextPath href={`#${id}`}>{text}</TextPath>
          </SvgText>
        </Svg>
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
    </View>
  );
}

export function BFHeroBadge() {
  return (
    <View style={[s.heroBadge, { borderColor: bfAccent(), shadowColor: bfAccent() }]}>
      <BFSpinRing size={250} fontSize={15} color={bfAccent()} text={bfCopy().badgeRing}>
        <View style={s.heroBadgeCore}>
          <Text style={[s.heroBadgeBig, { color: bfAccent() }]}>2X</Text>
          <Text style={s.heroBadgeCoins}>KarmaCoins</Text>
          <Text style={s.heroBadgeSub}>{bfCopy().badgeSub}</Text>
        </View>
      </BFSpinRing>
    </View>
  );
}

export function BF2x({ label = '2X', style, dark }: { label?: string; style?: object; dark?: boolean }) {
  return (
    <View style={[s.chip, { backgroundColor: bfAccent() }, dark && { backgroundColor: '#000' }, style]}>
      <Text style={[s.chipText, dark && { color: bfAccent() }]}>{label}</Text>
    </View>
  );
}

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' });
const RECEIPT_BARS = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 1, 3, 2, 1, 3, 1, 1, 2, 1, 4, 1, 2];

function Perforation({ edge, bg, wide }: { edge: 'top' | 'bottom'; bg: string; wide?: boolean }) {
  return (
    <View style={[s.perf, edge === 'top' ? { top: -5 } : { bottom: -5 }, wide && { justifyContent: 'flex-start', gap: 4 }]} pointerEvents="none">
      {Array.from({ length: wide ? 150 : 40 }).map((_, i) => <View key={i} style={[s.perfDot, { backgroundColor: bg }]} />)}
    </View>
  );
}

function ReceiptLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={s.rLine}>
      <Text style={[s.rText, strong && s.rStrong]}>{label}</Text>
      <Text style={s.rDots} numberOfLines={1} ellipsizeMode="clip">{' .'.repeat(140)}</Text>
      <Text style={[s.rText, strong && s.rStrong]}>{value}</Text>
    </View>
  );
}

// Home banner: a Black Friday receipt turned around. Things go out, nothing is spent, and the
// coins come in double. Kept short so it shows in full below the Home header without scrolling.
export function BFHomeBanner({ onPress, wide }: { onPress: () => void; wide?: boolean }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`${bfCopy().receiptTitle}. Old stuff out, pickup free, you spend nothing, 2X KarmaCoins. Schedule pickup`}
      style={[s.receiptWrap, wide && { maxWidth: '100%' }]}>
      <View style={[s.receipt, wide && { paddingHorizontal: 22, transform: [{ rotate: '-0.3deg' }] }]}>
        <Perforation edge="top" bg={colors.bg} wide={wide} />
        <View style={s.rHead}>
          <Text style={s.rBrand}>{bfCopy().receiptTitle}</Text>
          <Text style={s.rDate}>{bfCopy().receiptDate}</Text>
        </View>
        <View style={s.rRule} />
        <View style={s.rBody}>
          <View style={{ flex: 1, gap: 3 }}>
            <ReceiptLine label="Old stuff" value="OUT" />
            <ReceiptLine label="Pickup" value="FREE" />
            <ReceiptLine label="You spend" value="₹0" strong />
          </View>
          <View style={s.stamp}>
            <BFSpinRing size={74} fontSize={7.6} color="#15803d" text={bfCopy().stampRing}>
              <View style={s.stampInner}>
                <Text style={s.stampBig}>2X</Text>
              </View>
            </BFSpinRing>
          </View>
        </View>
        <View style={s.rFoot}>
          <View style={s.rBars}>{RECEIPT_BARS.map((w, i) => <View key={i} style={{ width: w, backgroundColor: i % 2 ? 'transparent' : '#1b1b1b' }} />)}</View>
          <View style={s.rBtn}>
            <Text style={s.rBtnText}>Schedule pickup</Text>
            <ArrowRight size={14} color="#ffffff" />
          </View>
        </View>
        <Perforation edge="bottom" bg={colors.bg} wide={wide} />
      </View>
    </TouchableOpacity>
  );
}

export function BFStrip({ text }: { text: string }) {
  return (
    <View style={[s.strip, { backgroundColor: bfAccent() }]}>
      <BF2x dark />
      <Text style={s.stripText}>{text}</Text>
    </View>
  );
}

export const bfHeaderEdge = { borderBottomWidth: 2, get borderColor() { return bfAccent(); }, overflow: 'hidden' as const };

// For screens whose header sits on the page background: a full-width black band, and
// translucent icon buttons that read on it.
export const bfPlainHeader = { ...bfHeaderEdge, get borderColor() { return bfAccent(); }, backgroundColor: '#000000', maxWidth: '100%' as const };
export const bfGhostBtn = { backgroundColor: 'rgba(255,255,255,0.14)', elevation: 0 };

const s = StyleSheet.create({
  ticker: { backgroundColor: BF_GOLD, borderRadius: 3, overflow: 'hidden', paddingVertical: 6, marginTop: 14, transform: [{ rotate: '-1deg' }], borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.18)' },
  tickRow: { flexDirection: 'row', paddingLeft: 14 },
  tickText: { color: '#111', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  tickSep: { color: 'rgba(0,0,0,0.4)' },
  chip: { backgroundColor: BF_GOLD, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  chipText: { color: '#111', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  receiptWrap: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingVertical: 2 },
  receipt: { backgroundColor: '#fbf8f1', borderRadius: 4, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 10, transform: [{ rotate: '-0.8deg' }], shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  perf: { position: 'absolute', left: 0, right: 0, height: 10, flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden' },
  perfDot: { width: 10, height: 10, borderRadius: 5 },
  rHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rBrand: { fontFamily: MONO, fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: '#1b1b1b' },
  rDate: { fontFamily: MONO, fontSize: 10, fontWeight: '700', color: '#6b6b6b' },
  rRule: { height: 1, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: '#b9b2a3', marginTop: 6, marginBottom: 4 },
  rBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rLine: { flexDirection: 'row', alignItems: 'flex-end' },
  rText: { fontFamily: MONO, fontSize: 12, fontWeight: '700', color: '#1b1b1b' },
  rStrong: { fontSize: 13, fontWeight: '900' },
  rDots: { flex: 1, fontFamily: MONO, fontSize: 12, color: '#b9b2a3', marginHorizontal: 4, overflow: 'hidden' },
  stamp: { width: 80, height: 80, borderRadius: 40, borderWidth: 2.5, borderColor: '#15803d', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }], opacity: 0.94 },
  stampInner: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#15803d', alignItems: 'center', justifyContent: 'center' },
  stampBig: { fontSize: 20, lineHeight: 22, fontWeight: '900', color: '#15803d', letterSpacing: -1 },
  rFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 12 },
  rBars: { flexDirection: 'row', height: 26, gap: 1.5, overflow: 'hidden', flexShrink: 1 },
  rBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111111', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  rBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
  wmRow: { position: 'absolute', left: 0, flexDirection: 'row' },
  wmText: { fontSize: 64, lineHeight: 70, fontWeight: '900', letterSpacing: -1, color: 'rgba(255,255,255,0.055)', flexShrink: 0, ...(Platform.OS === 'web' ? ({ whiteSpace: 'pre' } as any) : null) },
  heroBadge: { width: 270, height: 270, borderRadius: 135, backgroundColor: '#050505', borderWidth: 1.5, borderColor: 'rgba(245,197,66,0.55)', alignItems: 'center', justifyContent: 'center', shadowColor: BF_GOLD, shadowOpacity: 0.35, shadowRadius: 40, shadowOffset: { width: 0, height: 0 } },
  heroBadgeCore: { alignItems: 'center' },
  heroBadgeBig: { fontSize: 86, lineHeight: 88, fontWeight: '900', letterSpacing: -5, color: BF_GOLD },
  heroBadgeCoins: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginTop: -4 },
  heroBadgeSub: { fontSize: 12, fontWeight: '700', color: '#4ade80' },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BF_GOLD, paddingHorizontal: 20, paddingVertical: 9 },
  stripText: { color: '#111', fontWeight: '800', fontSize: 12.5, flex: 1 },
});
