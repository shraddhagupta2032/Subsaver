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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { settlementsApi } from '../../api/settlements';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';

const PAYMENT_METHODS = ['UPI', 'CASH', 'BANK_TRANSFER', 'OTHER'];

export const SettlementDetailsScreen = ({ route, navigation }) => {
  const { debt } = route.params || {};

  const isYouOwe = debt?.direction === 'YOU_OWE';
  const initialAmount = debt?.amount ? String(debt.amount) : '0';

  const [amount, setAmount] = useState(initialAmount);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  if (!debt) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorCenter}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={styles.errorTitle}>Debt Information Missing</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const handleRecordSettlement = async () => {
    const payAmt = parseFloat(amount);
    if (!amount || isNaN(payAmt) || payAmt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a settlement amount greater than 0.');
      return;
    }

    try {
      setLoading(true);
      setServerError(null);

      const payload = {
        payee_id: isYouOwe ? debt.to_user_id : debt.from_user_id,
        amount: payAmt.toFixed(2),
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      };

      await settlementsApi.recordSettlement(debt.group_id, payload);

      Alert.alert(
        'Settlement Recorded',
        `Successfully recorded payment of ₹${payAmt.toLocaleString('en-IN')} to ${debt.other_user_name}!`,
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settlement Details</Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {serverError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          )}

          {/* Hero Direction Card */}
          <Card
            style={[
              styles.heroCard,
              { borderColor: isYouOwe ? colors.danger : colors.success },
            ]}
          >
            <View
              style={[
                styles.heroIconBadge,
                {
                  backgroundColor: isYouOwe
                    ? colors.dangerBg
                    : 'rgba(16, 185, 129, 0.12)',
                },
              ]}
            >
              <Ionicons
                name={isYouOwe ? 'arrow-up-circle' : 'arrow-down-circle'}
                size={32}
                color={isYouOwe ? colors.danger : colors.success}
              />
            </View>
            <Text style={styles.heroDirectionLabel}>
              {isYouOwe ? 'You Owe' : 'Owed to You'}
            </Text>
            <Text
              style={[
                styles.heroAmount,
                { color: isYouOwe ? colors.danger : colors.success },
              ]}
            >
              ₹{Number(debt.amount).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.heroSubtitle}>
              {isYouOwe
                ? `Pay ${debt.other_user_name} to clear this balance`
                : `Awaiting settlement from ${debt.other_user_name}`}
            </Text>
          </Card>

          {/* Transaction Summary Card */}
          <Card style={styles.infoCard}>
            <Text style={styles.cardSectionTitle}>Transaction Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Counterparty</Text>
              <Text style={styles.infoValue}>{debt.other_user_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Group</Text>
              <Text style={styles.infoValue}>{debt.group_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Calculated By</Text>
              <Text style={styles.infoValue}>SubSaver Cent-Safe Split Engine</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Status</Text>
              <View
                style={[
                  styles.statusTag,
                  {
                    backgroundColor: isYouOwe
                      ? colors.dangerBg
                      : 'rgba(16, 185, 129, 0.12)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    { color: isYouOwe ? colors.danger : colors.success },
                  ]}
                >
                  {isYouOwe ? 'UNSETTLED (YOU OWE)' : 'RECEIVABLE'}
                </Text>
              </View>
            </View>
          </Card>

          {/* Settlement Action Card */}
          {isYouOwe ? (
            <Card style={styles.formCard}>
              <Text style={styles.cardSectionTitle}>Record Settlement Payment</Text>
              <Text style={styles.formSubtitle}>
                Once you have transferred the money (via UPI, Bank, or Cash), submit this payment record to clear your balance.
              </Text>

              {/* Amount Input */}
              <Input
                label="Payment Amount (₹) *"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                icon="wallet-outline"
              />

              {/* Payment Method Selector */}
              <Text style={styles.methodLabel}>Payment Method</Text>
              <View style={styles.methodsRow}>
                {PAYMENT_METHODS.map((m) => {
                  const isSelected = paymentMethod === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.methodChip, isSelected && styles.methodChipActive]}
                      onPress={() => setPaymentMethod(m)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.methodChipText,
                          isSelected && styles.methodChipTextActive,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Optional Notes */}
              <Input
                label="Notes / Transaction ID (Optional)"
                placeholder="e.g. Paid via GPay, UPI Ref 123456"
                value={notes}
                onChangeText={setNotes}
                icon="document-text-outline"
              />

              <Button
                title={`Confirm Payment of ₹${Number(amount || 0).toLocaleString('en-IN')}`}
                onPress={handleRecordSettlement}
                loading={loading}
                style={styles.payButton}
              />
            </Card>
          ) : (
            <Card style={styles.formCard}>
              <View style={styles.receivedNoticeRow}>
                <Ionicons name="information-circle-outline" size={24} color={colors.info} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.receivedNoticeTitle}>Receiving Money</Text>
                  <Text style={styles.receivedNoticeText}>
                    {debt.other_user_name} has been notified of this pending amount in {debt.group_name}. When they pay, the balance will automatically update.
                  </Text>
                </View>
              </View>

              <Button
                title="Back to Settlements"
                variant="outline"
                onPress={() => navigation.goBack()}
                style={{ marginTop: 14 }}
              />
            </Card>
          )}

          <View style={{ height: 40 }} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 6,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.danger,
    marginTop: 12,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
  },
  heroCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  heroIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroDirectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  infoCard: {
    padding: 16,
    marginBottom: 16,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  formCard: {
    padding: 16,
    marginBottom: 16,
  },
  formSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  methodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  methodChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  methodChipTextActive: {
    color: colors.surface,
  },
  payButton: {
    marginTop: 8,
  },
  receivedNoticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceLight,
    padding: 14,
    borderRadius: 10,
  },
  receivedNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  receivedNoticeText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
});

export default SettlementDetailsScreen;
