import { apiRequest } from './client';

export const expensesApi = {
  async getExpenses(groupId = null) {
    const query = groupId ? `?group_id=${groupId}` : '';
    return await apiRequest(`/expenses${query}`);
  },

  async getExpenseById(expenseId) {
    return await apiRequest(`/expenses/${expenseId}`);
  },

  async createExpense({
    title,
    total_amount,
    group_id,
    payer_id,
    split_user_ids,
    expense_date,
    due_date,
    notes,
  }) {
    return await apiRequest('/expenses', {
      method: 'POST',
      body: {
        title,
        total_amount,
        group_id,
        payer_id,
        split_user_ids,
        expense_date: expense_date || undefined,
        due_date: due_date || undefined,
        notes: notes || undefined,
        split_type: 'EQUAL',
      },
    });
  },

  async markSplitAsPaid(expenseId, splitId) {
    return await apiRequest(`/expenses/${expenseId}/splits/${splitId}/pay`, {
      method: 'POST',
    });
  },

  async setSplitPayLater(expenseId, splitId, promisedPaymentDate) {
    return await apiRequest(`/expenses/${expenseId}/splits/${splitId}/pay-later`, {
      method: 'POST',
      body: {
        promised_payment_date: promisedPaymentDate,
      },
    });
  },
};
