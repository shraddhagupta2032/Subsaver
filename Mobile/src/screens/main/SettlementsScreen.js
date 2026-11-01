import React, { useState, useEffect, useCallback } from 'react';
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
import { settlementsApi } from '../../api/settlements';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { colors } from '../../theme/colors';

const TONES = ['mint', 'peach', 'sky', 'purple'];

export const SettlementsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

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
  const netBal = Number(balancesSummary?.net_balance || (youAreOwedTotal - youOweTotal));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.headerContainer, { maxWidth: isDesktop ? 680 : '100%' }]}>
        <ScreenHeader
          title="Payments"
          subtitle="Clear balances, keep friendships intact."
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
        {/* Net Balance Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Net Balance</Text>
          <Text style={styles.heroAmount}>
            {netBal >= 0 ? '+' : '-'} ₹{Math.abs(netBal).toLocaleString('en-IN')}
          </Text>
          <View style={styles.heroSubRow}>
            <Text style={styles.heroSubItem}>
              You are owed: <Text style={{ fontWeight: '800', color: colors.mintBar }}>₹{youAreOwedTotal.toLocaleString('en-IN')}</Text>
            </Text>
            <Text style={styles.heroDot}>•</Text>
            <Text style={styles.heroSubItem}>
              You owe: <Text style={{ fontWeight: '800', color: '#FFA49C' }}>₹{youOweTotal.toLocaleString('en-IN')}</Text>
            </Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Debts List */}
        <Text style={styles.sectionTitle}>Pending settlements</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Calculating simplified debts...</Text>
          </View>
        ) : debts.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="checkmark-done-circle" size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>All Settled Up!</Text>
            <Text style={styles.emptySub}>
              You don't owe anyone and no one owes you in any group.
            </Text>
          </View>
        ) : (
          <View style={styles.debtsContainer}>
            {debts.map((item, idx) => {
              const isReceive = item.type === 'RECEIVABLE' || Number(item.amount_owed) > 0;
              const tone = TONES[idx % TONES.length];
              const isLast = idx === debts.length - 1;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.debtItem, !isLast && styles.debtBorder]}
                  activeOpacity={0.75}
                  onPress={() =>
                    navigation.navigate('SettlementDetails', {
                      counterpartyName: item.other_user_name || item.name,
                      amount: Math.abs(Number(item.amount_owed || item.amount || 0)),
                      isReceive,
                      groupId: item.group_id,
                    })
                  }
                >
                  <Avatar name={item.other_user_name || item.name || 'Member'} tone={tone} />

                  <View style={styles.debtInfo}>
                    <Text style={styles.debtName} numberOfLines={1}>
                      {item.other_user_name || item.name}
                    </Text>
                    <Text style={styles.debtDetail} numberOfLines={1}>
                      {isReceive ? 'owes you' : 'you owe'} {item.group_name ? `in ${item.group_name}` : ''}
                    </Text>
                  </View>

                  <View style={styles.debtAmountCol}>
                    <Text
                      style={[
                        styles.debtAmount,
                        { color: isReceive ? colors.primary : colors.danger },
                      ]}
                    >
                      {isReceive ? '+' : '-'} ₹{Math.abs(Number(item.amount_owed || item.amount || 0)).toLocaleString('en-IN')}
                    </Text>
                    <Badge
                      text={isReceive ? 'To Collect' : 'To Pay'}
                      variant={isReceive ? 'success' : 'danger'}
                      size="small"
                    />
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              );
            })}
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
    marginBottom: 8,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroSubItem: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
  },
  heroDot: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
    marginLeft: 4,
  },
  debtsContainer: {
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
  debtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  debtBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  debtInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  debtName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  debtDetail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  debtAmountCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  debtAmount: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
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
