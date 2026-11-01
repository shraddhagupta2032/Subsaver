import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { expensesApi } from '../../api/expenses';
import { analyticsApi } from '../../api/analytics';
import { colors } from '../../theme/colors';

const CATEGORY_CHIPS = ['All', 'Food', 'Bills', 'Travel', 'Shopping', 'Other'];

export const ExpensesScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [expenses, setExpenses] = useState([]);
  const [spendingSummary, setSpendingSummary] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [expensesData, monthlyData] = await Promise.allSettled([
        expensesApi.getExpenses(),
        analyticsApi.getMonthlySpending(),
      ]);

      if (expensesData.status === 'fulfilled' && Array.isArray(expensesData.value)) {
        setExpenses(expensesData.value);
      }
      if (monthlyData.status === 'fulfilled') {
        setSpendingSummary(monthlyData.value);
      }
    } catch (err) {
      console.warn('loadExpenses error:', err);
      setError(err.message || 'Failed to load expenses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getCategoryIcon = (category = '') => {
    const cat = category.toLowerCase();
    if (cat.includes('food') || cat.includes('dinner') || cat.includes('meal')) return 'restaurant-outline';
    if (cat.includes('bill') || cat.includes('wifi') || cat.includes('utility')) return 'wifi-outline';
    if (cat.includes('travel') || cat.includes('cab') || cat.includes('flight')) return 'car-outline';
    if (cat.includes('grocer') || cat.includes('shop')) return 'cart-outline';
    return 'receipt-outline';
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        (item.category && item.category.toLowerCase().includes(selectedCategory.toLowerCase()));
      const matchesSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.group_name && item.group_name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [expenses, selectedCategory, searchQuery]);

  // Group by date or date-label
  const groupedExpenses = useMemo(() => {
    const groups = {};
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    filteredExpenses.forEach((exp) => {
      let rawDate = exp.expense_date || exp.created_at || '';
      let dateKey = rawDate ? rawDate.split('T')[0] : 'RECENT';

      let label = dateKey;
      if (dateKey === todayStr) label = 'TODAY';
      else if (dateKey === yesterday) label = 'YESTERDAY';

      if (!groups[label]) groups[label] = [];
      groups[label].push(exp);
    });

    return groups;
  }, [filteredExpenses]);

  const currentMonthName = spendingSummary?.current_month_name || 'This Month';
  const totalMonthSpend = spendingSummary?.current_month_spending ?? 
    expenses.reduce((sum, e) => sum + Number(e.total_amount || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { maxWidth: isDesktop ? 1140 : '100%' }]}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Expenses</Text>
          <Text style={styles.headerSubtitle}>{currentMonthName} 2025</Text>
        </View>
        <TouchableOpacity
          style={styles.searchIconButton}
          onPress={() => setShowSearch(!showSearch)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showSearch ? 'close-outline' : 'search-outline'}
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Expandable Search Input */}
      {showSearch && (
        <View style={[styles.searchBarBox, { maxWidth: isDesktop ? 1140 : '100%' }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by title or group..."
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

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
        {/* Total This Month Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total this month</Text>
          <Text style={styles.heroAmount}>
            ₹{Number(totalMonthSpend).toLocaleString('en-IN')}
          </Text>
          {spendingSummary?.percentage_change !== null && spendingSummary?.percentage_change !== undefined && (
            <View style={styles.heroChangeRow}>
              <Ionicons
                name={spendingSummary.is_increase ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={colors.mintBar}
              />
              <Text style={styles.heroChangeText}>
                {Math.abs(spendingSummary.percentage_change)}% from {spendingSummary.previous_month_name || 'last month'}
              </Text>
            </View>
          )}
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {CATEGORY_CHIPS.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading expenses...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : filteredExpenses.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Expenses Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search or category filter.'
                : 'Tap "+ Add expense" below to log your first shared or personal expense.'}
            </Text>
          </View>
        ) : (
          Object.keys(groupedExpenses).map((dateGroup) => (
            <View key={dateGroup} style={styles.dateGroupContainer}>
              <Text style={styles.dateLabel}>{dateGroup}</Text>
              <View style={styles.expensesCardContainer}>
                {groupedExpenses[dateGroup].map((item, idx) => {
                  const isLast = idx === groupedExpenses[dateGroup].length - 1;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.expenseItem, !isLast && styles.expenseItemBorder]}
                      activeOpacity={0.75}
                      onPress={() =>
                        navigation.navigate('ExpenseDetails', {
                          expenseId: item.id,
                          expenseTitle: item.title,
                        })
                      }
                    >
                      <View style={styles.expenseItemLeft}>
                        <View style={styles.iconBox}>
                          <Ionicons
                            name={getCategoryIcon(item.category)}
                            size={20}
                            color={colors.primary}
                          />
                        </View>
                        <View style={styles.expenseInfo}>
                          <Text style={styles.expenseTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.expenseSub} numberOfLines={1}>
                            {item.group_name || 'Personal'} • {item.expense_date || 'Recent'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.expenseItemRight}>
                        <Text style={styles.expenseAmount}>
                          - ₹{Number(item.total_amount).toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.expensePayerTag}>
                          {item.payer_name ? `${item.payer_name} paid` : 'Shared'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button (+ Add Expense) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddExpense')}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.fabText}>Add expense</Text>
      </TouchableOpacity>
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
  searchIconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
    alignSelf: 'center',
    width: '90%',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    height: '100%',
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
  heroChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroChangeText: {
    color: colors.mintBar,
    fontSize: 12,
    fontWeight: '700',
  },
  chipsScroll: {
    marginBottom: 16,
  },
  chipsContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateGroupContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  expensesCardContainer: {
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
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  expenseItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  expenseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  expenseSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  expenseItemRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  expensePayerTag: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  centerBox: {
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
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: colors.primary,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 10,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
