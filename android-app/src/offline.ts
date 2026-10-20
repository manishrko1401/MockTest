import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { request } from './api';
import { Envelope, fromBase64, openEnvelope, publicKeyOf, toBase64 } from './offlineCrypto';

// -----------------------------------------------------------------------------
// Offline tests. This phone has its own key pair (the private key in Android's secure
// storage). The server encrypts each download for this phone's public key; the package is
// saved exactly as received and only opened in memory. Downloads expire after 30 days (moving
// the phone's clock back doesn't extend that). Results made offline wait in a queue and are
// uploaded when the internet is back; the server re-scores mock tests with its own key.
// -----------------------------------------------------------------------------

export type OfflineKind = 'mock' | 'typing';
export type OfflineItem = { kind: OfflineKind; id: string; title: string; subtitle?: string; questions?: number | null; isCbat?: boolean; expiresAt: number; downloadedAt: number; sizeBytes: number };

const KEY_PRIVATE = 'mth_device_key';
const INDEX = 'mth_offline_index';
const CLOCK = 'mth_offline_clock';
const OUTBOX = 'mth_outbox';
const attemptsKey = (kind: OfflineKind, id: string) => `mth_offline_attempts:${kind}:${id}`;
export const offlineSupported = Platform.OS !== 'web';

const listeners = new Set<() => void>();
const announce = () => listeners.forEach(fn => fn());

function dir() {
  const d = new Directory(Paths.document, 'offline');
  if (!d.exists) d.create();
  return d;
}
const pkgFile = (kind: OfflineKind, id: string) => new File(dir(), `${kind}-${id.replace(/[^A-Za-z0-9_-]/g, '_')}.pkg`);

async function privateKey(): Promise<Uint8Array> {
  const saved = await SecureStore.getItemAsync(KEY_PRIVATE);
  if (saved) return fromBase64(saved);
  const fresh = ExpoCrypto.getRandomBytes(32);
  await SecureStore.setItemAsync(KEY_PRIVATE, toBase64(fresh));
  return fresh;
}

/** Now, never earlier than the latest time seen (so a clock moved back can't extend downloads). */
async function trustedNow() {
  const seen = Number(await AsyncStorage.getItem(CLOCK)) || 0;
  const now = Math.max(Date.now(), seen);
  if (now > seen) AsyncStorage.setItem(CLOCK, String(now)).catch(() => {});
  return now;
}

export async function listOffline(): Promise<(OfflineItem & { expired: boolean })[]> {
  if (!offlineSupported) return [];
  const items: OfflineItem[] = JSON.parse((await AsyncStorage.getItem(INDEX)) || '[]');
  const now = await trustedNow();
  return items.map(it => ({ ...it, expired: now > it.expiresAt }));
}

export async function downloadOffline(kind: OfflineKind, id: string) {
  const pub = toBase64(publicKeyOf(await privateKey()));
  const res = await request<{ meta: any; envelope: string }>('offline-download', { kind, id, devicePublicKey: pub }, { timeoutMs: 120000 });
  const payload = openEnvelope(JSON.parse(res.envelope), await privateKey()); // opens on this phone
  if (payload.kind !== kind || payload.id !== id) throw new Error("Downloaded data doesn't match the test");
  const f = pkgFile(kind, id);
  if (!f.exists) f.create();
  f.write(res.envelope);
  const items: OfflineItem[] = JSON.parse((await AsyncStorage.getItem(INDEX)) || '[]');
  const next = items.filter(x => !(x.kind === kind && x.id === id));
  next.push({ kind, id, title: res.meta?.title || payload.title, subtitle: res.meta?.subtitle, questions: res.meta?.questions ?? null, isCbat: !!payload.data?.isCbat, expiresAt: payload.expiresAt, downloadedAt: Date.now(), sizeBytes: res.envelope.length });
  await AsyncStorage.setItem(INDEX, JSON.stringify(next));
  announce();
}

export async function openOffline(kind: OfflineKind, id: string): Promise<any> {
  const f = pkgFile(kind, id);
  if (!f.exists) throw new Error('This test is not downloaded.');
  const payload = openEnvelope(JSON.parse(await f.text()) as Envelope, await privateKey());
  if (payload.expiresAt && (await trustedNow()) > payload.expiresAt) throw new Error('EXPIRED');
  return payload;
}

export async function deleteOffline(kind: OfflineKind, id: string) {
  const f = pkgFile(kind, id);
  if (f.exists) f.delete();
  const items: OfflineItem[] = JSON.parse((await AsyncStorage.getItem(INDEX)) || '[]');
  await AsyncStorage.setItem(INDEX, JSON.stringify(items.filter(x => !(x.kind === kind && x.id === id))));
  await AsyncStorage.removeItem(attemptsKey(kind, id));
  announce();
}

/** An attempt finished offline: kept for the offline analysis and queued for upload. */
export async function saveOfflineAttempt(kind: OfflineKind, id: string, attempt: Record<string, any>) {
  const list = JSON.parse((await AsyncStorage.getItem(attemptsKey(kind, id))) || '[]');
  await AsyncStorage.setItem(attemptsKey(kind, id), JSON.stringify([attempt, ...list].slice(0, 10)));
  const outbox = JSON.parse((await AsyncStorage.getItem(OUTBOX)) || '[]');
  outbox.push({ kind, testId: id, attempt, queuedAt: Date.now() });
  await AsyncStorage.setItem(OUTBOX, JSON.stringify(outbox));
  announce();
}

export async function offlineAttempts(kind: OfflineKind, id: string): Promise<any[]> {
  return JSON.parse((await AsyncStorage.getItem(attemptsKey(kind, id))) || '[]');
}

export async function pendingUploads(): Promise<number> {
  return JSON.parse((await AsyncStorage.getItem(OUTBOX)) || '[]').length;
}

let syncing = false;
/** Uploads results made offline (mock tests are re-scored by the server). */
export async function syncOutbox(): Promise<{ uploaded: number; remaining: number }> {
  if (syncing || !offlineSupported) return { uploaded: 0, remaining: await pendingUploads() };
  syncing = true;
  let uploaded = 0;
  try {
    const outbox: any[] = JSON.parse((await AsyncStorage.getItem(OUTBOX)) || '[]');
    const keep: any[] = [];
    for (let i = 0; i < outbox.length; i++) {
      const item = outbox[i];
      try {
        await request(item.kind === 'mock' ? 'add-attempt' : 'save-typing-attempt', { ...item.attempt, source: 'app' });
        uploaded++;
      } catch (e: any) {
        // Permanently refused (e.g. test deleted): drop; offline / server busy: try later
        if (e?.status >= 400 && e?.status < 500 && e?.status !== 401 && e?.status !== 429) continue;
        keep.push(...outbox.slice(i));
        break;
      }
    }
    await AsyncStorage.setItem(OUTBOX, JSON.stringify(keep));
    if (uploaded) announce();
    return { uploaded, remaining: keep.length };
  } finally {
    syncing = false;
  }
}

/** Downloads on this phone, kept up to date. */
export function useOfflineIndex() {
  const [items, setItems] = useState<(OfflineItem & { expired: boolean })[]>([]);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    const load = () => { listOffline().then(setItems); pendingUploads().then(setPending); };
    load();
    listeners.add(load);
    return () => { listeners.delete(load); };
  }, []);
  return { items, pending };
}

export const newLocalId = () => `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
