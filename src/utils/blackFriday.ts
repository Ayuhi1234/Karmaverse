import { Platform } from 'react-native';
import { darkColors, ThemeColors } from '../theme/colors';

// Black Friday weekend, 27 Nov 00:00 to 1 Dec 00:00 IST. Pickups booked in this window earn
// 2X KarmaCoins (the backend adds the bonus). The theme switches itself off after END. To remove
// it, delete this file, src/components/festive/BlackFriday.tsx and the isBlackFriday() call sites.
const START = Date.parse('2026-11-27T00:00:00+05:30');
const END = Date.parse('2026-12-01T00:00:00+05:30');

export const BF_HEADER: [string, string, string] = ['#000000', '#0a0a0a', '#1c1c1c'];
export const BF_GOLD = '#f5c542';

// Monday 30 Nov is Cyber Monday: same theme, cyan accent and last-day wording.
const CM_START = Date.parse('2026-11-30T00:00:00+05:30');
export const CM_CYAN = '#22d3ee';

// ?bf=1 previews the Black Friday days on the web outside the dates, ?bf=cm previews Cyber Monday,
// ?bf=0 hides the theme. It is kept for the rest of the tab so it survives in-app navigation.
// EXPO_PUBLIC_BF_PREVIEW=1 or =cm does the same in a local app build; release builds leave it unset.
function previewMode(): 'bf' | 'cm' | 'off' | null {
  const env = process.env.EXPO_PUBLIC_BF_PREVIEW;
  if (env === '1') return 'bf';
  if (env === 'cm') return 'cm';
  if (Platform.OS !== 'web') return null;
  try {
    const q = new URLSearchParams(window.location.search).get('bf');
    if (q === '1' || q === '0' || q === 'cm') sessionStorage.setItem('kvBfPreview', q);
    const saved = sessionStorage.getItem('kvBfPreview');
    if (saved === '1') return 'bf';
    if (saved === 'cm') return 'cm';
    if (saved === '0') return 'off';
    return null;
  } catch {
    return null;
  }
}

function previewOverride(): boolean | null {
  const m = previewMode();
  return m === null ? null : m !== 'off';
}

export function isCyberMonday(now: number = Date.now()): boolean {
  const m = previewMode();
  if (m !== null) return m === 'cm';
  return now >= CM_START && now < END;
}

export function bfAccent(): string {
  return isCyberMonday() ? CM_CYAN : BF_GOLD;
}

export type BFCopy = {
  ticker: string[];
  watermark: string;
  receiptTitle: string;
  receiptDate: string;
  stampRing: string;
  badgeRing: string;
  badgeSub: string;
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  heroSub: string;
  heroCta: string;
  scheduleNote: string;
};

export function bfCopy(): BFCopy {
  if (isCyberMonday()) {
    return {
      ticker: ['Cyber Monday', 'Last day for 2X KarmaCoins', 'Book by 11:59 PM tonight', 'Free doorstep pickup'],
      watermark: 'CYBER MONDAY   ',
      receiptTitle: 'KARMAVER$E · CYBER MONDAY RECEIPT',
      receiptDate: 'LAST DAY',
      stampRing: 'CYBER MONDAY • LAST DAY 2X • ',
      badgeRing: 'CYBER MONDAY  ·  LAST DAY FOR 2X  ·  30 NOV  ·  ',
      badgeSub: 'book by 11:59 PM',
      eyebrow: 'Cyber Monday · Last day for 2X',
      headline: 'Cyber Monday.',
      headlineAccent: 'Last day for 2X.',
      heroSub: 'Today is the last day of 2X KarmaCoins. Book a free doorstep pickup for old newspapers, cartons and e-waste before 11:59 PM tonight.',
      heroCta: 'Get 2X before midnight',
      scheduleNote: 'Last day: pickups booked today earn 2X KarmaCoins',
    };
  }
  return {
    ticker: ['Black Friday weekend', '2X KarmaCoins on every pickup', '27–30 Nov', 'Free doorstep pickup'],
    watermark: 'BLACK FRIDAY   ',
    receiptTitle: 'KARMAVER$E · BLACK FRIDAY RECEIPT',
    receiptDate: '27–30 NOV',
    stampRing: 'BLACK FRIDAY • 2X KARMACOINS • ',
    badgeRing: 'BLACK FRIDAY  ·  2X KARMACOINS  ·  27–30 NOV  ·  ',
    badgeSub: 'on every pickup',
    eyebrow: 'Black Friday weekend · 27–30 Nov',
    headline: 'Black Friday.',
    headlineAccent: 'Double karma.',
    heroSub: 'This weekend, every pickup earns 2X KarmaCoins. Clear out old newspapers, cartons and e-waste with a free doorstep pickup, and get double the coins.',
    heroCta: 'Get 2X on a pickup',
    scheduleNote: 'Pickups booked till 30 Nov earn 2X KarmaCoins',
  };
}

// Dark mode during the theme: true black and charcoal instead of the green-tinted greys.
export const bfDarkColors: ThemeColors = {
  ...darkColors,
  bg: '#000000',
  surface: '#121212',
  surfaceAlt: '#1a1a1a',
  text: '#f5f5f5',
  textMuted: '#a3a3a3',
  textFaint: '#737373',
  border: '#262626',
  borderStrong: '#333333',
  primarySoft: '#1c1c1c',
  successSoft: '#1c1c1c',
  inputBg: '#1a1a1a',
};

export function isBlackFriday(now: number = Date.now()): boolean {
  const override = previewOverride();
  if (override !== null) return override;
  return now >= START && now < END;
}

// 'off' | 'bf' | 'cm' right now. ThemeProvider re-renders the app when this changes, so the
// theme turns on and off at midnight even if the app was left open or suspended.
export function festivePhase(now: number = Date.now()): 'off' | 'bf' | 'cm' {
  if (!isBlackFriday(now)) return 'off';
  return isCyberMonday(now) ? 'cm' : 'bf';
}

export function msToNextFestiveChange(now: number = Date.now()): number | null {
  const next = [START, CM_START, END].find((t) => t > now);
  return next === undefined ? null : next - now;
}

export function isBlackFridayBooking(createdAt?: string | number | null): boolean {
  if (createdAt == null) return false;
  const t = typeof createdAt === 'number' ? createdAt : Date.parse(createdAt);
  if (!Number.isFinite(t)) return false;
  if (previewOverride() === true) return true;
  return t >= START && t < END;
}
