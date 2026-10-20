import crypto from 'crypto';
import { after } from 'next/server';
import { prisma } from './prisma';

// -----------------------------------------------------------------------------
// Instant alerts for the Mock Test Hub Admin app (Android). Each signed-in admin device
// registers its Firebase Cloud Messaging token; when a student sends a support message,
// reports a question, etc., every staff device that handles that kind of message gets a
// push (shown by Android even when the app is closed).
//
// Needs FCM_SERVICE_ACCOUNT: the Firebase service-account key JSON (as is, or base64).
// Without it nothing is sent and everything else keeps working.
// -----------------------------------------------------------------------------

export type AlertType = 'support' | 'report' | 'inquiry' | 'suggestion' | 'feedback';
export const ALERT_TYPES: AlertType[] = ['support', 'report', 'inquiry', 'suggestion', 'feedback'];

/** Staff roles (besides ADMIN) that receive each kind of alert. */
const ALERT_ROLES: Record<AlertType, string[]> = {
  support: ['SUPPORT_TEAM'],
  report: ['SUPPORT_TEAM', 'TEST_CREATOR'],
  inquiry: ['SUPPORT_TEAM'],
  suggestion: ['SUPPORT_TEAM'],
  feedback: ['SUPPORT_TEAM'],
};

/** Android notification channel per alert type (created by the app; the admin can tune each in Android settings). */
const CHANNEL: Record<AlertType | 'test', string> = {
  support: 'support_chat', report: 'reported_questions', inquiry: 'inquiries', suggestion: 'suggestions', feedback: 'feedback', test: 'support_chat',
};

