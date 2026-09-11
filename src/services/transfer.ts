import api from './api';

// Peer-to-peer coin transfer. Recipients are identified by phone number and
// looked up against our own User collection — coins only ever move between
// KarmaCoin users, within the same ledger on both sides.
//
// Reward coins reprice by ₹ value (sender's tier rate → recipient's tier rate),
// so the number credited to the recipient can differ from the number sent.
// Pickup coins always move 1:1. Never recompute the conversion client-side —
// read `sent`/`received` straight off the API response.

export type CoinType = 'PICKUP' | 'REWARD';

export interface TransferSide {
  coins: number;
  rate: number;  // coins per ₹1 for that side (lower = better tier)
  value: number; // ₹ value at that side's rate
}

export interface TransferQuote {
  coinType: CoinType;
  ledger: 'pickup' | 'reward';
  recipient: { id: string; name: string; phone: string };
  sent: TransferSide;
  received: TransferSide;
}

export interface TransferRequest {
  recipientPhone: string;
  coinType: CoinType;
  amount: number;
}

export const transferService = {
  // Price a transfer and resolve the recipient's name WITHOUT moving any coins.
  // Always quote before transferring so the user sees exactly what will happen.
  quote: async (data: TransferRequest): Promise<TransferQuote> => {
    const response = await api.post('/api/v1/transfer/quote', data);
    return response.data.data || response.data;
  },

  // Actually move the coins. Call only after the user confirms. On success the
  // coins have already moved — use the returned shape (not the quote screen's
  // values) for the receipt, in case the recipient's tier changed in between.
  transfer: async (data: TransferRequest): Promise<TransferQuote> => {
    const response = await api.post('/api/v1/transfer', data);
    return response.data.data || response.data;
  },
};
