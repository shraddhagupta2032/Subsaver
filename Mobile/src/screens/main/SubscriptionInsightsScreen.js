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
import { subscriptionIntelligenceApi } from '../../api/subscriptionIntelligence';
import { Card } from '../../components/Card';
import { StatCard } from '../../components/StatCard';
import { colors } from '../../theme/colors';

export const SubscriptionInsightsScreen = ({ navigation }) => {
  const [summary, setSummary] = useState(null);
  const [health, setHealth] = useState(null);
  const [categories, setCategories] = useState([]);
  const [topSubs, setTopSubs] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [budgetImpacts, setBudgetImpacts] = useState([]);
  const [overlaps, setOverlaps] = useState([]);
  const [insights, setInsights] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllIntelligence = useCallback(async () => {
    try {
      setError(null);
      const [
        sumRes,
        healthRes,
        catsRes,
        topRes,
        renewalsRes,
        budgetRes,
        overlapsRes,
        insightsRes,
      ] = await Promise.all([
        subscriptionIntelligenceApi.getSummary(),
        subscriptionIntelligenceApi.getHealth(),
        subscriptionIntelligenceApi.getCategories(),
        subscriptionIntelligenceApi.getTop(5),
        subscriptionIntelligenceApi.getRenewals(7),
        subscriptionIntelligenceApi.getBudgetImpact(),
        subscriptionIntelligenceApi.getOverlaps(),
        subscriptionIntelligenceApi.getInsights(),
      ]);

      setSummary(sumRes);
      setHealth(healthRes);
      setCategories(catsRes || []);
      setTopSubs(topRes || []);
      setRenewals(renewalsRes || []);
      setBudgetImpacts(budgetRes || []);
      setOverlaps(overlapsRes || []);
      setInsights(insightsRes || []);
    } catch (err) {
      console.warn('fetchAllIntelligence error:', err);
      setError(err.message || 'Failed to load intelligence metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllIntelligence();
  }, [fetchAllIntelligence]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllIntelligence();
  };

  const getHealthColor = (score) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.danger;
  };

  const getBudgetStatusBadge = (status) => {
    switch (status) {
      case 'OVER_LIMIT':
        return { bg: colors.dangerBg, text: colors.danger, label: 'OVER LIMIT' };
      case 'NEAR_LIMIT':
        return { bg: colors.warningBg, text: colors.warning, label: 'NEAR LIMIT' };
      case 'WITHIN_LIMIT':
      default:
        return { bg: colors.successBg, text: colors.success, label: 'WITHIN LIMIT' };
    }
  };

  const getConcentrationColor = (level) => {
    switch (level) {
      case 'HIGH':
        return colors.danger;
      case 'MEDIUM':
        return colors.warning;
      case 'LOW':
      default:
        return colors.info;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Analyzing subscription portfolio...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Intelligence</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 1. Key Metrics 2x2 Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              title="Monthly Burden"
              value={
                summary?.monthly_subscription_cost
                  ? `₹${Number(summary.monthly_subscription_cost).toLocaleString('en-IN')}`
                  : '₹0'
              }
              subtitle="Personal + Shared Share"
              icon="card-outline"
              color={colors.primary}
            />
            <StatCard
              title="Annualized Cost"
              value={
                summary?.annualized_subscription_cost
                  ? `₹${Number(summary.annualized_subscription_cost).toLocaleString('en-IN')}`
                  : '₹0'
              }
              subtitle="Projected 12-mo spend"
              icon="calendar-outline"
              color={colors.purple}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Active Subs"
              value={String(summary?.active_subscription_count || 0)}
              subtitle={`Top: ${summary?.highest_category || summary?.highest_spending_category || 'None'}`}
              icon="layers-outline"
              color={colors.info}
            />
            <StatCard
              title="Health Score"
              value={health ? `${health.health_score}/100` : '100/100'}
              subtitle="Optimization status"
              icon="shield-checkmark-outline"
              color={getHealthColor(health?.health_score ?? 100)}
            />
          </View>
        </View>

        {/* 2. Subscription Health Score Card */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={getHealthColor(health?.health_score ?? 100)}
              />
              <Text style={styles.cardTitle}>Subscription Health Rating</Text>
            </View>
            <View
              style={[
                styles.healthScorePill,
                { backgroundColor: `${getHealthColor(health?.health_score ?? 100)}20` },
              ]}
            >
              <Text
                style={[
                  styles.healthScoreText,
                  { color: getHealthColor(health?.health_score ?? 100) },
                ]}
              >
                {health?.health_score ?? 100}/100
              </Text>
            </View>
          </View>

          {health?.factors && health.factors.length > 0 ? (
            <View style={styles.factorsList}>
              {health.factors.map((factor, idx) => (
                <View key={idx} style={styles.factorItem}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color={getHealthColor(health.health_score)}
                    style={styles.factorIcon}
                  />
                  <Text style={styles.factorText}>{factor}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.healthyNote}>
              ✓ Your subscriptions are well optimized with zero negative spending factors detected.
            </Text>
          )}
        </Card>

        {/* 3. Category Breakdown */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="pie-chart-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Category Spending Breakdown</Text>
            </View>
            <Text style={styles.countText}>{categories.length} categories</Text>
          </View>

          {categories.length > 0 ? (
            categories.map((cat, idx) => {
              const pct = Math.min(100, Math.max(0, parseFloat(cat.percentage_of_total) || 0));
              const amount = cat.monthly_cost ?? cat.monthly_equivalent ?? 0;
              return (
                <View key={idx} style={styles.categoryItem}>
                  <View style={styles.categoryRow}>
                    <Text style={styles.categoryName}>
                      {cat.category || 'General'} ({cat.subscription_count})
                    </Text>
                    <Text style={styles.categoryAmount}>
                      ₹{Number(amount).toLocaleString('en-IN')}/mo{' '}
                      <Text style={styles.categoryPct}>({pct.toFixed(1)}%)</Text>
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${pct}%`, backgroundColor: colors.primary },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No category distribution available.</Text>
          )}
        </Card>

        {/* 4. Top Ranked Subscriptions */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="trending-up-outline" size={20} color={colors.purple} />
              <Text style={styles.cardTitle}>Top Monthly Subscriptions</Text>
            </View>
            <Text style={styles.countText}>Top {topSubs.length}</Text>
          </View>

          {topSubs.length > 0 ? (
            topSubs.map((sub, idx) => (
              <View key={sub.id || idx} style={styles.topSubItem}>
                <View style={styles.topRankCircle}>
                  <Text style={styles.topRankText}>#{idx + 1}</Text>
                </View>
                <View style={styles.topSubInfo}>
                  <Text style={styles.topSubName}>{sub.name}</Text>
                  <Text style={styles.topSubCategory}>
                    {sub.category || 'General'} • {sub.billing_cycle}
                  </Text>
                </View>
                <Text style={styles.topSubAmount}>
                  ₹{Number(sub.monthly_equivalent ?? sub.user_cost ?? 0).toLocaleString('en-IN')}/mo
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No subscriptions found.</Text>
          )}
        </Card>

        {/* 5. Upcoming Renewals (Next 7 Days) */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.warning} />
              <Text style={styles.cardTitle}>Upcoming Renewals (7 Days)</Text>
            </View>
            <Text style={styles.countText}>{renewals.length} due</Text>
          </View>

          {renewals.length > 0 ? (
            renewals.map((r, idx) => (
              <View key={r.id || idx} style={styles.renewalItem}>
                <View style={styles.renewalLeft}>
                  <Text style={styles.renewalName}>{r.name}</Text>
                  <Text style={styles.renewalDate}>
                    {r.days_until_renewal === 0
                      ? 'Renews Today'
                      : r.days_until_renewal === 1
                      ? 'Renews Tomorrow'
                      : `Renews in ${r.days_until_renewal} days (${r.next_renewal_date})`}
                  </Text>
                </View>
                <Text style={styles.renewalAmount}>
                  ₹{Number(r.user_cost ?? r.amount ?? 0).toLocaleString('en-IN')}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No renewals due in the next 7 days.</Text>
          )}
        </Card>


        {/* 6. Budget Impact Analysis */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="wallet-outline" size={20} color={colors.success} />
              <Text style={styles.cardTitle}>Category Budget Impact</Text>
            </View>
            <Text style={styles.countText}>{budgetImpacts.length} budgets</Text>
          </View>

          {budgetImpacts.length > 0 ? (
            budgetImpacts.map((b, idx) => {
              const badge = getBudgetStatusBadge(b.status);
              const spending = b.subscription_monthly_cost ?? b.subscription_spending ?? 0;
              return (
                <View key={idx} style={styles.budgetItem}>
                  <View style={styles.budgetRow}>
                    <Text style={styles.budgetCategory}>{b.category}</Text>
                    <View style={[styles.budgetBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.budgetBadgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.budgetRatio}>
                    ₹{Number(spending).toFixed(2)} / ₹{Number(b.budget_limit).toFixed(2)}{' '}
                    <Text style={styles.budgetPct}>({Number(b.percentage_used).toFixed(1)}% used)</Text>
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, b.percentage_used)}%`,
                          backgroundColor:
                            b.status === 'OVER_LIMIT'
                              ? colors.danger
                              : b.status === 'NEAR_LIMIT'
                              ? colors.warning
                              : colors.success,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No category budget limits configured.</Text>
          )}
        </Card>

        {/* 7. Category Overlaps & Concentration */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="copy-outline" size={20} color={colors.info} />
              <Text style={styles.cardTitle}>Category Concentration</Text>
            </View>
          </View>

          {overlaps.length > 0 ? (
            overlaps.map((ov, idx) => {
              const level = ov.severity || ov.concentration_level || 'LOW';
              const color = getConcentrationColor(level);
              return (
                <View key={idx} style={styles.overlapItem}>
                  <View style={styles.overlapHeader}>
                    <Text style={styles.overlapCategory}>{ov.category}</Text>
                    <View style={[styles.overlapBadge, { backgroundColor: `${color}20` }]}>
                      <Text style={[styles.overlapBadgeText, { color }]}>
                        {level}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.overlapMessage}>{ov.message}</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No category overlaps identified.</Text>
          )}
        </Card>


        {/* 8. Actionable Savings & Optimization Insights */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="bulb-outline" size={20} color={colors.warning} />
              <Text style={styles.cardTitle}>Actionable Savings Insights</Text>
            </View>
            <Text style={styles.countText}>{insights.length} tips</Text>
          </View>

          {insights.length > 0 ? (
            insights.map((ins, idx) => {
              const getSeverityColor = (sev) => {
                switch (sev) {
                  case 'HIGH':
                    return colors.danger;
                  case 'MEDIUM':
                    return colors.warning;
                  case 'LOW':
                    return colors.info;
                  default:
                    return colors.primary;
                }
              };
              const color = getSeverityColor(ins.severity);

              return (
                <View key={idx} style={styles.insightItem}>
                  <View style={[styles.insightPill, { backgroundColor: `${color}20` }]}>
                    <Text style={[styles.insightPillText, { color }]}>
                      {ins.severity}
                    </Text>
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{ins.title}</Text>
                    <Text style={styles.insightMessage}>{ins.message}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No active recommendations.</Text>
          )}
        </Card>
      </ScrollView>
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
    padding: 24,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  statsGrid: {
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  card: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  healthScorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  healthScoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  factorsList: {
    marginTop: 4,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
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
  healthyNote: {
    color: colors.success,
    fontSize: 13,
    lineHeight: 18,
  },
  categoryItem: {
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  categoryPct: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '400',
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  topSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topRankText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  topSubInfo: {
    flex: 1,
  },
  topSubName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  topSubCategory: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  topSubAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  renewalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  renewalLeft: {
    flex: 1,
  },
  renewalName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  renewalDate: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 2,
  },
  renewalAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  budgetItem: {
    marginBottom: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  budgetCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  budgetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  budgetBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  budgetRatio: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  budgetPct: {
    color: colors.textMuted,
  },
  overlapItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  overlapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  overlapCategory: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  overlapBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  overlapBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  overlapMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  insightPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 10,
    marginTop: 2,
  },
  insightPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  insightMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
});
