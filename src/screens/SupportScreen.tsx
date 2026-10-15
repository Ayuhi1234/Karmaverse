import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar, KeyboardAvoidingView, Platform, Linking, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { ChevronLeft, Send, Volume2, VolumeX, Square, Mail, Phone, RotateCcw, Clapperboard } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme, makeStyles } from '../theme';
import { EarthBuddy, TypingDots } from '../components/carbon/EarthBuddy';
import { supportService, SupportAnswer, HistoryTurn, SUPPORT_CONTACT, SUPPORT_API_READY, supportVideoUrl } from '../services/support';

// KarmaVerse Assistant: Earth Buddy answers questions from the approved FAQ
// (on the device, or from the backend when EXPO_PUBLIC_SUPPORT_API is on) and
// reads answers aloud with the device's own text-to-speech (free). Captions show
// the sentence being spoken. Text always comes first; voice is an extra.

type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; question: string; data: SupportAnswer }
  | { id: string; role: 'error'; text: string; retry: string };

const WELCOME = "Hi! I'm Earth Buddy, your KarmaVerse assistant. Ask me about pickups, KarmaCoins, rewards or your carbon footprint.";
const MAX_QUESTION = 500;

// Speak sentence by sentence: it works the same on Android, iOS and web, and
// lets the caption follow along.
const sentences = (text: string) => (text.match(/[^.!?]+[.!?]*/g) || [text]).map((s) => s.trim()).filter(Boolean);

// A mascot video for one answer, made only when the user asks for it.
type VideoState = { status: 'requesting' | 'processing' | 'completed' | 'failed' | 'unavailable'; url?: string | null; note?: string };
const VIDEO_POLL_MS = 5000;
const VIDEO_MAX_POLLS = 36; // ~3 minutes, then the user can try again

const UNAVAILABLE_NOTE: Record<string, string> = {
  login_required: 'Log in to watch video answers.',
  video_disabled: "Video answers aren't switched on yet.",
  missing_credentials: "Video answers aren't set up yet.",
  timeout: 'The video took too long. Please try again.',
};

function AnswerVideo({ url }: { url: string }) {
  const styles = useStyles();
  const player = useVideoPlayer(url, (p) => { p.play(); });
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />;
}

let nextId = 0;
const newId = () => `m${++nextId}`;

