import { apiRequest } from './client';

export const sharedSubscriptionsApi = {
  async getGroupSharedSubscriptions(groupId, status) {
    const query = status ? `?status=${status}` : '';
    return await apiRequest(`/groups/${groupId}/shared-subscriptions${query}`);
  },

  async getSharedSubscriptionById(id) {
    return await apiRequest(`/shared-subscriptions/${id}`);
  },

  async createSharedSubscription(groupId, data) {
    return await apiRequest(`/groups/${groupId}/shared-subscriptions`, {
      method: 'POST',
      body: data,
    });
  },

  async updateSharedSubscription(id, data) {
    return await apiRequest(`/shared-subscriptions/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  async deleteSharedSubscription(id) {
    return await apiRequest(`/shared-subscriptions/${id}`, {
      method: 'DELETE',
    });
  },

  async renewSharedSubscription(id) {
    return await apiRequest(`/shared-subscriptions/${id}/renew`, {
      method: 'POST',
    });
  },
};
