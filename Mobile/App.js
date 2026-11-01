import React from 'react';
import { Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

// Web Alert Polyfill for React Native Web (makes Alert.alert interactive on web)
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length === 0) {
      window.alert(text);
      return;
    }
    if (buttons.length === 1) {
      window.alert(text);
      if (typeof buttons[0]?.onPress === 'function') {
        buttons[0].onPress();
      }
      return;
    }
    const confirmed = window.confirm(text);
    if (confirmed) {
      const confirmBtn = buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];
      if (typeof confirmBtn?.onPress === 'function') {
        confirmBtn.onPress();
      }
    } else {
      const cancelBtn = buttons.find((b) => b.style === 'cancel');
      if (typeof cancelBtn?.onPress === 'function') {
        cancelBtn.onPress();
      }
    }
  };
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
