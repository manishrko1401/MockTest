import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Gift, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react-native';
import { ApiClient } from '../api';
import { ThemeColors } from '../theme';

interface AuthScreenProps {
  onLoginSuccess: (user: any) => void;
  isDark?: boolean;
  onToggleTheme?: (dark: boolean) => void;
}

export default function AuthScreen({ onLoginSuccess, isDark = false, onToggleTheme }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (loginEmail: string, loginPass: string) => {
    if (!loginEmail.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!loginPass) {
      setError('Please enter your password');
      return;
    }
    setLoading(true);
    setError('');

    const res = await ApiClient.login(loginEmail, loginPass);
    setLoading(false);

    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setError(res.error || 'Login failed. Please verify credentials.');
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Email is incorrect.');
      return;
    }
    if (!mobile.trim()) {
      setError('Please enter your mobile number.');
      return;
    }
    if (!/^\d{10}$/.test(mobile.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    setError('');

    const res = await ApiClient.signup(name, email, mobile, password, referralCode);
    setLoading(false);

    if (res.success && res.user) {
      await AsyncStorage.setItem('show_signup_congrats_popup', 'true');
      Alert.alert('Registration Successful', `Welcome, ${res.user.name}!`);
      onLoginSuccess(res.user);
    } else {
      setError(res.error || 'Registration failed. Email might already be taken.');
    }
  };

  const handleSubmit = () => {
    if (activeTab === 'login') {
      handleLogin(email, password);
    } else {
      handleRegister();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDark && { backgroundColor: ThemeColors.dark.bg }]}
    >
      {/* Theme Toggle Button */}
      {onToggleTheme && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onToggleTheme(!isDark)}
          style={[
            styles.themeToggle,
            isDark 
              ? { backgroundColor: '#16223F', borderColor: '#1F2E54' } 
              : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }
          ]}
        >
          {isDark ? (
            <Sun size={18} color="#F59E0B" />
          ) : (
            <Moon size={18} color="#475569" />
          )}
        </TouchableOpacity>
      )}

      {/* Decorative Blur Orbs */}
      <View style={[styles.blurOrbLeft, isDark && { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]} />
      <View style={[styles.blurOrbRight, isDark && { backgroundColor: 'rgba(99, 102, 241, 0.08)' }]} />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Shield Header */}
        <View style={styles.headerBlock}>
          <View style={styles.shieldIconContainer}>
            <ShieldCheck size={28} color="#FFF" />
          </View>
          <Text style={[styles.logoText, isDark && { color: ThemeColors.dark.text }]}>MOCKTEST HUB ACCOUNT</Text>
          <Text style={[styles.subLogoText, isDark && { color: ThemeColors.dark.textMuted }]}>SINGLE SIGN-ON ACCESS</Text>
        </View>

        {/* Input Card */}
        <View style={[styles.card, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
          
          {/* Tab Switcher */}
          <View style={[styles.tabBar, isDark && { backgroundColor: '#020617', borderColor: '#334155' }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.tabButton,
                activeTab === 'login' && styles.tabButtonActive
              ]}
              onPress={() => {
                setActiveTab('login');
                setError('');
              }}
            >
              <Text style={[
                styles.tabButtonText,
                activeTab === 'login' ? styles.tabButtonTextActive : (isDark ? { color: '#94A3B8' } : { color: '#4B5563' })
              ]}>
                LOGIN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.tabButton,
                activeTab === 'signup' && styles.tabButtonActive
              ]}
              onPress={() => {
                setActiveTab('signup');
                setError('');
              }}
            >
              <Text style={[
                styles.tabButtonText,
                activeTab === 'signup' ? styles.tabButtonTextActive : (isDark ? { color: '#94A3B8' } : { color: '#4B5563' })
              ]}>
                REGISTER
              </Text>
            </TouchableOpacity>
          </View>

          {/* Feedback Message */}
          {error ? (
            <View style={[styles.errorBox, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#7F1D1D' }]}>
              <AlertCircle size={16} color="#EF4444" style={styles.errorIcon} />
              <Text style={[styles.errorText, isDark && { color: '#FCA5A5' }]}>{error}</Text>
            </View>
          ) : null}

          {/* Form Fields */}
          {activeTab === 'signup' && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.inputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Full Name</Text>
              <View style={[styles.inputWrapper, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder }]}>
                <User size={16} color={isDark ? '#94A3B8' : '#6B7280'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isDark && { color: ThemeColors.dark.text }]}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor={isDark ? '#475569' : '#9CA3AF'}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={[styles.inputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Email Address</Text>
            <View style={[styles.inputWrapper, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder }]}>
              <Mail size={16} color={isDark ? '#94A3B8' : '#6B7280'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isDark && { color: ThemeColors.dark.text }]}
                placeholder="student@example.com"
                placeholderTextColor={isDark ? '#475569' : '#9CA3AF'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {activeTab === 'signup' && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.inputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Mobile Number</Text>
              <View style={[styles.inputWrapper, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder }]}>
                <Phone size={16} color={isDark ? '#94A3B8' : '#6B7280'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isDark && { color: ThemeColors.dark.text }]}
                  placeholder="10-digit number"
                  placeholderTextColor={isDark ? '#475569' : '#9CA3AF'}
                  value={mobile}
                  onChangeText={(val) => setMobile(val.replace(/\D/g, ''))}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>
          )}

          {activeTab === 'signup' && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.inputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Referral Code (Optional)</Text>
              <View style={[styles.inputWrapper, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder }]}>
                <Gift size={16} color={isDark ? '#94A3B8' : '#6B7280'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isDark && { color: ThemeColors.dark.text }]}
                  placeholder="e.g. TB-RAHUL-1029"
                  placeholderTextColor={isDark ? '#475569' : '#9CA3AF'}
                  value={referralCode}
                  onChangeText={setReferralCode}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={[styles.inputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Password</Text>
            <View style={[styles.inputWrapper, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder }]}>
              <Lock size={16} color={isDark ? '#94A3B8' : '#6B7280'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }, isDark && { color: ThemeColors.dark.text }]}
                placeholder="••••••••"
                placeholderTextColor={isDark ? '#475569' : '#9CA3AF'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={16} color={isDark ? '#94A3B8' : '#6B7280'} />
                ) : (
                  <Eye size={16} color={isDark ? '#94A3B8' : '#6B7280'} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.primaryBtn, isDark && { backgroundColor: '#3B82F6', shadowColor: '#3B82F6' }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {activeTab === 'login' ? 'SIGN IN TO ACCOUNT' : 'REGISTER ACCOUNT'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate 50 matching web
  },
  themeToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 20,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  blurOrbLeft: {
    position: 'absolute',
    top: '15%',
    left: '-20%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(37, 99, 235, 0.04)', // blue-600/10
  },
  blurOrbRight: {
    position: 'absolute',
    bottom: '15%',
    right: '-20%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(79, 70, 229, 0.04)', // indigo-600/10
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 40,
  },
  shieldIconContainer: {
    backgroundColor: '#2563EB',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A', // Slate 900
    letterSpacing: 2,
    textAlign: 'center',
  },
  subLogoText: {
    fontSize: 10,
    color: '#64748B', // Slate 500
    marginTop: 4,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0', // slate 200
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // Slate 100
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#2563EB', // Blue 600
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  eyeButton: {
    padding: 6,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2563EB',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 16,
  },
});
