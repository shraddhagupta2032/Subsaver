import { apiRequest } from './client';

export const subscriptionIntelligenceApi = {
  async getSummary() {
    return await apiRequest('/subscription-intelligence/summary');
  },

  async getCategories() {
    return await apiRequest('/subscription-intelligence/categories');
  },

  async getTop(limit = 5) {
    return await apiRequest(`/subscription-intelligence/top?limit=${limit}`);
  },

  async getRenewals(days = 7) {
    return await apiRequest(`/subscription-intelligence/renewals?days=${days}`);
  },

  async getOverlaps() {
    return await apiRequest('/subscription-intelligence/overlaps');
  },

  async getBudgetImpact() {
    return await apiRequest('/subscription-intelligence/budget-impact');
  },

  async getInsights() {
    return await apiRequest('/subscription-intelligence/insights');
  },

  async getHealth() {
    return await apiRequest('/subscription-intelligence/health');
  },
};
