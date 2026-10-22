// Shared bits for the Test with Friends pages (server side: app/lib/friendRooms.ts).

export type RoomMode = 'live' | 'anytime';
export type RoomStatus = 'lobby' | 'open' | 'closed';

export interface RoomInfo {
  code: string; mode: RoomMode; status: RoomStatus; testId: string; testTitle: string; durationMinutes: number;
  locked: string | null; hostId: string; startedAt: string | null; closesAt: string | null; createdAt: string;
  maxMembers: number; minLimit: number; maxLimit: number;
}
export type Relation = 'self' | 'none' | 'friends' | 'incoming' | 'outgoing';
export interface RoomMember { userId?: string; name: string; isHost: boolean; joinedAt?: string; finished?: boolean; relation?: Relation }
export interface MemberResult {
  userId: string; score: number; maxScore: number; accuracy: number; timeSeconds: number; completedAt: string | null;
  correct: number; wrong: number; skipped: number;
  sections: Record<string, { score: number; correct: number; wrong: number; skipped: number; time: number }>;
  /** per question, in paper order: [chosen option, seconds, 1 correct / 0 wrong / null skipped] */
  answers: [number | null, number, 1 | 0 | null][];
  /** Held by the exam integrity checks: listed, not ranked, until an admin clears it */
  underReview?: boolean;
}
export interface Comparison {
  sections: { id: string; name: string; maxScore: number; questions: number }[];
  questions: { id: string; n: number; sectionId: string; correct: number }[];
  results: MemberResult[];
}
export interface RoomData {
  room: RoomInfo;
  me: { isMember: boolean; isHost: boolean; finished: boolean };
  members: RoomMember[];
  comparison?: Comparison | null;
  messageCounts?: Record<string, number>;
  friendsToAdd?: { userId: string; name: string; online: boolean }[];
}

// ---- Friend list and chat (server: app/lib/friends.ts) ----
export interface Person { userId: string; name: string; code: string; online: boolean; lastSeen: string | null }
export interface Friend extends Person { since: string | null; unread: number; lastMessage: { text: string; at: string; mine: boolean } | null }
export interface FriendRequest extends Person { at: string }
export interface FriendsData { myCode: string; friends: Friend[]; incoming: FriendRequest[]; outgoing: FriendRequest[] }
export interface ChatMessage {
  id: string; mine: boolean; text: string; kind: 'text' | 'room'; read: boolean; createdAt: string;
  meta: { code?: string; testTitle?: string; mode?: RoomMode } | null;
}

export function lastSeenText(p: { online: boolean; lastSeen: string | null }, hi: boolean) {
  if (p.online) return hi ? 'ऑनलाइन' : 'Online';
  if (!p.lastSeen) return hi ? 'ऑफ़लाइन' : 'Offline';
  const min = Math.floor((Date.now() - new Date(p.lastSeen).getTime()) / 60000);
  if (min < 60) return hi ? `${min} मिनट पहले देखा` : `Last seen ${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return hi ? `${h} घंटे पहले देखा` : `Last seen ${h}h ago`;
  const d = Math.floor(h / 24);
  return hi ? `${d} दिन पहले देखा` : `Last seen ${d}d ago`;
}
export interface MyRoom {
  code: string; mode: RoomMode; status: RoomStatus; testId: string; testTitle: string; members: number;
  isHost: boolean; finished: boolean; createdAt: string; closesAt: string | null; startedAt: string | null;
}
export interface RoomMessage { id: string; userId: string; name: string; text: string; createdAt: string; mine: boolean; canDelete: boolean }

export class RoomError extends Error {
  constructor(message: string, public code?: string, public status?: number) { super(message); }
}

export async function roomApi<T = any>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data }) });
  } catch {
    throw new RoomError('No internet connection. Please try again.', 'OFFLINE', 0);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new RoomError(json.error || 'Something went wrong. Please try again.', json.code, res.status);
  return json as T;
}

export const roomUrl = (code: string) => `/friends/${code}`;
export const LIMIT_MIN = 2, LIMIT_MAX = 50, LIMIT_PICKS = [5, 10, 20, 50];
export const SITE_ORIGIN = 'https://mocktesthub.vercel.app';

export function fmtTime(sec: number) {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(r).padStart(2, '0')}s`;
  return `${r}s`;
}
export const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';

/** A steady colour per person (avatars and chart marks), same for everyone viewing the room. */
const AVATAR_COLORS = ['#1e4e79', '#b45309', '#047857', '#7c3aed', '#be123c', '#0e7490', '#4d7c0f', '#a21caf', '#c2410c', '#334155'];
export function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function timeLeft(iso: string | null, hi: boolean) {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return hi ? 'बंद' : 'closed';
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return hi ? `${Math.floor(h / 24)} दिन बाकी` : `${Math.floor(h / 24)} days left`;
  if (h >= 1) return hi ? `${h} घंटे ${m} मिनट बाकी` : `${h}h ${m}m left`;
  return hi ? `${m} मिनट बाकी` : `${m} min left`;
}
