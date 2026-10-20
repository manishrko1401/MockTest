import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Google from 'expo-auth-session/providers/google';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { Camera, FileText, FolderUp, ImageIcon, Lock, LogOut, Plus, ShieldCheck, X } from 'lucide-react-native';
import { request, friendlyError } from '../api';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useSession, useUser } from '../session';
import { useTheme } from '../theme';
import { Button, Card, confirm, Empty, ErrorBox, Field, Header, HeaderButton, ListRow, Loading, Segmented } from '../ui';
import {
  GOOGLE_DRIVE_SCOPE, clearGoogleDriveSession, deleteFileFromGoogleDrive, getOrCreateLockerRootFolder, getOrCreateLockerSubFolder,
  getSavedGoogleDriveSession, saveGoogleDriveSession, uploadNativeFileToGoogleDrive,
} from '../googleDrive';

// -----------------------------------------------------------------------------
// Document Locker: the student's documents (admit cards, photos, certificates…) kept in their
// own Google Drive, listed here behind a PIN. Same data as the website's locker.
// -----------------------------------------------------------------------------

const TYPES = [
  { key: 'ADMIT_CARD', en: 'Admit card', hi: 'एडमिट कार्ड' },
  { key: 'APPLICATION_FORM', en: 'Application form', hi: 'आवेदन पत्र' },
  { key: 'PHOTO', en: 'Photo', hi: 'फोटो' },
  { key: 'SIGNATURE', en: 'Signature', hi: 'हस्ताक्षर' },
  { key: 'CERTIFICATE', en: 'Certificate', hi: 'प्रमाण पत्र' },
  { key: 'ID_PROOF', en: 'ID proof', hi: 'पहचान पत्र' },
] as const;

let unlockedUntil = 0; // stays unlocked for a few minutes after the PIN

