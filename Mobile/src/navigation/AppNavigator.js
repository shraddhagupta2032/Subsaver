import React from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { GroupsScreen } from '../screens/main/GroupsScreen';
import { GroupDetailsScreen } from '../screens/main/GroupDetailsScreen';
import { ExpensesScreen } from '../screens/main/ExpensesScreen';
import { AddExpenseScreen } from '../screens/main/AddExpenseScreen';
import { ExpenseDetailsScreen } from '../screens/main/ExpenseDetailsScreen';
import { SubscriptionsScreen } from '../screens/main/SubscriptionsScreen';
import { AddSubscriptionScreen } from '../screens/main/AddSubscriptionScreen';
import { EditSubscriptionScreen } from '../screens/main/EditSubscriptionScreen';
import { SubscriptionDetailsScreen } from '../screens/main/SubscriptionDetailsScreen';
import { AddSharedSubscriptionScreen } from '../screens/main/AddSharedSubscriptionScreen';
import { SharedSubscriptionDetailsScreen } from '../screens/main/SharedSubscriptionDetailsScreen';
import { SubscriptionInsightsScreen } from '../screens/main/SubscriptionInsightsScreen';
import { BillScannerScreen } from '../screens/main/BillScannerScreen';
import { BillReviewScreen } from '../screens/main/BillReviewScreen';
import { NotificationsScreen } from '../screens/main/NotificationsScreen';
import { RemindersScreen } from '../screens/main/RemindersScreen';
import { AnalyticsScreen } from '../screens/main/AnalyticsScreen';
import { BudgetsScreen } from '../screens/main/BudgetsScreen';
import { AddBudgetScreen } from '../screens/main/AddBudgetScreen';
import { EditBudgetScreen } from '../screens/main/EditBudgetScreen';
import { SettlementsScreen } from '../screens/main/SettlementsScreen';
import { SettlementDetailsScreen } from '../screens/main/SettlementDetailsScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { colors } from '../theme/colors';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const GroupsStack = createNativeStackNavigator();
const DashboardStack = createNativeStackNavigator();
const ExpensesStack = createNativeStackNavigator();
const SubscriptionsStack = createNativeStackNavigator();
const BillScannerStack = createNativeStackNavigator();

const BillScannerNavigator = () => {
  return (
    <BillScannerStack.Navigator screenOptions={{ headerShown: false }}>
      <BillScannerStack.Screen name="BillScannerHome" component={BillScannerScreen} />
      <BillScannerStack.Screen name="BillReview" component={BillReviewScreen} />
    </BillScannerStack.Navigator>
  );
};

const GroupsNavigator = () => {
  return (
    <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupsStack.Screen name="GroupsList" component={GroupsScreen} />
      <GroupsStack.Screen name="GroupDetails" component={GroupDetailsScreen} />
      <GroupsStack.Screen name="AddExpense" component={AddExpenseScreen} />
      <GroupsStack.Screen name="ExpenseDetails" component={ExpenseDetailsScreen} />
      <GroupsStack.Screen name="AddSharedSubscription" component={AddSharedSubscriptionScreen} />
      <GroupsStack.Screen name="SharedSubscriptionDetails" component={SharedSubscriptionDetailsScreen} />
      <GroupsStack.Screen name="BillScanner" component={BillScannerNavigator} />
      <GroupsStack.Screen name="Notifications" component={NotificationsScreen} />
      <GroupsStack.Screen name="Reminders" component={RemindersScreen} />
      <GroupsStack.Screen name="Analytics" component={AnalyticsScreen} />
      <GroupsStack.Screen name="Settlements" component={SettlementsScreen} />
      <GroupsStack.Screen name="SettlementDetails" component={SettlementDetailsScreen} />
      <GroupsStack.Screen name="Budgets" component={BudgetsScreen} />
      <GroupsStack.Screen name="AddBudget" component={AddBudgetScreen} />
      <GroupsStack.Screen name="EditBudget" component={EditBudgetScreen} />
    </GroupsStack.Navigator>
  );
};

