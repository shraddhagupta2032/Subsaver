import { apiRequest } from './client';

export const notificationsApi = {
  /**
   * Fetches user notifications / reminders with optional status and type filtering.
   * @param {Object} [params] - { status?: 'PENDING' | 'READ', reminder_type?: string }
   * @returns {Promise<Array>} List of reminders/notifications
   */
  async getNotifications(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.reminder_type) queryParams.append('reminder_type', params.reminder_type);

    const queryStr = queryParams.toString();
    const endpoint = queryStr ? `/reminders?${queryStr}` : '/reminders';
    return await apiRequest(endpoint);
  },

  /**
   * Fetches the number of unread notifications.
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount() {
    try {
      const pending = await apiRequest('/reminders?status=PENDING');
      return Array.isArray(pending) ? pending.length : 0;
    } catch (err) {
      console.warn('getUnreadCount error:', err);
      return 0;
    }
  },

  /**
   * Marks a specific notification/reminder as READ.
   * @param {number|string} reminderId
   * @returns {Promise<Object>} Updated reminder
   */
  async markAsRead(reminderId) {
    return await apiRequest(`/reminders/${reminderId}/read`, {
      method: 'POST',
    });
  },

  /**
   * Marks a specific notification/reminder as UNREAD (PENDING).
   * @param {number|string} reminderId
   * @returns {Promise<Object>} Updated reminder
   */
  async markAsUnread(reminderId) {
    return await apiRequest(`/reminders/${reminderId}/unread`, {
      method: 'POST',
    });
  },

  /**
   * Marks all user's pending notifications as READ.
   * @returns {Promise<Object>}
   */
  async markAllAsRead() {
    return await apiRequest('/reminders/read-all', {
      method: 'POST',
    });
  },

  /**
   * Fetches upcoming reminders within the specified forward days window (default 7 days).
   * @param {number} [days=7]
   * @returns {Promise<Array>}
   */
  async getUpcomingReminders(days = 7) {
    return await apiRequest(`/notifications/upcoming?days=${days}`);
  },

  /**
   * Fetches user's notification preferences & settings.
   * @returns {Promise<Object>}
   */
  async getNotificationSettings() {
    return await apiRequest('/notifications/settings');
  },

  /**
   * Updates user's notification preferences & settings.
   * @param {Object} settings - { subscription_reminders_enabled?, expense_reminders_enabled?, reminder_days_before? }
   * @returns {Promise<Object>}
   */
  async updateNotificationSettings(settings) {
    return await apiRequest('/notifications/settings', {
      method: 'PUT',
      body: settings,
    });
  },

  /**
   * Triggers the background reminder processor to generate reminders for due renewals and expenses.
   * @returns {Promise<Object>}
   */
  async processReminders() {
    return await apiRequest('/notifications/process', {
      method: 'POST',
    });
  },
};
