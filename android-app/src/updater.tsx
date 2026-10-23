import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Modal, Platform, ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Download, Sparkles } from 'lucide-react-native';
import { getServer } from './api';
import { useI18n } from './i18n';
import { useTheme } from './theme';
import { Button, ProgressBar } from './ui';

// -----------------------------------------------------------------------------
// App updates (the app is installed from the website, not Google Play). On opening, and when
// the app comes back after a few hours, it reads the website's downloads/android.json; if a
// newer version is out it offers it: download inside the app (with progress, size checked),
// then Android's installer opens and the student taps Install. Login and data stay (same
// signing key). Versions below minVersionCode must update (no "Later").
// "Later" skips that version for a day.
// -----------------------------------------------------------------------------

type Latest = { version: string; versionCode: number; size: number; notes?: string; minVersionCode?: number };

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
const LATER_KEY = 'mth_update_later';
const myCode = Number((Constants.expoConfig?.android as any)?.versionCode) || 0;

type Phase = { kind: 'offer' } | { kind: 'downloading'; done: number } | { kind: 'install'; uri: string } | { kind: 'error'; message: string };

export function UpdatePrompt() {
  const t = useTheme();
  const { hi } = useI18n();
  const [latest, setLatest] = useState<Latest | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'offer' });
  const lastCheck = useRef(0);
  const required = !!latest && myCode < (latest.minVersionCode || 0);

  const check = useCallback(async () => {
    if (Platform.OS !== 'android' || !myCode) return;
    lastCheck.current = Date.now();
    try {
      const res = await fetch(`${getServer()}/downloads/android.json?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) return;
      const info: Latest = await res.json();
      if (!info?.versionCode || info.versionCode <= myCode) { setLatest(null); return; }
      const mustUpdate = myCode < (info.minVersionCode || 0);
      if (!mustUpdate) {
        const later = JSON.parse((await AsyncStorage.getItem(LATER_KEY)) || 'null');
        if (later?.versionCode === info.versionCode && later.until > Date.now()) return;
      }
      setLatest(info);
      setPhase(p => (p.kind === 'downloading' ? p : { kind: 'offer' }));
    } catch { /* offline: try next time */ }
  }, []);

  useEffect(() => {
    const first = setTimeout(check, 2500); // after the first screen has drawn
    const sub = AppState.addEventListener('change', s => { if (s === 'active' && Date.now() - lastCheck.current > CHECK_EVERY_MS) check(); });
    return () => { clearTimeout(first); sub.remove(); };
  }, [check]);

  // A required update can't be closed with the back button
  useEffect(() => {
    if (!latest || !required) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [latest, required]);

  const openInstaller = async (uri: string) => {
    try {
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri, type: 'application/vnd.android.package-archive', flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      });
      setPhase({ kind: 'install', uri }); // back from the installer (cancelled or done): offer it again
    } catch {
      setPhase({ kind: 'error', message: hi ? 'इंस्टॉलर नहीं खुल सका। फिर से कोशिश करें।' : 'The installer could not open. Please try again.' });
    }
  };

  const download = async () => {
    if (!latest) return;
    const dir = FileSystem.cacheDirectory;
    if (!dir) return;
    const uri = `${dir}MockTestHub_${latest.version}.apk`;
    // Already downloaded (e.g. the installer was closed): don't download it again
    const existing = await FileSystem.getInfoAsync(uri).catch(() => null);
    if (existing?.exists && (!latest.size || (existing as any).size === latest.size)) { openInstaller(uri); return; }
    setPhase({ kind: 'downloading', done: 0 });
    try {
      const task = FileSystem.createDownloadResumable(`${getServer()}/api/download/android`, uri, {}, p => {
        const total = p.totalBytesExpectedToWrite > 0 ? p.totalBytesExpectedToWrite : latest.size;
        if (total) setPhase({ kind: 'downloading', done: Math.min(1, p.totalBytesWritten / total) });
      });
      const res = await task.downloadAsync();
      const info = res ? await FileSystem.getInfoAsync(res.uri) : null;
      if (!res || res.status !== 200 || !info?.exists || (latest.size && (info as any).size !== latest.size)) {
        await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        throw new Error('incomplete');
      }
      openInstaller(res.uri);
    } catch {
      setPhase({ kind: 'error', message: hi ? 'डाउनलोड पूरा नहीं हुआ। इंटरनेट देखकर फिर कोशिश करें।' : 'The download did not finish. Check the internet and try again.' });
    }
  };

  const later = async () => {
    if (!latest) return;
    await AsyncStorage.setItem(LATER_KEY, JSON.stringify({ versionCode: latest.versionCode, until: Date.now() + 24 * 60 * 60 * 1000 })).catch(() => {});
    setLatest(null);
  };

  if (!latest) return null;
  const mb = latest.size ? `${(latest.size / 1048576).toFixed(0)} MB` : '';
  const notes = (latest.notes || '').split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  const busy = phase.kind === 'downloading';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!required && !busy) later(); }}>
      <View style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: t.card, borderRadius: 20, padding: 22, maxHeight: '86%' }}>
          <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
            <Sparkles size={30} color={t.primary} />
          </View>
          <Text style={{ color: t.text, fontSize: 21, fontWeight: '900', textAlign: 'center', marginTop: 12 }}>
            {required ? (hi ? 'अपडेट ज़रूरी है' : 'Update required') : (hi ? 'नया अपडेट उपलब्ध' : 'Update available')}
          </Text>
          <Text style={{ color: t.textSoft, textAlign: 'center', marginTop: 4 }}>
            Mock Test Hub {latest.version}{mb ? ` · ${mb}` : ''}
          </Text>
          {required ? (
            <Text style={{ color: t.textSoft, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              {hi ? 'ऐप इस्तेमाल करते रहने के लिए यह अपडेट इंस्टॉल करें।' : 'Please install this update to keep using the app.'}
            </Text>
          ) : null}
          {notes.length ? (
            <ScrollView style={{ marginTop: 14, backgroundColor: t.cardAlt, borderRadius: 14, maxHeight: 180 }} contentContainerStyle={{ padding: 14, gap: 6 }}>
              <Text style={{ color: t.text, fontWeight: '800' }}>{hi ? 'नया क्या है' : "What's new"}</Text>
              {notes.map((n, i) => <Text key={i} style={{ color: t.textSoft, lineHeight: 20 }}>•  {n}</Text>)}
            </ScrollView>
          ) : null}

          {phase.kind === 'downloading' ? (
            <View style={{ marginTop: 18 }}>
              <ProgressBar value={phase.done} />
              <Text style={{ color: t.textSoft, textAlign: 'center', marginTop: 8 }}>{hi ? 'डाउनलोड हो रहा है' : 'Downloading'} · {Math.round(phase.done * 100)}%</Text>
            </View>
          ) : (
            <>
              {phase.kind === 'error' ? <Text style={{ color: t.danger, textAlign: 'center', marginTop: 14 }}>{phase.message}</Text> : null}
              {phase.kind === 'install' ? (
                <Text style={{ color: t.textSoft, textAlign: 'center', marginTop: 14, lineHeight: 20 }}>
                  {hi ? 'अगर फ़ोन पूछे तो "इस स्रोत से अनुमति दें" चालू करें, फिर "इंस्टॉल" दबाएं।' : 'If your phone asks, allow installs from Mock Test Hub, then tap Install.'}
                </Text>
              ) : null}
              <Button style={{ marginTop: 18 }} title={phase.kind === 'install' ? (hi ? 'इंस्टॉल करें' : 'Install') : (hi ? 'अभी अपडेट करें' : 'Update now')}
                icon={<Download size={18} color={t.primaryText} />} onPress={phase.kind === 'install' ? () => openInstaller(phase.uri) : download} />
              {!required ? <Button style={{ marginTop: 8 }} outline title={hi ? 'बाद में' : 'Later'} onPress={later} /> : null}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
