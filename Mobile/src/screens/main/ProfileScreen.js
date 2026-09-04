import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';

export const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of SubSaver?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (err) {
            console.warn('Logout error:', err);
          }
        },
      },
    ]);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account & Settings</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'SubSaver User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
            <View style={styles.verifiedPill}>
              <Ionicons name="checkmark-circle" size={13} color={colors.success} />
              <Text style={styles.verifiedText}>Verified Account</Text>
            </View>
          </View>
        </Card>

        {/* Quick Navigation Links */}
        <Text style={styles.sectionTitle}>Financial Hub</Text>
        <Card style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Budgets')}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>Category Budgets</Text>
              <Text style={styles.menuItemSubtitle}>Spending limits & threshold alerts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Settlements')}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>Group Debt Settlements</Text>
              <Text style={styles.menuItemSubtitle}>Simplified balances & payment recording</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Analytics')}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
              <Ionicons name="bar-chart-outline" size={20} color={colors.purple} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>Financial Analytics</Text>
              <Text style={styles.menuItemSubtitle}>Spending trends & category breakdown</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.warning} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>Notification Center</Text>
              <Text style={styles.menuItemSubtitle}>Renewal alerts & expense payment dues</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* App Info Card */}
        <Text style={styles.sectionTitle}>Application</Text>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Name</Text>
            <Text style={styles.infoValue}>SubSaver</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0 (Release Ready)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Engine</Text>
            <Text style={styles.infoValue}>Cent-Safe & Debt Simplification</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>AI Bill Scanner</Text>
            <Text style={styles.infoValue}>Google Gemini Vision</Text>
          </View>
        </Card>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            title="Log Out of SubSaver"
            variant="danger"
            onPress={handleLogout}
            icon="log-out-outline"
          />
        </View>

        <Text style={styles.footerNote}>
          SubSaver • Smart Subscription & Group Expense Management
        </Text>
        <View style={{ height: 40 }} />
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.surface,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 6,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  menuCard: {
    padding: 0,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
  infoCard: {
    padding: 16,
    marginBottom: 24,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  logoutContainer: {
    marginBottom: 16,
  },
  footerNote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ProfileScreen;
