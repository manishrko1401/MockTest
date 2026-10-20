import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { clearToken, loadToken, onSignedOut, request, saveToken } from './api';
import { readJson, removeJson, writeJson } from './storage';
import type { MockUser } from './shared/webTypes';

// -----------------------------------------------------------------------------
// The signed-in student. The saved copy opens the app instantly (also offline); the server
// copy refreshes it. Signing out happens only on the student's request or a real "login
// expired" from the server.
// -----------------------------------------------------------------------------

export type User = MockUser;

type SessionValue = {
  /** undefined while starting, null when signed out */
  user: User | null | undefined;
  refreshUser: () => Promise<void>;
  /** Changes the user on screen (and the saved copy) after an action */
  patchUser: (patch: Partial<User>) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (f: { name: string; email: string; mobile: string; password: string; referralCode?: string }) => Promise<void>;
  googleSignIn: (accessToken: string, name?: string, photo?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionValue | null>(null);
const USER_FILE = 'user';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const userRef = useRef<User | null | undefined>(undefined);
  userRef.current = user;

  const keep = useCallback((u: User | null) => {
    setUser(u);
    if (u) writeJson(USER_FILE, u); else removeJson(USER_FILE);
  }, []);

  const refreshUser = useCallback(async () => {
    const id = userRef.current?.id;
    if (!id) return;
    try {
      const res = await request<{ user: User }>('get-user-details', { userId: id });
      if (res.user) {
        if (res.user.isBlocked) { await clearToken(); keep(null); return; }
        keep(res.user);
      }
    } catch { /* offline / server busy: keep the saved copy */ }
  }, [keep]);

  useEffect(() => {
    (async () => {
      const token = await loadToken();
      const saved = token ? await readJson<User>(USER_FILE) : null;
      setUser(saved);
      if (saved) {
        userRef.current = saved;
        refreshUser();
        request('ping', { platform: 'app' }).catch(() => {});
      }
    })();
    return onSignedOut(() => keep(null));
  }, [keep, refreshUser]);

  const finishSignIn = useCallback(async (res: { user: User; authToken?: string }) => {
    if (!res.authToken) throw new Error('Sign-in failed. Please update the app.');
    await saveToken(res.authToken);
    keep(res.user);
    userRef.current = res.user;
    refreshUser();
  }, [keep, refreshUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    await finishSignIn(await request('login', { email: email.trim().toLowerCase(), password, client: 'android-app' }));
  }, [finishSignIn]);

  const signUp = useCallback(async (f: { name: string; email: string; mobile: string; password: string; referralCode?: string }) => {
    await finishSignIn(await request('signup', {
      name: f.name.trim(), email: f.email.trim().toLowerCase(), mobile: f.mobile.trim(), password: f.password,
      referralCodeInput: f.referralCode?.trim() || undefined, client: 'android-app',
    }));
  }, [finishSignIn]);

  const googleSignIn = useCallback(async (accessToken: string, name?: string, photo?: string) => {
    await finishSignIn(await request('google-auth', { accessToken, name, profilePhoto: photo, client: 'android-app' }));
  }, [finishSignIn]);

  const signOut = useCallback(async () => {
    await request('logout').catch(() => {});
    await clearToken();
    keep(null);
  }, [keep]);

  const patchUser = useCallback((patch: Partial<User>) => {
    const u = userRef.current;
    if (u) keep({ ...u, ...patch });
  }, [keep]);

  const value = useMemo(() => ({ user, refreshUser, patchUser, signIn, signUp, googleSignIn, signOut }), [user, refreshUser, patchUser, signIn, signUp, googleSignIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}

/** The signed-in user (screens behind sign-in only). */
export function useUser(): User {
  const { user } = useSession();
  if (!user) throw new Error('No user');
  return user;
}
