import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { settlementsApi } from '../../api/settlements';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors } from '../../theme/colors';

const PAYMENT_METHODS = ['UPI', 'CASH', 'BANK_TRANSFER', 'OTHER'];

export const SettlementDetailsScreen = ({ route, navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { debt, counterpartyName, amount: propAmount, isReceive, groupId } = route.params || {};

  const name = counterpartyName || debt?.other_user_name || 'Member';
  const rawAmt = propAmount !== undefined ? propAmount : (debt?.amount || 0);
  const directionIsReceive = isReceive !== undefined ? isReceive : (debt?.direction !== 'YOU_OWE');

  const [settled, setSettled] = useState(false);
  const [amount, setAmount] = useState(String(rawAmt || '0'));
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleRecordSettlement = async () => {
    const payAmt = parseFloat(amount);
    if (!amount || isNaN(payAmt) || payAmt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a settlement amount greater than 0.');
      return;
    }

    try {
      setLoading(true);
      setServerError(null);

      const targetGroupId = groupId || debt?.group_id;
      if (targetGroupId) {
        const payload = {
          payee_id: directionIsReceive ? (debt?.to_user_id || debt?.other_user_id) : (debt?.from_user_id || debt?.other_user_id),
          amount: payAmt.toFixed(2),
          payment_method: paymentMethod,
          notes: notes.trim() || undefined,
        };
        await settlementsApi.recordSettlement(targetGroupId, payload);
      }

      setSettled(true);
      Alert.alert(
        'Settlement Recorded',
        `Successfully recorded settlement of ₹${payAmt.toLocaleString('en-IN')} with ${name}!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      console.warn('Record settlement error:', err);
      setServerError(err.message || 'Failed to record settlement payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.headerContainer, { maxWidth: isDesktop ? 680 : '100%' }]}>
          <ScreenHeader
            title="Settlement details"
            back
            onBack={() => navigation.goBack()}
          />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            { maxWidth: isDesktop ? 680 : '100%', paddingHorizontal: isDesktop ? 24 : 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Settle Hero (from Figma settle-hero) */}
          <View style={styles.settleHeroCard}>
            <Avatar name={name} size="large" tone={directionIsReceive ? 'mint' : 'sky'} />
            <Text style={styles.settleHeroLabel}>
              {directionIsReceive ? `${name} owes you` : `You owe ${name}`}
            </Text>
            <Text style={styles.settleHeroAmount}>
              ₹{Number(settled ? 0 : amount).toLocaleString('en-IN')}
            </Text>
            <Badge
              text={settled ? 'Paid & Settled' : 'Payment Pending'}
              variant={settled ? 'success' : directionIsReceive ? 'warning' : 'danger'}
            />
          </View>

          {serverError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          )}

          {/* Settlement Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>Record Payment</Text>

            <Input
              label="Settlement Amount (₹)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              icon="cash-outline"
            />

            <Text style={styles.fieldLabel}>Payment Method</Text>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map((m) => {
                const isSelected = paymentMethod === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.methodChip, isSelected && styles.methodChipActive]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text style={[styles.methodChipText, isSelected && styles.methodChipTextActive]}>
                      {m.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Sent via GPay, Cash handed over"
              icon="document-text-outline"
            />

            <Button
              title={settled ? 'Settled' : 'Mark as settled'}
              onPress={handleRecordSettlement}
              loading={loading}
              disabled={settled}
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
  headerContainer: {
    paddingHorizontal: 20,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
    width: '100%',
    alignSelf: 'center',
  },
  settleHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  settleHeroLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  settleHeroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginTop: 8,
  },
  formCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  methodChipTextActive: {
    color: colors.primary,
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
