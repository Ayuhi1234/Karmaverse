import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from './alert';

// Fixed copy for persistent banners (Wallet screen, Home wallet widget) — kept static
// so the text doesn't visibly change on every re-render/focus.
export const REDEEM_INFO_TITLE = 'Redemption opens 1 October 🎉';
export const REDEEM_INFO_MESSAGE =
  'From 1 October, cash out your KarmaCoins XP — 10 XP = ₹1. Keep earning till then!';

// Single switch that flips the Wallet screen's Redeem button from the countdown
// popup over to the real redeem flow — flip the date (or the flow) here only.
export const REDEEM_LAUNCH_DATE = new Date('2026-10-01T00:00:00');
export function isRedeemLive() {
  return true;
}

// One clean, consistent message — simple and not text-heavy. The blank line
// between the two short paragraphs gives them room to breathe in the popup.
function buildPopupContent() {
  return {
    title: 'Redemption opens 1 October 🎉',
    message: 'From 1 October, your KarmaCoins XP turn into real cash — 10 XP = ₹1.\n\nKeep earning with every sustainable action! ♻️',
  };
}

// Shows the redeem-info popup once per flagKey, then never again.
export async function showRedeemInfoOnce(flagKey: string) {
  const alreadyShown = await AsyncStorage.getItem(flagKey);
  if (alreadyShown) return;
  await AsyncStorage.setItem(flagKey, 'true');
  const { title, message } = buildPopupContent();
  showAlert(title, message);
}

// Manual trigger (e.g. Wallet screen's Redeem/Transfer/Donate buttons) — same dynamic
// flavor as the one-time popups, but can be shown repeatedly.
export function showRedeemInfoNow() {
  const { title, message } = buildPopupContent();
  showAlert(title, message);
}
