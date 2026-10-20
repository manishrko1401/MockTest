import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// -----------------------------------------------------------------------------
// Talks to the MockTest Hub server (/api/db, the same API the website uses). The app signs in
// with its own login token (sent as "Authorization: Bearer"), one per phone, kept in the
// phone's secure storage. Only a real "login expired" (401) signs the student out; server
// errors and no internet never do.
// -----------------------------------------------------------------------------

const TOKEN_KEY = 'mth_token';
const SERVER_KEY = 'mth_server';
export const DEFAULT_SERVER: string = (Constants.expoConfig?.extra as any)?.apiBase || 'https://mocktesthub.vercel.app';

// The browser preview (development only) has no secure storage
const secure = Platform.OS === 'web'
  ? { getItemAsync: (k: string) => AsyncStorage.getItem(k), setItemAsync: (k: string, v: string) => AsyncStorage.setItem(k, v), deleteItemAsync: (k: string) => AsyncStorage.removeItem(k) }
  : SecureStore;

let token: string | null = null;
let server = DEFAULT_SERVER;
const signedOutListeners = new Set<() => void>();

export function onSignedOut(fn: () => void) {
  signedOutListeners.add(fn);
  return () => { signedOutListeners.delete(fn); };
}

export async function loadToken() {
  server = (await AsyncStorage.getItem(SERVER_KEY)) || DEFAULT_SERVER;
  token = await secure.getItemAsync(TOKEN_KEY);
  return token;
}
export async function saveToken(t: string) { token = t; await secure.setItemAsync(TOKEN_KEY, t); }
export async function clearToken() { token = null; await secure.deleteItemAsync(TOKEN_KEY).catch(() => {}); }
export const hasToken = () => !!token;

export const getServer = () => server;
export async function setServer(url: string) {
  server = url.replace(/\/+$/, '') || DEFAULT_SERVER;
  if (server === DEFAULT_SERVER) await AsyncStorage.removeItem(SERVER_KEY);
  else await AsyncStorage.setItem(SERVER_KEY, server);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code; }
}

type Options = { timeoutMs?: number; headers?: Record<string, string>; path?: string };

/** One request to the server. Throws ApiError (status 0 = no internet). */
export async function request<T = any>(action: string, data: object = {}, opts: Options = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 25000);
  let res: Response;
  try {
    res = await fetch(`${server}${opts.path || '/api/db'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
      body: JSON.stringify({ action, data }),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('No internet connection', 0);
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 304) return { notModified: true, status: 304 } as any;
  let json: any = null;
  try { json = await res.json(); } catch { /* not JSON (e.g. a gateway error page) */ }
  if (res.status === 401 && token && json?.code === 'AUTH_REQUIRED') {
    await clearToken();
    signedOutListeners.forEach(fn => fn());
  }
  if (!res.ok || json?.success === false || !json) {
    throw new ApiError(json?.error || (res.status >= 500 ? 'The server is busy. Please try again.' : `Request failed (${res.status})`), res.status, json?.code);
  }
  return json as T;
}

/** Same as request(), with the ETag header so unchanged data costs nothing. */
export async function requestWithEtag<T = any>(action: string, etag: string | null): Promise<{ data: T | null; etag: string | null }> {
  const res = await fetch(`${server}/api/db`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(etag ? { 'If-None-Match': etag } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ action }),
  }).catch(() => { throw new ApiError('No internet connection', 0); });
  if (res.status === 304) return { data: null, etag };
  if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status);
  return { data: await res.json(), etag: res.headers.get('ETag') };
}

export const friendlyError = (e: any) => (e?.status === 0 ? 'No internet connection. Please check your network.' : e?.message || 'Something went wrong');
