import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { expensesApi } from '../../api/expenses';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors } from '../../theme/colors';

export const ExpenseDetailsScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { expenseId } = route.params || {};

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Pay Later Modal State
  const [payLaterModalVisible, setPayLaterModalVisible] = useState(false);
  const [promisedDate, setPromisedDate] = useState('');
  const [submittingPayLater, setSubmittingPayLater] = useState(false);
  const [submittingPay, setSubmittingPay] = useState(false);
  const [payLaterError, setPayLaterError] = useState(null);

  const fetchExpense = useCallback(async () => {
    if (!expenseId) return;
    try {
      setError(null);
      const data = await expensesApi.getExpenseById(expenseId);
      setExpense(data);
    } catch (err) {
      console.warn('fetchExpense error:', err);
      setError(err.message || 'Failed to load expense details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [expenseId]);

  useEffect(() => {
    fetchExpense();
  }, [fetchExpense]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpense();
  };

  // Find the current logged in user's split record
  const userSplit = expense?.splits?.find((s) => s.user_id === user?.id);

  const handleMarkAsPaid = async () => {
    if (!userSplit) return;
    try {
      setSubmittingPay(true);
      await expensesApi.markSplitAsPaid(expenseId, userSplit.id);
      Alert.alert('Payment Recorded', 'Your split has been marked as PAID.');
      fetchExpense();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to mark split as paid.');
    } finally {
      setSubmittingPay(false);
    }
  };

  const handlePayLater = async () => {
    if (!userSplit) return;
    if (!promisedDate.trim()) {
      setPayLaterError('Please enter a promised payment date.');
      return;
    }

    try {
      setSubmittingPayLater(true);
      setPayLaterError(null);
      await expensesApi.setSplitPayLater(expenseId, userSplit.id, promisedDate.trim());
      setPayLaterModalVisible(false);
      setPromisedDate('');
      Alert.alert('Pay Later Set', `Promised payment date set to: ${promisedDate.trim()}`);
      fetchExpense();
    } catch (err) {
      setPayLaterError(err.message || 'Failed to set Pay Later.');
    } finally {
      setSubmittingPayLater(false);
    }
  };

  const setPresetDate = (daysFromNow) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setPromisedDate(d.toISOString().split('T')[0]);
    setPayLaterError(null);
  };

  const setNextFriday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    setPromisedDate(d.toISOString().split('T')[0]);
    setPayLaterError(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return { bg: colors.successBg, text: colors.success, label: 'PAID' };
      case 'PAY_LATER':
        return { bg: colors.purpleBg, text: colors.purple, label: 'PAY LATER' };
      case 'OVERDUE':
        return { bg: colors.dangerBg, text: colors.danger, label: 'OVERDUE' };
      default:
        return { bg: colors.warningBg, text: colors.warning, label: 'PENDING' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading expense details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {expense?.title || 'Expense Details'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {expense?.group_name || 'Group Expense'}
          </Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Main Expense Banner */}
        <Card style={styles.mainCard}>
          <Text style={styles.expenseMainTitle}>{expense?.title}</Text>
          <Text style={styles.expenseTotalAmount}>
            ₹{Number(expense?.total_amount || 0).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.expenseMetaText}>
            Paid by <Text style={styles.boldText}>{expense?.payer_name}</Text> on {expense?.expense_date}
          </Text>
          {expense?.due_date && (
            <Text style={styles.dueDateText}>Due Date: {expense.due_date}</Text>
          )}
          {expense?.notes && (
            <Text style={styles.notesText}>Note: {expense.notes}</Text>
          )}
        </Card>

        {/* User's Own Split Action Banner */}
        {userSplit && (
          <Card style={styles.userActionCard}>
            <View style={styles.userActionHeader}>
              <View>
                <Text style={styles.userActionTitle}>Your Split Status</Text>
                <Text style={styles.userActionAmount}>
                  Owed: ₹{Number(userSplit.amount_owed).toLocaleString('en-IN')}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: getStatusBadge(userSplit.status).bg },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    { color: getStatusBadge(userSplit.status).text },
                  ]}
                >
                  {getStatusBadge(userSplit.status).label}
                </Text>
              </View>
            </View>

            {userSplit.status === 'PAY_LATER' && (
              <View style={styles.promisedDateBanner}>
                <Ionicons name="calendar-outline" size={16} color={colors.purple} />
                <Text style={styles.promisedDateText}>
                  Promised Payment Date: <Text style={styles.boldText}>{userSplit.promised_payment_date}</Text>
                </Text>
              </View>
            )}

            {userSplit.status === 'PAID' && (
              <View style={styles.paidConfirmedBanner}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.paidConfirmedText}>
                  Paid in full {userSplit.paid_at ? `on ${userSplit.paid_at.split('T')[0]}` : ''}
                </Text>
              </View>
            )}

            {userSplit.status !== 'PAID' && (
              <View style={styles.actionButtonsRow}>
                <Button
                  title="Mark as Paid"
                  onPress={handleMarkAsPaid}
                  loading={submittingPay}
                  style={styles.payBtn}
                />
                <Button
                  title="Pay Later"
                  variant="outline"
                  onPress={() => setPayLaterModalVisible(true)}
                  style={styles.payLaterBtn}
                />
              </View>
            )}
          </Card>
        )}

        {/* All Splits List */}
        <Card>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Individual Splits</Text>
            </View>
            <Text style={styles.splitsTotalCount}>
              {expense?.splits?.length || 0} participants
            </Text>
          </View>

          {expense?.splits?.map((split) => {
            const badge = getStatusBadge(split.status);
            const isCurrentUser = split.user_id === user?.id;
            return (
              <View key={split.id} style={styles.splitRow}>
                <View style={styles.splitUserLeft}>
                  <View style={styles.splitAvatar}>
                    <Text style={styles.splitAvatarText}>
                      {(split.user_name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.splitInfo}>
                    <Text style={styles.splitUserName}>
                      {split.user_name} {isCurrentUser ? '(You)' : ''}
                    </Text>
                    {split.status === 'PAY_LATER' && split.promised_payment_date && (
                      <Text style={styles.splitPromisedDate}>
                        Promised: {split.promised_payment_date}
                      </Text>
                    )}
                    {split.status === 'PAID' && (
                      <Text style={styles.splitPaidDate}>Settled</Text>
                    )}
                  </View>
                </View>

                <View style={styles.splitUserRight}>
                  <Text style={styles.splitAmount}>
                    ₹{Number(split.amount_owed).toLocaleString('en-IN')}
                  </Text>
                  <View style={[styles.miniStatusPill, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.miniStatusText, { color: badge.text }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </Card>
      </ScrollView>

      {/* Pay Later Modal */}
      <Modal
        visible={payLaterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPayLaterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Promised Payment Date</Text>
              <TouchableOpacity onPress={() => setPayLaterModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Let the group and payer know when you plan to settle your ₹
              {Number(userSplit?.amount_owed || 0).toFixed(2)} share.
            </Text>

            {payLaterError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <Text style={styles.errorBannerText}>{payLaterError}</Text>
              </View>
            )}

            {/* Quick Presets */}
            <Text style={styles.presetLabel}>Quick Presets:</Text>
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => setPresetDate(1)}
              >
                <Text style={styles.presetChipText}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={setNextFriday}
              >
                <Text style={styles.presetChipText}>This Friday</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => setPresetDate(7)}
              >
                <Text style={styles.presetChipText}>In 7 Days</Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Promised Date (YYYY-MM-DD)"
              value={promisedDate}
              onChangeText={(text) => {
                setPromisedDate(text);
                setPayLaterError(null);
              }}
              placeholder="e.g. 2026-08-21"
              icon="calendar-outline"
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setPayLaterModalVisible(false)}
                style={styles.modalCancelBtn}
              />
              <Button
                title="Confirm Pay Later"
                onPress={handlePayLater}
                loading={submittingPayLater}
                style={styles.modalSubmitBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
    padding: 12,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  mainCard: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  expenseMainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  expenseTotalAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
  },
  expenseMetaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  boldText: {
    fontWeight: '700',
    color: colors.text,
  },
  dueDateText: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 6,
  },
  notesText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  userActionCard: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginBottom: 16,
  },
  userActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  userActionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  promisedDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purpleBg,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  promisedDateText: {
    color: colors.purple,
    fontSize: 12,
    marginLeft: 6,
  },
  paidConfirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  paidConfirmedText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  payBtn: {
    flex: 1,
    marginRight: 6,
    height: 44,
  },
  payLaterBtn: {
    flex: 1,
    marginLeft: 6,
    height: 44,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  splitsTotalCount: {
    color: colors.textMuted,
    fontSize: 12,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  splitUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  splitAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  splitAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  splitInfo: {
    flex: 1,
  },
  splitUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  splitPromisedDate: {
    fontSize: 11,
    color: colors.purple,
    marginTop: 2,
  },
  splitPaidDate: {
    fontSize: 11,
    color: colors.success,
    marginTop: 2,
  },
  splitUserRight: {
    alignItems: 'flex-end',
  },
  splitAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  miniStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  miniStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  presetChip: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  presetChipText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  modalCancelBtn: {
    flex: 1,
    marginRight: 8,
  },
  modalSubmitBtn: {
    flex: 1,
    marginLeft: 8,
  },
});
