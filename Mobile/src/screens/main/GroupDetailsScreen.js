import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { groupsApi } from '../../api/groups';
import { expensesApi } from '../../api/expenses';
import { sharedSubscriptionsApi } from '../../api/sharedSubscriptions';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors } from '../../theme/colors';

export const GroupDetailsScreen = ({ route, navigation }) => {
  const { groupId, groupName } = route.params || {};

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [sharedSubs, setSharedSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Add Member Modal State
  const [addMemberVisible, setAddMemberVisible] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState(null);

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) return;
    try {
      setError(null);
      const [detailsRes, membersRes, expensesRes, sharedSubsRes] = await Promise.all([
        groupsApi.getGroupDetails(groupId),
        groupsApi.getGroupMembers(groupId),
        expensesApi.getExpenses(groupId),
        sharedSubscriptionsApi.getGroupSharedSubscriptions(groupId).catch(() => []),
      ]);
      setGroup(detailsRes);
      setMembers(membersRes || []);
      setExpenses(expensesRes || []);
      setSharedSubs(sharedSubsRes || []);
    } catch (err) {
      console.warn('fetchGroupDetails error:', err);
      setError(err.message || 'Failed to load group details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);


  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  // Re-fetch when navigating back from Add Expense or Expense Details
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchGroupDetails();
    });
    return unsubscribe;
  }, [navigation, fetchGroupDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroupDetails();
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim()) {
      setMemberError('Please enter user email.');
      return;
    }

    try {
      setAddingMember(true);
      setMemberError(null);
      await groupsApi.addGroupMember(groupId, { email: memberEmail.trim() });
      setMemberEmail('');
      setAddMemberVisible(false);
      fetchGroupDetails();
      Alert.alert('Member Added', 'Member was successfully added to the group.');
    } catch (err) {
      setMemberError(err.message || 'Failed to add member.');
    } finally {
      setAddingMember(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading group details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {group?.name || groupName || 'Group Details'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {members.length} member{members.length === 1 ? '' : 's'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => setAddMemberVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="person-add-outline" size={20} color={colors.primary} />
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
        {/* Action Button: Add Expense */}
        <Button
          title="+ Add Group Expense"
          onPress={() =>
            navigation.navigate('AddExpense', {
              groupId,
              groupName: group?.name || groupName,
              members,
            })
          }
          style={styles.addExpenseBtn}
        />

        {/* Group Members Section */}
        <Card>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Members</Text>
            </View>
            <TouchableOpacity onPress={() => setAddMemberVisible(true)}>
              <Text style={styles.addMemberText}>+ Add Member</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.membersGrid}>
            {members.map((m) => (
              <View key={m.id || m.user_id} style={styles.memberChip}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.avatarInitial}>
                    {(m.name || m.user_name || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberTextContainer}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {m.name || m.user_name}
                  </Text>
                  <Text style={styles.memberEmail} numberOfLines={1}>
                    {m.email || m.user_email || ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Shared Subscriptions Section */}
        <Card>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="repeat-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Shared Subscriptions</Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('AddSharedSubscription', {
                  groupId,
                  groupName: group?.name || groupName,
                })
              }
            >
              <Text style={styles.addMemberText}>+ Add Shared Sub</Text>
            </TouchableOpacity>
          </View>

          {sharedSubs.length > 0 ? (
            sharedSubs.map((sub) => {
              const userShare = sub.current_user_share
                ? Number(sub.current_user_share).toFixed(2)
                : (Number(sub.total_amount) / (sub.members?.length || 1)).toFixed(2);
              return (
                <TouchableOpacity
                  key={sub.id}
                  style={styles.expenseItem}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('SharedSubscriptionDetails', {
                      subscriptionId: sub.id,
                    })
                  }
                >
                  <View style={styles.expenseLeft}>
                    <Text style={styles.expenseTitle}>{sub.name}</Text>
                    <Text style={styles.expenseMeta}>
                      Paid by {sub.payer_name} • Renews: {sub.next_renewal_date}
                    </Text>
                  </View>
                  <View style={styles.expenseRight}>
                    <Text style={styles.expenseAmount}>₹{userShare}/mo</Text>
                    <Text style={styles.splitsCount}>Your Share</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textMuted}
                    style={styles.chevron}
                  />
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyExpenses}>
              <Text style={styles.emptyExpensesText}>
                No shared recurring subscriptions in this group yet.
              </Text>
            </View>
          )}
        </Card>

        {/* Shared Expenses Section */}
        <Card>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="receipt-outline" size={20} color={colors.purple} />
              <Text style={styles.sectionTitle}>Group Expenses</Text>
            </View>
            <Text style={styles.countText}>{expenses.length} total</Text>
          </View>


          {expenses.length > 0 ? (
            expenses.map((exp) => (
              <TouchableOpacity
                key={exp.id}
                style={styles.expenseItem}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('ExpenseDetails', {
                    expenseId: exp.id,
                  })
                }
              >
                <View style={styles.expenseLeft}>
                  <Text style={styles.expenseTitle}>{exp.title}</Text>
                  <Text style={styles.expenseMeta}>
                    Paid by {exp.payer_name} • {exp.expense_date}
                  </Text>
                </View>
                <View style={styles.expenseRight}>
                  <Text style={styles.expenseAmount}>
                    ₹{Number(exp.total_amount).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.splitsCount}>
                    {exp.splits?.length || 0} split{exp.splits?.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.chevron} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyExpenses}>
              <Text style={styles.emptyExpensesText}>
                No expenses added to this group yet.
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Add Member Modal */}
      <Modal
        visible={addMemberVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddMemberVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Member by Email</Text>
              <TouchableOpacity onPress={() => setAddMemberVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {memberError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <Text style={styles.errorBannerText}>{memberError}</Text>
              </View>
            )}

            <Input
              label="Registered Email Address"
              value={memberEmail}
              onChangeText={(text) => {
                setMemberEmail(text);
                setMemberError(null);
              }}
              placeholder="friend@example.com"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setAddMemberVisible(false)}
                style={styles.modalCancelBtn}
              />
              <Button
                title="Add Member"
                onPress={handleAddMember}
                loading={addingMember}
                style={styles.modalSubmitBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  addExpenseBtn: {
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    margin: 16,
    padding: 12,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  addMemberText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  countText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 8,
    margin: 4,
    minWidth: '45%',
    flex: 1,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  memberTextContainer: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  memberEmail: {
    fontSize: 11,
    color: colors.textMuted,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  expenseLeft: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  expenseMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  splitsCount: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 4,
  },
  emptyExpenses: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyExpensesText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  modalCancelBtn: {
    flex: 1,
    marginRight: 8,
  },
  modalSubmitBtn: {
    flex: 1,
    marginLeft: 8,
  },
});