let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS admin_push_devices (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL UNIQUE,
          platform TEXT NOT NULL DEFAULT 'android',
          "deviceName" TEXT,
          muted TEXT[] NOT NULL DEFAULT '{}',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS admin_push_devices_user_idx ON admin_push_devices ("userId")`);
      await prisma.$executeRawUnsafe(`ALTER TABLE admin_push_devices ENABLE ROW LEVEL SECURITY`);
    })().catch(err => { tableReady = null; throw err; });
  }
  return tableReady;
}

export async function registerDevice(userId: string, token: string, deviceName: string | null, muted: string[]) {
  await ensureTable();
  const clean = muted.filter((m): m is AlertType => (ALERT_TYPES as string[]).includes(m));
  // A token belongs to one phone; if another admin signed in on it, it moves to them
  await prisma.$executeRaw`
    INSERT INTO admin_push_devices (id, "userId", token, "deviceName", muted)
    VALUES (${crypto.randomUUID()}, ${userId}, ${token}, ${deviceName}, ${clean})
    ON CONFLICT (token) DO UPDATE SET "userId" = EXCLUDED."userId", "deviceName" = EXCLUDED."deviceName", muted = EXCLUDED.muted, "lastSeenAt" = NOW()`;
}

export async function unregisterDevice(userId: string, token: string) {
  await ensureTable();
  await prisma.$executeRaw`DELETE FROM admin_push_devices WHERE token = ${token} AND "userId" = ${userId}`;
}

export const pushConfigured = () => !!serviceAccount();

// ---- FCM HTTP v1 ----------------------------------------------------------------

type ServiceAccount = { project_id: string; client_email: string; private_key: string };
let cachedAccount: ServiceAccount | null | undefined;
function serviceAccount(): ServiceAccount | null {
  if (cachedAccount !== undefined) return cachedAccount;
  const raw = process.env.FCM_SERVICE_ACCOUNT?.trim();
  cachedAccount = null;
  if (raw) {
    try {
      const json = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
      if (json.project_id && json.client_email && json.private_key) cachedAccount = json;
    } catch { console.error('FCM_SERVICE_ACCOUNT is not valid JSON'); }
  }
  return cachedAccount ?? null;
}

let accessToken: { value: string; expiresAt: number } | null = null;
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (accessToken && accessToken.expiresAt > Date.now() + 60_000) return accessToken.value;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error(`FCM auth failed: ${json.error_description || json.error || res.status}`);
  accessToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 };
  return accessToken.value;
}

type Alert = { type: AlertType | 'test'; title: string; body: string; data?: Record<string, string>; tag?: string };

async function sendToTokens(tokens: string[], alert: Alert) {
  const sa = serviceAccount();
  if (!sa || tokens.length === 0) return { sent: 0, failed: 0 };
  const bearer = await getAccessToken(sa);
  let sent = 0, failed = 0;
  const dead: string[] = [];
  await Promise.all(tokens.map(async (token) => {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: alert.title.slice(0, 120), body: alert.body.slice(0, 400) },
          data: { type: alert.type, ...(alert.data || {}) },
          android: {
            priority: 'HIGH',
            ttl: '86400s',
            notification: {
              channel_id: CHANNEL[alert.type],
              sound: 'default',
              default_vibrate_timings: true,
              notification_priority: 'PRIORITY_MAX',
              visibility: 'PRIVATE',
              ...(alert.tag ? { tag: alert.tag } : {}),
            },
          },
        },
      }),
    }).catch(() => null);
    if (res?.ok) { sent++; return; }
    failed++;
    const err = res ? await res.json().catch(() => ({})) : {};
    const code = err?.error?.details?.find?.((d: any) => d.errorCode)?.errorCode || err?.error?.status;
    if (res && (res.status === 404 || code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT')) dead.push(token);
  }));
  if (dead.length) await prisma.$executeRaw`DELETE FROM admin_push_devices WHERE token = ANY(${dead})`.catch(() => {});
  return { sent, failed };
}

/** Sends an alert to every staff device that handles this type (and hasn't muted it). */
async function sendAlert(alert: Alert & { type: AlertType }) {
  if (!serviceAccount()) return;
  await ensureTable();
  const roles = ALERT_ROLES[alert.type];
  const rows = await prisma.$queryRaw<{ token: string }[]>`
    SELECT d.token FROM admin_push_devices d JOIN users u ON u.id = d."userId"
    WHERE (u.role::text = 'ADMIN' OR u.role::text = ANY(${roles})) AND u."isBlocked" = false
      AND NOT (${alert.type} = ANY(d.muted))`;
  await sendToTokens(rows.map(r => r.token), alert);
}

/**
 * Queues an alert to be sent after the response (the student isn't kept waiting, and a
 * push failure never breaks the action that caused it). `build` runs then too, so any
 * lookups (e.g. the student's name) don't slow the request.
 */
export function notifyStaff(type: AlertType, build: () => Promise<Omit<Alert, 'type'>> | Omit<Alert, 'type'>) {
  if (!serviceAccount()) return;
  const run = async () => sendAlert({ ...(await build()), type });
  try {
    after(() => run().catch(err => console.error('Admin push failed:', err)));
  } catch {
    // Outside a request (scripts): send now
    run().catch(err => console.error('Admin push failed:', err));
  }
}

/** "Name (code)" for alert titles. */
export async function studentLabel(userId: string | null | undefined, fallback = 'A student') {
  if (!userId) return fallback;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, candidateCode: true } }).catch(() => null);
  return u ? `${u.fullName || fallback}${u.candidateCode ? ` (${u.candidateCode})` : ''}` : fallback;
}

/** "Send test alert" in the app's settings: to this admin's own devices. */
export async function sendTestAlert(userId: string) {
  if (!serviceAccount()) return { configured: false, sent: 0, failed: 0 };
  await ensureTable();
  const rows = await prisma.$queryRaw<{ token: string }[]>`SELECT token FROM admin_push_devices WHERE "userId" = ${userId}`;
  const r = await sendToTokens(rows.map(x => x.token), {
    type: 'test', title: 'Test alert', body: 'Instant alerts are working on this phone.', data: { screen: 'settings' },
  });
  return { configured: true, ...r };
}

export const shorten = (text: string, n = 160) => {
  const t = String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};
