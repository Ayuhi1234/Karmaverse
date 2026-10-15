import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { X, Play, MessageCircle, ChevronDown } from 'lucide-react-native';
import { useTheme, makeStyles } from '../../theme';
import { EarthBuddy } from '../carbon/EarthBuddy';
import { supportVideoList, SUPPORT_CATEGORY_LABELS } from '../../services/support';
import { navigationRef } from '../../navigation/navRef';
// Floating Earth Buddy button over the main tabs. Tapping it opens "Video help":
// the ready-made FAQ videos (public/support-videos/, registered by
// `npm run support:videos`), each playable right in the sheet, plus a link to
// ask Earth Buddy anything in Help & support.
//
//   bottom — distance from the screen bottom, so it sits above the tab bar.

function FaqVideo({ url }: { url: string }) {
  const styles = useStyles();
  const player = useVideoPlayer(url, (p) => { p.play(); });
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />;
}

export function VideoHelpButton({ bottom }: { bottom: number }) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { bottom }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Video help: watch Earth Buddy explain common questions"
      >
        <EarthBuddy face size={44} />
        <View style={styles.fabBadge}><Play size={10} color="white" fill="white" /></View>
      </TouchableOpacity>
      <VideoHelpSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** The "Video help" sheet on its own; `startWith` opens it already playing that FAQ's video. */
export function VideoHelpSheet({ visible, onClose, startWith }: { visible: boolean; onClose: () => void; startWith?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [playing, setPlaying] = useState<string | null>(null);
  const videos = useRef(supportVideoList()).current;

  useEffect(() => {
    if (visible && startWith && videos.some((v) => v.id === startWith)) setPlaying(startWith);
  }, [visible, startWith]);

  const close = () => { setPlaying(null); onClose(); };
  const askBuddy = () => { close(); navigationRef.current?.navigate('Support'); };

  return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.backdrop}>
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close video help" />
          <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.header}>
              <EarthBuddy face size={40} animate={false} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title} accessibilityRole="header">Video help</Text>
                <Text style={styles.subtitle}>Earth Buddy explains, step by step</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={close} accessibilityRole="button" accessibilityLabel="Close">
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
              {videos.length === 0 && <Text style={styles.empty}>Videos are on their way. Meanwhile, ask Earth Buddy below!</Text>}
              {videos.map((v) => {
                const isPlaying = playing === v.id;
                return (
                  <View key={v.id} style={[styles.item, isPlaying && styles.itemOpen]}>
                    <TouchableOpacity
                      style={styles.itemRow}
                      onPress={() => setPlaying(isPlaying ? null : v.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isPlaying }}
                      accessibilityLabel={`${isPlaying ? 'Hide' : 'Play'} video: ${v.question}`}
                    >
                      <View style={styles.playIcon}>
                        {isPlaying ? <ChevronDown size={16} color="white" /> : <Play size={14} color="white" fill="white" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.question}>{v.question}</Text>
                        <Text style={styles.category}>{SUPPORT_CATEGORY_LABELS[v.category] || v.category}</Text>
                      </View>
                    </TouchableOpacity>
                    {isPlaying && <FaqVideo key={v.id} url={v.url} />}
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.askBtn} onPress={askBuddy} accessibilityRole="button">
              <MessageCircle size={17} color="white" />
              <Text style={styles.askText}>Ask Earth Buddy something else</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  fab: {
    position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any,
    right: 16, zIndex: 90, width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#bbf7d0',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  fabBadge: {
    position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white',
  },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '85%', width: '100%', maxWidth: 560, alignSelf: 'center',
    backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  title: { fontSize: 18, fontWeight: '900', color: c.text },
  subtitle: { fontSize: 12.5, fontWeight: '600', color: c.textMuted },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },

  list: { paddingHorizontal: 16, gap: 10 },
  empty: { fontSize: 14, fontWeight: '600', color: c.textMuted, paddingVertical: 12 },
  item: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  itemOpen: { borderColor: '#86efac' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 56 },
  playIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  question: { fontSize: 14.5, fontWeight: '800', color: c.text },
  category: { fontSize: 12, fontWeight: '600', color: c.textMuted, marginTop: 2 },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },

  askBtn: {
    marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 13,
  },
  askText: { color: 'white', fontSize: 14.5, fontWeight: '800' },
}));
