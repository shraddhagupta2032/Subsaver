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
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { expensesApi } from '../../api/expenses';
import { groupsApi } from '../../api/groups';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors } from '../../theme/colors';

export const AddExpenseScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { groupId: propGroupId, groupName, members: initialMembers } = route.params || {};

  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(propGroupId || null);
  const [members, setMembers] = useState(initialMembers || []);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Food & Dining');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Selected participants for split
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  // Payer user id
  const [payerId, setPayerId] = useState(user?.id || null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadGroupsAndMembers() {
      try {
        const grps = await groupsApi.getGroups();
        setAvailableGroups(grps || []);
        const targetId = selectedGroupId || (grps && grps.length > 0 ? grps[0].id : null);
        if (targetId && !selectedGroupId) {
          setSelectedGroupId(targetId);
        }
        if (targetId) {
          const mems = await groupsApi.getGroupMembers(targetId);
          setMembers(mems || []);
          setSelectedUserIds(mems.map((m) => m.user_id || m.id));
          if (!payerId && mems.length > 0) {
            setPayerId(mems[0].user_id || mems[0].id);
          }
        }
      } catch (e) {
        console.warn('Failed to load groups/members:', e);
      }
    }
    loadGroupsAndMembers();
  }, [selectedGroupId, payerId]);

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
  const estimatedShare =
    splitCount > 0 && parsedAmount > 0
      ? (parsedAmount / splitCount).toFixed(2)
      : '0.00';

  const handleCreateExpense = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Please enter what the expense was for.');
      return;
    }
    if (!amount || parsedAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!selectedGroupId) {
      setError('Please select a group for this shared expense.');
      return;
    }
    if (!payerId) {
      setError('Please select who paid for the expense.');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Please select at least one member to split the expense.');
      return;
    }

    try {
      setLoading(true);
      await expensesApi.createExpense({
        title: title.trim(),
        total_amount: parsedAmount,
        group_id: selectedGroupId,
        payer_id: payerId,
        split_user_ids: selectedUserIds,
        expense_date: expenseDate,
        due_date: dueDate || undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Expense Added', `"${title.trim()}" was recorded and split successfully.`, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      setError(err.message || 'Failed to record expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { maxWidth: isDesktop ? 680 : '100%', paddingHorizontal: isDesktop ? 24 : 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title="Add expense"
            subtitle="Split it fairly, settle it easily."
            back
            onBack={() => navigation.goBack()}
          />

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Amount Entry Card (Figma style) */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Amount</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  setError(null);
                }}
                placeholder="0"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            {parsedAmount > 0 && (
              <View style={styles.splitEstimatePill}>
                <Ionicons name="people" size={14} color={colors.mintBar} />
                <Text style={styles.splitEstimateText}>
                  ₹{Number(estimatedShare).toLocaleString('en-IN')} per person ({splitCount} members)
                </Text>
              </View>
            )}
          </View>

          {/* Form Fields Card */}
          <View style={styles.formCard}>
            <Input
              label="What was it for?"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                setError(null);
              }}
              placeholder="e.g. Dinner at Haldiram’s, Groceries"
              icon="receipt-outline"
            />

            <Input
              label="Category"
              value={category}
              onChangeText={setCategory}
              placeholder="e.g. Food & dining, Travel, Bills"
              icon="pricetag-outline"
            />

            <Input
              label="Date"
              value={expenseDate}
              onChangeText={setExpenseDate}
              placeholder="YYYY-MM-DD"
              icon="calendar-outline"
            />

            {/* Group Selector */}
            {availableGroups.length > 1 && (
              <View style={styles.selectorGroup}>
                <Text style={styles.fieldLabel}>Group</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {availableGroups.map((g) => {
                    const isSelected = selectedGroupId === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.selectorChip, isSelected && styles.selectorChipActive]}
                        onPress={() => setSelectedGroupId(g.id)}
                      >
                        <Text style={[styles.selectorChipText, isSelected && styles.selectorChipTextActive]}>
                          {g.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Payer Selector */}
            <View style={styles.selectorGroup}>
              <Text style={styles.fieldLabel}>Paid by</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {members.map((m) => {
                  const mId = m.user_id || m.id;
                  const isPayer = payerId === mId;
                  const isYou = mId === user?.id;
                  return (
                    <TouchableOpacity
                      key={mId}
                      style={[styles.payerChip, isPayer && styles.payerChipActive]}
                      onPress={() => setPayerId(mId)}
                    >
                      <Avatar name={m.name || m.email} size="small" tone={isPayer ? 'mint' : 'sky'} />
                      <Text style={[styles.payerChipText, isPayer && styles.payerChipTextActive]}>
                        {isYou ? 'You' : (m.name || m.email).split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Split Members Checkboxes */}
            <View style={styles.selectorGroup}>
              <Text style={styles.fieldLabel}>Split with ({selectedUserIds.length})</Text>
              <View style={styles.membersList}>
                {members.map((m) => {
                  const mId = m.user_id || m.id;
                  const isSelected = selectedUserIds.includes(mId);
                  const isYou = mId === user?.id;
                  return (
                    <TouchableOpacity
                      key={mId}
                      style={[styles.memberCheckboxItem, isSelected && styles.memberCheckboxItemActive]}
                      onPress={() => toggleMemberSelection(mId)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.memberCheckboxLeft}>
                        <Avatar name={m.name || m.email} size="small" />
                        <Text style={styles.memberCheckboxName}>
                          {isYou ? `${m.name || 'You'} (You)` : m.name || m.email}
                        </Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={isSelected ? colors.primary : colors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Input
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any extra notes..."
              icon="document-text-outline"
            />

            <Button
              title="Save & split expense"
              onPress={handleCreateExpense}
              loading={loading}
              style={{ marginTop: 8 }}
            />
          </View>
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
  scrollContent: {
    paddingBottom: 110,
    width: '100%',
    alignSelf: 'center',
  },
  amountCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 22,
    padding: 22,
    marginBottom: 16,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 4,
  },
  amountLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginRight: 6,
  },
  amountInput: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    flex: 1,
    height: 52,
    padding: 0,
  },
  splitEstimatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    marginTop: 10,
  },
  splitEstimateText: {
    color: colors.mintBar,
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  selectorGroup: {
    marginBottom: 18,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  selectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  selectorChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  selectorChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  selectorChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  payerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    gap: 8,
  },
  payerChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  payerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  payerChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  membersList: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  memberCheckboxItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberCheckboxItemActive: {
    backgroundColor: '#FFFFFF',
  },
  memberCheckboxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberCheckboxName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
});