export default function LockerScreen() {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const user = useUser();
  const { refreshUser } = useSession();
  const L = (en: string, h: string) => (hi ? h : en);
  const hasPin = !!user.lockerPin;
  const [unlocked, setUnlocked] = useState(Date.now() < unlockedUntil);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [reset, setReset] = useState<'off' | 'sent'>('off');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [docs, setDocs] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [drive, setDrive] = useState<{ accessToken: string | null; email: string | null }>({ accessToken: null, email: null });
  const [upload, setUpload] = useState<{ uri: string; name: string; mime: string; size: number } | null>(null);

  const extra = (Constants.expoConfig?.extra || {}) as any;
  const [, googleRes, promptGoogle] = Google.useAuthRequest({
    androidClientId: extra.googleAndroidClientId, webClientId: extra.googleWebClientId,
    scopes: ['openid', 'email', 'profile', GOOGLE_DRIVE_SCOPE],
  });

  const loadDocs = useCallback(async () => {
    try { const r = await request('locker-get-docs', { userId: user.id }); setDocs(r.documents || []); setError(''); }
    catch (e) { setError(friendlyError(e)); }
  }, [user.id]);

  useEffect(() => { getSavedGoogleDriveSession().then(setDrive); }, []);
  useEffect(() => { if (unlocked) loadDocs(); }, [unlocked, loadDocs]);

  // Google Drive connected
  useEffect(() => {
    if (googleRes?.type !== 'success') return;
    const token = googleRes.authentication?.accessToken;
    if (!token) return;
    (async () => {
      setBusy('drive');
      try {
        const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
        const folderId = await getOrCreateLockerRootFolder(token);
        await saveGoogleDriveSession(token, info.email);
        await request('locker-update-drive-status', { userId: user.id, isConnected: true, googleDriveEmail: info.email, googleDriveFolderId: folderId });
        setDrive({ accessToken: token, email: info.email });
        refreshUser();
      } catch (e) { setError(friendlyError(e)); } finally { setBusy(''); }
    })();
  }, [googleRes]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError('');
    try { await fn(); } catch (e) { setError(friendlyError(e)); } finally { setBusy(''); }
  };
  const unlock = () => { unlockedUntil = Date.now() + 5 * 60 * 1000; setUnlocked(true); setPin(''); setPin2(''); };

  // ---- PIN screen ----
  if (!unlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Header title={L('Document Locker', 'डॉक्यूमेंट लॉकर')} onBack={nav.pop} />
        <View style={{ padding: 20 }}>
          <Card style={{ alignItems: 'center' }}>
            <Lock size={34} color={t.primary} />
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '800', marginTop: 8 }}>
              {!hasPin ? L('Set a locker PIN', 'लॉकर PIN बनाएं') : reset === 'sent' ? L('Reset your PIN', 'PIN रीसेट करें') : L('Enter your PIN', 'अपना PIN डालें')}
            </Text>
            <Text style={{ color: t.textSoft, textAlign: 'center', marginTop: 4 }}>{L('Your documents stay in your own Google Drive.', 'आपके दस्तावेज़ आपके अपने Google Drive में रहते हैं।')}</Text>
          </Card>
          {error ? <ErrorBox message={error} /> : null}
          <View style={{ marginTop: 14 }}>
            {reset === 'sent' ? <Field label={L('Code from email', 'ईमेल वाला कोड')} value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} /> : null}
            <Field label={!hasPin || reset === 'sent' ? L('New PIN (4–6 digits)', 'नया PIN (4–6 अंक)') : 'PIN'} value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} />
            {!hasPin || reset === 'sent' ? <Field label={L('Confirm PIN', 'PIN दोबारा')} value={pin2} onChangeText={setPin2} keyboardType="number-pad" secureTextEntry maxLength={6} /> : null}
            <Button title={!hasPin ? L('Set PIN', 'PIN बनाएं') : reset === 'sent' ? L('Reset PIN', 'PIN रीसेट करें') : L('Unlock', 'खोलें')} loading={busy === 'pin'}
              disabled={pin.length < 4}
              onPress={() => run('pin', async () => {
                if ((!hasPin || reset === 'sent') && pin !== pin2) throw new Error(L("PINs don't match.", 'PIN मेल नहीं खाते।'));
                if (!hasPin) { await request('locker-set-pin', { userId: user.id, pin }); await refreshUser(); unlock(); return; }
                if (reset === 'sent') { await request('locker-verify-otp-and-reset-pin', { userId: user.id, otp, newPin: pin }); setReset('off'); unlock(); return; }
                await request('locker-verify-pin', { userId: user.id, pin }); unlock();
              })} />
            {hasPin && reset === 'off' ? (
              <Pressable onPress={() => run('otp', async () => { await request('locker-send-reset-otp', { userId: user.id }); setReset('sent'); })} style={{ alignSelf: 'center', marginTop: 14 }}>
                <Text style={{ color: t.primary, fontWeight: '700' }}>{busy === 'otp' ? '…' : L('Forgot PIN?', 'PIN भूल गए?')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  // ---- Upload ----
  const pickFile = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    setUpload({ uri: a.uri, name: a.name, mime: a.mimeType || 'application/octet-stream', size: a.size || 0 });
  };
  const pickImage = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = camera ? await ImagePicker.launchCameraAsync({ quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    setUpload({ uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, mime: a.mimeType || 'image/jpeg', size: a.fileSize || 0 });
  };

  const list = (docs || []).filter(d => filter === 'all' || d.docType === filter);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={L('Document Locker', 'डॉक्यूमेंट लॉकर')} subtitle={drive.email || undefined} onBack={nav.pop}
        right={drive.accessToken ? <HeaderButton label="Add document" icon={<Plus size={24} color={t.headerText} />} onPress={pickFile} /> : undefined} />
      {error ? <ErrorBox message={error} /> : null}
      {!drive.accessToken ? (
        <View style={{ padding: 16 }}>
          <Card style={{ alignItems: 'center' }}>
            <ShieldCheck size={34} color={t.primary} />
            <Text style={{ color: t.text, fontSize: 17, fontWeight: '800', marginTop: 8, textAlign: 'center' }}>{L('Connect Google Drive', 'Google Drive जोड़ें')}</Text>
            <Text style={{ color: t.textSoft, textAlign: 'center', marginTop: 4 }}>{L('Documents are saved in a "MockTest Hub Locker" folder in your own Drive. The app can only see files it saved.', 'दस्तावेज़ आपके अपने Drive के "MockTest Hub Locker" फ़ोल्डर में सेव होते हैं। ऐप केवल अपनी सेव की गई फ़ाइलें देख सकता है।')}</Text>
            <Button style={{ marginTop: 14, alignSelf: 'stretch' }} title={L('Connect Google Drive', 'Google Drive जोड़ें')} loading={busy === 'drive'} onPress={() => promptGoogle()} />
          </Card>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 }}>
            <Button style={{ flex: 1 }} small outline title={L('File', 'फ़ाइल')} icon={<FolderUp size={16} color={t.primary} />} onPress={pickFile} />
            <Button style={{ flex: 1 }} small outline title={L('Gallery', 'गैलरी')} icon={<ImageIcon size={16} color={t.primary} />} onPress={() => pickImage(false)} />
            <Button style={{ flex: 1 }} small outline title={L('Camera', 'कैमरा')} icon={<Camera size={16} color={t.primary} />} onPress={() => pickImage(true)} />
          </View>
          <Segmented options={[{ key: 'all', label: L('All', 'सभी') }, ...TYPES.map(x => ({ key: x.key, label: hi ? x.hi : x.en }))]} value={filter} onChange={setFilter} />
          {docs === null ? <Loading /> : (
            <FlatList
              data={list}
              keyExtractor={d => d.id}
              ListEmptyComponent={<Empty title={L('No documents yet', 'अभी कोई दस्तावेज़ नहीं')} text={L('Add admit cards, photos, signatures and certificates.', 'एडमिट कार्ड, फोटो, हस्ताक्षर और प्रमाण पत्र जोड़ें।')} />}
              ListFooterComponent={
                <Pressable onPress={() => confirm(L('Disconnect Google Drive?', 'Google Drive हटाएं?'), L('Your files stay in your Drive.', 'आपकी फ़ाइलें Drive में रहेंगी।'), L('Disconnect', 'हटाएं'), async () => {
                  await request('locker-disconnect-drive', { userId: user.id }).catch(() => {}); await clearGoogleDriveSession(); setDrive({ accessToken: null, email: null }); refreshUser();
                })} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'center', padding: 16 }}>
                  <LogOut size={14} color={t.textMuted} /><Text style={{ color: t.textMuted }}>{L('Disconnect Google Drive', 'Google Drive हटाएं')}</Text>
                </Pressable>
              }
              renderItem={({ item: d }) => (
                <Pressable onLongPress={() => confirm(L('Delete document?', 'दस्तावेज़ हटाएं?'), d.title, L('Delete', 'हटाएं'), async () => {
                  if (drive.accessToken && d.driveFileId) await deleteFileFromGoogleDrive(drive.accessToken, d.driveFileId).catch(() => false);
                  await request('locker-delete-doc', { docId: d.id, userId: user.id }).catch(() => {});
                  loadDocs();
                })}>
                  <ListRow
                    onPress={() => d.driveViewUrl && Linking.openURL(d.driveViewUrl)}
                    left={d.thumbnailUrl ? <Image source={{ uri: d.thumbnailUrl }} style={{ width: 44, height: 44, borderRadius: 8 }} /> : <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center' }}><FileText size={20} color={t.primary} /></View>}
                    title={d.title}
                    subtitle={`${(TYPES.find(x => x.key === d.docType)?.[hi ? 'hi' : 'en']) || d.docType}${d.examName ? ` · ${d.examName}` : ''} · ${Math.max(1, Math.round((d.fileSizeBytes || 0) / 1024))} KB`}
                  />
                </Pressable>
              )}
            />
          )}
        </>
      )}
      {upload && drive.accessToken ? (
        <UploadSheet file={upload} accessToken={drive.accessToken} onClose={() => setUpload(null)}
          onDone={() => { setUpload(null); loadDocs(); }} onExpired={async () => { await clearGoogleDriveSession(); setDrive({ accessToken: null, email: null }); setUpload(null); setError(L('Google Drive sign-in expired. Please connect again.', 'Google Drive लॉग इन की अवधि समाप्त। कृपया फिर से जोड़ें।')); }} />
      ) : null}
    </View>
  );
}

