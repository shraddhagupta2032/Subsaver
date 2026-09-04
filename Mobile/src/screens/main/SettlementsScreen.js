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
import { settlementsApi } from '../../api/settlements';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';

export const SettlementsScreen = ({ navigation }) => {
  const [balancesSummary, setBalancesSummary] = useState(null);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchSettlementsData = useCallback(async () => {
    try {
      setError(null);
      const [summaryRes, debtsRes] = await Promise.all([
        settlementsApi.getGroupBalancesSummary().catch(() => null),
        settlementsApi.getAllUserDebts().catch(() => []),
      ]);

      setBalancesSummary(summaryRes);
      setDebts(debtsRes || []);
    } catch (err) {
      console.warn('Settlements load error:', err);
      setError(err.message || 'Unable to load settlement balances. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSettlementsData();
  }, [fetchSettlementsData]);

  // Re-fetch when navigating back to screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchSettlementsData();
    });
    return unsubscribe;
  }, [navigation, fetchSettlementsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSettlementsData();
  };

  const youOweTotal = Number(balancesSummary?.total_owed || 0);
  const youAreOwedTotal = Number(balancesSummary?.total_receivable || 0);
  const netBal = Number(balancesSummary?.net_balance || 0);

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
          <Text style={styles.headerTitle}>Group Settlements</Text>
          <Text style={styles.headerSubtitle}>Authoritative simplified debt balances</Text>
        </View>
      </View>

      {/* Main Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Calculating group balances...</Text>
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
              <TouchableOpacity onPress={fetchSettlementsData} activeOpacity={0.7}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Top 3 Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, styles.oweCard]}>
                <View style={styles.summaryIconCircle}>
                  <Ionicons name="arrow-up-circle" size={20} color={colors.danger} />
                </View>
                <Text style={styles.summaryLabel}>You Owe</Text>
                <Text style={[styles.summaryAmount, { color: colors.danger }]}>
                  ₹{youOweTotal.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={[styles.summaryCard, styles.receiveCard]}>
                <View style={styles.summaryIconCircle}>
                  <Ionicons name="arrow-down-circle" size={20} color={colors.success} />
                </View>
                <Text style={styles.summaryLabel}>You Are Owed</Text>
                <Text style={[styles.summaryAmount, { color: colors.success }]}>
                  ₹{youAreOwedTotal.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Net Balance Hero Pill */}
            <View
              style={[
                styles.netBalanceBanner,
                {
                  backgroundColor:
                    netBal > 0
                      ? 'rgba(16, 185, 129, 0.12)'
                      : netBal < 0
                      ? colors.dangerBg
                      : colors.surfaceLight,
                },
              ]}
            >
              <Ionicons
                name={
                  netBal > 0
                    ? 'trending-up-outline'
                    : netBal < 0
                    ? 'trending-down-outline'
                    : 'checkmark-circle-outline'
                }
                size={20}
                color={netBal > 0 ? colors.success : netBal < 0 ? colors.danger : colors.textMuted}
              />
              <Text style={styles.netBalanceLabel}>Net Position:</Text>
              <Text
                style={[
                  styles.netBalanceValue,
                  {
                    color:
                      netBal > 0
                        ? colors.success
                        : netBal < 0
                        ? colors.danger
                        : colors.textSecondary,
                  },
                ]}
              >
                {netBal > 0 ? `+₹${netBal.toLocaleString('en-IN')}` : netBal < 0 ? `-₹${Math.abs(netBal).toLocaleString('en-IN')}` : '₹0.00 (All Settled)'}
              </Text>
            </View>
          </View>

          {/* Individual Debts / Suggested Transfers */}
          <View style={styles.debtsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Debt Settlements</Text>
              <Text style={styles.countText}>{debts.length} pending</Text>
            </View>

            {debts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="shield-checkmark" size={48} color={colors.success} />
                </View>
                <Text style={styles.emptyTitle}>All Settled Up!</Text>
                <Text style={styles.emptyDescription}>
                  You don't owe anyone, and nobody owes you in any group. Great job keeping your balances clean!
                </Text>
              </View>
            ) : (
              debts.map((item) => {
                const isYouOwe = item.direction === 'YOU_OWE';
                const amt = Number(item.amount) || 0;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('SettlementDetails', { debt: item })}
                  >
                    <Card style={styles.debtCard}>
                      <View style={styles.debtMainRow}>
                        {/* Avatar / Direction Icon */}
                        <View
                          style={[
                            styles.avatarCircle,
                            {
                              backgroundColor: isYouOwe
                                ? colors.dangerBg
                                : 'rgba(16, 185, 129, 0.12)',
                            },
                          ]}
                        >
                          <Ionicons
                            name={isYouOwe ? 'arrow-forward' : 'arrow-back'}
                            size={18}
                            color={isYouOwe ? colors.danger : colors.success}
                          />
                        </View>

                        {/* Title & Group Details */}
                        <View style={styles.debtDetails}>
                          <Text style={styles.debtTitle}>
                            {isYouOwe
                              ? `You owe ${item.other_user_name}`
                              : `${item.other_user_name} owes you`}
                          </Text>
                          <View style={styles.groupBadgeRow}>
                            <Ionicons name="people-outline" size={12} color={colors.textMuted} />
                            <Text style={styles.groupNameText}>{item.group_name}</Text>
                          </View>
                        </View>

                        {/* Amount & Action Button */}
                        <View style={styles.debtAmountCol}>
                          <Text
                            style={[
                              styles.debtAmount,
                              { color: isYouOwe ? colors.danger : colors.success },
                            ]}
                          >
                            ₹{amt.toLocaleString('en-IN')}
                          </Text>
                          <View
                            style={[
                              styles.actionPill,
                              {
                                backgroundColor: isYouOwe ? colors.primary : colors.surfaceLight,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.actionPillText,
                                { color: isYouOwe ? colors.surface : colors.textSecondary },
                              ]}
                            >
                              {isYouOwe ? 'Settle →' : 'Details →'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

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
  summaryContainer: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 3,
  },
  oweCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  receiveCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  summaryIconCircle: {
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  netBalanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 3,
  },
  netBalanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
    marginRight: 6,
  },
  netBalanceValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  debtsSection: {
    marginTop: 4,
  },
  sectionHeader: {
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
  debtCard: {
    marginBottom: 12,
    padding: 14,
  },
  debtMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  debtDetails: {
    flex: 1,
  },
  debtTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  groupBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupNameText: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 4,
  },
  debtAmountCol: {
    alignItems: 'flex-end',
  },
  debtAmount: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  actionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
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
  },
});

export default SettlementsScreen;
