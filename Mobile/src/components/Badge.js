import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export const Badge = ({
  text,
  variant = 'success', // 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'neutral'
  size = 'medium', // 'small' | 'medium'
  style,
  textStyle,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'danger':
        return { bg: colors.dangerBg, text: colors.danger };
      case 'warning':
        return { bg: colors.warningBg, text: colors.warning };
      case 'info':
        return { bg: colors.infoBg, text: colors.info };
      case 'purple':
        return { bg: colors.purpleBg, text: colors.purple };
      case 'neutral':
        return { bg: colors.surfaceLight, text: colors.textSecondary };
      case 'success':
      default:
        return { bg: colors.primarySoft, text: colors.primary };
    }
  };

  const conf = getColors();
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: conf.bg,
          paddingHorizontal: isSmall ? 8 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: conf.text,
            fontSize: isSmall ? 10 : 11,
          },
          textStyle,
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 99,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
