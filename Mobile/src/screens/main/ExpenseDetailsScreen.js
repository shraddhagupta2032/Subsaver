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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { expensesApi } from '../../api/expenses';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors } from '../../theme/colors';

export const ExpenseDetailsScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { expenseId, expenseTitle } = route.params || {};
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

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

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading expense details...</Text>
      </SafeAreaView>
    );
  }

  const title = expense?.title || expenseTitle || 'Expense Details';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.headerContainer, { maxWidth: isDesktop ? 680 : '100%' }]}>
        <ScreenHeader
          title={title}
          subtitle={expense?.group_name || 'Group Expense'}
          back
          onBack={() => navigation.goBack()}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: isDesktop ? 680 : '100%', paddingHorizontal: isDesktop ? 24 : 16 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Total Expense Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total amount</Text>
          <Text style={styles.heroAmount}>
            ₹{Number(expense?.total_amount || 0).toLocaleString('en-IN')}
          </Text>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaText}>Paid by {expense?.payer_name || 'Group member'}</Text>
            <Text style={styles.heroMetaDot}>•</Text>
            <Text style={styles.heroMetaText}>{expense?.expense_date || 'Recent'}</Text>
          </View>
        </View>

        {/* User Split Action Card */}
        {userSplit && (
          <View style={styles.userSplitCard}>
            <View style={styles.userSplitHeader}>
              <View>
                <Text style={styles.userSplitLabel}>Your Share</Text>
                <Text style={styles.userSplitAmount}>
                  ₹{Number(userSplit.amount_owed).toLocaleString('en-IN')}
                </Text>
              </View>
              <Badge
                text={userSplit.status}
                variant={
                  userSplit.status === 'PAID'
                    ? 'success'
                    : userSplit.status === 'PAY_LATER'
                    ? 'warning'
                    : 'danger'
                }
              />
            </View>

            {userSplit.status !== 'PAID' && (
              <View style={styles.splitActionRow}>
                <Button
                  title="Mark as Paid"
                  onPress={handleMarkAsPaid}
                  loading={submittingPay}
                  style={styles.actionBtn}
                />
                <Button
                  title="Pay Later"
                  variant="secondary"
                  onPress={() => {
                    setPayLaterError(null);
                    setPayLaterModalVisible(true);
                  }}
                  style={styles.actionBtn}
                />
              </View>
            )}
          </View>
        )}

        {/* Splits Breakdown */}
        <Text style={styles.sectionTitle}>Split Breakdown</Text>
        <View style={styles.splitsContainer}>
          {expense?.splits?.map((s, idx) => {
            const isLast = idx === (expense.splits.length - 1);
            return (
              <View key={s.id || idx} style={[styles.splitRow, !isLast && styles.splitBorder]}>
                <View style={styles.splitLeft}>
                  <Avatar name={s.user_name || 'Member'} size="small" />
                  <View style={styles.splitNameCol}>
                    <Text style={styles.splitName}>{s.user_name || 'User'}</Text>
                    {s.promised_payment_date && (
                      <Text style={styles.promisedDate}>
                        Promised: {s.promised_payment_date}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.splitRight}>
                  <Text style={styles.splitAmount}>
                    ₹{Number(s.amount_owed).toLocaleString('en-IN')}
                  </Text>
                  <Badge
                    text={s.status}
                    variant={
                      s.status === 'PAID'
                        ? 'success'
                        : s.status === 'PAY_LATER'
                        ? 'warning'
                        : 'danger'
                    }
                    size="small"
                  />
                </View>
              </View>
            );
          })}
        </View>

        {expense?.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{expense.notes}</Text>
          </View>
        ) : null}
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
              <Text style={styles.modalTitle}>Set Pay Later Date</Text>
              <TouchableOpacity onPress={() => setPayLaterModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Enter the date you promise to settle this debt (YYYY-MM-DD).
            </Text>

            {payLaterError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{payLaterError}</Text>
              </View>
            )}

            <Input
              label="Promised Payment Date"
              value={promisedDate}
              onChangeText={setPromisedDate}
              placeholder="e.g. 2025-06-30"
              autoFocus
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setPayLaterModalVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Confirm Date"
                onPress={handlePayLater}
                loading={submittingPayLater}
                style={styles.modalBtn}
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
  headerContainer: {
    paddingHorizontal: 20,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
    width: '100%',
    alignSelf: 'center',
  },
  heroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 22,
    padding: 20,
    marginVertical: 12,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 4,
  },
  heroLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroMetaText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
  },
  heroMetaDot: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  userSplitCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  userSplitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  userSplitLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  userSplitAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  splitActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 44,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
    marginLeft: 4,
  },
  splitsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  splitBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  splitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  splitNameCol: {
    justifyContent: 'center',
  },
  splitName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  promisedDate: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
    marginTop: 2,
  },
  splitRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  splitAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  notesBox: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 32, 29, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 46,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
});
