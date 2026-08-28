import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Pressable } from 'react-native';
import { X } from 'lucide-react-native';

// Reusable branded, centered popup used by the dashboard stat cards (quiz
// calendar, streak). Fades + scales in, closes on X or tapping the backdrop.
export function StatModal({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title?: string; children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[s.cardWrap, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}
        >
          <View style={s.card}>
            <View style={s.header}>
              <Text style={s.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  cardWrap: { width: '100%', maxWidth: 380 },
  card: { backgroundColor: 'white', borderRadius: 22, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 32, elevation: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { flex: 1, fontSize: 18, fontWeight: '900', color: '#0f172a' },
});
