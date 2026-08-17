// Streak → Reward Wallet conversion tiers (source of truth for all streak/rate UI).
// Pickup Wallet is always a fixed 10:1 and is NOT part of this ladder — see PICKUP_RATE.
// `rate` = coins per ₹1 (e.g. 20 means 20 coins = ₹1). Lower rate = better payout.

export type LedgerType = 'pickup' | 'reward';

export const PICKUP_RATE = 10; // Pickup Wallet: fixed 10 coins = ₹1, never affected by streak
export const STREAK_FREEZE_COST = 3000; // reward coins spent to freeze one missed day

export interface StreakTier {
  name: string;
  days: string;
  rate: number; // coins per ₹1
  color: string;
  bg: string;
}

// Bronze → Royal, exactly matching the backend tier table.
export const STREAK_TIERS: StreakTier[] = [
  { name: 'Bronze',   days: 'Day 1–2',   rate: 100, color: '#b45309', bg: '#fef3c7' },
  { name: 'Silver',   days: 'Day 3–6',   rate: 75,  color: '#64748b', bg: '#f1f5f9' },
  { name: 'Gold',     days: 'Day 7–13',  rate: 50,  color: '#d97706', bg: '#fffbeb' },
  { name: 'Platinum', days: 'Day 14–20', rate: 30,  color: '#0ea5e9', bg: '#f0f9ff' },
  { name: 'Diamond',  days: 'Day 21–29', rate: 20,  color: '#06b6d4', bg: '#ecfeff' },
  { name: 'Royal',    days: 'Day 30+',   rate: 10,  color: '#7c3aed', bg: '#f5f3ff' },
];

export function tierByName(name?: string | null): StreakTier {
  return STREAK_TIERS.find((t) => t.name === name) || STREAK_TIERS[0];
}

// ₹ value of a coin amount at a given rate (coins per ₹1). Returns a number.
export function rupeesFor(coins: number, rate: number): number {
  if (!rate) return 0;
  return coins / rate;
}

// "₹20" for whole values, "₹13.3" otherwise — no trailing ".00".
export function formatRupees(amount: number): string {
  const rounded = Math.round(amount * 10) / 10;
  return Number.isInteger(rounded) ? `₹${rounded}` : `₹${rounded.toFixed(1)}`;
}
