import { Platform } from 'react-native';

// Website cookie choice (KAR-296). Strictly-necessary storage (sign-in) is always on;
// analytics cookies (Google Analytics) load only after the visitor accepts them.
// The app itself doesn't use cookies, so on iOS / Android this is always "unset"
// and nothing is shown.
export type CookieChoice = 'granted' | 'denied';

const KEY = 'kv_cookie_consent_v1';
const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

type Listener = (choice: CookieChoice | null) => void;
const listeners = new Set<Listener>();
const openers = new Set<() => void>();

export function getCookieChoice(): CookieChoice | null {
  if (!isWeb) return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setCookieChoice(choice: CookieChoice) {
  if (!isWeb) return;
  try { window.localStorage.setItem(KEY, choice); } catch { /* private mode: applies to this visit only */ }
  memoryChoice = choice;
  listeners.forEach((fn) => fn(choice));
}

// Remembered for this page load even when storage is blocked.
let memoryChoice: CookieChoice | null = null;
export const currentCookieChoice = (): CookieChoice | null => getCookieChoice() ?? memoryChoice;

export function onCookieChoice(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// "Cookie settings" links call this to show the banner again.
export function openCookieSettings() {
  openers.forEach((fn) => fn());
}
export function onOpenCookieSettings(fn: () => void): () => void {
  openers.add(fn);
  return () => { openers.delete(fn); };
}
