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
import { budgetsApi } from '../../api/budgets';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';

const PRESET_CATEGORIES = [
  'Food',
  'Entertainment',
  'Utilities',
  'Groceries',
  'Shopping',
  'Travel',
  'Health',
  'Subscriptions',
  'Education',
];

export const AddBudgetScreen = ({ navigation }) => {
  const [category, setCategory] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);

  const validate = () => {
    const newErrors = {};
    if (!category.trim()) {
      newErrors.category = 'Category name is required';
    }

    const limitNum = parseFloat(monthlyLimit);
    if (!monthlyLimit || isNaN(limitNum) || limitNum <= 0) {
      newErrors.monthlyLimit = 'Please enter a valid monthly limit greater than 0';
    }

    const threshNum = parseInt(alertThreshold, 10);
    if (isNaN(threshNum) || threshNum < 1 || threshNum > 100) {
      newErrors.alertThreshold = 'Threshold must be between 1% and 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      setServerError(null);

      const payload = {
        category: category.trim(),
        monthly_limit: parseFloat(monthlyLimit).toFixed(2),
        alert_threshold_percentage: parseInt(alertThreshold, 10) || 80,
      };

      await budgetsApi.createBudget(payload);
      Alert.alert('Success', `Budget for "${category.trim()}" created successfully!`, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.warn('Create budget error:', err);
      setServerError(err.message || 'Failed to create budget. Please try again.');
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
          <Text style={styles.headerTitle}>Create Category Budget</Text>
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

          <Card style={styles.formCard}>
            <Text style={styles.sectionHeaderTitle}>Budget Details</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              Define spending limits to get alerted before you exceed your budget.
            </Text>

            {/* Category Input */}
            <Input
              label="Category Name *"
              placeholder="e.g. Food, Entertainment, Shopping"
              value={category}
              onChangeText={(text) => {
                setCategory(text);
                if (errors.category) setErrors({ ...errors, category: null });
              }}
              icon="pricetag-outline"
              error={errors.category}
              autoCapitalize="words"
            />

            {/* Category Quick Chips */}
            <Text style={styles.chipsLabel}>Quick Suggestions:</Text>
            <View style={styles.chipsContainer}>
              {PRESET_CATEGORIES.map((preset) => {
                const isSelected = category.toLowerCase() === preset.toLowerCase();
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => {
                      setCategory(preset);
                      if (errors.category) setErrors({ ...errors, category: null });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {preset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Monthly Limit Input */}
            <Input
              label="Monthly Limit (₹) *"
              placeholder="e.g. 5000"
              value={monthlyLimit}
              onChangeText={(text) => {
                setMonthlyLimit(text);
                if (errors.monthlyLimit) setErrors({ ...errors, monthlyLimit: null });
              }}
              icon="wallet-outline"
              keyboardType="numeric"
              error={errors.monthlyLimit}
            />

            {/* Alert Threshold Input */}
            <Input
              label="Alert Threshold (%)"
              placeholder="80"
              value={alertThreshold}
              onChangeText={(text) => {
                setAlertThreshold(text);
                if (errors.alertThreshold) setErrors({ ...errors, alertThreshold: null });
              }}
              icon="notifications-outline"
              keyboardType="number-pad"
              error={errors.alertThreshold}
            />
            <Text style={styles.helperText}>
              You'll be notified when spending reaches {alertThreshold || 80}% of your limit.
            </Text>
          </Card>

          <View style={styles.buttonContainer}>
            <Button
              title="Save Budget"
              onPress={handleSave}
              loading={loading}
              style={styles.saveButton}
            />
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => navigation.goBack()}
              disabled={loading}
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
  formCard: {
    padding: 18,
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
  chipsLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: -4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.surface,
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  buttonContainer: {
    marginTop: 8,
  },
  saveButton: {
    marginBottom: 12,
  },
});

export default AddBudgetScreen;
