import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { registerAlertHandler, AlertPayload } from '../../utils/alert';

// Renders showAlert() calls as an in-app modal on web (instead of the browser's
// native window.alert). Mounted once at the app root. Native keeps Alert.alert.
export function AlertHost() {
  const [payload, setPayload] = useState<AlertPayload | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    registerAlertHandler((p) => setPayload(p));
    return () => registerAlertHandler(null);
  }, []);

  const close = () => setPayload(null);
  const buttons = payload?.buttons && payload.buttons.length ? payload.buttons : [{ text: 'OK' }];

  return (
    <Modal visible={!!payload} transparent animationType="fade" onRequestClose={close}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.header}>
            <Text style={s.title}>{payload?.title}</Text>
            <TouchableOpacity onPress={close} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          {!!payload?.message && <Text style={s.message}>{payload.message}</Text>}
          <View style={s.btnRow}>
            {buttons.map((b, i) => {
              const danger = b.style === 'destructive';
              const cancel = b.style === 'cancel';
              return (
                <TouchableOpacity
                  key={i}
                  style={[s.btn, cancel && s.btnCancel, danger && s.btnDanger]}
                  onPress={() => { close(); b.onPress?.(); }}
                  activeOpacity={0.85}
                >
                  <Text style={[s.btnText, cancel && s.btnTextCancel, danger && s.btnTextDanger]}>{b.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 22, width: '100%', maxWidth: 420, shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 32, elevation: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: '#0f172a' },
  message: { fontSize: 14, color: '#475569', fontWeight: '500', lineHeight: 21, marginBottom: 18 },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  btn: { backgroundColor: '#16a34a', borderRadius: 12, paddingHorizontal: 22, paddingVertical: 11 },
  btnCancel: { backgroundColor: '#f1f5f9' },
  btnDanger: { backgroundColor: '#dc2626' },
  btnText: { color: 'white', fontSize: 14, fontWeight: '800' },
  btnTextCancel: { color: '#475569' },
  btnTextDanger: { color: 'white' },
});
