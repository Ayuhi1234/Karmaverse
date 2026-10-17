import { Platform } from 'react-native';

// GA4 (web only). The Measurement ID comes from EXPO_PUBLIC_GA_MEASUREMENT_ID, which Expo
// inlines at bundle time (it must be read as a literal `process.env.EXPO_PUBLIC_…`
// expression for that to work). If it's missing or malformed, analytics is a silent no-op.
//
// Privacy: nothing identifying is ever sent. Every URL is reduced to origin + path (+ UTM
// campaign params only). Query strings can carry referral codes, deep-link tokens or
// React Navigation route params such as the booking object with its address. Event
// params pass an allowlist, and string values that look like an email or phone number are dropped.
const MEASUREMENT_ID = process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID;
const IS_ENABLED =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof MEASUREMENT_ID === 'string' &&
  /^G-[A-Z0-9]+$/.test(MEASUREMENT_ID);

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

// Only these event parameters are ever forwarded to GA4.
const ALLOWED_PARAMS = new Set([
  'page_title', 'page_location', 'page_referrer',
  'method', 'category_count', 'item_quantity', 'reward_context', 'ledger',
  'redemption_type', 'coins_redeemed', 'value', 'currency',
]);
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /\+?\d[\d\s-]{8,}\d/;

let initialized = false;
let lastPageKey: string | null = null;
// Sanitized URL of the previous screen. Sent as page_referrer so gtag never falls back
// to the raw previous URL (with its query string) as the referrer after an in-app navigation.
let lastPageLocation: string | undefined;
const completedPickups = new Set<string>();

// Must push the real `arguments` object, exactly like Google's snippet: gtag.js ignores
// plain arrays in dataLayer, so a rest-parameter array would silently drop every event.
function gtag(..._args: any[]) {
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments);
}

export function sanitizeUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const kept = new URLSearchParams();
    UTM_PARAMS.forEach((p) => {
      const v = url.searchParams.get(p);
      if (v) kept.set(p, v);
    });
    const qs = kept.toString();
    return `${url.origin}${url.pathname}${qs ? `?${qs}` : ''}`;
  } catch {
    return undefined;
  }
}

function cleanParams(params: Record<string, unknown> = {}) {
  const out: Record<string, string | number | boolean> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (!ALLOWED_PARAMS.has(key) || value === undefined || value === null) return;
    if (typeof value === 'number' || typeof value === 'boolean') {
      if (typeof value !== 'number' || Number.isFinite(value)) out[key] = value;
      return;
    }
    if (typeof value !== 'string') return;
    const isUrl = key === 'page_location' || key === 'page_referrer';
    if (!isUrl && (value.length > 100 || EMAIL_RE.test(value) || PHONE_RE.test(value))) return;
    out[key] = value;
  });
  return out;
}

// Loads gtag.js once and configures GA4 with automatic page views OFF: page views are sent
// by trackPageView on every React Navigation route change (initial load included), so
// letting gtag send its own would double-count the first page.
export function initAnalytics() {
  if (!IS_ENABLED || initialized) return;
  initialized = true;
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== 'function') w.gtag = gtag;
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, {
    send_page_view: false,
    page_location: sanitizeUrl(window.location.href),
    page_referrer: sanitizeUrl(document.referrer),
  });
  const src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  if (!document.querySelector(`script[src="${src}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!IS_ENABLED) return;
  initAnalytics();
  gtag('event', name, cleanParams({ page_location: sanitizeUrl(window.location.href), ...params }));
}

// One page_view per distinct screen. The key is the route name plus, for Legal, which
// document is shown (never other params, which can hold booking/address objects).
// Re-renders, onReady + onStateChange for the same route, and param-only updates don't
// produce duplicates.
export function trackPageView(route: { name?: string; params?: any } | undefined) {
  if (!IS_ENABLED || !route?.name) return;
  const legalType = route.name === 'Legal' && typeof route.params?.type === 'string' ? route.params.type : '';
  const key = legalType ? `${route.name}:${legalType}` : route.name;
  if (key === lastPageKey) return;
  lastPageKey = key;
  initAnalytics();
  const pageTitle = legalType ? `Legal - ${legalType}` : route.name;
  const pageLocation = sanitizeUrl(window.location.href);
  const pageReferrer = lastPageLocation ?? sanitizeUrl(document.referrer);
  lastPageLocation = pageLocation;
  // `set` makes later automatic events (user_engagement, scroll, …) inherit the
  // sanitized location/title/referrer of this screen rather than the raw URL.
  gtag('set', { page_location: pageLocation, page_title: pageTitle, page_referrer: pageReferrer ?? '' });
  gtag('event', 'page_view', cleanParams({ page_title: pageTitle, page_location: pageLocation, page_referrer: pageReferrer }));
}

// pickup_completed can be detected from two places (socket event, tracking-screen poll)
// and in several tabs, so it's de-duplicated per booking. The booking ID is only used
// locally for that check and is never sent to GA.
export function trackPickupCompleted(bookingId: string | undefined) {
  if (!IS_ENABLED || !bookingId || completedPickups.has(bookingId)) return;
  completedPickups.add(bookingId);
  const storageKey = 'ga_pickup_completed_ids';
  try {
    const seen: string[] = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    if (seen.includes(bookingId)) return;
    window.localStorage.setItem(storageKey, JSON.stringify([...seen, bookingId].slice(-50)));
  } catch {
    // storage unavailable (private mode) — the in-memory set still de-duplicates this tab
  }
  trackEvent('pickup_completed');
}
