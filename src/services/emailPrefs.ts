import axios from 'axios';
import { BACKEND_BASE } from './api';

// Token-based (login-free) email actions opened from mailer links — Feedback,
// Unsubscribe and email Preferences. The `token` is a signed, per-recipient value
// the backend embeds in the email URL; it identifies the user WITHOUT a session,
// so these calls deliberately do NOT use the authenticated `api` instance (no JWT,
// no 401 -> Login redirect). A logged-out recipient can complete them from a browser.
//
// Backend contract (endpoints to implement):
//   POST /api/v1/feedback              { token, score, comment }
//   POST /api/v1/email/unsubscribe     { token }                 // one-click, all marketing off
//   POST /api/v1/email/resubscribe     { token }
//   GET  /api/v1/email/preferences?token=...   -> { email, prefs }
//   POST /api/v1/email/preferences     { token, prefs }
const base = `${BACKEND_BASE}/api/v1`;
const T = 60000; // Render/AWS cold-start headroom, same as the main api client.

export type EmailPrefs = {
  newsletter: boolean;
  quiz: boolean;
  impact: boolean;
  offers: boolean;
  seasonal: boolean;
};

export const DEFAULT_PREFS: EmailPrefs = {
  newsletter: true, quiz: true, impact: true, offers: true, seasonal: true,
};

// Order + copy mirror the "Manage preferences" page and the mailer categories.
export const PREF_META: { key: keyof EmailPrefs; title: string; subtitle: string }[] = [
  { key: 'newsletter', title: 'Monthly newsletter', subtitle: 'Sustainability stories from the Knowledge Hub.' },
  { key: 'quiz', title: 'Daily quiz & streak reminders', subtitle: 'Nudges to play and keep your streak alive.' },
  { key: 'impact', title: 'Impact reports & rewards', subtitle: 'Your monthly impact, redemption and tier updates.' },
  { key: 'offers', title: 'Offers & promotions', subtitle: 'Limited-time boosts and bonus-coin campaigns.' },
  { key: 'seasonal', title: 'Seasonal & birthday', subtitle: 'Festival wishes and your birthday gift.' },
];

export async function submitFeedback(token: string, score: number | null, comment: string) {
  const { data } = await axios.post(`${base}/feedback`, { token, score, comment }, { timeout: T });
  return data;
}

export async function unsubscribeAll(token: string) {
  const { data } = await axios.post(`${base}/email/unsubscribe`, { token }, { timeout: T });
  return data;
}

export async function resubscribe(token: string) {
  const { data } = await axios.post(`${base}/email/resubscribe`, { token }, { timeout: T });
  return data;
}

export async function getPreferences(token: string): Promise<{ email?: string; prefs: EmailPrefs }> {
  const { data } = await axios.get(`${base}/email/preferences`, { params: { token }, timeout: T });
  const payload = data?.data || data || {};
  const prefs = (payload.prefs || {}) as Partial<EmailPrefs>;
  return { email: payload.email, prefs: { ...DEFAULT_PREFS, ...prefs } };
}

export async function savePreferences(token: string, prefs: EmailPrefs) {
  const { data } = await axios.post(`${base}/email/preferences`, { token, prefs }, { timeout: T });
  return data;
}
