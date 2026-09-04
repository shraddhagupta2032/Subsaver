import { apiRequest } from './client';

export const groupsApi = {
  async getGroups() {
    return await apiRequest('/groups');
  },

  async getGroupDetails(groupId) {
    return await apiRequest(`/groups/${groupId}`);
  },

  async getGroupMembers(groupId) {
    return await apiRequest(`/groups/${groupId}/members`);
  },

  async createGroup(name) {
    return await apiRequest('/groups', {
      method: 'POST',
      body: { name },
    });
  },

  async addGroupMember(groupId, { userId, email }) {
    const payload = {};
    if (userId) payload.user_id = userId;
    if (email) payload.email = email;

    return await apiRequest(`/groups/${groupId}/members`, {
      method: 'POST',
      body: payload,
    });
  },
};
