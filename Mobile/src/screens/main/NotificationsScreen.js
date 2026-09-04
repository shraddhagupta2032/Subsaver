import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '../../api/notifications';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';

export const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'READ'
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
      // Optimistic update
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
        subscriptionName: notification.subscription?.name || 'Subscription',
      });
    } else if (notification.expense_split?.expense_id) {
      navigation.navigate('ExpenseDetails', {
        expenseId: notification.expense_split.expense_id,
        expenseTitle: notification.expense_split.expense?.title || 'Expense',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadCount = notifications.filter((n) => n.status === 'PENDING').length;
    if (unreadCount === 0) return;

    try {
      setMarkingAll(true);
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'READ', read_at: new Date().toISOString() }))
      );
      await notificationsApi.markAllAsRead();
    } catch (err) {
      console.warn('markAllAsRead error:', err);
      Alert.alert('Error', 'Failed to mark all notifications as read.');
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return n.status === 'PENDING';
    if (filter === 'READ') return n.status === 'READ';
    return true;
  });

  const unreadCount = notifications.filter((n) => n.status === 'PENDING').length;

  const getTypeConfig = (type) => {
    switch (type) {
      case 'SUBSCRIPTION_RENEWAL':
        return {
          icon: 'calendar-outline',
          color: colors.primary,
          bg: 'rgba(59, 130, 246, 0.12)',
          label: 'Subscription Renewal',
        };
      case 'EXPENSE_PAYMENT':
        return {
          icon: 'cash-outline',
          color: colors.danger,
          bg: colors.dangerBg,
          label: 'Payment Due',
        };
      case 'BUDGET_WARNING':
        return {
          icon: 'warning-outline',
          color: colors.warning,
          bg: colors.warningBg,
          label: 'Budget Alert',
        };
      default:
        return {
          icon: 'notifications-outline',
          color: colors.purple,
          bg: 'rgba(168, 85, 247, 0.12)',
          label: 'Notification',
        };
    }
  };

  const renderItem = ({ item }) => {
    const isUnread = item.status === 'PENDING';
    const typeConf = getTypeConfig(item.reminder_type);
    const dateFormatted = item.reminder_date
      ? new Date(item.reminder_date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';

    return (
      <TouchableOpacity
        style={[styles.notificationCard, isUnread && styles.notificationCardUnread]}
        activeOpacity={0.7}
        onPress={() => handleMarkAsRead(item)}
      >
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconContainer, { backgroundColor: typeConf.bg }]}>
            <Ionicons name={typeConf.icon} size={20} color={typeConf.color} />
          </View>
          <View style={styles.headerInfoCol}>
            <View style={styles.titleBadgeRow}>
              <Text style={styles.typeLabel}>{typeConf.label}</Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
        </View>

        <Text style={styles.messageText}>{item.message}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.dateText}>Due: {dateFormatted}</Text>
          </View>

          {isUnread ? (
            <TouchableOpacity
              style={styles.markReadBtn}
              onPress={() => handleMarkAsRead(item)}
            >
              <Text style={styles.markReadBtnText}>Mark read</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.readLabel}>Read</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllAsRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.markAllBtnText}>Read all</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { key: 'ALL', label: `All (${notifications.length})` },
          { key: 'UNREAD', label: `Unread (${unreadCount})` },
          { key: 'READ', label: `Read (${notifications.length - unreadCount})` },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterChip, filter === tab.key && styles.filterChipActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text
              style={[styles.filterChipText, filter === tab.key && styles.filterChipTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Error state */}
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchNotifications}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
                <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'UNREAD'
                  ? "You're all caught up! Check back when your subscription renewals or expense payments are due."
                  : 'We will notify you about upcoming renewals, dues, and payment deadlines.'}
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  notificationCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  notificationCardUnread: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
    backgroundColor: 'rgba(59, 130, 246, 0.04)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfoCol: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  messageText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 4,
  },
  markReadBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  markReadBtnText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  readLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.surfaceLight,
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
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
