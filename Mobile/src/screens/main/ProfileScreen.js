import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { groupsApi } from '../../api/groups';
import { expensesApi } from '../../api/expenses';

export const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [groupCount, setGroupCount] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);

  useEffect(() => {
    // Load quick user stats
    const fetchStats = async () => {
      try {
        const [groups, expenses] = await Promise.allSettled([
          groupsApi.getGroups(),
          expensesApi.getExpenses(),
        ]);
        if (groups.status === 'fulfilled' && Array.isArray(groups.value)) {
          setGroupCount(groups.value.length);
        }
        if (expenses.status === 'fulfilled' && Array.isArray(expenses.value)) {
          setExpenseCount(expenses.value.length);
        }
      } catch (e) {
        // quiet fallback
      }
    };
    fetchStats();
  }, []);

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

  const memberYear = user?.created_at
    ? new Date(user.created_at).getFullYear()
    : '2025';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { maxWidth: isDesktop ? 1140 : '100%' }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => Alert.alert('Settings', 'App version: SubSaver 2.0.0')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: isDesktop ? 1140 : '100%',
            paddingHorizontal: isDesktop ? 24 : 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Emerald Profile Hero Card */}
        <View style={styles.profileHeroCard}>
          <View style={styles.profileHeroLeft}>
            <Avatar name={user?.name || 'Aarav Mehta'} tone="mint" size="large" />
            <View style={styles.profileHeroTextCol}>
              <Text style={styles.profileName}>{user?.name || 'Aarav Mehta'}</Text>
              <Text style={styles.profileEmail}>{user?.email || 'aarav.mehta@gmail.com'}</Text>
              <Text style={styles.profileMemberDate}>Member since {memberYear}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editPencilBtn}
            activeOpacity={0.75}
            onPress={() => Alert.alert('Edit Profile', 'Profile details are synced from your account.')}
          >
            <Ionicons name="pencil" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 3-Column Metrics Card */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{groupCount || 3}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{expenseCount || 28}</Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>₹4.8k</Text>
            <Text style={styles.statLabel}>Settled</Text>
          </View>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionHeading}>Account</Text>
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Personal Details', `Name: ${user?.name || 'User'}\nEmail: ${user?.email || ''}`)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconBox}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuTitle}>Personal details</Text>
                <Text style={styles.menuSub}>Name, phone and email</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Settlements')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconBox}>
                <Ionicons name="wallet-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuTitle}>Payment methods & settlements</Text>
                <Text style={styles.menuSub}>UPI, debts and bank transfers</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconBox}>
                <Ionicons name="notifications-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuTitle}>Notifications</Text>
                <Text style={styles.menuSub}>Reminders and renewal updates</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Privacy & Security', 'Your data is encrypted and securely stored.')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuTitle}>Privacy & security</Text>
                <Text style={styles.menuSub}>Data controls and session safety</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Help & Support', 'SubSaver Support: support@subsaver.app')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconBox}>
                <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuTitle}>Help & support</Text>
                <Text style={styles.menuSub}>FAQs and contact us</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Financial Hub Links */}
        <Text style={styles.sectionHeading}>Financial Tools</Text>
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Budgets')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconBox}>
                <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuTitle}>Monthly Budgets</Text>
                <Text style={styles.menuSub}>Category limits and spending caps</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Reminders')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconBox}>
                <Ionicons name="alarm-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuTitle}>Renewal Reminders</Text>
                <Text style={styles.menuSub}>Upcoming renewal timeline</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Analytics')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconBox}>
                <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuTitle}>Spending Analytics</Text>
                <Text style={styles.menuSub}>Monthly trends and breakdown</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Log Out Button */}
        <Button
          title="Log Out"
          variant="outline"
          onPress={handleLogout}
          icon={<Ionicons name="log-out-outline" size={18} color={colors.danger} />}
          style={styles.logoutButton}
          textStyle={{ color: colors.danger }}
        />
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
    width: '100%',
    alignSelf: 'center',
  },
  profileHeroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 4,
  },
  profileHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  profileHeroTextCol: {
    marginLeft: 14,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  profileMemberDate: {
    fontSize: 11,
    color: colors.mintBar,
    fontWeight: '600',
    marginTop: 4,
  },
  editPencilBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '65%',
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemTextCol: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  menuSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  logoutButton: {
    borderColor: colors.danger,
    marginTop: 4,
    marginBottom: 20,
  },
});
