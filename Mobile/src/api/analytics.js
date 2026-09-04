import { apiRequest } from './client';

export const analyticsApi = {
  /**
   * Fetches overall financial summary.
   * Returns: { total_subscription_monthly, total_subscription_yearly, total_subscription_active, total_expense_owed, total_expense_paid, total_expense_pending, total_expense_pay_later, upcoming_subscription_renewals, upcoming_expense_payments }
   */
  async getFinancialSummary() {
    return await apiRequest('/analytics/summary');
  },

  /**
   * Fetches monthly spending analysis with previous month comparison & 6-month historical trend.
   * Returns: { current_month_spending, previous_month_spending, percentage_change, is_increase, current_month_name, previous_month_name, trends }
   */
  async getMonthlySpending() {
    return await apiRequest('/analytics/monthly-spending');
  },

  /**
   * Fetches category-wise combined spending distribution (expenses + subscriptions).
   * Returns: { total_spending, categories: [{ category, amount, percentage, expense_count }] }
   */
  async getCategorySpending() {
    return await apiRequest('/analytics/categories/spending');
  },

  /**
   * Fetches subscription breakdown by category.
   */
  async getSubscriptionCategories() {
    return await apiRequest('/analytics/subscriptions/categories');
  },

  /**
   * Fetches upcoming subscription renewals.
   * @param {number} [days=30]
   */
  async getUpcomingSubscriptions(days = 30) {
    return await apiRequest(`/analytics/subscriptions/upcoming?days=${days}`);
  },

  /**
   * Fetches upcoming expense payments due.
   * @param {number} [days=30]
   */
  async getUpcomingExpenses(days = 30) {
    return await apiRequest(`/analytics/expenses/upcoming?days=${days}`);
  },

  /**
   * Fetches overall group debt & receivable balances summary.
   * Returns: { total_owed, total_receivable, net_balance, groups_count }
   */
  async getGroupBalancesSummary() {
    return await apiRequest('/analytics/group-balances/summary');
  },

  /**
   * Fetches specific group balances and simplified debt graph.
   * @param {number|string} groupId
   */
  async getGroupBalances(groupId) {
    return await apiRequest(`/groups/${groupId}/balances`);
  },

  /**
   * Fetches user's budget overview & category budget statuses.
   */
  async getBudgetOverview() {
    return await apiRequest('/budgets/overview');
  },

  /**
   * Fetches list of all active budgets with status (WITHIN_LIMIT, NEAR_LIMIT, OVER_LIMIT).
   */
  async getBudgets() {
    return await apiRequest('/budgets/');
  },

  /**
   * Fetches subscription intelligence summary.
   */
  async getSubscriptionIntelligenceSummary() {
    return await apiRequest('/subscription-intelligence/summary');
  },

  /**
   * Fetches subscription health score & diagnostic factors.
   */
  async getSubscriptionHealth() {
    return await apiRequest('/subscription-intelligence/health');
  },

  /**
   * Fetches unified recent financial activity (expenses, subscriptions, settlements).
   * @param {number} [limit=10]
   */
  async getRecentActivity(limit = 10) {
    return await apiRequest(`/analytics/activity/recent?limit=${limit}`);
  },
};

