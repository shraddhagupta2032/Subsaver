import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { expensesApi } from '../../api/expenses';
import { groupsApi } from '../../api/groups';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';

export const AddExpenseScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { groupId, groupName, members: initialMembers } = route.params || {};

  const [members, setMembers] = useState(initialMembers || []);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Selected participants for split
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  // Payer user id
  const [payerId, setPayerId] = useState(user?.id || null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadMembersIfNeeded() {
      if ((!members || members.length === 0) && groupId) {
        try {
          const mems = await groupsApi.getGroupMembers(groupId);
          setMembers(mems || []);
          setSelectedUserIds(mems.map((m) => m.id || m.user_id));
          if (!payerId && mems.length > 0) {
            setPayerId(mems[0].id || mems[0].user_id);
          }
        } catch (e) {
          console.warn('Failed to load group members:', e);
        }
      } else if (members && members.length > 0) {
        setSelectedUserIds(members.map((m) => m.id || m.user_id));
        if (!payerId) {
          const currentInGroup = members.find((m) => (m.id || m.user_id) === user?.id);
          setPayerId(currentInGroup ? user.id : members[0].id || members[0].user_id);
        }
      }
    }
    loadMembersIfNeeded();
  }, [groupId, members, payerId, user]);

  const toggleMemberSelection = (uid) => {
    if (selectedUserIds.includes(uid)) {
      if (selectedUserIds.length === 1) {
        Alert.alert('Selection Error', 'At least one member must be selected for the split.');
        return;
      }
      setSelectedUserIds(selectedUserIds.filter((id) => id !== uid));
    } else {
      setSelectedUserIds([...selectedUserIds, uid]);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const splitCount = selectedUserIds.length;
  const estimatedShare = splitCount > 0 && parsedAmount > 0
    ? (parsedAmount / splitCount).toFixed(2)
    : '0.00';

  const handleCreateExpense = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Please enter an expense title.');
      return;
    }
    if (!amount || parsedAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!payerId) {
      setError('Please select a payer.');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Please select at least one member to split with.');
      return;
    }

    try {
      setLoading(true);
      const createdExpense = await expensesApi.createExpense({
        title: title.trim(),
        total_amount: parsedAmount.toFixed(2),
        group_id: groupId,
        payer_id: payerId,
        split_user_ids: selectedUserIds,
        expense_date: expenseDate.trim() || undefined,
        due_date: dueDate.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      navigation.replace('ExpenseDetails', {
        expenseId: createdExpense.id,
      });
    } catch (err) {
      setError(err.message || 'Failed to create expense.');
    } finally {
      setLoading(false);
    }
  };

  const payerObj = members.find((m) => (m.id || m.user_id) === payerId);
  const payerName = payerObj?.name || payerObj?.user_name || (payerId === user?.id ? user?.name : 'Selected Payer');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Add Expense</Text>
            <Text style={styles.headerSubtitle}>{groupName || 'Group Expense'}</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Details */}
          <Card>
            <Input
              label="Expense Title"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                setError(null);
              }}
              placeholder="e.g. Groceries, WiFi Bill, Dinner"
              icon="receipt-outline"
            />

            <Input
              label="Total Amount (₹)"
              value={amount}
              onChangeText={(text) => {
                setAmount(text);
                setError(null);
              }}
              placeholder="2000.00"
              keyboardType="decimal-pad"
              icon="cash-outline"
            />

            <Input
              label="Expense Date"
              value={expenseDate}
              onChangeText={setExpenseDate}
              placeholder="YYYY-MM-DD"
              icon="calendar-outline"
            />

            <Input
              label="Due Date (Optional)"
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              icon="time-outline"
            />

            <Input
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any specific details..."
              icon="document-text-outline"
            />
          </Card>

          {/* Payer Selection */}
          <Card>
            <Text style={styles.sectionTitle}>Paid By</Text>
            <Text style={styles.sectionSubtitle}>Select who paid for this expense</Text>
            <View style={styles.chipsContainer}>
              {members.map((m) => {
                const uid = m.id || m.user_id;
                const isSelected = payerId === uid;
                return (
                  <TouchableOpacity
                    key={uid}
                    style={[styles.payerChip, isSelected && styles.payerChipSelected]}
                    onPress={() => setPayerId(uid)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={isSelected ? "#FFFFFF" : colors.textSecondary}
                      style={styles.chipIcon}
                    />
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {m.name || m.user_name} {uid === user?.id ? '(You)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Members Split Selection */}
          <Card>
            <View style={styles.splitHeader}>
              <View>
                <Text style={styles.sectionTitle}>Split Between</Text>
                <Text style={styles.sectionSubtitle}>
                  {selectedUserIds.length} of {members.length} members selected (Equal Split)
                </Text>
              </View>
            </View>

            <View style={styles.membersList}>
              {members.map((m) => {
                const uid = m.id || m.user_id;
                const isChecked = selectedUserIds.includes(uid);
                return (
                  <TouchableOpacity
                    key={uid}
                    style={styles.memberCheckRow}
                    onPress={() => toggleMemberSelection(uid)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isChecked ? "checkbox" : "square-outline"}
                      size={22}
                      color={isChecked ? colors.primary : colors.textMuted}
                    />
                    <Text style={styles.memberRowName}>
                      {m.name || m.user_name} {uid === user?.id ? '(You)' : ''}
                    </Text>
                    {isChecked && parsedAmount > 0 && (
                      <Text style={styles.memberRowShare}>₹{estimatedShare}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Equal Split Summary Preview */}
          {parsedAmount > 0 && splitCount > 0 && (
            <Card style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="calculator-outline" size={20} color={colors.success} />
                <Text style={styles.summaryTitle}>Split Summary Preview</Text>
              </View>
              <Text style={styles.summarySubtext}>
                {payerName} paid ₹{parsedAmount.toFixed(2)}
              </Text>
              <View style={styles.previewDivider} />
              {members
                .filter((m) => selectedUserIds.includes(m.id || m.user_id))
                .map((m) => {
                  const uid = m.id || m.user_id;
                  const isPayer = uid === payerId;
                  return (
                    <View key={uid} style={styles.previewRow}>
                      <Text style={styles.previewMemberName}>
                        {m.name || m.user_name} {isPayer ? '(Payer)' : ''}
                      </Text>
                      <Text style={[styles.previewStatus, isPayer ? styles.statusPaid : styles.statusOwes]}>
                        {isPayer ? 'PAID ₹' + estimatedShare : 'owes ₹' + estimatedShare}
                      </Text>
                    </View>
                  );
                })}
            </Card>
          )}

          <Button
            title="Create Shared Expense"
            onPress={handleCreateExpense}
            loading={loading}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
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
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
    padding: 12,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  payerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
  },
  payerChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membersList: {
    marginTop: 4,
  },
  memberCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberRowName: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  memberRowShare: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  summaryCard: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.success,
    marginLeft: 8,
  },
  summarySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  previewDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  previewMemberName: {
    fontSize: 13,
    color: colors.text,
  },
  previewStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusPaid: {
    color: colors.success,
  },
  statusOwes: {
    color: colors.warning,
  },
  submitBtn: {
    marginTop: 8,
  },
});
