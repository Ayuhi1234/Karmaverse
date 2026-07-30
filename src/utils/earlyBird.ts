// Early Bird signup incentive — shown on the homepage and claimed via a scratch
// card right after registration. The number here is purely a frontend display;
// the backend must actually credit this amount during POST /api/v1/auth/register
// (same pattern the existing referral-bonus screen already relies on) or the
// real wallet balance shown afterwards won't match what the user was promised.
export const EARLY_BIRD_COINS = 500;
