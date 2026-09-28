import api from './api';

// Categories shown in the "Where it comes from" breakdown. `waste` is the
// recycling category — it SAVES CO₂; the rest emit it.
export type CarbonCategoryKey = 'transport' | 'food' | 'energy' | 'waste';

export interface CarbonCategory {
  key: CarbonCategoryKey;
  kgCo2e: number;          // always positive; `direction` says which way it counts
  direction: 'save' | 'emit';
  meta?: string;           // e.g. "12 trips this month" — optional, backend-written
}

export interface CarbonSummary {
  totalSavedKg: number;    // lifetime CO₂ saved — the hero number
  monthSavedKg: number;
  monthEmittedKg: number;
  monthActions: number;
  level?: string | null;   // level name; the UI falls back to deriving it from totalSavedKg
  categories: CarbonCategory[];
  tip?: { title: string; body: string } | null;
}

export interface CarbonActivity {
  _id: string;
  category: CarbonCategoryKey;
  title: string;
  kgCo2e: number;
  direction: 'save' | 'emit';
  createdAt: string;
}

// Activities the user can log from the "Log activity" sheet. The backend owns the
// CO₂ value for each — the app only sends the type.
export type LoggableActivity = 'public_transport' | 'cycle_walk' | 'plant_based_meal' | 'energy_saving';

export const carbonService = {
  // 404 = this backend doesn't have the carbon feature yet. Expected — the screen
  // shows its empty state — so don't spam the console for it (same as streak).
  getSummary: async (): Promise<CarbonSummary | null> => {
    try {
      const response = await api.get('/api/v1/carbon/summary');
      return response.data.data || response.data;
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error('Get Carbon Summary Error:', error);
      }
      return null;
    }
  },

  getActivities: async (): Promise<CarbonActivity[]> => {
    try {
      const response = await api.get('/api/v1/carbon/activities');
      const data = response.data.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error('Get Carbon Activities Error:', error);
      }
      return [];
    }
  },

  logActivity: async (type: LoggableActivity) => {
    const response = await api.post('/api/v1/carbon/activities', { type });
    return response.data.data || response.data;
  },

  // Monthly reduction goal, as a percentage of last month's emissions.
  setGoal: async (reductionPercent: number) => {
    const response = await api.post('/api/v1/carbon/goal', { reductionPercent });
    return response.data.data || response.data;
  },
};
