import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// -----------------------------------------------------------------------------
// Talks to the website: /api/admin-app (this app's own API) and /api/db (actions shared
// with the website's admin panel: notices, test rename / delete). The login token is kept
// in the phone's secure storage (Android Keystore).
// -----------------------------------------------------------------------------

const TOKEN_KEY = 'mth_admin_token';
const USER_KEY = 'mth_admin_user';
const SERVER_KEY = 'mth_admin_server';
export const DEFAULT_SERVER: string = (Constants.expoConfig?.extra as any)?.apiBase || 'https://mocktesthub.vercel.app';

export type StaffUser = { id: string; name: string; email: string; role: string; candidateCode?: string };

let token: string | null = null;
// The browser preview (development only) has no secure storage
const secure = Platform.OS === 'web'
  ? { getItemAsync: (k: string) => AsyncStorage.getItem(k), setItemAsync: (k: string, v: string) => AsyncStorage.setItem(k, v), deleteItemAsync: (k: string) => AsyncStorage.removeItem(k) }
  : SecureStore;
let server = DEFAULT_SERVER;
const signedOutListeners = new Set<() => void>();

export function onSignedOut(fn: () => void) {
  signedOutListeners.add(fn);
  return () => { signedOutListeners.delete(fn); };
}

export async function loadSession(): Promise<StaffUser | null> {
  server = (await AsyncStorage.getItem(SERVER_KEY)) || DEFAULT_SERVER;
  token = await secure.getItemAsync(TOKEN_KEY);
  const raw = await AsyncStorage.getItem(USER_KEY);
  return token && raw ? JSON.parse(raw) : null;
}

export async function saveSession(newToken: string, user: StaffUser) {
  token = newToken;
  await secure.setItemAsync(TOKEN_KEY, newToken);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  token = null;
  await secure.deleteItemAsync(TOKEN_KEY).catch(() => {});
  await AsyncStorage.removeItem(USER_KEY).catch(() => {});
}

export const getServer = () => server;
export async function setServer(url: string) {
  server = url.replace(/\/+$/, '') || DEFAULT_SERVER;
  if (server === DEFAULT_SERVER) await AsyncStorage.removeItem(SERVER_KEY);
  else await AsyncStorage.setItem(SERVER_KEY, server);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

async function post<T>(path: string, action: string, data: object, timeoutMs = 20000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${server}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action, data }),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('No internet connection', 0);
  } finally {
    clearTimeout(timer);
  }
  let json: any = {};
  try { json = await res.json(); } catch { /* not JSON */ }
  if (res.status === 401 && token) {
    await clearSession();
    signedOutListeners.forEach(fn => fn());
  }
  if (!res.ok || json?.success === false) throw new ApiError(json?.error || `Request failed (${res.status})`, res.status);
  return json as T;
}

/** This app's API. */
export const api = <T = any>(action: string, data: object = {}, timeoutMs?: number) => post<T>('/api/admin-app', action, data, timeoutMs);
/** Shared website actions (notices, test edits). */
export const db = <T = any>(action: string, data: object = {}) => post<T>('/api/db', action, data);

export async function login(email: string, password: string) {
  const res = await post<{ token: string; user: StaffUser }>('/api/admin-app', 'login', { email, password });
  await saveSession(res.token, res.user);
  return res.user;
}
