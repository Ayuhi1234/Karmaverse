import api from './api';

// Live waste catalogue: [{ category, subCategories: [{ name, unit, karmaCoinsPerUnit, … }] }].
export const catalogueService = {
  getCatalogue: async (): Promise<any[]> => {
    const res = await api.get('/api/v1/catalogue');
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },
};
