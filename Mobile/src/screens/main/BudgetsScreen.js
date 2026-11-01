import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { budgetsApi } from '../../api/budgets';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Badge } from '../../components/Badge';
import { colors } from '../../theme/colors';

export const BudgetsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

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
        budgetsApi.getBudgetsOverview().catch(() => null),
      ]);
      setBudgets(budgetsRes || []);
      setOverview(overviewRes);
    } catch (err) {
      console.warn('Budgets fetch error:', err);
      setError(err.message || 'Unable to load budgets. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgetsData();
  }, [fetchBudgetsData]);

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

  const totalSpent = useMemo(() => {
    if (overview?.total_spent !== undefined) return Number(overview.total_spent);
    return budgets.reduce((sum, b) => sum + Number(b.spent_amount || 0), 0);
  }, [overview, budgets]);

  const totalLimit = useMemo(() => {
    if (overview?.total_budget !== undefined) return Number(overview.total_budget);
    return budgets.reduce((sum, b) => sum + Number(b.monthly_limit || 0), 0);
  }, [overview, budgets]);

  const overallPct = Math.min(100, Math.round((totalSpent / (totalLimit || 1)) * 100));
  const remaining = Math.max(0, totalLimit - totalSpent);

  const handleDeleteBudget = (budget) => {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to remove the budget cap for "${budget.category}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(budget.id);
              await budgetsApi.deleteBudget(budget.id);
              fetchBudgetsData();
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
      <View style={[styles.headerContainer, { maxWidth: isDesktop ? 680 : '100%' }]}>
        <ScreenHeader
          title="Budgets"
          subtitle="Keep your monthly spending in check."
          back
          onBack={() => navigation.goBack()}
          action={
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('AddBudget')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          }
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
        {/* Overall Budget Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Overall budget status</Text>
          <Text style={styles.heroAmount}>
            ₹{totalSpent.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.heroSub}>
            of ₹{totalLimit.toLocaleString('en-IN')} total monthly limit
          </Text>

          <View style={styles.budgetTrack}>
            <View
              style={[
                styles.budgetFill,
                { width: `${overallPct}%`, backgroundColor: overallPct >= 100 ? colors.danger : colors.mintBar },
              ]}
            />
          </View>

          <View style={styles.heroFootRow}>
            <Text style={styles.heroFootText}>{overallPct}% used</Text>
            <Text style={styles.heroFootText}>
              ₹{remaining.toLocaleString('en-IN')} remaining
            </Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Category Caps</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading category budgets...</Text>
          </View>
        ) : budgets.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="pie-chart-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Budgets Set</Text>
            <Text style={styles.emptySub}>
              Set monthly spending caps for dining, groceries, and bills to receive early warning alerts.
            </Text>
          </View>
        ) : (
          <View style={styles.budgetsContainer}>
            {budgets.map((b, idx) => {
              const spent = Number(b.spent_amount || 0);
              const limit = Number(b.monthly_limit || 1);
              const pct = Math.min(100, Math.round((spent / limit) * 100));
              const isOver = pct >= 100;
              const isNear = pct >= 80 && pct < 100;
              const isLast = idx === budgets.length - 1;

              return (
                <View key={b.id || idx} style={[styles.budgetItem, !isLast && styles.budgetBorder]}>
                  <View style={styles.budgetTopRow}>
                    <View style={styles.budgetTitleCol}>
                      <Text style={styles.budgetName}>{b.category}</Text>
                      <Text style={styles.budgetNumbers}>
                        ₹{spent.toLocaleString('en-IN')} of ₹{limit.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <Badge
                      text={isOver ? 'OVER LIMIT' : isNear ? 'NEAR LIMIT' : 'WITHIN LIMIT'}
                      variant={isOver ? 'danger' : isNear ? 'warning' : 'success'}
                      size="small"
                    />
                  </View>

                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${pct}%`,
                          backgroundColor: isOver ? colors.danger : isNear ? colors.warning : colors.primary,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.budgetActionsRow}>
                    <Text style={[styles.pctText, isOver && { color: colors.danger }]}>
                      {pct}% spent
                    </Text>
                    <View style={styles.btnRow}>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => navigation.navigate('EditBudget', { budgetId: b.id, budget: b })}
                      >
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteBudget(b)}
                        disabled={deletingId === b.id}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
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
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 2,
  },
  heroSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    marginBottom: 12,
  },
  budgetTrack: {
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  budgetFill: {
    height: '100%',
    borderRadius: 99,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
    marginLeft: 4,
  },
  budgetsContainer: {
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
  budgetItem: {
    paddingVertical: 14,
  },
  budgetBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  budgetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  budgetTitleCol: {
    flex: 1,
  },
  budgetName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  budgetNumbers: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  track: {
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
    marginBottom: 10,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pctText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  deleteBtn: {
    padding: 4,
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