const ExpensesNavigator = () => {
  return (
    <ExpensesStack.Navigator screenOptions={{ headerShown: false }}>
      <ExpensesStack.Screen name="ExpensesList" component={ExpensesScreen} />
      <ExpensesStack.Screen name="ExpenseDetails" component={ExpenseDetailsScreen} />
      <ExpensesStack.Screen name="AddExpense" component={AddExpenseScreen} />
      <ExpensesStack.Screen name="BillScanner" component={BillScannerNavigator} />
    </ExpensesStack.Navigator>
  );
};

const SubscriptionsNavigator = () => {
  return (
    <SubscriptionsStack.Navigator screenOptions={{ headerShown: false }}>
      <SubscriptionsStack.Screen name="SubscriptionsList" component={SubscriptionsScreen} />
      <SubscriptionsStack.Screen name="SubscriptionDetails" component={SubscriptionDetailsScreen} />
      <SubscriptionsStack.Screen name="AddSubscription" component={AddSubscriptionScreen} />
      <SubscriptionsStack.Screen name="EditSubscription" component={EditSubscriptionScreen} />
      <SubscriptionsStack.Screen name="AddSharedSubscription" component={AddSharedSubscriptionScreen} />
      <SubscriptionsStack.Screen name="SharedSubscriptionDetails" component={SharedSubscriptionDetailsScreen} />
      <SubscriptionsStack.Screen name="SubscriptionInsights" component={SubscriptionInsightsScreen} />
      <SubscriptionsStack.Screen name="BillScanner" component={BillScannerNavigator} />
      <SubscriptionsStack.Screen name="Notifications" component={NotificationsScreen} />
      <SubscriptionsStack.Screen name="Reminders" component={RemindersScreen} />
      <SubscriptionsStack.Screen name="Analytics" component={AnalyticsScreen} />
      <SubscriptionsStack.Screen name="Budgets" component={BudgetsScreen} />
      <SubscriptionsStack.Screen name="AddBudget" component={AddBudgetScreen} />
      <SubscriptionsStack.Screen name="EditBudget" component={EditBudgetScreen} />
    </SubscriptionsStack.Navigator>
  );
};

const DashboardNavigator = () => {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardHome" component={DashboardScreen} />
      <DashboardStack.Screen name="ExpenseDetails" component={ExpenseDetailsScreen} />
      <DashboardStack.Screen name="AddExpense" component={AddExpenseScreen} />
      <DashboardStack.Screen name="SubscriptionDetails" component={SubscriptionDetailsScreen} />
      <DashboardStack.Screen name="SubscriptionInsights" component={SubscriptionInsightsScreen} />
      <DashboardStack.Screen name="BillScanner" component={BillScannerNavigator} />
      <DashboardStack.Screen name="Notifications" component={NotificationsScreen} />
      <DashboardStack.Screen name="Reminders" component={RemindersScreen} />
      <DashboardStack.Screen name="Analytics" component={AnalyticsScreen} />
      <DashboardStack.Screen name="Budgets" component={BudgetsScreen} />
      <DashboardStack.Screen name="AddBudget" component={AddBudgetScreen} />
      <DashboardStack.Screen name="EditBudget" component={EditBudgetScreen} />
      <DashboardStack.Screen name="Settlements" component={SettlementsScreen} />
      <DashboardStack.Screen name="SettlementDetails" component={SettlementDetailsScreen} />
    </DashboardStack.Navigator>
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#183129',
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
            },
            android: {
              elevation: 8,
            },
            web: {
              boxShadow: '0 -4px 16px rgba(24, 49, 41, 0.05)',
            },
          }),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Groups') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Expenses') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Subscriptions') {
            iconName = focused ? 'sync' : 'sync-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return (
            <View style={styles.tabIconBox}>
              {focused && <View style={styles.activeIndicator} />}
              <Ionicons name={iconName} size={22} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardNavigator} />
      <Tab.Screen name="Groups" component={GroupsNavigator} />
      <Tab.Screen name="Expenses" component={ExpensesNavigator} />
      <Tab.Screen name="Subscriptions" component={SubscriptionsNavigator} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Register" component={RegisterScreen} />
            <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconBox: {
    alignItems: 'center',
    position: 'relative',
    height: 28,
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
