import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export const Avatar = ({ name = 'User', tone = 'mint', size = 'normal', style }) => {
  const initials = (name || 'User')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const toneConfig = colors.tones[tone] || colors.tones.mint;
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const dim = isSmall ? 28 : isLarge ? 52 : 40;
  const radius = isSmall ? 10 : isLarge ? 18 : 14;
  const fontSize = isSmall ? 10 : isLarge ? 16 : 13;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: dim,
          height: dim,
          borderRadius: radius,
          backgroundColor: toneConfig.bg,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize, color: toneConfig.text }]}>
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
