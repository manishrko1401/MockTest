import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { BarChart3, CloudUpload, Download, Keyboard, Play, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useTheme } from '../theme';
import { Button, Card, confirm, Empty, Header, Pill } from '../ui';
import { deleteOffline, downloadOffline, OfflineKind, offlineSupported, syncOutbox, useOfflineIndex } from '../offline';
import { friendlyError } from '../api';

// "My offline tests": tests downloaded to this phone, results waiting to upload.
export default function OfflineScreen() {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const { items, pending } = useOfflineIndex();
  const [syncing, setSyncing] = useState(false);
  const [note, setNote] = useState('');
  const L = (en: string, h: string) => (hi ? h : en);
  const fmt = (ms: number) => new Date(ms).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' });
  const mb = items.reduce((a, x) => a + (x.sizeBytes || 0), 0) / 1048576;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={L('My offline tests', 'मेरे ऑफ़लाइन टेस्ट')} subtitle={`${items.length} · ${mb.toFixed(1)} MB`} onBack={nav.pop} />
      <FlatList
        data={[...items].sort((a, b) => b.downloadedAt - a.downloadedAt)}
        keyExtractor={x => `${x.kind}:${x.id}`}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 30 }}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <CloudUpload size={22} color={pending ? t.warning : t.success} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: '700' }}>{L('Results waiting to upload', 'अपलोड के लिए प्रतीक्षित परिणाम')}: {pending}</Text>
                <Text style={{ color: t.textSoft, fontSize: 12 }}>{pending ? L('They upload by themselves when you are online.', 'इंटरनेट आने पर अपने आप अपलोड होंगे।') : L('Everything is uploaded.', 'सब अपलोड हो गया।')}</Text>
              </View>
              {pending ? <Button small title={L('Upload', 'अपलोड')} loading={syncing} onPress={async () => { setSyncing(true); const r = await syncOutbox(); setSyncing(false); setNote(r.remaining ? L('No internet. Will try again.', 'इंटरनेट नहीं। फिर कोशिश होगी।') : L('Uploaded.', 'अपलोड हो गया।')); }} /> : null}
            </Card>
            {note ? <Text style={{ color: t.textSoft }}>{note}</Text> : null}
            <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: t.cardAlt }}>
              <ShieldCheck size={20} color={t.success} />
              <Text style={{ color: t.textSoft, flex: 1, fontSize: 12 }}>{L('Downloads are encrypted for this phone and open only in this app. They stay for 30 days.', 'डाउनलोड इस फ़ोन के लिए एन्क्रिप्टेड हैं और केवल इसी ऐप में खुलते हैं। ये 30 दिन रहते हैं।')}</Text>
            </Card>
          </View>
        }
        ListEmptyComponent={<Empty title={L('No downloads yet', 'अभी कोई डाउनलोड नहीं')} text={L('Open any mock or typing test and press "Download for offline".', 'किसी भी मॉक या टाइपिंग टेस्ट में "ऑफ़लाइन के लिए डाउनलोड" दबाएं।')} icon={<Download size={40} color={t.textMuted} />} />}
        renderItem={({ item: x }) => (
          <Card>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              <Pill text={x.kind === 'mock' ? L('Mock test', 'मॉक टेस्ट') : L('Typing', 'टाइपिंग')} tone={x.kind === 'mock' ? 'primary' : 'neutral'} />
              {x.expired ? <Pill text={L('Expired', 'समाप्त')} tone="danger" /> : null}
            </View>
            <Text style={{ color: t.text, fontWeight: '700' }}>{x.title}</Text>
            <Text style={{ color: t.textSoft, fontSize: 12 }}>{[x.subtitle, x.expired ? L('Download again when online', 'इंटरनेट पर फिर डाउनलोड करें') : `${L('Available until', 'उपलब्ध')} ${fmt(x.expiresAt)}`].filter(Boolean).join(' · ')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {!x.expired ? <Button style={{ flex: 1 }} small title={L('Start', 'शुरू करें')} icon={x.kind === 'mock' ? <Play size={16} color={t.primaryText} /> : <Keyboard size={16} color={t.primaryText} />}
                onPress={() => nav.push(x.kind === 'typing' ? { name: 'typingRun', testId: x.id, offline: true } : x.isCbat ? { name: 'cbatRun', testId: x.id, offline: true } : { name: 'examRun', testId: x.id, offline: true, resume: true })} /> : null}
              {!x.expired && x.kind === 'mock' ? <Button style={{ flex: 1 }} small outline title={L('Analysis', 'विश्लेषण')} icon={<BarChart3 size={16} color={t.primary} />} onPress={() => nav.push({ name: 'analysis', testId: x.id, offline: true })} /> : null}
              <Button small outline tone="danger" title="" icon={<Trash2 size={16} color={t.danger} />} style={{ width: 46 }}
                onPress={() => confirm(L('Remove download?', 'डाउनलोड हटाएं?'), x.title, L('Remove', 'हटाएं'), () => deleteOffline(x.kind, x.id))} />
            </View>
          </Card>
        )}
      />
    </View>
  );
}

/** "Download for offline" on a test page. */
export function DownloadButton({ kind, id }: { kind: OfflineKind; id: string }) {
  const t = useTheme();
  const { hi } = useI18n();
  const nav = useNav();
  const { items } = useOfflineIndex();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!offlineSupported) return null;
  const saved = items.find(x => x.kind === kind && x.id === id && !x.expired);
  return (
    <View>
      {saved ? (
        <Button outline tone="success" title={hi ? '✓ इस फ़ोन पर डाउनलोड है' : '✓ Downloaded to this phone'} onPress={() => nav.push({ name: 'offline' })} />
      ) : (
        <Button outline title={hi ? 'ऑफ़लाइन के लिए डाउनलोड करें' : 'Download for offline'} loading={busy} icon={<Download size={18} color={t.primary} />}
          onPress={async () => { setBusy(true); setError(''); try { await downloadOffline(kind, id); } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); } }} />
      )}
      {error ? <Text style={{ color: t.danger, marginTop: 6 }}>{error}</Text> : null}
    </View>
  );
}