function UploadSheet({ file, accessToken, onClose, onDone, onExpired }: { file: { uri: string; name: string; mime: string; size: number }; accessToken: string; onClose: () => void; onDone: () => void; onExpired: () => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const user = useUser();
  const insets = useSafeAreaInsets();
  const L = (en: string, h: string) => (hi ? h : en);
  const [title, setTitle] = useState(file.name.replace(/\.[a-z0-9]+$/i, ''));
  const [type, setType] = useState<string>(file.mime.startsWith('image/') ? 'PHOTO' : 'ADMIT_CARD');
  const [exam, setExam] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true); setError('');
    try {
      const root = await getOrCreateLockerRootFolder(accessToken);
      const folder = await getOrCreateLockerSubFolder(accessToken, root, TYPES.find(x => x.key === type)?.en || 'Documents');
      const up = await uploadNativeFileToGoogleDrive(accessToken, file.uri, file.name, file.mime, folder);
      await request('locker-save-meta', {
        userId: user.id, title: title.trim() || file.name, docType: type, examName: exam.trim() || null, driveFileId: up.id, driveFolderId: folder,
        driveViewUrl: up.webViewLink || null, thumbnailUrl: up.thumbnailLink || null, mimeType: up.mimeType || file.mime, fileSizeBytes: Number(up.size) || file.size,
      });
      onDone();
    } catch (e: any) {
      if (/401|invalid credentials|unauthenticated/i.test(String(e?.message))) onExpired();
      else setError(friendlyError(e));
    } finally { setBusy(false); }
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: t.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 20 + insets.bottom }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: t.text, fontSize: 17, fontWeight: '800', flex: 1 }}>{L('Save document', 'दस्तावेज़ सेव करें')}</Text>
            <Pressable onPress={onClose} hitSlop={10}><X size={22} color={t.text} /></Pressable>
          </View>
          {error ? <ErrorBox message={error} /> : null}
          <Field label={L('Name', 'नाम')} value={title} onChangeText={setTitle} />
          <Text style={{ color: t.textSoft, fontWeight: '600', marginBottom: 6 }}>{L('Type', 'प्रकार')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {TYPES.map(x => (
              <Pressable key={x.key} onPress={() => setType(x.key)} style={{ paddingHorizontal: 12, height: 34, borderRadius: 999, justifyContent: 'center', backgroundColor: type === x.key ? t.primary : t.card, borderWidth: 1, borderColor: type === x.key ? t.primary : t.border }}>
                <Text style={{ color: type === x.key ? t.primaryText : t.text, fontWeight: '700', fontSize: 13 }}>{hi ? x.hi : x.en}</Text>
              </Pressable>
            ))}
          </View>
          <Field label={L('Exam (optional)', 'परीक्षा (वैकल्पिक)')} value={exam} onChangeText={setExam} placeholder="SSC CGL 2026" />
          {busy ? <ActivityIndicator color={t.primary} style={{ marginBottom: 10 }} /> : null}
          <Button title={L('Upload to my Drive', 'मेरे Drive पर अपलोड करें')} loading={busy} onPress={save} />
        </View>
      </View>
    </Modal>
  );
}
