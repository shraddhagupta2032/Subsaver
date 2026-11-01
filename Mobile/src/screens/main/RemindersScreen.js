import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '../../api/notifications';
import { Card } from '../../components/Card';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { colors } from '../../theme/colors';

export const RemindersScreen = ({ navigation }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const fetchReminders = useCallback(async () => {
    try {
      setError(null);
      const data = await notificationsApi.getUpcomingReminders(30);
      setReminders(data || []);
    } catch (err) {
      console.warn('fetchReminders error:', err);
      setError(err.message || 'Failed to load upcoming reminders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReminders();
  };

  const handleSyncReminders = async () => {
    try {
      setSyncing(true);
      await notificationsApi.processReminders();
      await fetchReminders();
    } catch (err) {
      console.warn('processReminders error:', err);
      Alert.alert('Notice', 'Unable to refresh automated reminder engine at this time.');
    } finally {
      setSyncing(false);
    }
  };

  const handleItemPress = (reminder) => {
    if (reminder.subscription_id) {
      navigation.navigate('SubscriptionDetails', {
        subscriptionId: reminder.subscription_id,
        subscriptionName: reminder.subscription?.name || 'Subscription',
      });
    } else if (reminder.expense_split?.expense_id) {
      navigation.navigate('ExpenseDetails', {
        expenseId: reminder.expense_split.expense_id,
        expenseTitle: reminder.expense_split.expense?.title || 'Expense',
      });
    }
  };

  // Group reminders by relative date buckets: TODAY, TOMORROW, IN X DAYS, LATER
  const groupRemindersByDate = (items) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groupsMap = {};

    items.forEach((item) => {
      if (!item.reminder_date) return;
      const rDate = new Date(item.reminder_date);
      rDate.setHours(0, 0, 0, 0);

      const diffTime = rDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let sectionKey = 'LATER';
      let sortOrder = 999;

      if (diffDays < 0) {
        sectionKey = 'OVERDUE';
        sortOrder = -1;
      } else if (diffDays === 0) {
        sectionKey = 'TODAY';
        sortOrder = 0;
      } else if (diffDays === 1) {
        sectionKey = 'TOMORROW';
        sortOrder = 1;
      } else if (diffDays <= 7) {
        sectionKey = `IN ${diffDays} DAYS`;
        sortOrder = diffDays;
      } else if (diffDays <= 14) {
        sectionKey = 'NEXT WEEK';
        sortOrder = 14;
      } else {
        sectionKey = 'LATER THIS MONTH';
        sortOrder = 30;
      }

      if (!groupsMap[sectionKey]) {
        groupsMap[sectionKey] = {
          title: sectionKey,
          sortOrder,
          items: [],
        };
      }
      groupsMap[sectionKey].items.push(item);
    });

    return Object.values(groupsMap).sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const groupedSections = groupRemindersByDate(reminders);

  return (
    <SafeAreaView style={styles.container}>
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
        <ScreenHeader
          title="Upcoming Reminders"
          subtitle="Renewal dates & payment deadlines"
          back
          onBack={() => navigation.goBack()}
          action={
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleSyncReminders}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh-outline" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          }
        />

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchReminders}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Checking upcoming deadlines...</Text>
          </View>
        ) : groupedSections.length > 0 ? (
          groupedSections.map((sec, idx) => (
            <View key={idx} style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text
                  style={[
                    styles.sectionTitle,
                    sec.title === 'OVERDUE' && { color: colors.danger },
                    sec.title === 'TODAY' && { color: colors.warning },
                  ]}
                >
                  {sec.title}
                </Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{sec.items.length}</Text>
                </View>
              </View>

              {sec.items.map((item) => {
                const isSub = item.reminder_type === 'SUBSCRIPTION_RENEWAL';
                const amount = isSub
                  ? item.subscription?.amount
                  : item.expense_split?.amount_owed;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.reminderCard}
                    activeOpacity={0.7}
                    onPress={() => handleItemPress(item)}
                  >
                    <View style={styles.cardLeft}>
                      <View
                        style={[
                          styles.iconBox,
                          {
                            backgroundColor: isSub
                              ? colors.primarySoft
                              : colors.dangerBg,
                          },
                        ]}
                      >
                        <Ionicons
                          name={isSub ? 'calendar-outline' : 'cash-outline'}
                          size={20}
                          color={isSub ? colors.primary : colors.danger}
                        />
                      </View>
                      <View style={styles.infoCol}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemSubtitle}>
                          {isSub
                            ? `${item.subscription?.category || 'Subscription'} • ${item.subscription?.billing_cycle?.toLowerCase() || 'monthly'}`
                            : `Group: ${item.expense_split?.expense?.group_name || 'Group Expense'}`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardRight}>
                      {amount !== undefined && amount !== null && (
                        <Text style={styles.itemAmount}>
                          ₹{Number(amount).toFixed(2)}
                        </Text>
                      )}
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No upcoming reminders"
            message="You have no pending subscription renewals or expense payment deadlines in the next 30 days."
          />
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
  syncButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionBadge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginRight: 6,
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
});
