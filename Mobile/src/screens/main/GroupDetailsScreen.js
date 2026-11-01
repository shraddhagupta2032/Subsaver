import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { groupsApi } from '../../api/groups';
import { expensesApi } from '../../api/expenses';
import { sharedSubscriptionsApi } from '../../api/sharedSubscriptions';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors } from '../../theme/colors';

const MEMBER_TONES = ['mint', 'peach', 'sky', 'purple'];

export const GroupDetailsScreen = ({ route, navigation }) => {
  const { groupId, groupName } = route.params || {};
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

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
      Alert.alert('Success', 'Member invited to group successfully.');
    } catch (err) {
      setMemberError(err.message || 'Failed to add member.');
    } finally {
      setAddingMember(false);
    }
  };

  const totalGroupSpend = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.total_amount || 0), 0);
  }, [expenses]);

  const titleText = group?.name || groupName || 'Group Details';
  const subtitleText = `${members.length} member${members.length === 1 ? '' : 's'} • ${expenses.length} expense${expenses.length === 1 ? '' : 's'}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.headerContainer, { maxWidth: isDesktop ? 1140 : '100%' }]}>
        <ScreenHeader
          title={titleText}
          subtitle={subtitleText}
          back
          onBack={() => navigation.goBack()}
          action={
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => setAddMemberVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          }
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: isDesktop ? 1140 : '100%', paddingHorizontal: isDesktop ? 24 : 16 },
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
        {/* Total Group Spending Hero */}
        <View style={styles.groupHeroCard}>
          <Text style={styles.heroLabel}>Total group spend</Text>
          <Text style={styles.heroAmount}>
            ₹{Number(totalGroupSpend).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.heroSub}>
            Shared among {members.length} flatmates & crew members
          </Text>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddExpense', { groupId, groupName: titleText })}
          >
            <Ionicons name="add-circle" size={18} color={colors.primary} />
            <Text style={styles.actionBtnText}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Settlements', { groupId, groupName: titleText })}
          >
            <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
            <Text style={styles.actionBtnText}>Settle Debts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddSharedSubscription', { groupId, groupName: titleText })}
          >
            <Ionicons name="sync" size={16} color={colors.primary} />
            <Text style={styles.actionBtnText}>Share Sub</Text>
          </TouchableOpacity>
        </View>

        {/* Group Members List */}
        <Text style={styles.sectionTitle}>Members</Text>
        <View style={styles.membersContainer}>
          {members.length > 0 ? (
            members.map((m, idx) => {
              const tone = MEMBER_TONES[idx % MEMBER_TONES.length];
              const isLast = idx === members.length - 1;
              return (
                <View key={m.id || idx} style={[styles.memberItem, !isLast && styles.memberBorder]}>
                  <Avatar name={m.name || m.email || 'Member'} tone={tone} />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.name || m.email}</Text>
                    <Text style={styles.memberRole}>{m.role || 'Member'}</Text>
                  </View>
                  <View style={styles.memberBalanceCol}>
                    <Text style={styles.memberBalanceLabel}>Status</Text>
                    <Text style={styles.memberBalanceVal}>Active</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No members found.</Text>
          )}
        </View>

        {/* Group Expenses Section */}
        <Text style={styles.sectionTitle}>Group Expenses</Text>
        <View style={styles.expensesContainer}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ padding: 20 }} />
          ) : expenses.length === 0 ? (
            <View style={styles.emptyExpenseBox}>
              <Ionicons name="receipt-outline" size={28} color={colors.primary} />
              <Text style={styles.emptyExpenseTitle}>No Expenses In This Group</Text>
              <Text style={styles.emptyExpenseSub}>Tap "Add Expense" above to record the first shared bill.</Text>
            </View>
          ) : (
            expenses.map((exp, idx) => {
              const isLast = idx === expenses.length - 1;
              return (
                <TouchableOpacity
                  key={exp.id || idx}
                  style={[styles.expenseItem, !isLast && styles.expenseBorder]}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('ExpenseDetails', { expenseId: exp.id, expenseTitle: exp.title })}
                >
                  <View style={styles.expenseLeft}>
                    <View style={styles.expenseIconBox}>
                      <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.expenseTextCol}>
                      <Text style={styles.expenseTitle}>{exp.title}</Text>
                      <Text style={styles.expenseSub}>{exp.payer_name ? `${exp.payer_name} paid` : 'Paid'} • {exp.expense_date || 'Recent'}</Text>
                    </View>
                  </View>
                  <View style={styles.expenseRight}>
                    <Text style={styles.expenseAmount}>₹{Number(exp.total_amount).toLocaleString('en-IN')}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
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
              <Text style={styles.modalTitle}>Add Member to Group</Text>
              <TouchableOpacity onPress={() => setAddMemberVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Enter the registered email of the user to invite them to {titleText}.
            </Text>

            {memberError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{memberError}</Text>
              </View>
            )}

            <Input
              label="User Email"
              value={memberEmail}
              onChangeText={setMemberEmail}
              placeholder="flatmate@example.com"
              keyboardType="email-address"
              autoFocus
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setAddMemberVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Invite Member"
                onPress={handleAddMember}
                loading={addingMember}
                style={styles.modalBtn}
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
  headerContainer: {
    paddingHorizontal: 20,
    width: '100%',
    alignSelf: 'center',
  },
  moreBtn: {
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
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
    width: '100%',
    alignSelf: 'center',
  },
  groupHeroCard: {
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
    marginBottom: 6,
  },
  heroSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
    marginLeft: 4,
  },
  membersContainer: {
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
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  memberRole: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  memberBalanceCol: {
    alignItems: 'flex-end',
  },
  memberBalanceLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  memberBalanceVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  expensesContainer: {
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
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  expenseBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  expenseIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseTextCol: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  expenseSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  emptyExpenseBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyExpenseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  emptyExpenseSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 32, 29, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 46,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
});
