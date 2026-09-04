import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { budgetsApi } from '../../api/budgets';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';

export const BudgetsScreen = ({ navigation }) => {
  const [budgets, setBudgets] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const fetchBudgetsData = useCallback(async () => {
    try {
      setError(null);
      const [budgetsRes, overviewRes] = await Promise.all([
        budgetsApi.getBudgets(),
        budgetsApi.getBudgetOverview().catch(() => null),
      ]);

      setBudgets(budgetsRes || []);
      setOverview(overviewRes);
    } catch (err) {
      console.warn('Budgets load error:', err);
      setError(err.message || 'Unable to load category budgets. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgetsData();
  }, [fetchBudgetsData]);

  // Re-fetch when navigating back to screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBudgetsData();
    });
    return unsubscribe;
  }, [navigation, fetchBudgetsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBudgetsData();
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'OVER_LIMIT':
      case 'EXCEEDED':
        return {
          label: 'OVER LIMIT',
          color: colors.danger,
          bg: colors.dangerBg,
          icon: 'alert-circle',
        };
      case 'NEAR_LIMIT':
      case 'WARNING':
        return {
          label: 'NEAR LIMIT',
          color: colors.warning,
          bg: colors.warningBg,
          icon: 'warning',
        };
      default:
        return {
          label: 'WITHIN LIMIT',
          color: colors.success,
          bg: 'rgba(16, 185, 129, 0.12)',
          icon: 'checkmark-circle',
        };
    }
  };

  const handleDeleteBudget = (budget) => {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete the budget for "${budget.category}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(budget.id);
              await budgetsApi.deleteBudget(budget.id);
              await fetchBudgetsData();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete budget.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Category Budgets</Text>
          <Text style={styles.headerSubtitle}>Set limits and prevent overspending</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddBudget')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading budgets...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
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
          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
              <Text style={styles.errorBannerText}>{error}</Text>
              <TouchableOpacity onPress={fetchBudgetsData} activeOpacity={0.7}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Overview Stat Cards */}
          {overview && (
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { borderLeftColor: colors.primary }]}>
                <Text style={styles.statLabel}>Active Budgets</Text>
                <Text style={styles.statValue}>
                  {overview.budgets_count !== undefined ? overview.budgets_count : budgets.length}
                </Text>
              </View>
              <View
                style={[
                  styles.statBox,
                  {
                    borderLeftColor:
                      overview.exceeded_count > 0 ? colors.danger : colors.success,
                  },
                ]}
              >
                <Text style={styles.statLabel}>Over Limit</Text>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        overview.exceeded_count > 0 ? colors.danger : colors.success,
                    },
                  ]}
                >
                  {overview.exceeded_count || 0}
                </Text>
              </View>
              <View style={[styles.statBox, { borderLeftColor: colors.purple }]}>
                <Text style={styles.statLabel}>Total Budget</Text>
                <Text style={styles.statValue}>
                  ₹{Number(overview.total_budget || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          )}


          {/* Budgets List */}
          {budgets.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="pie-chart-outline" size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Budgets Created</Text>
              <Text style={styles.emptyDescription}>
                Stay in control of your finances by setting spending limits for categories like Food, Entertainment, and Utilities.
              </Text>
              <Button
                title="+ Create Your First Budget"
                onPress={() => navigation.navigate('AddBudget')}
                style={styles.emptyButton}
              />
            </View>
          ) : (
            <View style={styles.budgetsList}>
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Your Category Limits</Text>
                <Text style={styles.countText}>{budgets.length} categories</Text>
              </View>

              {budgets.map((b) => {
                const statusConf = getStatusConfig(b.status);
                const spent = Number(b.spent_amount) || 0;
                const limit = Number(b.monthly_limit) || 0;
                const pct = Number(b.percentage_utilized ?? b.spent_percentage) || 0;
                const isDeleting = deletingId === b.id;

                return (
                  <Card key={b.id} style={styles.budgetCard}>
                    {/* Header: Category & Status */}
                    <View style={styles.cardHeader}>
                      <View style={styles.catTitleRow}>
                        <View style={styles.catIconCircle}>
                          <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
                        </View>
                        <Text style={styles.categoryName}>{b.category}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
                        <Ionicons
                          name={statusConf.icon}
                          size={13}
                          color={statusConf.color}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.statusText, { color: statusConf.color }]}>
                          {statusConf.label}
                        </Text>
                      </View>
                    </View>

                    {/* Monetary Details */}
                    <View style={styles.spendingRow}>
                      <View>
                        <Text style={styles.spendingLabel}>Spent / Limit</Text>
                        <Text style={styles.spendingAmount}>
                          ₹{spent.toLocaleString('en-IN')} / ₹{limit.toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={styles.pctCol}>
                        <Text style={[styles.pctValue, { color: statusConf.color }]}>
                          {pct}%
                        </Text>
                        <Text style={styles.pctLabel}>utilized</Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.min(100, pct)}%`,
                            backgroundColor: statusConf.color,
                          },
                        ]}
                      />
                    </View>

                    {/* Subscriptions & Expenses Breakdown if present */}
                    {(Number(b.subscription_spending) > 0 || Number(b.expense_spending) > 0) && (
                      <View style={styles.subBreakdownRow}>
                        {Number(b.subscription_spending) > 0 && (
                          <Text style={styles.breakdownItem}>
                            🔁 Subs: ₹{Number(b.subscription_spending).toLocaleString('en-IN')}
                          </Text>
                        )}
                        {Number(b.expense_spending) > 0 && (
                          <Text style={styles.breakdownItem}>
                            🧾 Expenses: ₹{Number(b.expense_spending).toLocaleString('en-IN')}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Actions: Edit / Delete */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('EditBudget', { budget: b })}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create-outline" size={16} color={colors.primary} />
                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleDeleteBudget(b)}
                        disabled={isDeleting}
                        activeOpacity={0.7}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color={colors.danger} />
                        ) : (
                          <>
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                            <Text style={[styles.actionBtnText, { color: colors.danger }]}>
                              Delete
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 6,
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
  },
  retryText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 3,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  budgetsList: {
    marginTop: 4,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  countText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  budgetCard: {
    marginBottom: 14,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  catIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  spendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  spendingLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  spendingAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  pctCol: {
    alignItems: 'flex-end',
  },
  pctValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  pctLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  subBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
  },
  breakdownItem: {
    fontSize: 11,
    color: colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    minWidth: 220,
  },
});

export default BudgetsScreen;
