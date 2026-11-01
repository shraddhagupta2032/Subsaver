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
import { useAuth } from '../../context/AuthContext';
import { subscriptionsApi } from '../../api/subscriptions';
import { sharedSubscriptionsApi } from '../../api/sharedSubscriptions';
import { groupsApi } from '../../api/groups';
import { subscriptionIntelligenceApi } from '../../api/subscriptionIntelligence';
import { colors } from '../../theme/colors';

const TABS = ['All', 'Personal', 'Shared', 'Insights'];

export const SubscriptionsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [activeTab, setActiveTab] = useState('All');
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

      if (groupsRes && groupsRes.length > 0) {
        const sharedPromises = groupsRes.map((g) =>
          sharedSubscriptionsApi
            .getGroupSharedSubscriptions(g.id)
            .catch(() => [])
        );
        const sharedResults = await Promise.all(sharedPromises);
        const flattened = sharedResults.flat();
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

  const personalTotal = useMemo(() => {
    return personalSubs
      .filter((s) => s.status === 'ACTIVE' || !s.status)
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  }, [personalSubs]);

  const sharedTotal = useMemo(() => {
    return sharedSubs
      .filter((s) => s.status === 'ACTIVE' || !s.status)
      .reduce((sum, s) => sum + Number(s.user_split_amount || s.amount || 0), 0);
  }, [sharedSubs]);

  const monthlyTotal = intelligenceSummary?.monthly_subscription_cost ?? (personalTotal + sharedTotal);

  const displayedSubs = useMemo(() => {
    if (activeTab === 'Personal') {
      return personalSubs.map((s) => ({ ...s, isShared: false }));
    }
    if (activeTab === 'Shared') {
      return sharedSubs.map((s) => ({ ...s, isShared: true }));
    }
    // 'All'
    const p = personalSubs.map((s) => ({ ...s, isShared: false }));
    const sh = sharedSubs.map((s) => ({ ...s, isShared: true }));
    return [...p, ...sh];
  }, [activeTab, personalSubs, sharedSubs]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading subscriptions...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { maxWidth: isDesktop ? 1140 : '100%' }]}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Subscriptions</Text>
          <Text style={styles.headerSubtitle}>Stay ahead of every renewal.</Text>
        </View>
        <TouchableOpacity
          style={styles.addButtonCircle}
          onPress={() => navigation.navigate('AddSubscription')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

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
        {/* Emerald Hero Summary Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Monthly subscription cost</Text>
          <Text style={styles.heroAmount}>
            ₹{Number(monthlyTotal).toLocaleString('en-IN')}
          </Text>
          <View style={styles.heroSplitRow}>
            <Text style={styles.heroSplitText}>
              <Text style={{ fontWeight: '800' }}>₹{Number(sharedTotal).toLocaleString('en-IN')}</Text> shared
            </Text>
            <Text style={styles.heroDot}>•</Text>
            <Text style={styles.heroSplitText}>
              <Text style={{ fontWeight: '800' }}>₹{Number(personalTotal).toLocaleString('en-IN')}</Text> personal
            </Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Tab Content: Insights */}
        {activeTab === 'Insights' ? (
          <View style={styles.insightsSection}>
            {healthData && (
              <View style={styles.healthScoreCard}>
                <View style={styles.healthLeft}>
                  <Text style={styles.healthLabel}>Subscription Health</Text>
                  <Text style={styles.healthSub}>Optimization & waste rating</Text>
                </View>
                <View style={styles.healthBadge}>
                  <Text style={styles.healthScoreVal}>{healthData.health_score || 85}</Text>
                  <Text style={styles.healthScoreMax}>/100</Text>
                </View>
              </View>
            )}

            {insightsList.map((ins, idx) => (
              <View key={idx} style={styles.insightItem}>
                <Ionicons name="sparkles" size={18} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={styles.insightTextCol}>
                  <Text style={styles.insightTitle}>{ins.title || 'Spending Tip'}</Text>
                  <Text style={styles.insightDesc}>{ins.description || ins.message}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* Subscriptions List */
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>Active subscriptions</Text>

            {displayedSubs.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="sync-outline" size={30} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No Subscriptions Found</Text>
                <Text style={styles.emptySub}>
                  Tap the '+' button above to add a recurring service like Netflix, Spotify, or your gym plan.
                </Text>
              </View>
            ) : (
              <View style={styles.cardsContainer}>
                {displayedSubs.map((sub, idx) => {
                  const badge = getServiceBadge(sub.name);
                  const isLast = idx === displayedSubs.length - 1;
                  return (
                    <TouchableOpacity
                      key={sub.id || idx}
                      style={[styles.subCard, !isLast && styles.subCardBorder]}
                      activeOpacity={0.75}
                      onPress={() => {
                        if (sub.isShared) {
                          navigation.navigate('SharedSubscriptionDetails', {
                            subscriptionId: sub.id,
                            subscriptionName: sub.name,
                          });
                        } else {
                          navigation.navigate('SubscriptionDetails', {
                            subscriptionId: sub.id,
                            subscriptionName: sub.name,
                          });
                        }
                      }}
                    >
                      <View style={[styles.serviceLogo, { backgroundColor: badge.bg }]}>
                        <Text style={styles.serviceLogoText}>{badge.text}</Text>
                      </View>

                      <View style={styles.subInfoCol}>
                        <Text style={styles.subName} numberOfLines={1}>
                          {sub.name}
                        </Text>
                        <Text style={styles.subMeta} numberOfLines={1}>
                          {sub.plan_type || sub.category || 'General'} • {sub.isShared ? 'Shared' : 'Personal'}
                        </Text>
                        <View style={styles.renewalRow}>
                          <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                          <Text style={styles.renewalDate}>
                            Renews {sub.next_renewal_date || 'Soon'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.subRightCol}>
                        <Text style={styles.subAmount}>
                          ₹{Number(sub.user_split_amount || sub.amount || 0).toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.subBillingCycle}>
                          /{sub.billing_cycle === 'YEARLY' ? 'year' : 'month'}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textSecondary}
                        style={{ marginLeft: 6 }}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  addButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  scrollView: {
    flex: 1,
    width: '100%',
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
    marginBottom: 8,
  },
  heroSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroSplitText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
  },
  heroDot: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  tabsScroll: {
    marginBottom: 16,
  },
  tabsContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabChipTextActive: {
    color: '#FFFFFF',
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
  cardsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  subCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  serviceLogo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceLogoText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  subInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  subName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  subMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  renewalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  renewalDate: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  subRightCol: {
    alignItems: 'flex-end',
  },
  subAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subBillingCycle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  insightsSection: {
    gap: 12,
  },
  healthScoreCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  healthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  healthSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  healthScoreVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  healthScoreMax: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 2,
  },
  insightItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  insightTextCol: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  insightDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
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
