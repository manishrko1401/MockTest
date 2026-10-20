import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { request, friendlyError, getServer, setServer, DEFAULT_SERVER } from '../api';
import { useI18n } from '../i18n';
import { useSession } from '../session';
import { useTheme } from '../theme';
import { Button, Field } from '../ui';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'signin' | 'signup' | 'forgot';

export default function AuthScreen() {
  const t = useTheme();
  const { t: tr, lang, setLang } = useI18n();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, googleSignIn } = useSession();
  const [mode, setMode] = useState<Mode>('signin');
  const [f, setF] = useState({ name: '', email: '', mobile: '', password: '', referral: '', otp: '', newPassword: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showServer, setShowServer] = useState(getServer() !== DEFAULT_SERVER);
  const [server, setServerText] = useState(getServer());
  const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));

  const extra = (Constants.expoConfig?.extra || {}) as any;
  const [, googleResponse, promptGoogle] = Google.useAuthRequest({ androidClientId: extra.googleAndroidClientId, webClientId: extra.googleWebClientId });

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const accessToken = googleResponse.authentication?.accessToken;
    if (!accessToken) return;
    (async () => {
      setBusy('google'); setError('');
      try {
        const profile = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.json()).catch(() => ({}));
        await googleSignIn(accessToken, profile?.name, profile?.picture);
      } catch (e: any) { setError(friendlyError(e)); } finally { setBusy(''); }
    })();
  }, [googleResponse, googleSignIn]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError(''); setInfo('');
    try { await setServer(server.trim() || DEFAULT_SERVER); await fn(); } catch (e: any) { setError(friendlyError(e)); } finally { setBusy(''); }
  };

  const submit = () => {
    if (mode === 'signin') return run('main', () => signIn(f.email, f.password));
    if (mode === 'signup') {
      if (f.name.trim().length < 2) { setError('Please enter your full name.'); return; }
      if (!/^\d{10}$/.test(f.mobile.trim())) { setError('Please enter a 10-digit mobile number.'); return; }
      if (f.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      return run('main', () => signUp({ name: f.name, email: f.email, mobile: f.mobile, password: f.password, referralCode: f.referral }));
    }
    if (!otpSent) {
      return run('main', async () => {
        await request('request-password-reset', { email: f.email.trim().toLowerCase() });
        setOtpSent(true);
        setInfo('We have emailed you a 6-digit code.');
      });
    }
    return run('main', async () => {
      if (f.newPassword.length < 6) throw new Error('Password must be at least 6 characters.');
      await request('confirm-password-reset', { email: f.email.trim().toLowerCase(), otp: f.otp.trim(), newPassword: f.newPassword });
      setMode('signin'); setOtpSent(false); setF(s => ({ ...s, password: '', otp: '', newPassword: '' }));
      setInfo('Password changed. Please sign in with your new password.');
    });
  };

  const switchMode = (m: Mode) => { setMode(m); setError(''); setInfo(''); setOtpSent(false); };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.header }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 22, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => setLang(lang === 'hi' ? 'en' : 'hi')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{lang === 'hi' ? 'English' : 'हिन्दी'}</Text>
          </Pressable>
        </View>
        {/* Long-press the logo: point the app at a test server (development) */}
        <Pressable onLongPress={() => setShowServer(s => !s)} style={{ alignItems: 'center', marginVertical: 20 }}>
          <Image source={require('../../assets/icon.png')} style={{ width: 80, height: 80, borderRadius: 20 }} />
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 12 }}>MockTest Hub</Text>
          <Text style={{ color: '#fff', opacity: 0.8, marginTop: 4 }}>{lang === 'hi' ? 'सरकारी परीक्षाओं की तैयारी' : 'Prepare for government exams'}</Text>
        </Pressable>

        <View style={{ backgroundColor: t.card, borderRadius: 18, padding: 18 }}>
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', marginBottom: 14 }}>
            {mode === 'signin' ? tr('Sign in') : mode === 'signup' ? tr('Create account') : tr('Reset password')}
          </Text>
          {mode === 'signup' ? <Field label={tr('Full name')} value={f.name} onChangeText={set('name')} autoComplete="name" /> : null}
          <Field label={tr('Email')} value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!(mode === 'forgot' && otpSent)} />
          {mode === 'signup' ? <Field label={tr('Mobile number')} value={f.mobile} onChangeText={set('mobile')} keyboardType="phone-pad" maxLength={10} /> : null}
          {mode !== 'forgot' ? <Field label={tr('Password')} value={f.password} onChangeText={set('password')} secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'password'} onSubmitEditing={submit} /> : null}
          {mode === 'signup' ? <Field label={tr('Referral code (optional)')} value={f.referral} onChangeText={set('referral')} autoCapitalize="characters" /> : null}
          {mode === 'forgot' && otpSent ? (
            <>
              <Field label={tr('Code from email')} value={f.otp} onChangeText={set('otp')} keyboardType="number-pad" maxLength={6} />
              <Field label={tr('New password')} value={f.newPassword} onChangeText={set('newPassword')} secureTextEntry autoComplete="new-password" />
            </>
          ) : null}
          {showServer ? <Field label="Server (testing)" value={server} onChangeText={setServerText} autoCapitalize="none" keyboardType="url" /> : null}
          {error ? <Text style={{ color: t.danger, marginBottom: 12, fontWeight: '600' }}>{error}</Text> : null}
          {info ? <Text style={{ color: t.success, marginBottom: 12, fontWeight: '600' }}>{info}</Text> : null}
          <Button
            title={mode === 'signin' ? tr('Sign in') : mode === 'signup' ? tr('Create account') : otpSent ? tr('Reset password') : tr('Send code')}
            onPress={submit} loading={busy === 'main'} disabled={!f.email || (mode !== 'forgot' && !f.password)} />

          {mode === 'signin' ? (
            <Pressable onPress={() => switchMode('forgot')} style={{ alignSelf: 'flex-end', marginTop: 12 }}>
              <Text style={{ color: t.primary, fontWeight: '700' }}>{tr('Forgot password?')}</Text>
            </Pressable>
          ) : null}

          {mode !== 'forgot' && Platform.OS === 'android' ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                <Text style={{ color: t.textMuted }}>{tr('or')}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
              </View>
              <Button outline title={tr('Continue with Google')} loading={busy === 'google'} onPress={() => { setError(''); promptGoogle(); }}
                icon={<Text style={{ fontSize: 18, fontWeight: '800', color: '#4285F4' }}>G</Text>} />
            </>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 18, gap: 6 }}>
            {mode === 'signin' ? (
              <>
                <Text style={{ color: t.textSoft }}>{tr('New here?')}</Text>
                <Pressable onPress={() => switchMode('signup')}><Text style={{ color: t.primary, fontWeight: '800' }}>{tr('Create account')}</Text></Pressable>
              </>
            ) : mode === 'signup' ? (
              <>
                <Text style={{ color: t.textSoft }}>{tr('Already have an account?')}</Text>
                <Pressable onPress={() => switchMode('signin')}><Text style={{ color: t.primary, fontWeight: '800' }}>{tr('Sign in')}</Text></Pressable>
              </>
            ) : (
              <Pressable onPress={() => switchMode('signin')}><Text style={{ color: t.primary, fontWeight: '800' }}>{tr('Back to sign in')}</Text></Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
