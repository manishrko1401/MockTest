import React, { useState } from 'react';
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
import { ApiClient } from '../api';

interface AuthScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (loginEmail: string) => {
    if (!loginEmail.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError('');

    const res = await ApiClient.login(loginEmail);
    setLoading(false);

    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setError(res.error || 'Login failed. Account might not exist.');
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !mobile.trim()) {
      setError('Name, Email and Mobile are required');
      return;
    }
    setLoading(true);
    setError('');

    const res = await ApiClient.signup(name, email, mobile, referralCode);
    setLoading(false);

    if (res.success && res.user) {
      Alert.alert('Registration Successful', `Welcome, ${res.user.name}!`);
      onLoginSuccess(res.user);
    } else {
      setError(res.error || 'Registration failed. Email might already be taken.');
    }
  };

  const selectQuickAccount = (emailAddress: string) => {
    setEmail(emailAddress);
    handleLogin(emailAddress);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Logo/Brand Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.logoText}>testbook</Text>
          <Text style={styles.subLogoText}>India's No. 1 Govt Exam Prep Platform</Text>
        </View>

        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isRegistering ? 'Create Student Account' : 'Sign In with Email'}
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {isRegistering ? (
            <>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Text style={styles.inputLabel}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
              />
            </>
          ) : null}

          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. student@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {isRegistering ? (
            <>
              <Text style={styles.inputLabel}>Referral Code (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. TB-RAHUL-1029"
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
              />
            </>
          ) : null}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={isRegistering ? handleRegister : () => handleLogin(email)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isRegistering ? 'Register & Start Prep' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
          >
            <Text style={styles.toggleBtnText}>
              {isRegistering ? 'Already have an account? Log In' : 'New to Testbook? Register here'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Account Pickers */}
        <View style={styles.quickAccessBlock}>
          <Text style={styles.quickAccessTitle}>Developer Quick Logins</Text>
          <View style={styles.pickerRow}>
            <TouchableOpacity
              style={[styles.quickBadge, { backgroundColor: '#1E3A8A' }]}
              onPress={() => selectQuickAccount('admin@mocktest.com')}
            >
              <Text style={styles.quickBadgeText}>Admin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBadge, { backgroundColor: '#10B981' }]}
              onPress={() => selectQuickAccount('rahul.sharma@example.com')}
            >
              <Text style={styles.quickBadgeText}>Pass Pro User</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBadge, { backgroundColor: '#F59E0B' }]}
              onPress={() => selectQuickAccount('amit.verma@example.com')}
            >
              <Text style={styles.quickBadgeText}>Free User</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0F2942',
    letterSpacing: -1,
  },
  subLogoText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  toggleBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleBtnText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 6,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    fontWeight: '600',
  },
  quickAccessBlock: {
    marginTop: 40,
    alignItems: 'center',
  },
  quickAccessTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickBadge: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  quickBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
