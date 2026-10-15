import { Platform } from 'react-native';
import api from './api';
import { SUPPORT_VIDEOS } from '../data/supportVideos';

// ─────────────────────────────────────────────────────────────────────────────
// KarmaVerse AI Support Assistant — client service.
//
// With EXPO_PUBLIC_SUPPORT_API=true the app asks the backend
// (POST /api/v1/support/ask, see backend-support-service/). Without it, or when
// the backend can't be reached, the app answers on the device with the SAME
// engine and the SAME approved FAQ file the backend uses, so answers never
// differ and Help & Support works even before the backend is deployed.
// Zero cost either way unless the backend is configured with paid providers.
// ─────────────────────────────────────────────────────────────────────────────
export const SUPPORT_API_READY = process.env.EXPO_PUBLIC_SUPPORT_API === 'true';

// Shared, dependency-free engine + approved FAQs (also used by the backend).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const engine = require('../../backend-support-service/src/faqEngine');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FAQS: SupportFaq[] = require('../../backend-support-service/faq/faqs.json');

export type SupportLanguage = 'en';
export type ResponseMode = 'text' | 'voice' | 'video';

export interface SupportFaq {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  language: string;
  status: string;
}

export interface SupportReference { id: string; question: string; category: string }

export interface SupportVideo {
  jobId: string | null;
  status: 'processing' | 'completed' | 'failed' | 'unavailable';
  videoUrl: string | null;
  error: string | null;
}

export interface SupportAnswer {
  answer: string;
  supported: boolean;
  supportRecommended: boolean;
  references: SupportReference[];
  related: { id: string; question: string }[];
  video: SupportVideo | null;
  source: 'server' | 'device';
}

export interface HistoryTurn { role: 'user' | 'assistant'; text: string }

// Where human support is reached (from Profile's Help & support and the web footer).
export const SUPPORT_CONTACT = {
  email: 'cto.team@0waste.co.in',
  phone: '+91 70931 98828',
  phoneHref: 'tel:+917093198828',
};

export const SUPPORT_CATEGORY_LABELS: Record<string, string> = {
  pickups: 'Pickups',
  karmacoins: 'KarmaCoins',
  rewards: 'Rewards',
  carbon: 'Carbon footprint',
  account: 'Account',
  technical: 'Help',
};

function answerOnDevice(question: string, history: HistoryTurn[], language: SupportLanguage): SupportAnswer {
  const match = engine.matchWithHistory(question, FAQS, { language, history });
  const result = engine.answerFromMatch(match, language);
  return {
    ...result,
    related: match.related.map((f: SupportFaq) => ({ id: f.id, question: f.question })),
    video: null,
    source: 'device',
  };
}

// Ready-made Earth Buddy videos (made in the HeyGen website, saved in
// public/support-videos/ and listed by `npm run support:videos`). They're
// published with the website, so phones stream them from there.
const VIDEO_BASE = process.env.EXPO_PUBLIC_SUPPORT_VIDEO_BASE
  || (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'https://karmaverse.earth');

/** URL of the ready-made video for an FAQ, or null if none has been made yet. */
export function supportVideoUrl(faqId?: string): string | null {
  const file = faqId ? SUPPORT_VIDEOS[faqId] : undefined;
  return file ? `${VIDEO_BASE}/support-videos/${encodeURIComponent(file)}` : null;
}

export interface SupportVideoItem { id: string; question: string; category: string; url: string }

/** Every FAQ that has a ready-made video, in FAQ order (for the floating Video help button). */
export function supportVideoList(): SupportVideoItem[] {
  return FAQS
    .filter((f) => f.status === 'published' &&SUPPORT_VIDEOS[f.id])
    .map((f) => ({ id: f.id, question: f.question, category: f.category, url: supportVideoUrl(f.id)! }));
}

export const supportService = {
  /** Suggested questions, one or two per category. */
  suggestions(language: SupportLanguage = 'en'): { category: string; label: string; questions: { id: string; question: string }[] }[] {
    const byCategory = engine.suggestedQuestions(FAQS, language, 2);
    return Object.keys(SUPPORT_CATEGORY_LABELS)
      .filter((c) => byCategory[c]?.length)
      .map((c) => ({ category: c, label: SUPPORT_CATEGORY_LABELS[c], questions: byCategory[c] }));
  },

  /** Ask a question. Never throws for "no answer": that's a normal fallback answer. */
  async ask(question: string, opts: { history?: HistoryTurn[]; language?: SupportLanguage; responseMode?: ResponseMode } = {}): Promise<SupportAnswer> {
    const { history = [], language = 'en', responseMode = 'text' } = opts;
    const trimmed = question.trim();
    if (!SUPPORT_API_READY) return answerOnDevice(trimmed, history, language);
    try {
      const response = await api.post('/api/v1/support/ask', {
        question: trimmed,
        language,
        responseMode,
        history: history.slice(-6).map((h) => ({ role: h.role, text: h.text.slice(0, 1200) })),
      }, { timeout: 15000 });
      const d = response.data?.data ?? response.data;
      return {
        answer: d.answer,
        supported: !!d.supported,
        supportRecommended: !!d.supportRecommended,
        references: d.references ?? [],
        related: d.related ?? [],
        video: d.video ?? null,
        source: 'server',
      };
    } catch (error: any) {
      // Rate limit and bad input are real answers from the server: surface them.
      const status = error?.response?.status;
      if (status === 429 || status === 400) throw error;
      // Server down, route not deployed or offline: answer on the device instead.
      return answerOnDevice(trimmed, history, language);
    }
  },

  /** Status of a mascot video job (only when the backend has video enabled). */
  async video(jobId: string): Promise<SupportVideo | null> {
    if (!SUPPORT_API_READY) return null;
    try {
      const response = await api.get(`/api/v1/support/video/${encodeURIComponent(jobId)}`);
      return response.data?.data ?? null;
    } catch {
      return null;
    }
  },
};
