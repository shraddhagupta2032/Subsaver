import { apiRequest } from './client';

/**
 * Settlements API Service
 * Connects to SubSaver FastAPI backend for Group Debt Settlements and Balances.
 */
export const settlementsApi = {
  /**
   * Fetches overall summary of group balances (total owed, total receivable, net balance).
   */
  async getGroupBalancesSummary() {
    return await apiRequest('/analytics/group-balances/summary');
  },

  /**
   * Fetches all simplified debts involving the current user across all groups.
   */
  async getAllUserDebts() {
    return await apiRequest('/groups/user/debts');
  },

  /**
   * Fetches balance calculations and suggested settlements for a specific group.
   * @param {number} groupId
   */
  async getGroupBalances(groupId) {
    return await apiRequest(`/groups/${groupId}/balances`);
  },

  /**
   * Records a settlement payment from current user to a payee.
   * @param {number} groupId
   * @param {Object} settlementData
   * @param {number} settlementData.payee_id
   * @param {number|string} settlementData.amount
   * @param {string} [settlementData.payment_method='UPI'] - UPI, CASH, BANK_TRANSFER, OTHER
   * @param {string} [settlementData.settlement_date]
   * @param {string} [settlementData.notes]
   */
  async recordSettlement(groupId, settlementData) {
    return await apiRequest(`/groups/${groupId}/settlements`, {
      method: 'POST',
      body: JSON.stringify(settlementData),
    });
  },

  /**
   * Fetches settlement history for a specific group.
   * @param {number} groupId
   */
  async getGroupSettlements(groupId) {
    return await apiRequest(`/groups/${groupId}/settlements`);
  },

  /**
   * Fetches single settlement details by ID.
   * @param {number} groupId
   * @param {number} settlementId
   */
  async getSettlementById(groupId, settlementId) {
    return await apiRequest(`/groups/${groupId}/settlements/${settlementId}`);
  },
};

export default settlementsApi;
