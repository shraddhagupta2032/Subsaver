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
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';

export const SubscriptionDetailsScreen = ({ route, navigation }) => {
  const { subscriptionId } = route.params;

  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await subscriptionsApi.getSubscriptionById(subscriptionId);
      setSub(data);
    } catch (err) {
      setError(err.message || 'Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [subscriptionId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchSubscription();
    });
    return unsubscribe;
  }, [navigation, subscriptionId]);

  const handleDeleteConfirm = () => {
    Alert.alert(
      'Delete Subscription',
      `Are you sure you want to delete ${sub?.name || 'this subscription'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await subscriptionsApi.deleteSubscription(subscriptionId);
              Alert.alert('Deleted', 'Subscription deleted successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete subscription.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: colors.successBg, text: colors.success, label: 'ACTIVE' };
      case 'PAUSED':
        return { bg: colors.warningBg, text: colors.warning, label: 'PAUSED' };
      case 'CANCELLED':
        return { bg: colors.dangerBg, text: colors.danger, label: 'CANCELLED' };
      default:
        return { bg: colors.surfaceLight, text: colors.textSecondary, label: status || 'ACTIVE' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading subscription details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !sub) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>Error Loading Subscription</Text>
        <Text style={styles.errorText}>{error || 'Subscription not found.'}</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }

  const badge = getStatusBadge(sub.status);

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
        <Text style={styles.headerTitle}>Subscription Details</Text>
        <TouchableOpacity
          style={styles.editHeaderBtn}
          onPress={() => navigation.navigate('EditSubscription', { subscriptionId: sub.id })}
        >
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Main Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroName}>{sub.name}</Text>
              <Text style={styles.heroCategory}>{sub.category || 'General'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                {badge.label}
              </Text>
            </View>
          </View>

          <View style={styles.amountBlock}>
            <Text style={styles.amountValue}>
              ₹{Number(sub.amount).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.amountCadence}>/ {sub.billing_cycle?.toLowerCase() || 'month'}</Text>
          </View>
        </Card>

        {/* Details Grid */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Subscription Info</Text>

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

          <View style={styles.infoRow}>
            <View style={styles.infoIconCol}>
              <Ionicons name="cash-outline" size={18} color={colors.success} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Currency</Text>
              <Text style={styles.infoValue}>{sub.currency || 'INR'}</Text>
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

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Edit Subscription"
            variant="outline"
            onPress={() => navigation.navigate('EditSubscription', { subscriptionId: sub.id })}
            style={styles.actionBtn}
          />
          <Button
            title={deleting ? 'Deleting...' : 'Delete Subscription'}
            variant="danger"
            onPress={handleDeleteConfirm}
            loading={deleting}
            style={styles.actionBtn}
          />
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
  editHeaderBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    marginBottom: 16,
    padding: 20,
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
  heroCategory: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  amountBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  amountCadence: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  detailsCard: {
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
  actionsContainer: {
    gap: 12,
  },
  actionBtn: {
    marginBottom: 0,
  },
});
