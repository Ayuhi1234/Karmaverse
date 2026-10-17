import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { Avatar, AVATAR_IDS, PERSON_AVATAR_IDS } from './Avatar';
import { useTheme, makeStyles } from '../../theme';

// Lets the user pick a profile avatar — the illustrated people first, then the
// eco-creatures. Selection is immediate: tapping an avatar calls onSelect and
// closes. The current pick is highlighted with a green ring.
export function AvatarPickerModal({ visible, currentId, onSelect, onClose }: {
  visible: boolean;
  currentId?: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const pick = (id: string) => {
    onSelect(id);
    onClose();
  };

  const Grid = ({ ids }: { ids: readonly string[] }) => (
    <View style={styles.grid}>
      {ids.map((id) => {
        const active = id === currentId;
        return (
          <TouchableOpacity key={id} onPress={() => pick(id)} activeOpacity={0.8} style={[styles.cell, active && styles.cellActive]}>
            <Avatar avatarId={id} size={62} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>Choose your avatar</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
            <Text style={styles.section}>People</Text>
            <Grid ids={PERSON_AVATAR_IDS} />

            <Text style={styles.section}>Eco characters</Text>
            <Grid ids={AVATAR_IDS} />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: 'center', padding: Platform.OS === 'web' ? 20 : 0 },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    padding: 22, paddingBottom: Platform.OS === 'web' ? 22 : 34,
    maxWidth: 520, width: '100%', alignSelf: 'center',
  },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.border, alignSelf: 'center', marginBottom: 14 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '900', color: c.text },
  section: { fontSize: 13, fontWeight: '800', color: c.textMuted, marginTop: 14, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { borderRadius: 40, padding: 3, borderWidth: 3, borderColor: 'transparent' },
  cellActive: { borderColor: '#16a34a', backgroundColor: c.primarySoft },
}));
