import { Platform } from 'react-native';

// Remembers a protected URL the user landed on while logged out (e.g. the email
// "Track pickup" link -> /OrderTracking?bookingId=...), so that after they log in
// we can send them straight to it instead of dropping them on the dashboard.
let pendingUrl: string | null = null;

// Authenticated routes worth returning to after login. Path is matched
// case-insensitively against window.location.pathname.
const PROTECTED = [
  '/ordertracking',
  '/bookingdetails',
  '/wallet',
  '/orders',
  '/profile',
  '/redeem',
  '/redeemhistory',
  '/quiz',
  '/referral',
  '/schedulepickup',
];

// Capture as early as possible (before the router rewrites the URL). No-op unless
// the current URL is a protected route on web.
export function capturePendingDeepLink(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const path = (window.location.pathname || '').replace(/\/+$/, '').toLowerCase();
  if (PROTECTED.some((p) => path === p || path.startsWith(p + '/'))) {
    pendingUrl = window.location.pathname + window.location.search;
  }
}

export function clearPendingDeepLink(): void {
  pendingUrl = null;
}

export function hasPendingDeepLink(): boolean {
  return !!pendingUrl;
}

// After a successful login, send the user to the remembered deep link (once).
// Returns true if it navigated. Route name comes from the path; query params
// (e.g. ?bookingId=) become navigation params.
export function consumePendingDeepLink(navigation: any): boolean {
  if (!pendingUrl || !navigation) return false;
  const url = pendingUrl;
  pendingUrl = null;
  try {
    const qIdx = url.indexOf('?');
    const routeName = (qIdx >= 0 ? url.slice(0, qIdx) : url).replace(/^\/+|\/+$/g, '');
    if (!routeName) return false;
    const params: Record<string, string> = {};
    const query = qIdx >= 0 ? url.slice(qIdx + 1) : '';
    if (query) {
      query.split('&').forEach((pair) => {
        const [k, v] = pair.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    navigation.navigate(routeName, params);
    return true;
  } catch (_) {
    return false;
  }
}
