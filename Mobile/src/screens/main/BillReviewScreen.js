import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { billScannerApi } from '../../api/billScanner';
import { groupsApi } from '../../api/groups';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';

const BILLING_CYCLES = ['MONTHLY', 'YEARLY', 'WEEKLY', 'CUSTOM'];
const CATEGORIES = [
  'Entertainment',
  'Utilities',
  'Software',
  'Groceries',
  'Food & Dining',
  'Housing',
  'Fitness',
  'Transport',
  'Other',
];

export const BillReviewScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { scanResult, imageUri } = route.params || {};
  const extracted = scanResult?.extracted_data || {};

  // Determine initial creation type from document_type
  const getInitialCreationType = (docType) => {
    switch (docType) {
      case 'SUBSCRIPTION':
        return 'SUBSCRIPTION';
      case 'SHARED_SUBSCRIPTION':
        return 'SHARED_SUBSCRIPTION';
      case 'EXPENSE':
      default:
        return 'EXPENSE';
    }
  };

  const [creationType, setCreationType] = useState(() =>
    getInitialCreationType(extracted.document_type)
  );

  // Common editable fields
  const [name, setName] = useState(extracted.merchant_name || extracted.description || '');
  const [amount, setAmount] = useState(extracted.total_amount ? String(extracted.total_amount) : '');
  const [category, setCategory] = useState(extracted.category || 'Entertainment');
  const [dateVal, setDateVal] = useState(() => {
    if (extracted.bill_date) return String(extracted.bill_date);
    return new Date().toISOString().split('T')[0];
  });
  const [billingCycle, setBillingCycle] = useState(extracted.billing_cycle || 'MONTHLY');
  const [nextRenewalDate, setNextRenewalDate] = useState(() => {
    if (extracted.next_renewal_date) return String(extracted.next_renewal_date);
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState(extracted.description || '');

  // Group and member states (for EXPENSE and SHARED_SUBSCRIPTION)
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [payerId, setPayerId] = useState(user?.id || null);

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [successRecord, setSuccessRecord] = useState(null);

  // Fetch groups if user might assign to group
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoadingGroups(true);
        const data = await groupsApi.getGroups();
        setGroups(data || []);
        if (data && data.length > 0) {
          setSelectedGroupId(data[0].id);
        }
      } catch (err) {
        console.warn('loadGroups error:', err);
      } finally {
        setLoadingGroups(false);
      }
    };
    loadGroups();
  }, []);

  // Fetch members when group changes
  useEffect(() => {
    if (!selectedGroupId) return;
    const loadMembers = async () => {
      try {
        setLoadingMembers(true);
        const data = await groupsApi.getGroupMembers(selectedGroupId);
        setMembersData(data || []);
      } catch (err) {
        console.warn('loadMembers error:', err);
      } finally {
        setLoadingMembers(false);
      }
    };
    loadMembers();
  }, [selectedGroupId]);

  const setMembersData = (data) => {
    setGroupMembers(data);
    const allIds = data.map((m) => m.id);
    setSelectedMemberIds(allIds);
    if (user && allIds.includes(user.id)) {
      setPayerId(user.id);
    } else if (allIds.length > 0) {
      setPayerId(allIds[0]);
    }
  };

  const toggleMemberSelection = (memberId) => {
    if (selectedMemberIds.includes(memberId)) {
      if (selectedMemberIds.length === 1) {
        Alert.alert('Notice', 'At least one participant must be selected.');
        return;
      }
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const getConfidenceLevel = (conf) => {
    const num = parseFloat(conf) || 0.8;
    if (num >= 0.85) return { label: 'High Confidence', color: colors.success, bg: colors.successBg, pct: Math.round(num * 100) };
    if (num >= 0.65) return { label: 'Medium Confidence', color: colors.warning, bg: colors.warningBg, pct: Math.round(num * 100) };
    return { label: 'Low Confidence', color: colors.danger, bg: colors.dangerBg, pct: Math.round(num * 100) };
  };

  const confidenceInfo = getConfidenceLevel(extracted.confidence);

  const handleConfirmSubmit = () => {
    if (!name.trim()) {
      setError('Please provide a name / merchant for this bill.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (creationType === 'EXPENSE' && !selectedGroupId) {
      setError('Please select a group for this shared expense.');
      return;
    }
    if (creationType === 'SHARED_SUBSCRIPTION' && !selectedGroupId) {
      setError('Please select a group for this shared subscription.');
      return;
    }

    // Confirmation Summary Dialog
    let summaryText = '';
    if (creationType === 'EXPENSE') {
      summaryText = `Create Group Expense?\n\nTitle: ${name.trim()}\nAmount: ₹${parsedAmount.toFixed(2)}\nGroup: ${groups.find((g) => g.id === selectedGroupId)?.name || 'Selected Group'}\nSplit: ${selectedMemberIds.length} member(s)`;
    } else if (creationType === 'SUBSCRIPTION') {
      summaryText = `Create Personal Subscription?\n\nName: ${name.trim()}\nAmount: ₹${parsedAmount.toFixed(2)} / ${billingCycle.toLowerCase()}\nCategory: ${category}\nNext renewal: ${nextRenewalDate}`;
    } else {
      summaryText = `Create Shared Subscription?\n\nName: ${name.trim()}\nTotal: ₹${parsedAmount.toFixed(2)} / ${billingCycle.toLowerCase()}\nGroup: ${groups.find((g) => g.id === selectedGroupId)?.name || 'Selected Group'}\nParticipants: ${selectedMemberIds.length}`;
    }

    Alert.alert('Confirm Financial Record', summaryText, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm & Save', onPress: executeCreateRecord },
    ]);
  };

  const executeCreateRecord = async () => {
    try {
      setConfirming(true);
      setError(null);

      const parsedAmount = parseFloat(amount);
      const payload = {
        creation_type: creationType,
      };

      if (creationType === 'EXPENSE') {
        payload.group_id = selectedGroupId;
        payload.expense_data = {
          title: name.trim(),
          total_amount: parsedAmount.toFixed(2),
          group_id: selectedGroupId,
          payer_id: payerId || user.id,
          split_user_ids: selectedMemberIds,
          expense_date: dateVal,
          notes: notes.trim() || null,
        };
      } else if (creationType === 'SUBSCRIPTION') {
        payload.subscription_data = {
          name: name.trim(),
          amount: parsedAmount.toFixed(2),
          currency: 'INR',
          billing_cycle: billingCycle,
          next_renewal_date: nextRenewalDate,
          category: category,
          status: 'ACTIVE',
          notes: notes.trim() || null,
        };
      } else if (creationType === 'SHARED_SUBSCRIPTION') {
        payload.group_id = selectedGroupId;
        payload.shared_subscription_data = {
          name: name.trim(),
          total_amount: parsedAmount.toFixed(2),
          currency: 'INR',
          billing_cycle: billingCycle,
          next_renewal_date: nextRenewalDate,
          category: category,
          payer_id: payerId || user.id,
          member_user_ids: selectedMemberIds,
          auto_renew_expense: true,
          notes: notes.trim() || null,
        };
      }

      const res = await billScannerApi.confirmBill(payload);
      setSuccessRecord(res);
    } catch (err) {
      console.warn('confirmBill error:', err);
      setError(err.message || 'Failed to create financial record from scanned bill.');
    } finally {
      setConfirming(false);
    }
  };

  if (successRecord) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>
            {creationType === 'EXPENSE'
              ? 'Expense Created!'
              : creationType === 'SUBSCRIPTION'
              ? 'Subscription Created!'
              : 'Shared Subscription Created!'}
          </Text>
          <Text style={styles.successSubtitle}>
            {successRecord.message || 'The financial record was securely created in your SubSaver account.'}
          </Text>

          <Card style={styles.recordCard}>
            <Text style={styles.recordName}>{name}</Text>
            <Text style={styles.recordAmount}>₹{Number(amount).toFixed(2)}</Text>
            <Text style={styles.recordType}>
              Type: {creationType.replace('_', ' ')} • ID #{successRecord.created_record_id}
            </Text>
          </Card>

          <Button
            title="Go to Dashboard"
            onPress={() => navigation.navigate('DashboardHome')}
            style={{ width: '100%', marginBottom: 12 }}
          />

          <Button
            title="Scan Another Bill"
            variant="outline"
            onPress={() => navigation.navigate('BillScannerHome')}
            style={{ width: '100%' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Scanned Bill</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* AI Confidence & Verification Banner */}
        <Card style={styles.confidenceCard}>
          <View style={styles.confRow}>
            <View style={[styles.confPill, { backgroundColor: confidenceInfo.bg }]}>
              <Text style={[styles.confPillText, { color: confidenceInfo.color }]}>
                AI {confidenceInfo.pct}% • {confidenceInfo.label}
              </Text>
            </View>
            <Text style={styles.verifiedText}>Please verify all fields below</Text>
          </View>
          {scanResult?.warnings && scanResult.warnings.length > 0 ? (
            <View style={styles.warningsList}>
              {scanResult.warnings.map((w, idx) => (
                <View key={idx} style={styles.warningItem}>
                  <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
                  <Text style={styles.warningText}>{w}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Creation Type Selector */}
        <Text style={styles.fieldSectionLabel}>What would you like to create?</Text>
        <View style={styles.typeSelectorRow}>
          {[
            { key: 'EXPENSE', label: 'One-Time Expense', icon: 'receipt-outline' },
            { key: 'SUBSCRIPTION', label: 'Personal Sub', icon: 'person-outline' },
            { key: 'SHARED_SUBSCRIPTION', label: 'Shared Sub', icon: 'people-outline' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.typeOption,
                creationType === item.key && styles.typeOptionActive,
              ]}
              onPress={() => setCreationType(item.key)}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={creationType === item.key ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeOptionText,
                  creationType === item.key && styles.typeOptionTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Editable Fields Card */}
        <Card style={styles.formCard}>
          <Input
            label={creationType === 'EXPENSE' ? 'Expense Title / Merchant' : 'Subscription Name'}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
            }}
          />

          <Input
            label="Total Amount (₹)"
            value={amount}
            onChangeText={(t) => {
              setAmount(t);
              setError(null);
            }}
            keyboardType="decimal-pad"
          />

          {/* Category Selector */}
          <Text style={styles.inputLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, category === cat && styles.catChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Creation-Type Specific Fields */}
          {creationType === 'EXPENSE' && (
            <View>
              <Input
                label="Expense Date (YYYY-MM-DD)"
                value={dateVal}
                onChangeText={setDateVal}
              />

              {/* Group Selector */}
              <Text style={styles.inputLabel}>Select Group</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
                {groups.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.groupChip, selectedGroupId === g.id && styles.groupChipActive]}
                    onPress={() => setSelectedGroupId(g.id)}
                  >
                    <Text style={[styles.groupChipText, selectedGroupId === g.id && styles.groupChipTextActive]}>
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Payer Selector */}
              <Text style={styles.inputLabel}>Paid By</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
                {groupMembers.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberChip, payerId === m.id && styles.memberChipActive]}
                    onPress={() => setPayerId(m.id)}
                  >
                    <Text style={[styles.memberChipText, payerId === m.id && styles.memberChipTextActive]}>
                      {m.name} {m.id === user?.id ? '(You)' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Split Members */}
              <Text style={styles.inputLabel}>Split Among ({selectedMemberIds.length} members)</Text>
              {groupMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberSelectRow, isSelected && styles.memberSelectRowActive]}
                    onPress={() => toggleMemberSelection(m.id)}
                  >
                    <Text style={styles.memberSelectName}>
                      {m.name} {m.id === user?.id ? '(You)' : ''}
                    </Text>
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {creationType === 'SUBSCRIPTION' && (
            <View>
              <Text style={styles.inputLabel}>Billing Cycle</Text>
              <View style={styles.cycleRow}>
                {BILLING_CYCLES.map((cycle) => (
                  <TouchableOpacity
                    key={cycle}
                    style={[styles.cycleChip, billingCycle === cycle && styles.cycleChipActive]}
                    onPress={() => setBillingCycle(cycle)}
                  >
                    <Text style={[styles.cycleChipText, billingCycle === cycle && styles.cycleChipTextActive]}>
                      {cycle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Next Renewal Date (YYYY-MM-DD)"
                value={nextRenewalDate}
                onChangeText={setNextRenewalDate}
              />
            </View>
          )}

          {creationType === 'SHARED_SUBSCRIPTION' && (
            <View>
              {/* Group Selector */}
              <Text style={styles.inputLabel}>Select Group</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
                {groups.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.groupChip, selectedGroupId === g.id && styles.groupChipActive]}
                    onPress={() => setSelectedGroupId(g.id)}
                  >
                    <Text style={[styles.groupChipText, selectedGroupId === g.id && styles.groupChipTextActive]}>
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Billing Cycle</Text>
              <View style={styles.cycleRow}>
                {BILLING_CYCLES.map((cycle) => (
                  <TouchableOpacity
                    key={cycle}
                    style={[styles.cycleChip, billingCycle === cycle && styles.cycleChipActive]}
                    onPress={() => setBillingCycle(cycle)}
                  >
                    <Text style={[styles.cycleChipText, billingCycle === cycle && styles.cycleChipTextActive]}>
                      {cycle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Next Renewal Date (YYYY-MM-DD)"
                value={nextRenewalDate}
                onChangeText={setNextRenewalDate}
              />

              {/* Payer Selector */}
              <Text style={styles.inputLabel}>Payer / Host</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
                {groupMembers.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberChip, payerId === m.id && styles.memberChipActive]}
                    onPress={() => setPayerId(m.id)}
                  >
                    <Text style={[styles.memberChipText, payerId === m.id && styles.memberChipTextActive]}>
                      {m.name} {m.id === user?.id ? '(You)' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Members Multi-select */}
              <Text style={styles.inputLabel}>Participants ({selectedMemberIds.length})</Text>
              {groupMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberSelectRow, isSelected && styles.memberSelectRowActive]}
                    onPress={() => toggleMemberSelection(m.id)}
                  >
                    <Text style={styles.memberSelectName}>
                      {m.name} {m.id === user?.id ? '(You)' : ''}
                    </Text>
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Input
            label="Notes / Description"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />

          <Button
            title={confirming ? 'Creating Record...' : 'Confirm & Create Financial Record'}
            onPress={handleConfirmSubmit}
            loading={confirming}
            style={styles.confirmButton}
          />
        </Card>
      </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  confidenceCard: {
    marginBottom: 16,
    padding: 14,
  },
  confRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  verifiedText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  warningsList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 11,
    color: colors.warning,
    marginLeft: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  fieldSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
  },
  formCard: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  catChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: colors.primary,
  },
  catChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  groupScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  groupChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  groupChipActive: {
    backgroundColor: colors.primary,
  },
  groupChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  groupChipTextActive: {
    color: '#FFFFFF',
  },
  memberChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  memberChipActive: {
    backgroundColor: colors.primary,
  },
  memberChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  memberChipTextActive: {
    color: '#FFFFFF',
  },
  memberSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  memberSelectRowActive: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  memberSelectName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  cycleRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  cycleChip: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 6,
  },
  cycleChipActive: {
    backgroundColor: colors.primary,
  },
  cycleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  cycleChipTextActive: {
    color: '#FFFFFF',
  },
  confirmButton: {
    marginTop: 10,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  recordCard: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  recordName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  recordAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  recordType: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
