import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, Mail } from 'lucide-react-native';
import { login, getServer, setServer, DEFAULT_SERVER, StaffUser } from '../api';
import { useTheme } from '../theme';
import { Button, Field } from '../ui';

export default function LoginScreen({ onSignedIn }: { onSignedIn: (u: StaffUser) => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showServer, setShowServer] = useState(getServer() !== DEFAULT_SERVER);
  const [server, setServerText] = useState(getServer());

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await setServer(server.trim() || DEFAULT_SERVER);
      onSignedIn(await login(email.trim(), password));
    } catch (e: any) {
      setError(e?.message || 'Could not sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.header }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: insets.top + 24 }} keyboardShouldPersistTaps="handled">
        {/* Long-press the logo to point the app at another server (testing) */}
        <Pressable onLongPress={() => setShowServer(s => !s)} style={{ alignItems: 'center', marginBottom: 24 }}>
          <Image source={require('../../assets/icon.png')} style={{ width: 88, height: 88, borderRadius: 22 }} />
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 14 }}>Mock Test Hub Admin</Text>
          <Text style={{ color: '#fff', opacity: 0.75, marginTop: 4 }}>Sign in with your staff account</Text>
        </Pressable>
        <View style={{ backgroundColor: t.card, borderRadius: 16, padding: 18 }}>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="admin@example.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="••••••••" onSubmitEditing={submit} />
          {showServer ? <Field label="Server (testing)" value={server} onChangeText={setServerText} autoCapitalize="none" keyboardType="url" /> : null}
          {error ? <Text style={{ color: t.danger, marginBottom: 12, fontWeight: '600' }}>{error}</Text> : null}
          <Button title="Sign in" onPress={submit} loading={busy} disabled={!email || !password} icon={<Lock size={18} color={t.primaryText} />} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, justifyContent: 'center' }}>
            <Mail size={14} color={t.textMuted} />
            <Text style={{ color: t.textMuted, fontSize: 12 }}>Only admin and staff accounts can sign in.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
