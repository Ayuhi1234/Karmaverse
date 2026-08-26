import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BellOff, X } from 'lucide-react-native';
import { useNotifications } from '../../context/NotificationContext';

// Slim, dismissible nudge shown on the dashboard when OS notifications are off.
// Dismiss hides it for a week; the permanent home for turning them on is Profile.
const DISMISS_KEY = 'notifPermBannerDismissedAt';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export default function NotificationPermissionBanner() {
  const { pushEnabled, enablePush } = useNotifications();
  // Start hidden until we've read the cooldown, so it never flashes on mount.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(DISMISS_KEY)
      .then(v => {
        if (!active) return;
        const at = v ? parseInt(v, 10) : 0;
        setDismissed(!!at && Date.now() - at < COOLDOWN_MS);
      })
      .catch(() => { if (active) setDismissed(false); });
    return () => { active = false; };
  }, []);

  // Only when we know push is off (null = unknown / not supported → stay hidden).
  if (pushEnabled !== false || dismissed) return null;

  const onDismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISS_KEY, String(Date.now())).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <BellOff size={18} color="#15803d" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Notifications are off</Text>
        <Text style={styles.sub}>Turn them on to get pickup and rewards updates.</Text>
      </View>
      <TouchableOpacity style={styles.cta} onPress={enablePush} activeOpacity={0.85}>
        <Text style={styles.ctaText}>Turn on</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.close} onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={15} color="#94a3b8" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dcfce7',
    shadowColor: '#052e16',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 13.5, fontWeight: '700', color: '#0f172a' },
  sub: { fontSize: 11.5, fontWeight: '500', color: '#64748b', marginTop: 1 },
  cta: { backgroundColor: '#15803d', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  ctaText: { color: '#ffffff', fontSize: 12.5, fontWeight: '700' },
  close: { padding: 2 },
});
