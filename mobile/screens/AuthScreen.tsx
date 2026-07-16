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
  Alert,
  Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  Moon,
  Trophy,
  X
} from 'lucide-react-native';
import { ApiClient } from '../api';
import { ThemeColors } from '../theme';


interface AuthScreenProps {
  onLoginSuccess: (user: any) => void;
  onContinueAsGuest?: () => void;
  isDark?: boolean;
  onToggleTheme?: (dark: boolean) => void;
}

export default function AuthScreen({ onLoginSuccess, onContinueAsGuest, isDark = false, onToggleTheme }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password Reset states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = input credentials, 2 = input OTP + new password
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleRequestReset = async () => {
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }
    setResetLoading(true);
    setResetError('');
    setResetSuccess('');

    try {
      const res = await ApiClient.requestPasswordReset(resetEmail.trim());
      if (res.success) {
        setResetSuccess('Verification code has been sent to your email.');
        setResetStep(2);
      } else {
        setResetError(res.error || 'Failed to request reset.');
      }
    } catch (err) {
      setResetError('Connection error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!resetOtp.trim()) {
      setResetError('Please enter the verification code.');
      return;
    }
    if (!resetNewPassword.trim()) {
      setResetError('Please enter a new password.');
      return;
    }
    if (resetNewPassword.length < 4) {
      setResetError('Password must be at least 4 characters long.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess('');

    try {
      const res = await ApiClient.confirmPasswordReset(
        resetEmail.trim(),
        resetOtp.trim(),
        resetNewPassword.trim()
      );
      if (res.success) {
        Alert.alert(
          'Success',
          'Password reset successful! Please login with your new password.',
          [{ text: 'OK' }]
        );
        setShowResetModal(false);
        setResetOtp('');
        setResetNewPassword('');
        setPassword(resetNewPassword);
        setEmail(resetEmail);
      } else {
        setResetError(res.error || 'Password reset failed.');
      }
    } catch (err) {
      setResetError('Connection error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

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
    setSuccess('');

    const res = await ApiClient.login(loginEmail, loginPass);

    if (res.success && res.user) {
      setSuccess('Logged in successfully!');
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess(res.user);
      }, 1500);
    } else {
      setLoading(false);
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
    setSuccess('');

    const res = await ApiClient.signup(name, email, mobile, password, referralCode);

    if (res.success && res.user) {
      await AsyncStorage.setItem('show_signup_congrats_popup', 'true');
      setSuccess('Signed up successfully!');
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess(res.user);
      }, 1500);
    } else {
      setLoading(false);
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
              : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
            { top: Math.max(insets.top + 10, 16) }
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
        {/* Logo Header */}
        <View style={styles.headerBlock}>
          <View style={[
            styles.shieldIconContainer, 
            { 
              backgroundColor: isDark ? '#1E293B' : '#E6F4FE', 
              borderRadius: 30,
              padding: 12,
              borderColor: isDark ? '#334155' : '#BFDBFE',
              borderWidth: 1.5,
              shadowColor: '#3B82F6',
            }
          ]}>
            <Trophy size={28} color={isDark ? '#60A5FA' : '#2563EB'} />
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
                setSuccess('');
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
                setSuccess('');
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

          {success ? (
            <View style={[styles.successBox, isDark && { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: '#14532D' }]}>
              <ShieldCheck size={16} color="#22C55E" style={styles.successIcon} />
              <Text style={[styles.successText, isDark && { color: '#86EFAC' }]}>{success}</Text>
            </View>
          ) : null}

          {/* Form Fields */}

            <View style={{ width: '100%' }}>
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

              {activeTab === 'login' && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setResetStep(1);
                    setShowResetModal(true);
                    setResetError('');
                    setResetSuccess('');
                  }}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={[styles.forgotPasswordText, isDark && { color: '#60A5FA' }]}>
                    FORGOT PASSWORD?
                  </Text>
                </TouchableOpacity>
              )}

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

              {onContinueAsGuest && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onContinueAsGuest}
                  style={styles.guestBtn}
                >
                  <Text style={[styles.guestBtnText, isDark && { color: '#94A3B8' }]}>
                    CONTINUE AS GUEST
                  </Text>
                </TouchableOpacity>
              )}
            </View>
        </View>
      </ScrollView>

      {/* Password Reset Modal */}
      <Modal
        visible={showResetModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <View style={[
              styles.modalContent,
              isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }
            ]}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.closeModalBtn, isDark && { backgroundColor: '#1E293B' }]}
                onPress={() => setShowResetModal(false)}
              >
                <X size={16} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>

              <View style={styles.modalHeader}>
                <Lock size={20} color={isDark ? '#60A5FA' : '#2563EB'} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, isDark && { color: ThemeColors.dark.text }]}>RESET PASSWORD</Text>
              </View>

              {/* Feedback Messages for Reset */}
              {resetError ? (
                <View style={[styles.errorBox, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#7F1D1D' }, { width: '100%', marginBottom: 16 }]}>
                  <AlertCircle size={16} color="#EF4444" style={styles.errorIcon} />
                  <Text style={[styles.errorText, isDark && { color: '#FCA5A5' }]}>{resetError}</Text>
                </View>
              ) : null}

              {resetSuccess ? (
                <View style={[styles.successBox, isDark && { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: '#14532D' }, { width: '100%', marginBottom: 16 }]}>
                  <ShieldCheck size={16} color="#22C55E" style={styles.successIcon} />
                  <Text style={[styles.successText, isDark && { color: '#86EFAC' }]}>{resetSuccess}</Text>
                </View>
              ) : null}

              {resetStep === 1 ? (
                <View style={{ width: '100%' }}>
                  <Text style={[styles.resetInstructions, isDark && { color: ThemeColors.dark.textMuted }]}>
                    Enter your registered email address. We will send you a 6-digit verification code (OTP) to reset your password.
                  </Text>

                  <View style={styles.fieldGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Email Address</Text>
                    <View style={[styles.inputWrapper, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder }]}>
                      <Mail size={16} color={isDark ? '#94A3B8' : '#6B7280'} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, isDark && { color: ThemeColors.dark.text }]}
                        placeholder="student@example.com"
                        placeholderTextColor={isDark ? '#475569' : '#9CA3AF'}
                        value={resetEmail}
                        onChangeText={setResetEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.primaryBtn, isDark && { backgroundColor: '#3B82F6' }]}
                    onPress={handleRequestReset}
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.primaryBtnText}>GET VERIFICATION CODE</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ width: '100%' }}>
                  <Text style={[styles.resetInstructions, isDark && { color: ThemeColors.dark.textMuted }]}>
                    Please enter the 6-digit verification code (OTP) sent to your email and choose a new password.
                  </Text>

                  <View style={styles.fieldGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Verification Code (OTP)</Text>
                    <View style={[styles.inputWrapper, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder }, { justifyContent: 'center' }]}>
                      <TextInput
                        style={[
                          styles.input,
                          { textAlign: 'center', fontSize: 18, fontWeight: 'bold', letterSpacing: 8, paddingVertical: 10 },
                          isDark && { color: ThemeColors.dark.text }
                        ]}
                        placeholder="••••••"
                        placeholderTextColor={isDark ? '#475569' : '#9CA3AF'}
                        value={resetOtp}
                        onChangeText={(val) => setResetOtp(val.replace(/\D/g, ''))}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>New Password</Text>
                    <View style={[styles.inputWrapper, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder }]}>
                      <Lock size={16} color={isDark ? '#94A3B8' : '#6B7280'} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { flex: 1 }, isDark && { color: ThemeColors.dark.text }]}
                        placeholder="At least 4 characters"
                        placeholderTextColor={isDark ? '#475569' : '#9CA3AF'}
                        value={resetNewPassword}
                        onChangeText={setResetNewPassword}
                        secureTextEntry={!showResetPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.eyeButton}
                        onPress={() => setShowResetPassword(!showResetPassword)}
                      >
                        {showResetPassword ? (
                          <EyeOff size={16} color={isDark ? '#94A3B8' : '#6B7280'} />
                        ) : (
                          <Eye size={16} color={isDark ? '#94A3B8' : '#6B7280'} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[styles.secondaryBtn, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}
                      onPress={() => { setResetStep(1); setResetError(''); setResetSuccess(''); }}
                    >
                      <Text style={[styles.secondaryBtnText, isDark && { color: ThemeColors.dark.text }]}>BACK</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={[styles.primaryBtn, { flex: 1, marginTop: 0 }, isDark && { backgroundColor: '#3B82F6' }]}
                      onPress={handleConfirmReset}
                      disabled={resetLoading}
                    >
                      {resetLoading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.primaryBtnText}>RESET PASSWORD</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  successIcon: {
    marginRight: 8,
  },
  successText: {
    flex: 1,
    color: '#15803D',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  guestBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  guestBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 5,
    position: 'relative',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
    zIndex: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
  },
  resetInstructions: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 4,
    paddingVertical: 10,
  },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loginMethodBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    maxWidth: 180,
  },
  loginMethodBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginMethodBtnActive: {
    backgroundColor: '#2563EB',
  },
  loginMethodBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loginMethodBtnTextActive: {
    color: '#FFFFFF',
  },
});
