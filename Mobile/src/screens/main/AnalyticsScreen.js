import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { analyticsApi } from '../../api/analytics';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';

const CATEGORY_COLORS = [colors.primary, colors.purple, colors.warning, colors.info, '#E50914'];

export const AnalyticsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [monthlySpending, setMonthlySpending] = useState(null);
  const [categorySpending, setCategorySpending] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [intelligence, setIntelligence] = useState(null);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setError(null);
      const [monthlyRes, categoryRes, budgetsRes, intelRes] = await Promise.all([
        analyticsApi.getMonthlySpending().catch(() => null),
        analyticsApi.getCategorySpending().catch(() => null),
        analyticsApi.getBudgets().catch(() => []),
        analyticsApi.getSubscriptionIntelligenceSummary().catch(() => null),
      ]);

      setMonthlySpending(monthlyRes);
      setCategorySpending(categoryRes);
      setBudgets(budgetsRes || []);
      setIntelligence(intelRes);
    } catch (err) {
      console.warn('Analytics load error:', err);
      setError(err.message || 'Unable to load your financial analytics.');
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

  const trends = useMemo(() => {
    return monthlySpending?.trends || [
      { month_name: 'Jan', spending: 8400 },
      { month_name: 'Feb', spending: 11200 },
      { month_name: 'Mar', spending: 9500 },
      { month_name: 'Apr', spending: 13800 },
      { month_name: 'May', spending: 11400 },
      { month_name: 'Jun', spending: 12480 },
    ];
  }, [monthlySpending]);

  const maxSpend = useMemo(() => {
    return Math.max(...trends.map((t) => Number(t.spending || 0)), 1);
  }, [trends]);

  const totalSpend = monthlySpending?.current_month_spending ?? 12480;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.headerContainer, { maxWidth: isDesktop ? 680 : '100%' }]}>
        <ScreenHeader
          title="Spending insights"
          subtitle="Your money, made easier to understand."
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
        {/* Total Spending Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total spending</Text>
          <Text style={styles.heroAmount}>
            ₹{Number(totalSpend).toLocaleString('en-IN')}
          </Text>
          {monthlySpending?.percentage_change !== null && monthlySpending?.percentage_change !== undefined && (
            <View style={styles.heroSubRow}>
              <Ionicons
                name={monthlySpending.is_increase ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={colors.mintBar}
              />
              <Text style={styles.heroChangeText}>
                {Math.abs(monthlySpending.percentage_change)}% vs {monthlySpending.previous_month_name || 'last month'}
              </Text>
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Monthly Trend Chart Card */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Monthly trend</Text>
            <Text style={styles.chartSub}>Last 6 months</Text>
          </View>

          <View style={styles.barsRow}>
            {trends.map((t, idx) => {
              const val = Number(t.spending || 0);
              const heightPct = Math.max(15, Math.round((val / maxSpend) * 100));
              const isCurrent = idx === trends.length - 1;

              return (
                <View key={idx} style={styles.barCol}>
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
                  <Text style={[styles.barMonth, isCurrent && styles.barMonthActive]}>
                    {t.month_name?.slice(0, 3)}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Top Categories Breakdown */}
        <Text style={styles.sectionTitle}>Top categories</Text>
        <Card style={styles.categoriesCard}>
          {categorySpending?.categories?.length > 0 ? (
            categorySpending.categories.slice(0, 5).map((cat, idx) => {
              const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
              const isLast = idx === Math.min(4, categorySpending.categories.length - 1);
              return (
                <View key={idx} style={[styles.catRow, !isLast && styles.catBorder]}>
                  <View style={styles.catInfoRow}>
                    <View style={styles.catLeft}>
                      <View style={[styles.catDot, { backgroundColor: color }]} />
                      <Text style={styles.catName}>{cat.category}</Text>
                    </View>
                    <Text style={styles.catAmount}>
                      ₹{Number(cat.amount).toLocaleString('en-IN')} ({cat.percentage}%)
                    </Text>
                  </View>
                  <View style={styles.catTrack}>
                    <View
                      style={[
                        styles.catFill,
                        { width: `${Math.min(100, Math.max(3, cat.percentage))}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No category breakdown available for this month.</Text>
          )}
        </Card>

        {/* Active Budgets Overview */}
        {budgets.length > 0 && (
          <>
            <View style={styles.budgetsHeaderRow}>
              <Text style={styles.sectionTitle}>Category Budgets</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Budgets')}>
                <Text style={styles.budgetsLink}>Manage ›</Text>
              </TouchableOpacity>
            </View>

            <Card style={styles.budgetsCard}>
              {budgets.map((b, idx) => {
                const spent = Number(b.spent_amount || 0);
                const limit = Number(b.monthly_limit || 1);
                const pct = Math.min(100, Math.round((spent / limit) * 100));
                const isOver = pct >= 100;
                const isLast = idx === budgets.length - 1;

                return (
                  <View key={b.id || idx} style={[styles.budgetRow, !isLast && styles.catBorder]}>
                    <View style={styles.catInfoRow}>
                      <Text style={styles.budgetName}>{b.category}</Text>
                      <Text style={[styles.budgetAmount, isOver && { color: colors.danger }]}>
                        ₹{spent.toLocaleString('en-IN')} / ₹{limit.toLocaleString('en-IN')} ({pct}%)
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
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroChangeText: {
    color: colors.mintBar,
    fontSize: 12,
    fontWeight: '700',
  },
  chartCard: {
    padding: 20,
    marginBottom: 20,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  chartSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 22,
    height: 100,
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barMonth: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 8,
  },
  barMonthActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
    marginLeft: 4,
  },
  categoriesCard: {
    padding: 16,
    marginBottom: 20,
  },
  catRow: {
    paddingVertical: 10,
  },
  catBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  catInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  catAmount: {
    fontSize: 12,
    fontWeight: '600',
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
  budgetsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginRight: 4,
  },
  budgetsLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  budgetsCard: {
    padding: 16,
    marginBottom: 20,
  },
  budgetRow: {
    paddingVertical: 10,
  },
  budgetName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  budgetAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    paddingVertical: 10,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
  },
});
