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
import { groupsApi } from '../../api/groups';
import { sharedSubscriptionsApi } from '../../api/sharedSubscriptions';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';

const BILLING_CYCLES = ['MONTHLY', 'YEARLY', 'WEEKLY', 'CUSTOM'];
const CATEGORIES = [
  'Entertainment',
  'Utilities',
  'Software',
  'Housing',
  'Productivity',
  'Other',
];

export const AddSharedSubscriptionScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const initialGroupId = route.params?.groupId || null;

  const [groups, setGroups] = useState(route.params?.groups || []);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [members, setMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [payerId, setPayerId] = useState(user?.id || null);

  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [renewalDate, setRenewalDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [category, setCategory] = useState('Entertainment');
  const [autoRenewExpense, setAutoRenewExpense] = useState(true);
  const [notes, setNotes] = useState('');

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch groups if not provided
  useEffect(() => {
    const loadGroups = async () => {
      if (groups.length === 0) {
        try {
          setLoadingGroups(true);
          const data = await groupsApi.getGroups();
          setGroups(data || []);
          if (data && data.length > 0 && !selectedGroupId) {
            setSelectedGroupId(data[0].id);
          }
        } catch (err) {
          setError('Failed to load groups.');
        } finally {
          setLoadingGroups(false);
        }
      } else if (!selectedGroupId && groups.length > 0) {
        setSelectedGroupId(groups[0].id);
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
        setMembers(data || []);
        const allIds = (data || []).map((m) => m.id);
        setSelectedMemberIds(allIds);
        if (user && allIds.includes(user.id)) {
          setPayerId(user.id);
        } else if (allIds.length > 0) {
          setPayerId(allIds[0]);
        }
      } catch (err) {
        setError('Failed to load group members.');
      } finally {
        setLoadingMembers(false);
      }
    };
    loadMembers();
  }, [selectedGroupId]);

  const toggleMemberSelection = (memberId) => {
    if (selectedMemberIds.includes(memberId)) {
      if (selectedMemberIds.length === 1) {
        Alert.alert('Notice', 'A shared subscription must have at least one participant.');
        return;
      }
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const getSplitPreview = () => {
    const amt = parseFloat(totalAmount);
    if (isNaN(amt) || amt <= 0 || selectedMemberIds.length === 0) {
      return null;
    }
    const count = selectedMemberIds.length;
    const baseShare = Math.floor((amt / count) * 100) / 100;
    const remainderCents = Math.round((amt - baseShare * count) * 100);

    return selectedMemberIds.map((id, idx) => {
      const member = members.find((m) => m.id === id);
      const isExtra = idx < remainderCents;
      const share = (baseShare + (isExtra ? 0.01 : 0)).toFixed(2);
      return {
        id,
        name: member?.name || `Member ${id}`,
        email: member?.email,
        share,
      };
    });
  };

  const splitPreview = getSplitPreview();

  const handleCreate = async () => {
    if (!selectedGroupId) {
      setError('Please select a group');
      return;
    }
    if (!name.trim()) {
      setError('Please enter a subscription name');
      return;
    }
    const parsedAmount = parseFloat(totalAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid total amount');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setError('Please select at least one member');
      return;
    }
    if (!payerId) {
      setError('Please select a payer');
      return;
    }
    if (!renewalDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(renewalDate.trim())) {
      setError('Please enter a valid renewal date (YYYY-MM-DD)');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name: name.trim(),
        total_amount: parsedAmount.toFixed(2),
        currency: 'INR',
        billing_cycle: billingCycle,
        next_renewal_date: renewalDate.trim(),
        category: category.trim(),
        payer_id: payerId,
        member_user_ids: selectedMemberIds,
        auto_renew_expense: autoRenewExpense,
        notes: notes.trim() || null,
      };

      await sharedSubscriptionsApi.createSharedSubscription(selectedGroupId, payload);
      Alert.alert('Success', 'Shared group subscription created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.warn('createSharedSubscription error:', err);
      setError(err.message || 'Failed to create shared subscription.');
    } finally {
      setSubmitting(false);
    }
  };

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
        <Text style={styles.headerTitle}>Add Shared Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Card style={styles.card}>
          {/* Group Selector */}
          <Text style={styles.fieldLabel}>Select Group</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
            {groups.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.groupChip,
                  selectedGroupId === g.id && styles.groupChipActive,
                ]}
                onPress={() => setSelectedGroupId(g.id)}
              >
                <Ionicons
                  name="people"
                  size={14}
                  color={selectedGroupId === g.id ? '#FFFFFF' : colors.primary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.groupChipText,
                    selectedGroupId === g.id && styles.groupChipTextActive,
                  ]}
                >
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Input
            label="Subscription Name"
            placeholder="e.g. Spotify Family, Netflix Premium, WiFi"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
          />

          <Input
            label="Total Amount (₹)"
            placeholder="e.g. 179.00"
            value={totalAmount}
            onChangeText={(text) => {
              setTotalAmount(text);
              setError(null);
            }}
            keyboardType="decimal-pad"
          />

          {/* Billing Cycle */}
          <Text style={styles.fieldLabel}>Billing Cycle</Text>
          <View style={styles.cycleRow}>
            {BILLING_CYCLES.map((cycle) => (
              <TouchableOpacity
                key={cycle}
                style={[
                  styles.cycleChip,
                  billingCycle === cycle && styles.cycleChipActive,
                ]}
                onPress={() => setBillingCycle(cycle)}
              >
                <Text
                  style={[
                    styles.cycleChipText,
                    billingCycle === cycle && styles.cycleChipTextActive,
                  ]}
                >
                  {cycle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Next Renewal Date */}
          <Input
            label="Next Renewal Date (YYYY-MM-DD)"
            value={renewalDate}
            onChangeText={setRenewalDate}
          />

          {/* Category */}
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categoryWrap}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catChip,
                  category === cat && styles.catChipActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.catChipText,
                    category === cat && styles.catChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Payer Selector */}
          <Text style={styles.fieldLabel}>Who Pays / Hosts?</Text>
          {loadingMembers ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.memberChip,
                    payerId === m.id && styles.memberChipActive,
                  ]}
                  onPress={() => setPayerId(m.id)}
                >
                  <Text
                    style={[
                      styles.memberChipText,
                      payerId === m.id && styles.memberChipTextActive,
                    ]}
                  >
                    {m.name} {m.id === user?.id ? '(You)' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Members Multi-select */}
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
            Split Among ({selectedMemberIds.length} members)
          </Text>
          <View style={styles.memberList}>
            {members.map((m) => {
              const isSelected = selectedMemberIds.includes(m.id);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberRow, isSelected && styles.memberRowSelected]}
                  onPress={() => toggleMemberSelection(m.id)}
                >
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {m.name} {m.id === user?.id ? '(You)' : ''}
                    </Text>
                    <Text style={styles.memberEmail}>{m.email}</Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Live Cent-Safe Split Preview */}
          {splitPreview && (
            <View style={styles.previewBox}>
              <View style={styles.previewHeader}>
                <Ionicons name="calculator-outline" size={16} color={colors.primary} />
                <Text style={styles.previewTitle}>Estimated Member Breakdown</Text>
              </View>
              {splitPreview.map((item) => (
                <View key={item.id} style={styles.previewRow}>
                  <Text style={styles.previewMemberName}>
                    {item.name} {item.id === user?.id ? '(You)' : ''}
                  </Text>
                  <Text style={styles.previewAmount}>₹{item.share}/mo</Text>
                </View>
              ))}
            </View>
          )}

          <Input
            label="Notes (Optional)"
            placeholder="Family plan slot details or guidelines"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />

          <Button
            title={submitting ? 'Creating...' : 'Create Shared Subscription'}
            onPress={handleCreate}
            loading={submitting}
            style={styles.submitBtn}
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
  card: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  groupScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  groupChipActive: {
    backgroundColor: colors.primary,
  },
  groupChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  groupChipTextActive: {
    color: '#FFFFFF',
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
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  catChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
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
  memberList: {
    marginBottom: 14,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  memberRowSelected: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderWidth: 1,
  },
  memberInfo: {
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
    marginTop: 2,
  },
  previewBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  previewMemberName: {
    fontSize: 12,
    color: colors.text,
  },
  previewAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  submitBtn: {
    marginTop: 10,
  },
});
