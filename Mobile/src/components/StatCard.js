import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export const StatCard = ({
  title,
  value,
  subtitle,
  subtext,
  icon,
  tone = 'positive', // 'positive' | 'negative' | 'neutral'
  color,
  style,
  onPress,
}) => {
  const isNegative = tone === 'negative';
  const activeColor = color || (isNegative ? colors.danger : colors.primary);
  const displaySubtitle = subtitle || subtext;
  const ContainerComponent = onPress ? TouchableOpacity : View;

  return (
    <ContainerComponent
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {icon && (
          <View style={[styles.iconBadge, { backgroundColor: `${activeColor}15` }]}>
            <Ionicons name={icon} size={15} color={activeColor} />
          </View>
        )}
      </View>
      <Text style={[styles.value, { color: activeColor }]} numberOfLines={1}>
        {value}
      </Text>
      {displaySubtitle ? (
        <View style={styles.subRow}>
          <Ionicons
            name={isNegative ? 'arrow-forward' : 'arrow-back'}
            size={12}
            color={isNegative ? colors.danger : colors.primary}
          />
          <Text style={[styles.subtitle, { color: activeColor }]} numberOfLines={1}>
            {displaySubtitle}
          </Text>
        </View>
      ) : null}
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 10,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#183129',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 4px 16px rgba(24, 49, 41, 0.05)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
});
