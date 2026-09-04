import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { analyticsApi } from '../../api/analytics';
import { Card } from '../../components/Card';
import { StatCard } from '../../components/StatCard';
import { colors } from '../../theme/colors';

export const AnalyticsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState(null);
  const [monthlySpending, setMonthlySpending] = useState(null);
  const [categorySpending, setCategorySpending] = useState(null);
  const [groupBalances, setGroupBalances] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  const [health, setHealth] = useState(null);
  const [activities, setActivities] = useState([]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setError(null);
      const [
        summaryRes,
        monthlyRes,
        categoryRes,
        groupBalRes,
        budgetsRes,
        intelRes,
        healthRes,
        activityRes,
      ] = await Promise.all([
        analyticsApi.getFinancialSummary(),
        analyticsApi.getMonthlySpending(),
        analyticsApi.getCategorySpending(),
        analyticsApi.getGroupBalancesSummary(),
        analyticsApi.getBudgets(),
        analyticsApi.getSubscriptionIntelligenceSummary(),
        analyticsApi.getSubscriptionHealth(),
        analyticsApi.getRecentActivity(10),
      ]);

      setSummary(summaryRes);
      setMonthlySpending(monthlyRes);
      setCategorySpending(categoryRes);
      setGroupBalances(groupBalRes);
      setBudgets(budgetsRes || []);
      setIntelligence(intelRes);
      setHealth(healthRes);
      setActivities(activityRes || []);

    } catch (err) {
      console.warn('Analytics load error:', err);
      setError(err.message || 'Unable to load your financial analytics. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalyticsData();
  };

  const getBudgetStatusColor = (status) => {
    switch (status) {
      case 'OVER_LIMIT':
      case 'EXCEEDED':
        return { color: colors.danger, bg: colors.dangerBg, text: 'OVER LIMIT' };
      case 'NEAR_LIMIT':
      case 'WARNING':
        return { color: colors.warning, bg: colors.warningBg, text: 'NEAR LIMIT' };
      default:
        return { color: colors.success, bg: 'rgba(16, 185, 129, 0.12)', text: 'WITHIN LIMIT' };
    }
  };


  const getHealthColor = (score) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.danger;
  };

  const maxTrendSpend = monthlySpending?.trends?.length
    ? Math.max(...monthlySpending.trends.map((t) => Number(t.spending) || 0), 1)
    : 1;

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your financial analytics...</Text>
      </SafeAreaView>
    );
  }

  const isZeroUser =
    (!summary || (Number(summary.total_subscription_monthly) === 0 && Number(summary.total_expense_owed) === 0)) &&
    (!monthlySpending || Number(monthlySpending.current_month_spending) === 0) &&
    (!categorySpending || categorySpending.categories.length === 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Financial Analytics</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAnalyticsData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
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
        {isZeroUser ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Financial Activity Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first expense or subscription to start tracking analytics and financial insights.
            </Text>
          </View>
        ) : (
          <>
            {/* 1. Top Key Metric Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatCard
                  title="Monthly Spending"
                  value={`₹${Number(monthlySpending?.current_month_spending ?? 0).toLocaleString('en-IN')}`}
                  icon="wallet-outline"
                  iconColor={colors.primary}
                  subtext={monthlySpending?.current_month_name || 'This Month'}
                />
                <StatCard
                  title="Subscriptions"
                  value={`₹${Number(intelligence?.monthly_subscription_cost ?? summary?.total_subscription_monthly ?? 0).toLocaleString('en-IN')}`}
                  icon="layers-outline"
                  iconColor={colors.purple}
                  subtext={`${intelligence?.active_subscription_count ?? summary?.total_subscription_active ?? 0} Active`}
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard
                  title="You Owe"
                  value={`₹${Number(groupBalances?.total_owed ?? 0).toLocaleString('en-IN')}`}
                  icon="arrow-up-circle-outline"
                  iconColor={colors.danger}
                  subtext="Across Groups"
                />
                <StatCard
                  title="You Are Owed"
                  value={`₹${Number(groupBalances?.total_receivable ?? 0).toLocaleString('en-IN')}`}
                  icon="arrow-down-circle-outline"
                  iconColor={colors.success}
                  subtext={`Net: ${Number(groupBalances?.net_balance ?? 0) >= 0 ? '+' : '-'}₹${Math.abs(Number(groupBalances?.net_balance ?? 0)).toLocaleString('en-IN')}`}
                />
              </View>
            </View>

            {/* 2. Monthly Spending Overview */}
            {monthlySpending && (
              <Card>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>
                      {monthlySpending.current_month_name} Spending
                    </Text>
                  </View>
                </View>

                <View style={styles.spendingHeroRow}>
                  <Text style={styles.spendingHeroAmount}>
                    ₹{Number(monthlySpending.current_month_spending).toLocaleString('en-IN')}
                  </Text>
                  {monthlySpending.percentage_change !== null && monthlySpending.percentage_change !== undefined && (
                    <View
                      style={[
                        styles.changePill,
                        {
                          backgroundColor: monthlySpending.is_increase
                            ? colors.dangerBg
                            : 'rgba(16, 185, 129, 0.12)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={monthlySpending.is_increase ? 'arrow-up' : 'arrow-down'}
                        size={14}
                        color={monthlySpending.is_increase ? colors.danger : colors.success}
                      />
                      <Text
                        style={[
                          styles.changePillText,
                          {
                            color: monthlySpending.is_increase ? colors.danger : colors.success,
                          },
                        ]}
                      >
                        {monthlySpending.percentage_change}% from {monthlySpending.previous_month_name}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            )}

            {/* 3. Spending Trends Chart / Visualization */}
            {monthlySpending?.trends?.length > 0 && (
              <Card>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="trending-up-outline" size={20} color={colors.info} />
                    <Text style={styles.sectionTitle}>Spending Trend</Text>
                  </View>
                </View>

                <View style={styles.trendBarsRow}>
                  {monthlySpending.trends.map((item, idx) => {
                    const spend = Number(item.spending) || 0;
                    const heightPct = Math.max(15, Math.round((spend / maxTrendSpend) * 100));
                    const isCurrent = idx === monthlySpending.trends.length - 1;

                    return (
                      <View key={idx} style={styles.trendCol}>
                        <Text style={styles.trendValText}>
                          {spend > 0 ? `₹${spend >= 1000 ? (spend / 1000).toFixed(1) + 'k' : spend}` : '0'}
                        </Text>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${heightPct}%`,
                                backgroundColor: isCurrent ? colors.primary : colors.surfaceLight,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.trendMonthLabel, isCurrent && styles.trendMonthLabelActive]}>
                          {item.month_name}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            )}

            {/* 4. Category Breakdown */}
            {categorySpending?.categories?.length > 0 && (
              <Card>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="pie-chart-outline" size={20} color={colors.warning} />
                    <Text style={styles.sectionTitle}>Spending by Category</Text>
                  </View>
                  <Text style={styles.subtextMuted}>
                    Total: ₹{Number(categorySpending.total_spending).toLocaleString('en-IN')}
                  </Text>
                </View>

                {categorySpending.categories.map((cat, idx) => (
                  <View key={idx} style={styles.categoryRow}>
                    <View style={styles.catInfoRow}>
                      <Text style={styles.catName}>{cat.category}</Text>
                      <Text style={styles.catAmount}>
                        ₹{Number(cat.amount).toLocaleString('en-IN')} ({cat.percentage}%)
                      </Text>
                    </View>
                    <View style={styles.catBarTrack}>
                      <View
                        style={[
                          styles.catBarFill,
                          {
                            width: `${Math.min(100, Math.max(2, cat.percentage))}%`,
                            backgroundColor:
                              idx === 0
                                ? colors.primary
                                : idx === 1
                                ? colors.purple
                                : idx === 2
                                ? colors.warning
                                : colors.info,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* 5. Category Budgets Integration */}
            {budgets.length > 0 && (
              <Card>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
                    <Text style={styles.sectionTitle}>Category Budgets</Text>
                  </View>
                </View>

                {budgets.map((b) => {
                  const statusConf = getBudgetStatusColor(b.status);
                  return (
                    <View key={b.id} style={styles.budgetItem}>
                      <View style={styles.budgetHeader}>
                        <Text style={styles.budgetName}>{b.category}</Text>
                        <View style={[styles.budgetStatusPill, { backgroundColor: statusConf.bg }]}>
                          <Text style={[styles.budgetStatusText, { color: statusConf.color }]}>
                            {statusConf.text}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.budgetNumbersRow}>
                        <Text style={styles.budgetSpentText}>
                          ₹{Number(b.spent_amount).toLocaleString('en-IN')} / ₹{Number(b.monthly_limit).toLocaleString('en-IN')}
                        </Text>
                        <Text style={[styles.budgetPctText, { color: statusConf.color }]}>
                          {b.percentage_utilized ?? b.spent_percentage ?? 0}% used
                        </Text>
                      </View>
                      <View style={styles.catBarTrack}>
                        <View
                          style={[
                            styles.catBarFill,
                            {
                              width: `${Math.min(100, b.percentage_utilized ?? b.spent_percentage ?? 0)}%`,
                              backgroundColor: statusConf.color,
                            },
                          ]}
                        />
                      </View>

                    </View>
                  );
                })}
              </Card>
            )}

            {/* 6. Group Money Summary */}
            {groupBalances && (
              <Card>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="people-outline" size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Group Money</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('Groups')}>
                    <Text style={styles.linkText}>View Groups →</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.groupMoneyGrid}>
                  <View style={styles.groupMoneyCol}>
                    <Text style={styles.groupMoneyLabel}>You Owe</Text>
                    <Text style={[styles.groupMoneyVal, { color: colors.danger }]}>
                      ₹{Number(groupBalances.total_owed).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.groupMoneyCol}>
                    <Text style={styles.groupMoneyLabel}>You Are Owed</Text>
                    <Text style={[styles.groupMoneyVal, { color: colors.success }]}>
                      ₹{Number(groupBalances.total_receivable).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.groupMoneyCol}>
                    <Text style={styles.groupMoneyLabel}>Net Balance</Text>
                    <Text
                      style={[
                        styles.groupMoneyVal,
                        {
                          color:
                            Number(groupBalances.net_balance) >= 0 ? colors.success : colors.danger,
                        },
                      ]}
                    >
                      {Number(groupBalances.net_balance) >= 0 ? '+' : '-'}₹{Math.abs(Number(groupBalances.net_balance)).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* 7. Subscription Health & Insights */}
            {intelligence && (
              <Card>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="fitness-outline" size={20} color={colors.purple} />
                    <Text style={styles.sectionTitle}>Subscription Health</Text>
                  </View>
                  <View
                    style={[
                      styles.healthScoreBadge,
                      {
                        backgroundColor: `${getHealthColor(health?.health_score ?? 100)}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.healthScoreText,
                        { color: getHealthColor(health?.health_score ?? 100) },
                      ]}
                    >
                      {health?.health_score ?? 100} / 100
                    </Text>
                  </View>
                </View>

                {health?.factors?.length > 0 && (
                  <View style={styles.factorsList}>
                    {health.factors.slice(0, 2).map((factor, idx) => (
                      <View key={idx} style={styles.factorItem}>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={16}
                          color={getHealthColor(health.health_score)}
                          style={styles.factorIcon}
                        />
                        <Text style={styles.factorText}>{factor}</Text>
                      </View>
                    ))}
                  </View>
                )}


                <TouchableOpacity
                  style={styles.insightsButton}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('SubscriptionInsights')}
                >
                  <Text style={styles.insightsButtonText}>View Subscription Insights →</Text>
                </TouchableOpacity>
              </Card>
            )}

            {/* 8. Unified Recent Financial Activity */}
            {activities.length > 0 && (
              <Card>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="list-outline" size={20} color={colors.info} />
                    <Text style={styles.sectionTitle}>Recent Financial Activity</Text>
                  </View>
                </View>

                {activities.map((act) => {
                  const isExp = act.activity_type === 'EXPENSE';
                  const isSub = act.activity_type === 'SUBSCRIPTION';

                  return (
                    <TouchableOpacity
                      key={act.id}
                      style={styles.activityItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (isSub && act.reference_id) {
                          navigation.navigate('SubscriptionDetails', {
                            subscriptionId: act.reference_id,
                            subscriptionName: act.title,
                          });
                        } else if (isExp && act.reference_id) {
                          navigation.navigate('ExpenseDetails', {
                            expenseId: act.reference_id,
                            expenseTitle: act.title,
                          });
                        }
                      }}
                    >
                      <View style={styles.activityLeft}>
                        <View
                          style={[
                            styles.activityIconBox,
                            {
                              backgroundColor: isExp
                                ? colors.dangerBg
                                : isSub
                                ? 'rgba(59, 130, 246, 0.12)'
                                : 'rgba(16, 185, 129, 0.12)',
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              isExp
                                ? 'receipt-outline'
                                : isSub
                                ? 'layers-outline'
                                : 'checkmark-done-outline'
                            }
                            size={18}
                            color={isExp ? colors.danger : isSub ? colors.primary : colors.success}
                          />
                        </View>
                        <View style={styles.activityInfo}>
                          <Text style={styles.activityTitle}>{act.title}</Text>
                          <Text style={styles.activityDate}>
                            {act.date} • {act.activity_type}
                            {act.group_name ? ` (${act.group_name})` : ''}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.activityAmount}>
                        ₹{Number(act.amount).toLocaleString('en-IN')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </Card>
            )}
          </>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  refreshButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsGrid: {
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
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
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtextMuted: {
    fontSize: 12,
    color: colors.textMuted,
  },
  linkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  spendingHeroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  spendingHeroAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  changePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  trendBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 20,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendValText: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  barTrack: {
    width: 24,
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  trendMonthLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    fontWeight: '600',
  },
  trendMonthLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  categoryRow: {
    marginBottom: 12,
  },
  catInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  catAmount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  catBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetItem: {
    marginBottom: 14,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  budgetName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  budgetStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  budgetStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  budgetNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  budgetSpentText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  budgetPctText: {
    fontSize: 13,
    fontWeight: '700',
  },
  groupMoneyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  groupMoneyCol: {
    flex: 1,
    alignItems: 'center',
  },
  groupMoneyLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  groupMoneyVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  healthScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  healthScoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  factorsList: {
    marginTop: 4,
    marginBottom: 8,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  factorIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  factorText: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  insightsButton: {
    marginTop: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  insightsButtonText: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '700',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  activityDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    margin: 16,
    marginBottom: 0,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
