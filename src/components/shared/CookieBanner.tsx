import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useTheme, makeStyles } from '../../theme';
import { navigationRef } from '../../navigation/navRef';
import {
  CookieChoice, currentCookieChoice, setCookieChoice, onOpenCookieSettings,
} from '../../utils/cookieConsent';

// Portalled to <body> (like AlertHost) so it sits above RNW <Modal> popups such as
// the Early Bird welcome, instead of being dimmed behind them.
let createPortal: ((node: React.ReactNode, container: Element) => any) | null = null;
if (Platform.OS === 'web') {
  try { createPortal = require('react-dom').createPortal; } catch (_) { /* no-op */ }
}

// Website-only cookie banner (KAR-296). Shown until the visitor chooses, and again
// from any "Cookie settings" link. Analytics cookies load only after "Accept analytics".
export function CookieBanner() {
  const s = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [choice, setChoice] = useState<CookieChoice | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const saved = currentCookieChoice();
    setChoice(saved);
    setVisible(!saved);
    return onOpenCookieSettings(() => {
      setChoice(currentCookieChoice());
      setVisible(true);
    });
  }, []);

  if (Platform.OS !== 'web' || !visible) return null;

  const choose = (c: CookieChoice) => {
    setCookieChoice(c);
    setChoice(c);
    setVisible(false);
  };
  const narrow = width < 640;
  const privacy = (
    <Text style={s.link} onPress={() => navigationRef.current?.navigate('Legal', { type: 'privacy' })}>
      Privacy policy
    </Text>
  );

  const banner = (
    <View style={[s.wrap, narrow && s.wrapNarrow]} accessibilityRole="alert" accessibilityLabel="Cookie settings">
      <View style={[s.card, narrow && s.cardNarrow]}>
        <View style={s.textCol}>
          <Text style={s.title}>Cookies on KarmaVerse</Text>
          {narrow ? (
            <Text style={s.body}>
              Necessary cookies keep you signed in. Analytics cookies (Google Analytics) only if you allow. {privacy}
            </Text>
          ) : (
            <Text style={s.body}>
              We use necessary cookies to keep you signed in. With your permission, we also use analytics
              cookies (Google Analytics) to see how the website is used. No advertising cookies. You can
              change this anytime from "Cookie settings" at the bottom of the page. {privacy}
            </Text>
          )}
          {!!choice && (
            <Text style={s.current}>
              Current choice: {choice === 'granted' ? 'analytics allowed' : 'only necessary cookies'}
            </Text>
          )}
        </View>
        <View style={s.btnRow}>
          <TouchableOpacity style={[s.btn, s.btnGhost, narrow && s.btnHalf]} onPress={() => choose('denied')} activeOpacity={0.85}>
            <Text style={[s.btnText, { color: colors.text }]}>Only necessary</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnPrimary, narrow && s.btnHalf]} onPress={() => choose('granted')} activeOpacity={0.85}>
            <Text style={[s.btnText, { color: '#ffffff' }]}>Accept analytics</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return createPortal && typeof document !== 'undefined' ? createPortal(banner, document.body) : banner;
}

const useStyles = makeStyles((c) => ({
  // Above RNW modals; AlertHost (2147483647) still sits above this.
  wrap: { position: 'fixed' as any, left: 0, right: 0, bottom: 0, zIndex: 2147483000, padding: 16, alignItems: 'center' },
  wrapNarrow: { padding: 10 },
  card: {
    width: '100%', maxWidth: 880, backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border,
    padding: 18, flexDirection: 'row', alignItems: 'center', gap: 18,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  cardNarrow: { flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: 14 },
  textCol: { flex: 1, gap: 6 },
  title: { fontSize: 15, fontWeight: '800', color: c.text },
  body: { fontSize: 13, lineHeight: 19, color: c.textMuted },
  link: { color: c.primary, fontWeight: '700', textDecorationLine: 'underline' },
  current: { fontSize: 12, color: c.textFaint, marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 10 },

  btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnHalf: { flex: 1, paddingHorizontal: 8 },
  btnGhost: { borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface },
  btnPrimary: { backgroundColor: '#15803d' },
  btnText: { fontSize: 14, fontWeight: '800' },
}));
