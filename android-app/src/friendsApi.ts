import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { request } from './api';

// -----------------------------------------------------------------------------
// With Friends: test rooms, the friend list and chat. Same server actions as the website
// (web/app/lib/friendRooms.ts and friends.ts); the app sends its login token.
// -----------------------------------------------------------------------------

export type RoomMode = 'live' | 'anytime';
export type RoomStatus = 'lobby' | 'open' | 'closed';
export type Relation = 'self' | 'none' | 'friends' | 'incoming' | 'outgoing';

export interface RoomInfo {
  code: string; mode: RoomMode; status: RoomStatus; testId: string; testTitle: string; durationMinutes: number;
  locked: string | null; hostId: string; startedAt: string | null; closesAt: string | null; createdAt: string;
  maxMembers: number; minLimit: number; maxLimit: number;
}
export interface RoomMember { userId?: string; name: string; isHost: boolean; joinedAt?: string; finished?: boolean; relation?: Relation }
export interface MemberResult {
  userId: string; score: number; maxScore: number; accuracy: number; timeSeconds: number; completedAt: string | null;
  correct: number; wrong: number; skipped: number;
  sections: Record<string, { score: number; correct: number; wrong: number; skipped: number; time: number }>;
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
export interface MyRoom {
  code: string; mode: RoomMode; status: RoomStatus; testId: string; testTitle: string; members: number;
  isHost: boolean; finished: boolean; createdAt: string; closesAt: string | null; startedAt: string | null;
}
export interface RoomMessage { id: string; userId: string; name: string; text: string; createdAt: string; mine: boolean; canDelete: boolean }

export interface Person { userId: string; name: string; code: string; online: boolean; lastSeen: string | null }
export interface Friend extends Person { since: string | null; unread: number; lastMessage: { text: string; at: string; mine: boolean } | null }
export interface FriendRequest extends Person { at: string }
export interface FriendsData { myCode: string; friends: Friend[]; incoming: FriendRequest[]; outgoing: FriendRequest[] }
export interface ChatMessage {
  id: string; mine: boolean; text: string; kind: 'text' | 'room'; read: boolean; createdAt: string; deleted?: boolean;
  meta: { code?: string; testTitle?: string; mode?: RoomMode } | null;
}

export const LIMIT_MIN = 2, LIMIT_MAX = 50, LIMIT_PICKS = [5, 10, 20, 50];
export const ANYTIME_HOURS = [24, 72, 168];
export const SITE = 'https://mocktesthub.vercel.app';
export const roomLink = (code: string) => `${SITE}/friends/${code}`;

export const api = <T = any>(action: string, data: Record<string, unknown> = {}) => request<T>(action, data);

export function lastSeenText(p: { online?: boolean; lastSeen?: string | null }, hi: boolean) {
  if (p.online) return hi ? 'ऑनलाइन' : 'Online';
  if (!p.lastSeen) return hi ? 'ऑफ़लाइन' : 'Offline';
  const min = Math.floor((Date.now() - new Date(p.lastSeen).getTime()) / 60000);
  if (min < 60) return hi ? `${Math.max(1, min)} मिनट पहले देखा` : `Last seen ${Math.max(1, min)} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return hi ? `${h} घंटे पहले देखा` : `Last seen ${h}h ago`;
  const d = Math.floor(h / 24);
  return hi ? `${d} दिन पहले देखा` : `Last seen ${d}d ago`;
}

export function fmtTime(sec: number) {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(r).padStart(2, '0')}s`;
  return `${r}s`;
}
export const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

const COLORS = ['#1e4e79', '#b45309', '#047857', '#7c3aed', '#be123c', '#0e7490', '#4d7c0f', '#a21caf', '#c2410c', '#334155'];
/** A steady colour per person, the same one the website uses. */
export function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function timeLeft(iso: string | null, hi: boolean) {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return hi ? 'बंद' : 'Closed';
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return hi ? `${Math.floor(h / 24)} दिन बाकी` : `${Math.floor(h / 24)} days left`;
  if (h >= 1) return hi ? `${h} घंटे ${m} मिनट बाकी` : `${h}h ${m}m left`;
  return hi ? `${m} मिनट बाकी` : `${m} min left`;
}

export const showCode = (c: string) => (c && c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c);

// ---- Badges: new friend requests + unread messages (Friends tab), unread notifications (bell) ----

type BadgeValue = { requests: number; unread: number; total: number; notifications: number; refresh: () => void };
const BadgeCtx = createContext<BadgeValue>({ requests: 0, unread: 0, total: 0, notifications: 0, refresh: () => {} });

export function FriendsBadgeProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState({ requests: 0, unread: 0 });
  const [notifications, setNotifications] = useState(0);
  const refresh = useCallback(() => {
    api<{ requests: number; unread: number }>('friends-badge').then(r => setCounts({ requests: r.requests || 0, unread: r.unread || 0 }), () => {});
    // only the count (no list) for the bell
    api<{ unread: number }>('notif-since').then(r => setNotifications(r.unread || 0), () => {});
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 90 * 1000);
    const sub = AppState.addEventListener('change', s => { if (s === 'active') refresh(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [refresh]);
  const value = useMemo(() => ({ ...counts, total: counts.requests + counts.unread, notifications, refresh }), [counts, notifications, refresh]);
  return React.createElement(BadgeCtx.Provider, { value }, children);
}

export const useFriendsBadge = () => useContext(BadgeCtx);
