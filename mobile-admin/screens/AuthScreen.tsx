import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldAlert, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { ApiClient } from '../api';
import { ThemeColors } from '../theme';

interface AuthScreenProps {
  onLoginSuccess: (user: any) => void;
  isDark?: boolean;
}

export default function AuthScreen({ onLoginSuccess, isDark = true }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = isDark ? ThemeColors.dark : ThemeColors.light;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await ApiClient.login(email.trim().toLowerCase(), password);

      if (res.success && res.user) {
        // Enforce role-based access security
        if (res.user.role === 'STUDENT') {
          setError('Access Denied: You do not have administrator permissions.');
          ApiClient.setApiSession(null, null);
        } else {
          onLoginSuccess(res.user);
        }
      } else {
        setError(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError('Network connection failed. Verify server status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.headerBg} />
      
      {/* Decorative Glow Orbs */}
      <View style={[styles.glowOrb, { top: -120, left: -100, backgroundColor: 'rgba(99, 102, 241, 0.15)' }]} />
      <View style={[styles.glowOrb, { bottom: -120, right: -100, backgroundColor: 'rgba(79, 70, 229, 0.15)' }]} />

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.header}>
          <View style={[styles.logoIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
            <ShieldAlert size={40} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>MockTest Admin</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Authorized Portal Access
          </Text>
        </View>

        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Email Address</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Mail size={18} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="admin@mocktesthub.com"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Password</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Lock size={18} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="••••••••"
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              {showPassword ? (
                <EyeOff size={18} color={theme.textMuted} />
              ) : (
                <Eye size={18} color={theme.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          style={[styles.loginBtn, { backgroundColor: theme.primary }]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.loginBtnText}>Secure Sign In</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
          Warning: Unauthorised access attempts are monitored and recorded.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  glowOrb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  eyeBtn: {
    padding: 8,
  },
  loginBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 16,
  },
});