export function SupportScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [caption, setCaption] = useState(WELCOME);
  const [videos, setVideos] = useState<Record<string, VideoState>>({});
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const scrollRef = useRef<ScrollView>(null);
  const speakToken = useRef(0); // bumps on every new speech so stale callbacks stop
  const suggestions = useRef(supportService.suggestions()).current;

  const stopSpeaking = useCallback(() => {
    speakToken.current += 1;
    Speech.stop();
    setSpeakingId(null);
  }, []);

  const speak = useCallback((id: string, text: string) => {
    stopSpeaking();
    const token = speakToken.current;
    const parts = sentences(text);
    setSpeakingId(id);
    const say = (i: number) => {
      if (token !== speakToken.current) return;
      if (i >= parts.length) { setSpeakingId(null); return; }
      setCaption(parts[i]);
      Speech.speak(parts[i], {
        language: 'en-IN',
        rate: 1.0,
        onDone: () => say(i + 1),
        onStopped: () => { if (token === speakToken.current) setSpeakingId(null); },
        onError: () => { if (token === speakToken.current) setSpeakingId(null); },
      });
    };
    say(0);
  }, [stopSpeaking]);

  // Stop talking when leaving the screen or when the app goes to the background.
  useEffect(() => {
    const unsubBlur = navigation.addListener('blur', stopSpeaking);
    const sub = AppState.addEventListener('change', (s) => { if (s !== 'active') stopSpeaking(); });
    return () => { unsubBlur(); sub.remove(); stopSpeaking(); };
  }, [navigation, stopSpeaking]);

  const history = (): HistoryTurn[] => messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-6)
    .map((m) => ({ role: m.role as 'user' | 'assistant', text: m.text }));

  const ask = async (raw: string) => {
    const question = raw.trim().slice(0, MAX_QUESTION);
    if (!question || busy) return;
    stopSpeaking();
    setInput('');
    setMessages((m) => [...m, { id: newId(), role: 'user', text: question }]);
    setBusy(true);
    try {
      const data = await supportService.ask(question, { history: history(), responseMode: voiceOn ? 'voice' : 'text' });
      const id = newId();
      setMessages((m) => [...m, { id, role: 'assistant', text: data.answer, question, data }]);
      if (voiceOn) speak(id, data.answer);
      else setCaption(data.answer);
    } catch (error: any) {
      const status = error?.response?.status;
      const text = status === 429
        ? "You're asking quickly! Please wait a few seconds, then try again."
        : error?.response?.data?.message || "Sorry, I couldn't answer that right now. Please try again.";
      setMessages((m) => [...m, { id: newId(), role: 'error', text, retry: question }]);
    } finally {
      setBusy(false);
    }
  };

  // Ask the backend for this answer as a mascot video, then check on it until
  // it's ready. The text answer never depends on this.
  const watchVideo = async (msgId: string, question: string, faqId?: string) => {
    stopSpeaking();
    const set = (v: VideoState) => alive.current && setVideos((all) => ({ ...all, [msgId]: v }));
    // A ready-made video for this FAQ plays straight away: no API, no cost.
    const ready = supportVideoUrl(faqId);
    if (ready) return set({ status: 'completed', url: ready });
    set({ status: 'requesting' });
    try {
      const data = await supportService.ask(question, { responseMode: 'video' });
      let v = data.video;
      if (!v || v.status === 'unavailable') return set({ status: 'unavailable', note: UNAVAILABLE_NOTE[v?.error || 'video_disabled'] || UNAVAILABLE_NOTE.video_disabled });
      for (let i = 0; v && v.status === 'processing' && i < VIDEO_MAX_POLLS; i++) {
        set({ status: 'processing' });
        await new Promise((r) => setTimeout(r, VIDEO_POLL_MS));
        if (!alive.current) return;
        v = (v.jobId && (await supportService.video(v.jobId))) || v;
      }
      if (v && v.status === 'completed' && v.videoUrl) return set({ status: 'completed', url: v.videoUrl });
      set({ status: 'failed', note: UNAVAILABLE_NOTE[v?.status === 'processing' ? 'timeout' : v?.error || ''] || "Sorry, the video couldn't be made. The answer above is still right." });
    } catch {
      set({ status: 'failed', note: "Sorry, the video couldn't be made. The answer above is still right." });
    }
  };

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App'));
  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <LinearGradient colors={['#064e3b', '#166534']} style={styles.headerBg}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={goBack} accessibilityRole="button" accessibilityLabel="Go back">
            <ChevronLeft size={22} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} accessibilityRole="header">KarmaVerse Assistant</Text>
            <Text style={styles.subtitle}>Help & support</Text>
          </View>
          <TouchableOpacity
            style={[styles.iconBtn, !voiceOn && styles.iconBtnOff]}
            onPress={() => { if (voiceOn) stopSpeaking(); setVoiceOn((v) => !v); }}
            accessibilityRole="switch"
            accessibilityState={{ checked: voiceOn }}
            accessibilityLabel="Read answers aloud"
          >
            {voiceOn ? <Volume2 size={19} color="white" /> : <VolumeX size={19} color="white" />}
          </TouchableOpacity>
        </View>

        {/* Earth Buddy + caption of what it's saying */}
        <View style={styles.stage}>
          <EarthBuddy size={86} wave={!speakingId} speaking={!!speakingId} cheer />
          <View style={styles.captionBubble} accessibilityLiveRegion="polite">
            <View style={styles.captionTail} />
            <Text style={styles.captionText} numberOfLines={4}>{busy ? 'Let me check…' : caption}</Text>
            {speakingId && (
              <TouchableOpacity style={styles.stopBtn} onPress={stopSpeaking} accessibilityRole="button" accessibilityLabel="Stop speaking">
                <Square size={11} color="#14532d" fill="#14532d" />
                <Text style={styles.stopText}>Stop</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={{ gap: 14 }}>
              <Text style={styles.sectionLabel}>Popular questions</Text>
              {suggestions.map((group) => (
                <View key={group.category} style={{ gap: 8 }}>
                  <Text style={styles.groupLabel}>{group.label}</Text>
                  <View style={styles.chips}>
                    {group.questions.map((q) => (
                      <TouchableOpacity key={q.id} style={styles.chip} onPress={() => ask(q.question)} accessibilityRole="button">
                        <Text style={styles.chipText}>{q.question}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {messages.map((m) => {
            if (m.role === 'user') {
              return (
                <View key={m.id} style={styles.userRow}>
                  <View style={styles.userBubble}><Text style={styles.userText}>{m.text}</Text></View>
                </View>
              );
            }
            if (m.role === 'error') {
              return (
                <View key={m.id} style={styles.botRow}>
                  <EarthBuddy face size={34} animate={false} />
                  <View style={[styles.botBubble, styles.errorBubble]}>
                    <Text style={styles.botText}>{m.text}</Text>
                    <TouchableOpacity style={styles.inlineBtn} onPress={() => ask(m.retry)} accessibilityRole="button">
                      <RotateCcw size={14} color={colors.primary} />
                      <Text style={styles.inlineBtnText}>Try again</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }
            const d = m.data;
            const speakingThis = speakingId === m.id;
            return (
              <View key={m.id} style={{ gap: 8 }}>
                <View style={styles.botRow}>
                  <EarthBuddy face size={34} animate={speakingThis} speaking={speakingThis} />
                  <View style={styles.botBubble}>
                    <Text style={styles.botText} selectable>{m.text}</Text>
                    <View style={styles.answerActions}>
                      <TouchableOpacity
                        style={styles.inlineBtn}
                        onPress={() => (speakingThis ? stopSpeaking() : speak(m.id, m.text))}
                        accessibilityRole="button"
                        accessibilityLabel={speakingThis ? 'Stop reading this answer' : 'Read this answer aloud'}
                      >
                        {speakingThis ? <Square size={13} color={colors.primary} fill={colors.primary} /> : <Volume2 size={15} color={colors.primary} />}
                        <Text style={styles.inlineBtnText}>{speakingThis ? 'Stop' : 'Listen'}</Text>
                      </TouchableOpacity>
                      {d.supported && (SUPPORT_API_READY || !!supportVideoUrl(d.references[0]?.id)) && (!videos[m.id] || ['failed', 'unavailable'].includes(videos[m.id].status)) && (
                        <TouchableOpacity style={styles.inlineBtn} onPress={() => watchVideo(m.id, m.question, d.references[0]?.id)} accessibilityRole="button" accessibilityLabel="Watch Earth Buddy explain this as a video">
                          <Clapperboard size={15} color={colors.primary} />
                          <Text style={styles.inlineBtnText}>{videos[m.id] ? 'Try video again' : 'Watch video'}</Text>
                        </TouchableOpacity>
                      )}
                      {d.references[0] && <Text style={styles.source} numberOfLines={1}>From: {d.references[0].question}</Text>}
                    </View>
                    {videos[m.id] && ['requesting', 'processing'].includes(videos[m.id].status) && (
                      <View style={styles.videoNote} accessibilityLiveRegion="polite">
                        <TypingDots color={colors.primary} />
                        <Text style={styles.videoNoteText}>Earth Buddy is recording your video… this can take a minute.</Text>
                      </View>
                    )}
                    {videos[m.id]?.status === 'completed' && videos[m.id].url && (
                      videos[m.id].url!.startsWith('mock://')
                        ? <Text style={styles.videoNoteText}>Mock video ready (test mode has no real video).</Text>
                        : <AnswerVideo url={videos[m.id].url!} />
                    )}
                    {videos[m.id] && ['failed', 'unavailable'].includes(videos[m.id].status) && (
                      <Text style={styles.videoNoteText}>{videos[m.id].note}</Text>
                    )}
                  </View>
                </View>

                {(d.supportRecommended || !d.supported) && (
                  <View style={styles.contactCard}>
                    <Text style={styles.contactTitle}>{d.supported ? 'Still need help?' : 'Talk to our team'}</Text>
                    <View style={styles.contactRow}>
                      <TouchableOpacity style={styles.contactBtn} onPress={() => openLink(`mailto:${SUPPORT_CONTACT.email}`)} accessibilityRole="button" accessibilityLabel={`Email ${SUPPORT_CONTACT.email}`}>
                        <Mail size={16} color="white" />
                        <Text style={styles.contactBtnText}>Email us</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.contactBtn} onPress={() => openLink(SUPPORT_CONTACT.phoneHref)} accessibilityRole="button" accessibilityLabel={`Call ${SUPPORT_CONTACT.phone}`}>
                        <Phone size={16} color="white" />
                        <Text style={styles.contactBtnText}>Call us</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.contactFine} selectable>{SUPPORT_CONTACT.email} · {SUPPORT_CONTACT.phone}</Text>
                  </View>
                )}

                {d.related.length > 0 && (
                  <View style={[styles.chips, { paddingLeft: 42 }]}>
                    {d.related.map((r) => (
                      <TouchableOpacity key={r.id} style={styles.chipSmall} onPress={() => ask(r.question)} accessibilityRole="button">
                        <Text style={styles.chipSmallText}>{r.question}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {busy && (
            <View style={styles.botRow}>
              <EarthBuddy face size={34} />
              <View style={styles.botBubble}><TypingDots color={colors.primary} /></View>
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Ask Earth Buddy a question…"
            placeholderTextColor={colors.textFaint}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => ask(input)}
            returnKeyType="send"
            maxLength={MAX_QUESTION}
            editable={!busy}
            accessibilityLabel="Your question"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || busy) && styles.sendBtnOff]}
            onPress={() => ask(input)}
            disabled={!input.trim() || busy}
            accessibilityRole="button"
            accessibilityLabel="Send question"
          >
            <Send size={17} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  headerBg: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, maxWidth: 800, width: '100%', alignSelf: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  iconBtnOff: { backgroundColor: 'rgba(255,255,255,0.08)' },
  title: { color: 'white', fontSize: 18, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  stage: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 8, maxWidth: 800, width: '100%', alignSelf: 'center' },
  captionBubble: { flex: 1, backgroundColor: 'white', borderRadius: 16, paddingVertical: 11, paddingHorizontal: 14, gap: 8 },
  captionTail: { position: 'absolute', left: -6, top: 26, width: 12, height: 12, backgroundColor: 'white', transform: [{ rotate: '45deg' }] },
  captionText: { color: '#14532d', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  stopBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#dcfce7', borderRadius: 100, paddingVertical: 4, paddingHorizontal: 10 },
  stopText: { color: '#14532d', fontSize: 12, fontWeight: '800' },

  thread: { padding: 16, paddingBottom: 24, gap: 12, maxWidth: 680, width: '100%', alignSelf: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1, color: c.textMuted, textTransform: 'uppercase' },
  groupLabel: { fontSize: 13, fontWeight: '800', color: c.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: '#86efac', backgroundColor: c.surface, borderRadius: 100, paddingVertical: 9, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '700', color: c.primary },
  chipSmall: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 100, paddingVertical: 7, paddingHorizontal: 12 },
  chipSmallText: { fontSize: 12, fontWeight: '700', color: c.textMuted },

  botRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '92%' },
  botBubble: { flexShrink: 1, backgroundColor: c.surface, borderRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1, borderColor: c.border, gap: 8 },
  errorBubble: { borderColor: '#fca5a5' },
  botText: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: c.text },
  answerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  inlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 100, backgroundColor: c.primarySoft, alignSelf: 'flex-start' },
  inlineBtnText: { fontSize: 12.5, fontWeight: '800', color: c.primary },
  source: { flexShrink: 1, fontSize: 11.5, fontWeight: '600', color: c.textFaint },
  userRow: { alignItems: 'flex-end' },
  userBubble: { maxWidth: '82%', backgroundColor: '#16a34a', borderRadius: 16, borderBottomRightRadius: 4, paddingVertical: 10, paddingHorizontal: 14 },
  userText: { fontSize: 14.5, lineHeight: 20, fontWeight: '700', color: 'white' },

  video: { width: '100%', aspectRatio: 16 / 9, maxWidth: 360, borderRadius: 12, backgroundColor: '#000' },
  videoNote: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  videoNoteText: { flexShrink: 1, fontSize: 12.5, fontWeight: '600', color: c.textMuted },
  contactCard: { marginLeft: 42, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: '#86efac', padding: 14, gap: 10 },
  contactTitle: { fontSize: 14, fontWeight: '900', color: c.text },
  contactRow: { flexDirection: 'row', gap: 8 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 11 },
  contactBtnText: { color: 'white', fontSize: 14, fontWeight: '800' },
  contactFine: { fontSize: 12, color: c.textMuted, fontWeight: '600', textAlign: 'center' },

  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
  input: { flex: 1, minHeight: 44, borderRadius: 100, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16, fontSize: 14.5, color: c.text },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: '#9cccb0' },
}));
