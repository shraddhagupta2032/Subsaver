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
import { sharedSubscriptionsApi } from '../../api/sharedSubscriptions';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';

export const SharedSubscriptionDetailsScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { subscriptionId } = route.params;

  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sharedSubscriptionsApi.getSharedSubscriptionById(subscriptionId);
      setSub(data);
    } catch (err) {
      setError(err.message || 'Failed to load shared subscription details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [subscriptionId]);

  const handleRenew = () => {
    Alert.alert(
      'Renew Shared Subscription',
      `Advance renewal date to next cycle and generate group expense for ${sub?.name || 'this subscription'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Renew Now',
          onPress: async () => {
            try {
              setRenewing(true);
              const res = await sharedSubscriptionsApi.renewSharedSubscription(subscriptionId);
              Alert.alert(
                'Renewed Successfully',
                `Generated Expense ID: ${res.generated_expense_id || res.expense_id}\nNext renewal date: ${res.next_renewal_date}`,
                [{ text: 'OK', onPress: () => fetchSubscription() }]
              );

            } catch (err) {
              Alert.alert('Renewal Failed', err.message || 'Failed to renew subscription.');
            } finally {
              setRenewing(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Shared Subscription',
      `Are you sure you want to delete ${sub?.name || 'this shared subscription'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await sharedSubscriptionsApi.deleteSharedSubscription(subscriptionId);
              Alert.alert('Deleted', 'Shared subscription removed.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete shared subscription.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading shared subscription...</Text>
      </SafeAreaView>
    );
  }

  if (error || !sub) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>Error Loading Subscription</Text>
        <Text style={styles.errorText}>{error || 'Shared subscription not found.'}</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }

  const userMember = sub.members?.find((m) => m.user_id === user?.id);
  const userShare = userMember
    ? Number(userMember.share_amount).toFixed(2)
    : (sub.current_user_share ? Number(sub.current_user_share).toFixed(2) : '0.00');

  const isCreatorOrPayer = user?.id === sub.created_by || user?.id === sub.payer_id;

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
        <Text style={styles.headerTitle}>Shared Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Main Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroName}>{sub.name}</Text>
              <Text style={styles.heroGroup}>
                {sub.group_name || 'Group'} • Paid by {sub.payer_name}
              </Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{sub.status || 'ACTIVE'}</Text>
            </View>
          </View>

          {/* Prominent User Share Display */}
          <View style={styles.userShareBox}>
            <Text style={styles.userShareLabel}>YOUR PERSONAL SHARE</Text>
            <View style={styles.shareAmountRow}>
              <Text style={styles.userShareValue}>₹{userShare}</Text>
              <Text style={styles.userShareCycle}>
                / {sub.billing_cycle?.toLowerCase() || 'month'}
              </Text>
            </View>
            <Text style={styles.totalClarification}>
              Total service cost: ₹{Number(sub.total_amount).toFixed(2)} split across {sub.members?.length || 0} members
            </Text>
          </View>
        </Card>

        {/* Subscription Info Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconCol}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Next Renewal Date</Text>
              <Text style={styles.infoValue}>{sub.next_renewal_date}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconCol}>
              <Ionicons name="repeat-outline" size={18} color={colors.purple} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Billing Cycle</Text>
              <Text style={styles.infoValue}>{sub.billing_cycle}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconCol}>
              <Ionicons name="pricetag-outline" size={18} color={colors.info} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>{sub.category || 'General'}</Text>
            </View>
          </View>

          {sub.notes ? (
            <View style={styles.infoRow}>
              <View style={styles.infoIconCol}>
                <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Notes</Text>
                <Text style={styles.infoValue}>{sub.notes}</Text>
              </View>
            </View>
          ) : null}
        </Card>

        {/* Member Breakdown Card */}
        <Card style={styles.membersCard}>
          <Text style={styles.sectionTitle}>Member Breakdown ({sub.members?.length || 0})</Text>

          {sub.members?.map((m) => {
            const isMe = m.user_id === user?.id;
            return (
              <View key={m.id || m.user_id} style={[styles.memberRow, isMe && styles.memberRowMe]}>
                <View style={styles.memberLeft}>
                  <Text style={styles.memberName}>
                    {m.user_name || `Member ${m.user_id}`} {isMe ? '(You)' : ''}
                  </Text>
                  <Text style={styles.memberRole}>
                    {m.user_id === sub.payer_id ? 'Payer / Host' : 'Participant'}
                  </Text>
                </View>
                <Text style={[styles.memberShare, isMe && styles.memberShareMe]}>
                  ₹{Number(m.share_amount).toFixed(2)}/mo
                </Text>
              </View>
            );
          })}
        </Card>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title={renewing ? 'Renewing...' : 'Advance & Generate Expense Now'}
            onPress={handleRenew}
            loading={renewing}
            style={styles.actionBtn}
          />
          {isCreatorOrPayer && (
            <Button
              title={deleting ? 'Deleting...' : 'Delete Shared Subscription'}
              variant="danger"
              onPress={handleDelete}
              loading={deleting}
              style={styles.actionBtn}
            />
          )}
        </View>
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
    padding: 24,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
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
  heroCard: {
    marginBottom: 16,
    padding: 18,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  heroLeft: {
    flex: 1,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  heroGroup: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  userShareBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 14,
    padding: 14,
  },
  userShareLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  shareAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  userShareValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  userShareCycle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  totalClarification: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  infoCard: {
    marginBottom: 16,
  },
  membersCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIconCol: {
    width: 32,
    alignItems: 'center',
    marginRight: 10,
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberRowMe: {
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  memberLeft: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  memberRole: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  memberShare: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  memberShareMe: {
    color: colors.primary,
  },
  actionsContainer: {
    gap: 12,
  },
  actionBtn: {
    marginBottom: 0,
  },
});
