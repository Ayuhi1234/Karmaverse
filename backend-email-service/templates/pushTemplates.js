// Push notification templates (FCM) for KarmaVerse — same functional shape as the
// email templates: one function per key → { title, body, data }.
//
// These are the NON-TRANSACTIONAL (engagement / marketing) pushes. Unlike the
// transactional pushes (booking accepted, coins credited, etc., which fire off a
// real event), the backend sends these on a schedule or to a targeted segment, so:
//   • send ONLY to users opted in to marketing notifications, and
//   • respect a frequency cap (e.g. max 1 non-transactional push/day).
//
// `data.route` is the in-app screen to open when the user taps the push — it maps
// to the app's navigation routes (Wallet / Quiz / Referral / SchedulePickup /
// OrderTracking), the same targets the email CTAs deep-link to. `data.type` lets
// the client/analytics identify the campaign.
//
// Keys + their variable sets are a FIXED contract with the backend — don't rename.
// Every value falls back so a missing field never renders "undefined"/"null".

const CURRENCY = 'KarmaCoins XP';
const s = (v, f = '') => (v == null || String(v).trim() === '' ? f : String(v));
// Big numbers scan faster with a thousands separator (4055 -> 4,055); '' if none.
const fmt = (v) => { const n = Number(String(v).replace(/[^\d.]/g, '')); return Number.isFinite(n) && n > 0 ? n.toLocaleString('en-US') : ''; };

const pushTemplates = {
  // Streak about to reset — the single most important retention nudge.
  STREAK_AT_RISK: ({ tier }) => ({
    title: 'Your streak is at risk!',
    body: `A pickup, quiz, or referral today keeps your ${s(tier, '')} streak — and your reward rate.`.replace('  ', ' '),
    data: { route: 'Wallet', type: 'STREAK_AT_RISK' },
  }),

  // Daily reminder to play the quiz. "Resets tonight" (not "5:30 AM" — that IST
  // time is midnight UTC leaking through, and it reads like there's all night left).
  DAILY_QUIZ_REMINDER: () => ({
    title: "Today's eco quiz is live",
    body: `5 quick questions, instant ${CURRENCY}. Resets tonight.`,
    data: { route: 'Quiz', type: 'DAILY_QUIZ_REMINDER' },
  }),

  // Re-activation: remind users sitting on a balance to redeem.
  REDEMPTION_READY: ({ balance }) => {
    const b = fmt(balance);
    return {
      title: 'Your coins are ready to cash out',
      body: b ? `${b} ${CURRENCY} waiting to become real rewards.` : `Redeem your ${CURRENCY} for real rewards.`,
      data: { route: 'Wallet', type: 'REDEMPTION_READY' },
    };
  },

  // Celebration when the user moves up a streak tier (better reward rate).
  TIER_UPGRADE: ({ tier }) => ({
    title: `You reached ${s(tier, 'a new')} tier!`,
    body: 'Each of your reward coins is now worth more. Keep the streak alive!',
    data: { route: 'Wallet', type: 'TIER_UPGRADE' },
  }),

  // Win-back for lapsed users (e.g. inactive 14+ days).
  WIN_BACK: ({ name }) => ({
    title: `We miss you${name && String(name).trim() ? ', ' + s(name) : ''}!`,
    body: `Your next pickup is one tap away — turn everyday materials into ${CURRENCY}.`,
    data: { route: 'SchedulePickup', type: 'WIN_BACK' },
  }),

  // Growth nudge for users who've never referred anyone. "each" (not "both") is
  // unambiguous that every party gets 1,000.
  REFERRAL_NUDGE: () => ({
    title: 'Invite a friend, both earn',
    body: `Share your code — you each get 1,000 ${CURRENCY}.`,
    data: { route: 'Referral', type: 'REFERRAL_NUDGE' },
  }),
};

module.exports = { pushTemplates };
