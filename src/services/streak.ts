import api from './api';

export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  tier: string;        // Bronze | Silver | Gold | Platinum | Diamond | Royal
  rewardRate: number;  // coins per ₹1 for the Reward Wallet
  freezeAvailable: boolean;
  atRiskForDate: string | null; // YYYY-MM-DD (IST) or null
}

export const streakService = {
  // Live reward-streak status — the ONLY source of truth for the Reward Wallet rate
  // and freeze eligibility. (Not the quiz's own `currentStreak`, which is unrelated.)
  getStatus: async (): Promise<StreakStatus | null> => {
    try {
      const response = await api.get('/api/v1/streak/status');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Get Streak Status Error:', error);
      return null;
    }
  },

  // Purchase a freeze for the currently at-risk day (spends 3,000 reward coins).
  // No body — the backend resolves which day is at risk.
  purchaseFreeze: async () => {
    const response = await api.post('/api/v1/streak/freeze');
    return response.data.data || response.data;
  },
};
