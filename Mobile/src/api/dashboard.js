import { apiRequest } from './client';

export const dashboardApi = {
  async getFinancialOverview() {
    try {
      return await apiRequest('/analytics/summary');
    } catch (e) {
      console.warn('getFinancialOverview error:', e.message);
      return null;
    }
  },


  async getSubscriptionSummary() {
    try {
      return await apiRequest('/subscription-intelligence/summary');
    } catch (e) {
      console.warn('getSubscriptionSummary error:', e.message);
      return null;
    }
  },

  async getSubscriptionHealth() {
    try {
      return await apiRequest('/subscription-intelligence/health');
    } catch (e) {
      console.warn('getSubscriptionHealth error:', e.message);
      return null;
    }
  },

  async getUpcomingRenewals(days = 7) {
    try {
      return await apiRequest(`/subscription-intelligence/renewals?days=${days}`);
    } catch (e) {
      console.warn('getUpcomingRenewals error:', e.message);
      return [];
    }
  },

  async getRecentExpenses() {
    try {
      return await apiRequest('/expenses');
    } catch (e) {
      console.warn('getRecentExpenses error:', e.message);
      return [];
    }
  },

  async getPersonalSubscriptions() {
    try {
      return await apiRequest('/subscriptions');
    } catch (e) {
      console.warn('getPersonalSubscriptions error:', e.message);
      return [];
    }
  },

  async getTopSubscriptions(limit = 5) {
    try {
      return await apiRequest(`/subscription-intelligence/top?limit=${limit}`);
    } catch (e) {
      console.warn('getTopSubscriptions error:', e.message);
      return [];
    }
  },
};
