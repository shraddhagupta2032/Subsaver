import { apiRequest } from './client';

export const subscriptionsApi = {
  async getSubscriptions({ category, status } = {}) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/subscriptions${queryString}`);
  },

  async getSubscriptionById(id) {
    return await apiRequest(`/subscriptions/${id}`);
  },

  async createSubscription(data) {
    return await apiRequest('/subscriptions', {
      method: 'POST',
      body: data,
    });
  },

  async updateSubscription(id, data) {
    return await apiRequest(`/subscriptions/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteSubscription(id) {
    return await apiRequest(`/subscriptions/${id}`, {
      method: 'DELETE',
    });
  },
};
