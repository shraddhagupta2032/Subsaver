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
import { subscriptionsApi } from '../../api/subscriptions';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';

const BILLING_CYCLES = ['MONTHLY', 'YEARLY', 'WEEKLY', 'CUSTOM'];
const CATEGORIES = [
  'Entertainment',
  'Software',
  'Utilities',
  'Fitness',
  'Productivity',
  'Work',
  'Other',
];

export const EditSubscriptionScreen = ({ route, navigation }) => {
  const { subscriptionId } = route.params;

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [renewalDate, setRenewalDate] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [status, setStatus] = useState('ACTIVE');
  const [notes, setNotes] = useState('');

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSub = async () => {
      try {
        setInitialLoading(true);
        const data = await subscriptionsApi.getSubscriptionById(subscriptionId);
        setName(data.name || '');
        setAmount(data.amount ? String(data.amount) : '');
        setCurrency(data.currency || 'INR');
        setBillingCycle(data.billing_cycle || 'MONTHLY');
        setRenewalDate(data.next_renewal_date || '');
        setCategory(data.category || 'Entertainment');
        setStatus(data.status || 'ACTIVE');
        setNotes(data.notes || '');
      } catch (err) {
        setError(err.message || 'Failed to load subscription.');
      } finally {
        setInitialLoading(false);
      }
    };
    loadSub();
  }, [subscriptionId]);

  const handleUpdate = async () => {
    if (!name.trim()) {
      setError('Please enter a subscription name');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (!renewalDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(renewalDate.trim())) {
      setError('Please enter a valid renewal date (YYYY-MM-DD)');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: name.trim(),
        amount: parsedAmount.toFixed(2),
        currency: currency.trim() || 'INR',
        billing_cycle: billingCycle,
        next_renewal_date: renewalDate.trim(),
        category: category.trim(),
        status: status,
        notes: notes.trim() || null,
      };

      await subscriptionsApi.updateSubscription(subscriptionId, payload);
      Alert.alert('Success', 'Subscription updated successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.warn('updateSubscription error:', err);
      setError(err.message || 'Failed to update subscription.');
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading subscription...</Text>
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
        <Text style={styles.headerTitle}>Edit Subscription</Text>
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
          <Input
            label="Subscription Name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
          />

          <Input
            label="Amount (₹)"
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              setError(null);
            }}
            keyboardType="decimal-pad"
          />

          {/* Billing Cycle Picker */}
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

          {/* Category Selector */}
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

          {/* Status Selector */}
          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.cycleRow}>
            {['ACTIVE', 'PAUSED', 'CANCELLED'].map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.cycleChip,
                  status === st && styles.cycleChipActive,
                ]}
                onPress={() => setStatus(st)}
              >
                <Text
                  style={[
                    styles.cycleChipText,
                    status === st && styles.cycleChipTextActive,
                  ]}
                >
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Notes (Optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />

          <Button
            title={saving ? 'Updating...' : 'Update Subscription'}
            onPress={handleUpdate}
            loading={saving}
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
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
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
  cycleRow: {
    flexDirection: 'row',
    marginBottom: 16,
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
    marginBottom: 16,
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
  submitBtn: {
    marginTop: 10,
  },
});
