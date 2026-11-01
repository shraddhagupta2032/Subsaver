import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../api/dashboard';
import { analyticsApi } from '../../api/analytics';
import { notificationsApi } from '../../api/notifications';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';

export const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Financial data states from backend APIs
  const [monthlySpending, setMonthlySpending] = useState(null);
  const [groupBalances, setGroupBalances] = useState(null);
  const [categorySpending, setCategorySpending] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  const [health, setHealth] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [
        monthlyRes,
        groupBalRes,
        categoryRes,
        budgetsRes,
        intelRes,
        healthRes,
        activityRes,
        renewalsRes,
        unreadRes,
      ] = await Promise.all([
        analyticsApi.getMonthlySpending().catch(() => null),
        analyticsApi.getGroupBalancesSummary().catch(() => null),
        analyticsApi.getCategorySpending().catch(() => null),
        analyticsApi.getBudgets().catch(() => []),
        analyticsApi.getSubscriptionIntelligenceSummary().catch(() => null),
        analyticsApi.getSubscriptionHealth().catch(() => null),
        analyticsApi.getRecentActivity(5).catch(() => []),
        dashboardApi.getUpcomingRenewals(7).catch(() => []),
        notificationsApi.getUnreadCount().catch(() => 0),
      ]);

      setMonthlySpending(monthlyRes);
      setGroupBalances(groupBalRes);
      setCategorySpending(categoryRes);
      setBudgets(budgetsRes || []);
      setIntelligence(intelRes);
      setHealth(healthRes);
      setRecentActivity(activityRes || []);
      setRenewals(renewalsRes || []);
      setUnreadCount(unreadRes || 0);
    } catch (err) {
      console.warn('Dashboard load error:', err);
      setError(err.message || 'Failed to fetch latest dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const todayEyebrow = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).toUpperCase();
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  // Budget calculations
  const totalBudgetLimit = useMemo(() => {
    if (budgets && budgets.length > 0) {
      return budgets.reduce((sum, b) => sum + Number(b.monthly_limit || 0), 0);
    }
    return 20000;
  }, [budgets]);

  const totalSpent = Number(monthlySpending?.current_month_spending || 0);
  const budgetUsedPct = Math.min(100, Math.round((totalSpent / (totalBudgetLimit || 1)) * 100));
  const budgetLeft = Math.max(0, totalBudgetLimit - totalSpent);

  const getServiceBadge = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('netflix')) return { bg: '#E50914', text: 'N' };
    if (n.includes('spotify')) return { bg: '#1DB954', text: 'S' };
    if (n.includes('youtube')) return { bg: '#FF0000', text: '▶' };
    if (n.includes('jio') || n.includes('fiber') || n.includes('wifi')) return { bg: '#0A2540', text: 'J' };
    if (n.includes('prime') || n.includes('amazon')) return { bg: '#00A8E1', text: 'A' };
    if (n.includes('apple') || n.includes('icloud')) return { bg: '#000000', text: '' };
    return { bg: colors.primary, text: (name[0] || 'S').toUpperCase() };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your financial snapshot...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: isDesktop ? 1140 : '100%',
            paddingHorizontal: isDesktop ? 24 : 16,
          },
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
        {/* Top Header / Greeting Bar */}
        <View style={styles.dashboardTop}>
          <View style={styles.greetingCol}>
            <Text style={styles.eyebrow}>{todayEyebrow}</Text>
            <Text style={styles.greeting}>Good morning, {firstName}</Text>
            <Text style={styles.greetingSub}>Here’s your money snapshot.</Text>
          </View>

          <View style={styles.topRightActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <Avatar name={user?.name || 'Aarav Mehta'} tone="mint" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={19} color={colors.text} />
              {unreadCount > 0 && <View style={styles.notificationDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={18} color={colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={loadDashboardData} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hero Emerald Spending & Budget Card */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Analytics')}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroTagRow}>
              <Ionicons name="wallet-outline" size={16} color="rgba(255, 255, 255, 0.85)" />
              <Text style={styles.heroTagText}>
                {monthlySpending?.current_month_name || 'Current'} spending
              </Text>
            </View>
            <Ionicons name="trending-up-outline" size={18} color="rgba(255, 255, 255, 0.85)" />
          </View>

          <Text style={styles.heroAmount}>
            ₹{totalSpent.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.heroBudgetSub}>
            of ₹{totalBudgetLimit.toLocaleString('en-IN')} monthly budget
          </Text>

          {/* Budget track */}
          <View style={styles.budgetTrack}>
            <View style={[styles.budgetFill, { width: `${budgetUsedPct}%` }]} />
          </View>

          <View style={styles.heroFootRow}>
            <Text style={styles.heroFootText}>{budgetUsedPct}% used</Text>
            <Text style={styles.heroFootText}>
              ₹{budgetLeft.toLocaleString('en-IN')} left
            </Text>
          </View>
        </TouchableOpacity>

        {/* Side-by-Side Money Grid */}
        <View style={styles.moneyGrid}>
          <TouchableOpacity
            style={styles.moneyCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Settlements')}
          >
            <Text style={styles.moneyCardLabel}>Others owe you</Text>
            <Text style={[styles.moneyCardAmount, { color: colors.primary }]}>
              ₹{Number(groupBalances?.total_receivable ?? 0).toLocaleString('en-IN')}
            </Text>
            <View style={styles.moneyCardFoot}>
              <Ionicons name="arrow-back" size={12} color={colors.primary} />
              <Text style={[styles.moneyCardFootText, { color: colors.primary }]}>
                {groupBalances?.receivable_count ?? 0} payments
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moneyCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Settlements')}
          >
            <Text style={styles.moneyCardLabel}>You owe</Text>
            <Text style={[styles.moneyCardAmount, { color: colors.danger }]}>
              ₹{Number(groupBalances?.total_owed ?? 0).toLocaleString('en-IN')}
            </Text>
            <View style={styles.moneyCardFoot}>
              <Text style={[styles.moneyCardFootText, { color: colors.danger }]}>
                {groupBalances?.owed_count ?? 0} payments
              </Text>
              <Ionicons name="arrow-forward" size={12} color={colors.danger} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 4 Quick Action Buttons */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickActionItem}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('AddExpense')}
          >
            <View style={styles.quickIconCircle}>
              <Ionicons name="add" size={24} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Add expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Subscriptions', { screen: 'AddSubscription' })}
          >
            <View style={styles.quickIconCircle}>
              <Ionicons name="sync" size={20} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Subscription</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('BillScanner')}
          >
            <View style={styles.quickIconCircle}>
              <Ionicons name="scan-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Scan bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Settlements')}
          >
            <View style={styles.quickIconCircle}>
              <Ionicons name="wallet-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Settle up</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Renewals Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming renewals</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Subscriptions')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllLink}>See all ›</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.renewalsScroll}
          contentContainerStyle={styles.renewalsContent}
        >
          {renewals.length > 0 ? (
            renewals.map((item, idx) => {
              const badge = getServiceBadge(item.name);
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.renewalCard}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate('SubscriptionDetails', {
                      subscriptionId: item.id,
                      subscriptionName: item.name,
                    })
                  }
                >
                  <View style={[styles.serviceBadgeBox, { backgroundColor: badge.bg }]}>
                    <Text style={styles.serviceBadgeText}>{badge.text}</Text>
                  </View>
                  <View style={styles.renewalCardInfo}>
                    <Text style={styles.renewalName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.renewalDate} numberOfLines={1}>
                      {item.days_until_renewal === 0
                        ? 'Renews Today'
                        : `in ${item.days_until_renewal} days`}
                    </Text>
                  </View>
                  <Text style={styles.renewalCost}>
                    ₹{Number(item.user_cost || item.amount || 0).toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyRenewalsBox}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.emptyRenewalsText}>No renewals due in the next 7 days</Text>
            </View>
          )}
        </ScrollView>

        {/* Desktop multi-column / Mobile single-column breakdown */}
        <View style={isDesktop ? styles.desktopGrid : styles.stackedContainer}>
          {/* Category Budgets */}
          {budgets.length > 0 && (
            <Card style={isDesktop ? styles.desktopCol : styles.fullWidthCol}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
                  <Text style={styles.cardTitle}>Category Budgets</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Budgets')}>
                  <Text style={styles.cardActionLink}>Manage ›</Text>
                </TouchableOpacity>
              </View>

              {budgets.slice(0, 3).map((b) => {
                const spent = Number(b.spent_amount || 0);
                const limit = Number(b.monthly_limit || 1);
                const pct = Math.min(100, Math.round((spent / limit) * 100));
                const isOver = pct >= 100;

                return (
                  <View key={b.id} style={styles.budgetItem}>
                    <View style={styles.budgetHeader}>
                      <Text style={styles.budgetName}>{b.category}</Text>
                      <Text style={[styles.budgetAmount, isOver && { color: colors.danger }]}>
                        ₹{spent.toLocaleString('en-IN')} / ₹{limit.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.catTrack}>
                      <View
                        style={[
                          styles.catFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: isOver ? colors.danger : colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </Card>
          )}

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <Card style={isDesktop ? styles.desktopCol : styles.fullWidthCol}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                  <Text style={styles.cardTitle}>Recent Activity</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
                  <Text style={styles.cardActionLink}>All ›</Text>
                </TouchableOpacity>
              </View>

              {recentActivity.slice(0, 4).map((act) => (
                <View key={act.id} style={styles.activityItem}>
                  <View style={styles.activityLeft}>
                    <View style={styles.activityIconBox}>
                      <Ionicons
                        name={act.activity_type === 'EXPENSE' ? 'receipt-outline' : 'sync-outline'}
                        size={16}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {act.title}
                      </Text>
                      <Text style={styles.activityDate}>{act.date || 'Recent'}</Text>
                    </View>
                  </View>
                  <Text style={styles.activityAmount}>
                    ₹{Number(act.amount).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 110,
    width: '100%',
    alignSelf: 'center',
  },
  dashboardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  greetingCol: {
    flex: 1,
    marginRight: 10,
  },
  eyebrow: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  greetingSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 12,
    flex: 1,
    marginLeft: 8,
  },
  retryBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroCard: {
    width: '100%',
    padding: 20,
    backgroundColor: colors.primaryDark,
    borderRadius: 22,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroTagText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginVertical: 2,
  },
  heroBudgetSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '500',
  },
  budgetTrack: {
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
    marginVertical: 14,
  },
  budgetFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.mintBar,
  },
  heroFootRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroFootText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '700',
  },
  moneyGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  moneyCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  moneyCardLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  moneyCardAmount: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  moneyCardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moneyCardFootText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  seeAllLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  renewalsScroll: {
    marginBottom: 20,
    marginHorizontal: -4,
  },
  renewalsContent: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
  },
  renewalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 160,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceBadgeBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  serviceBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  renewalCardInfo: {
    flex: 1,
    marginRight: 8,
  },
  renewalName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  renewalDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  renewalCost: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  emptyRenewalsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyRenewalsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  desktopGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  stackedContainer: {
    flexDirection: 'column',
  },
  desktopCol: {
    flex: 1,
  },
  fullWidthCol: {
    width: '100%',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  cardActionLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  budgetItem: {
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  budgetName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  budgetAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  catTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
  catFill: {
    height: '100%',
    borderRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  activityIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  activityDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
});
