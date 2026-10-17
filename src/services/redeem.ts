import api from './api';
import { extractList } from '../utils/apiList';

export const redeemService = {
  // Submit a redeem request — deducts coins from the chosen wallet immediately, status starts PENDING.
  // `ledger` ('pickup' | 'reward') is REQUIRED by the backend — a missing/invalid value 400s.
  create: async (data: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
    ledger: 'pickup' | 'reward';
    coinsToRedeem: number;
  }) => {
    try {
      const response = await api.post('/api/v1/redeem', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Create Redeem Request Error:', error);
      throw error;
    }
  },

  // Get the current user's redeem request history, newest first
  getMyRequests: async () => {
    try {
      const response = await api.get('/api/v1/redeem/my');
      // Robust to any wrapper shape (see extractList) so redeem history never
      // silently shows empty when the backend changes the response shape.
      return extractList(response.data);
    } catch (error) {
      console.error('Get My Redeem Requests Error:', error);
      throw error;
    }
  },
};
