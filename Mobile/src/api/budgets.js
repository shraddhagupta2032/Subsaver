import { apiRequest } from './client';

/**
 * Budgets API Service
 * Connects to SubSaver FastAPI backend for Category Budget Management.
 */
export const budgetsApi = {
  /**
   * Fetches all category budgets with real-time status and spending calculations.
   */
  async getBudgets() {
    return await apiRequest('/budgets/');
  },

  /**
   * Fetches overall budget overview including active count, over limit count, and total monthly limits.
   */
  async getBudgetOverview() {
    return await apiRequest('/budgets/overview');
  },

  /**
   * Fetches single budget details by ID.
   * @param {number} budgetId
   */
  async getBudget(budgetId) {
    return await apiRequest(`/budgets/${budgetId}`);
  },

  /**
   * Creates a new category budget.
   * @param {Object} budgetData
   * @param {string} budgetData.category
   * @param {number|string} budgetData.monthly_limit
   * @param {number} [budgetData.alert_threshold_percentage=80]
   * @param {number} [budgetData.month]
   * @param {number} [budgetData.year]
   */
  async createBudget(budgetData) {
    return await apiRequest('/budgets/', {
      method: 'POST',
      body: JSON.stringify(budgetData),
    });
  },

  /**
   * Updates an existing category budget.
   * @param {number} budgetId
   * @param {Object} updateData
   * @param {string} [updateData.category]
   * @param {number|string} [updateData.monthly_limit]
   * @param {number} [updateData.alert_threshold_percentage]
   */
  async updateBudget(budgetId, updateData) {
    return await apiRequest(`/budgets/${budgetId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  /**
   * Deletes a category budget.
   * @param {number} budgetId
   */
  async deleteBudget(budgetId) {
    return await apiRequest(`/budgets/${budgetId}`, {
      method: 'DELETE',
    });
  },
};

export default budgetsApi;
