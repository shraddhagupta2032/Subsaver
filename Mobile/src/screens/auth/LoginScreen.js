import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { getApiBaseUrl, setApiBaseUrl } from '../../api/client';
import { storage } from '../../utils/storage';

export const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServerUrl = async () => {
    if (!serverUrl.trim()) return;
    setApiBaseUrl(serverUrl.trim());
    await storage.saveApiBaseUrl(serverUrl.trim());
    setShowServerConfig(false);
    Alert.alert('Server Configured', `API URL set to: ${serverUrl.trim()}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="wallet-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.appName}>SubSaver</Text>
            <Text style={styles.tagline}>
              Smart Subscription & Expense Management
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to access your financial dashboard</Text>

            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <Input
              label="Email Address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              placeholder="you@example.com"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null);
              }}
              placeholder="Enter your password"
              icon="lock-closed-outline"
              secureTextEntry
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.7}
              >
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Server Config Toggle */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Ionicons name="settings-outline" size={14} color={colors.textMuted} />
            <Text style={styles.configToggleText}>
              {showServerConfig ? 'Hide Server URL' : 'Configure Server URL'}
            </Text>
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverBox}>
              <Input
                label="FastAPI Backend URL"
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://10.0.2.2:8000"
                icon="server-outline"
              />
              <Button
                title="Apply URL"
                variant="secondary"
                onPress={handleSaveServerUrl}
                style={styles.applyButton}
              />
            </View>
          )}
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  configToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  configToggleText: {
    color: colors.textMuted,
    fontSize: 12,
    marginLeft: 6,
  },
  serverBox: {
    marginTop: 14,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applyButton: {
    height: 40,
  },
});
