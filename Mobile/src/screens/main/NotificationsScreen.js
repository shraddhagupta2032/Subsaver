import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '../../api/notifications';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../theme/colors';

const FILTER_TABS = ['ALL', 'UNREAD', 'READ'];

export const NotificationsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const data = await notificationsApi.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.warn('fetchNotifications error:', err);
      setError(err.message || 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (notification) => {
    if (notification.status === 'READ') {
      navigateToTarget(notification);
      return;
    }

    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, status: 'READ', read_at: new Date().toISOString() } : n))
      );
      await notificationsApi.markAsRead(notification.id);
    } catch (err) {
      console.warn('markAsRead error:', err);
    }
    navigateToTarget(notification);
  };

  const navigateToTarget = (notification) => {
    if (notification.subscription_id) {
      navigation.navigate('SubscriptionDetails', {
        subscriptionId: notification.subscription_id,
        subscriptionName: notification.title || 'Subscription',
      });
    } else if (notification.expense_split?.expense_id) {
      navigation.navigate('ExpenseDetails', {
        expenseId: notification.expense_split.expense_id,
        expenseTitle: notification.title || 'Expense',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadCount = notifications.filter((n) => n.status === 'PENDING').length;
    if (unreadCount === 0) return;

    try {
      setMarkingAll(true);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'READ', read_at: new Date().toISOString() }))
      );
      await notificationsApi.markAllAsRead();
    } catch (err) {
      console.warn('markAllAsRead error:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const filteredList = useMemo(() => {
    if (filter === 'UNREAD') return notifications.filter((n) => n.status === 'PENDING');
    if (filter === 'READ') return notifications.filter((n) => n.status === 'READ');
    return notifications;
  }, [notifications, filter]);

  const getNoticeConfig = (item) => {
    const t = (item.reminder_type || item.type || '').toUpperCase();
    if (t.includes('SUBSCRIPTION')) {
      return { icon: 'sync-outline', color: colors.primary, bg: colors.primarySoft };
    }
    if (t.includes('EXPENSE') || t.includes('PAYMENT')) {
      return { icon: 'wallet-outline', color: colors.warning, bg: colors.warningBg };
    }
    return { icon: 'people-outline', color: colors.info, bg: colors.infoBg };
  };

  const renderItem = ({ item }) => {
    const conf = getNoticeConfig(item);
    const isUnread = item.status === 'PENDING';

    return (
      <TouchableOpacity
        style={[styles.noticeItem, isUnread && styles.noticeItemUnread]}
        activeOpacity={0.75}
        onPress={() => handleMarkAsRead(item)}
      >
        <View style={[styles.iconBox, { backgroundColor: conf.bg }]}>
          <Ionicons name={conf.icon} size={20} color={conf.color} />
        </View>

        <View style={styles.noticeTextCol}>
          <View style={styles.noticeTopRow}>
            <Text style={styles.noticeTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.noticeMessage} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const unreadTotal = notifications.filter((n) => n.status === 'PENDING').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.headerContainer, { maxWidth: isDesktop ? 680 : '100%' }]}>
        <ScreenHeader
          title="Notifications"
          subtitle="Stay ahead of dues and renewals."
          back
          onBack={() => navigation.goBack()}
          action={
            unreadTotal > 0 ? (
              <TouchableOpacity
                onPress={handleMarkAllAsRead}
                disabled={markingAll}
                activeOpacity={0.7}
              >
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            ) : null
          }
        />

        {/* Filter Chips */}
        <View style={styles.chipsRow}>
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(tab)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab === 'UNREAD' && unreadTotal > 0 ? `Unread (${unreadTotal})` : tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { maxWidth: isDesktop ? 680 : '100%', paddingHorizontal: isDesktop ? 24 : 16 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySub}>
                {filter === 'UNREAD'
                  ? 'You are all caught up! No unread notifications.'
                  : 'You have no notifications or reminders at this time.'}
              </Text>
            </View>
          }
        />
      )}
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
    marginBottom: 8,
  },
  markAllText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 110,
    width: '100%',
    alignSelf: 'center',
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  noticeItemUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(13, 143, 111, 0.4)',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  noticeTextCol: {
    flex: 1,
  },
  noticeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 6,
  },
  noticeMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
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
  },
  centerBox: {
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
});
