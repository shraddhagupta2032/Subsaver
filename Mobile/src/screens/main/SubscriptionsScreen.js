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
import { useAuth } from '../../context/AuthContext';
import { subscriptionsApi } from '../../api/subscriptions';
import { sharedSubscriptionsApi } from '../../api/sharedSubscriptions';
import { groupsApi } from '../../api/groups';
import { subscriptionIntelligenceApi } from '../../api/subscriptionIntelligence';
import { Card } from '../../components/Card';
import { StatCard } from '../../components/StatCard';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';

export const SubscriptionsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'shared' | 'insights'

  const [personalSubs, setPersonalSubs] = useState([]);
  const [sharedSubs, setSharedSubs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [intelligenceSummary, setIntelligenceSummary] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [categoriesData, setCategoriesData] = useState([]);
  const [insightsList, setInsightsList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchSubscriptionsData = useCallback(async () => {
    try {
      setError(null);
      // Fetch personal subs, groups, and intelligence in parallel
      const [personalRes, groupsRes, summaryRes, healthRes, catRes, insightsRes] =
        await Promise.all([
          subscriptionsApi.getSubscriptions(),
          groupsApi.getGroups(),
          subscriptionIntelligenceApi.getSummary().catch(() => null),
          subscriptionIntelligenceApi.getHealth().catch(() => null),
          subscriptionIntelligenceApi.getCategories().catch(() => []),
          subscriptionIntelligenceApi.getInsights().catch(() => []),
        ]);

      setPersonalSubs(personalRes || []);
      setGroups(groupsRes || []);
      setIntelligenceSummary(summaryRes);
      setHealthData(healthRes);
      setCategoriesData(catRes || []);
      setInsightsList(insightsRes || []);

      // Fetch shared subscriptions across all user's groups
      if (groupsRes && groupsRes.length > 0) {
        const sharedPromises = groupsRes.map((g) =>
          sharedSubscriptionsApi
            .getGroupSharedSubscriptions(g.id)
            .catch(() => [])
        );
        const sharedResults = await Promise.all(sharedPromises);
        const flattened = sharedResults.flat();
        // Deduplicate by id if needed
        const uniqueShared = Array.from(
          new Map(flattened.map((s) => [s.id, s])).values()
        );
        setSharedSubs(uniqueShared);
      } else {
        setSharedSubs([]);
      }
    } catch (err) {
      console.warn('fetchSubscriptionsData error:', err);
      setError(err.message || 'Failed to load subscriptions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionsData();
  }, [fetchSubscriptionsData]);

  // Re-fetch on focus (e.g. after adding/editing)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchSubscriptionsData();
    });
    return unsubscribe;
  }, [navigation, fetchSubscriptionsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscriptionsData();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: colors.successBg, text: colors.success, label: 'ACTIVE' };
      case 'PAUSED':
        return { bg: colors.warningBg, text: colors.warning, label: 'PAUSED' };
      case 'CANCELLED':
        return { bg: colors.dangerBg, text: colors.danger, label: 'CANCELLED' };
      default:
        return { bg: colors.surfaceLight, text: colors.textSecondary, label: status || 'ACTIVE' };
    }
  };

  const getHealthColor = (score) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.danger;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading subscriptions...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Subscriptions</Text>
          <Text style={styles.subtitle}>Track, manage & optimize recurring costs</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.scanHeaderButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('BillScanner', { screen: 'BillScannerHome' })}
          >
            <Ionicons name="scan-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => {
              if (activeTab === 'shared') {
                navigation.navigate('AddSharedSubscription', { groups });
              } else {
                navigation.navigate('AddSubscription');
              }
            }}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabSwitcher}>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'personal' && styles.tabButtonActive]}
          onPress={() => setActiveTab('personal')}
        >
          <Ionicons
            name="person-outline"
            size={16}
            color={activeTab === 'personal' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'personal' && styles.tabButtonTextActive,
            ]}
          >
            Personal ({personalSubs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'shared' && styles.tabButtonActive]}
          onPress={() => setActiveTab('shared')}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={activeTab === 'shared' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'shared' && styles.tabButtonTextActive,
            ]}
          >
            Shared ({sharedSubs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'insights' && styles.tabButtonActive]}
          onPress={() => setActiveTab('insights')}
        >
          <Ionicons
            name="analytics-outline"
            size={16}
            color={activeTab === 'insights' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'insights' && styles.tabButtonTextActive,
            ]}
          >
            Insights
          </Text>
        </TouchableOpacity>
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
        {/* ================= PERSONAL SUBSCRIPTIONS TAB ================= */}
        {activeTab === 'personal' && (
          <View>
            <Button
              title="+ Add Personal Subscription"
              onPress={() => navigation.navigate('AddSubscription')}
              style={styles.actionAddBtn}
            />

            {personalSubs.length > 0 ? (
              personalSubs.map((sub) => {
                const badge = getStatusBadge(sub.status);
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={styles.subCard}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('SubscriptionDetails', {
                        subscriptionId: sub.id,
                      })
                    }
                  >
                    <View style={styles.subCardHeader}>
                      <View style={styles.subLeft}>
                        <Text style={styles.subName}>{sub.name}</Text>
                        <Text style={styles.subCategory}>
                          {sub.category || 'General'} • {sub.billing_cycle}
                        </Text>
                      </View>
                      <View style={styles.subRight}>
                        <Text style={styles.subAmount}>
                          ₹{Number(sub.amount).toLocaleString('en-IN')}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.subCardFooter}>
                      <View style={styles.renewalDateRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.renewalDateText}>
                          Renews on {sub.next_renewal_date}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="layers-outline" size={48} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No personal subscriptions yet</Text>
                <Text style={styles.emptySubtitle}>
                  Keep track of Netflix, Spotify, Gym, or SaaS subscriptions in one place.
                </Text>
                <Button
                  title="Add Subscription"
                  onPress={() => navigation.navigate('AddSubscription')}
                  style={styles.emptyCreateButton}
                />
              </View>
            )}
          </View>
        )}

        {/* ================= SHARED SUBSCRIPTIONS TAB ================= */}
        {activeTab === 'shared' && (
          <View>
            <Button
              title="+ Add Shared Group Subscription"
              onPress={() => navigation.navigate('AddSharedSubscription', { groups })}
              style={styles.actionAddBtn}
            />

            {sharedSubs.length > 0 ? (
              sharedSubs.map((sub) => {
                const userShare = sub.current_user_share
                  ? Number(sub.current_user_share).toFixed(2)
                  : (Number(sub.total_amount) / (sub.members?.length || 1)).toFixed(2);
                const badge = getStatusBadge(sub.status);

                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={styles.sharedCard}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('SharedSubscriptionDetails', {
                        subscriptionId: sub.id,
                      })
                    }
                  >
                    <View style={styles.sharedHeader}>
                      <View style={styles.sharedHeaderLeft}>
                        <Text style={styles.sharedTitle}>{sub.name}</Text>
                        <Text style={styles.sharedGroupName}>
                          {sub.group_name || 'Group Subscription'} • Paid by {sub.payer_name}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    {/* Prominent User Share Highlight */}
                    <View style={styles.userShareBox}>
                      <View>
                        <Text style={styles.userShareLabel}>YOUR SHARE</Text>
                        <Text style={styles.userShareAmount}>
                          ₹{userShare} <Text style={styles.userShareCadence}>/ {sub.billing_cycle?.toLowerCase() || 'month'}</Text>
                        </Text>
                      </View>
                      <View style={styles.totalPill}>
                        <Text style={styles.totalPillText}>
                          Total: ₹{Number(sub.total_amount).toFixed(2)} ({sub.members?.length || 0} members)
                        </Text>
                      </View>
                    </View>

                    <View style={styles.subCardFooter}>
                      <View style={styles.renewalDateRow}>
                        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.renewalDateText}>
                          Next renewal: {sub.next_renewal_date}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No shared subscriptions in your groups</Text>
                <Text style={styles.emptySubtitle}>
                  Split recurring family plans like Spotify, Netflix, YouTube, or WiFi with your flatmates.
                </Text>
                <Button
                  title="Add Shared Subscription"
                  onPress={() => navigation.navigate('AddSharedSubscription', { groups })}
                  style={styles.emptyCreateButton}
                />
              </View>
            )}
          </View>
        )}

        {/* ================= SUBSCRIPTION INTELLIGENCE TAB ================= */}
        {activeTab === 'insights' && (
          <View>
            {/* Top Summary Metrics */}
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatCard
                  title="Monthly Cost"
                  value={
                    intelligenceSummary?.monthly_subscription_cost
                      ? `₹${Number(intelligenceSummary.monthly_subscription_cost).toLocaleString('en-IN')}`
                      : '₹0'
                  }
                  subtitle={`${intelligenceSummary?.active_subscription_count || 0} active subscriptions`}
                  icon="card-outline"
                  color={colors.primary}
                />
                <StatCard
                  title="Annualized Cost"
                  value={
                    intelligenceSummary?.annualized_subscription_cost
                      ? `₹${Number(intelligenceSummary.annualized_subscription_cost).toLocaleString('en-IN')}`
                      : '₹0'
                  }
                  subtitle="Projected annual total"
                  icon="calendar-outline"
                  color={colors.purple}
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard
                  title="Top Category"
                  value={intelligenceSummary?.highest_category || intelligenceSummary?.highest_spending_category || 'None'}
                  subtitle="Highest monthly burden"
                  icon="pie-chart-outline"
                  color={colors.info}
                />
                <StatCard
                  title="Health Score"
                  value={healthData ? `${healthData.health_score}/100` : '100/100'}
                  subtitle="Optimization rating"
                  icon="shield-checkmark-outline"
                  color={getHealthColor(healthData?.health_score ?? 100)}
                />
              </View>
            </View>

            {/* Health Score Card */}
            <Card style={styles.healthScoreCard}>
              <View style={styles.healthCardHeader}>
                <View style={styles.healthHeaderTitle}>
                  <Ionicons
                    name="shield-checkmark"
                    size={22}
                    color={getHealthColor(healthData?.health_score ?? 100)}
                  />
                  <Text style={styles.cardHeaderTitle}>Subscription Health Rating</Text>
                </View>
                <View
                  style={[
                    styles.scorePill,
                    { backgroundColor: `${getHealthColor(healthData?.health_score ?? 100)}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.scorePillText,
                      { color: getHealthColor(healthData?.health_score ?? 100) },
                    ]}
                  >
                    {healthData?.health_score ?? 100}/100
                  </Text>
                </View>
              </View>

              {healthData?.factors && healthData.factors.length > 0 ? (
                <View style={styles.factorsList}>
                  {healthData.factors.map((factor, idx) => (
                    <View key={idx} style={styles.factorItem}>
                      <Ionicons
                        name={healthData.health_score >= 80 ? "checkmark-outline" : "alert-circle-outline"}
                        size={16}
                        color={getHealthColor(healthData.health_score)}
                        style={styles.factorIcon}
                      />
                      <Text style={styles.factorText}>{factor}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No negative health factors detected.</Text>
              )}
            </Card>

            {/* Category Breakdown Section */}
            <Card>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="pie-chart-outline" size={20} color={colors.primary} />
                  <Text style={styles.cardHeaderTitle}>Category Breakdown</Text>
                </View>
                <Text style={styles.countText}>{categoriesData.length} categories</Text>
              </View>

              {categoriesData.length > 0 ? (
                categoriesData.map((cat, idx) => {
                  const pct = Math.min(100, Math.max(0, parseFloat(cat.percentage_of_total) || 0));
                  const amount = cat.monthly_cost ?? cat.monthly_equivalent ?? 0;
                  return (
                    <View key={idx} style={styles.categoryItem}>
                      <View style={styles.categoryHeaderRow}>
                        <Text style={styles.categoryName}>
                          {cat.category || 'General'} ({cat.subscription_count})
                        </Text>
                        <Text style={styles.categoryAmount}>
                          ₹{Number(amount).toLocaleString('en-IN')}/mo{' '}
                          <Text style={styles.categoryPct}>({pct.toFixed(1)}%)</Text>
                        </Text>
                      </View>
                      <View style={styles.progressBarBackground}>

                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${pct}%`, backgroundColor: colors.primary },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No active category data available.</Text>
              )}
            </Card>

            {/* Actionable Insights Section */}
            <Card>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="bulb-outline" size={20} color={colors.warning} />
                  <Text style={styles.cardHeaderTitle}>Savings & Intelligence Insights</Text>
                </View>
                <Text style={styles.countText}>{insightsList.length} insights</Text>
              </View>

              {insightsList.length > 0 ? (
                insightsList.map((ins, idx) => {
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
                <Text style={styles.emptyText}>No insights generated yet.</Text>
              )}
            </Card>

            <Button
              title="Open Detailed Intelligence View"
              variant="outline"
              onPress={() => navigation.navigate('SubscriptionInsights')}
              style={styles.deepInsightsBtn}
            />
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceLight,
  },
  tabButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabButtonTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  actionAddBtn: {
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  subCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  subCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  subLeft: {
    flex: 1,
  },
  subName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  subCategory: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  subRight: {
    alignItems: 'flex-end',
  },
  subAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  renewalDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  renewalDateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  sharedCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  sharedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sharedHeaderLeft: {
    flex: 1,
  },
  sharedTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  sharedGroupName: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  userShareBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
  },
  userShareLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  userShareAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  userShareCadence: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  totalPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  totalPillText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  statsGrid: {
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  healthScoreCard: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  healthCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  healthHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  scorePillText: {
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
  countText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  categoryItem: {
    marginBottom: 12,
  },
  categoryHeaderRow: {
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
  progressBarBackground: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
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
  deepInsightsBtn: {
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyCreateButton: {
    minWidth: 180,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  scanHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
