import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

// -----------------------------------------------------------------------------
// Bottom tabs plus a stack of screens on top. The Android back button closes the top screen
// first (a screen can block it, e.g. a running exam asks before leaving).
// -----------------------------------------------------------------------------

export type Tab = 'home' | 'tests' | 'planner' | 'friends' | 'profile';

export type Route =
  | { name: 'notices'; category?: string }
  | { name: 'notice'; notice: any }
  | { name: 'savedJobs' }
  | { name: 'support' }
  | { name: 'editProfile' }
  | { name: 'changePassword' }
  | { name: 'referrals' }
  | { name: 'category'; categoryId: string }
  | { name: 'exam'; categoryId: string; examId: string }
  | { name: 'testInfo'; testId: string }
  | { name: 'examRun'; testId: string; resume?: boolean; lang?: 'en' | 'hi'; l1?: string; l2?: string; offline?: boolean; roomCode?: string }
  | { name: 'cbatRun'; testId: string; offline?: boolean }
  | { name: 'analysis'; testId: string; attemptId?: string; offline?: boolean }
  | { name: 'bookmarks' }
  | { name: 'typingCategory'; categoryId: string }
  | { name: 'typingRun'; testId: string; offline?: boolean }
  | { name: 'locker' }
  | { name: 'offline' }
  | { name: 'pass' }
  | { name: 'room'; code: string }
  | { name: 'friendChat'; friend: { userId: string; name: string; code?: string; online?: boolean; lastSeen?: string | null } };

type BackBlocker = () => boolean;

type NavValue = {
  tab: Tab;
  /** Opens a tab; `section` picks a part of it (e.g. tests → 'typing') */
  setTab: (t: Tab, section?: string) => void;
  /** The section asked for with setTab (read once by the tab) */
  section: { tab: Tab; value: string; at: number } | null;
  stack: Route[];
  push: (r: Route) => void;
  replace: (r: Route) => void;
  pop: () => void;
  popToRoot: () => void;
  /** A screen that must confirm before closing (returns true when it handled Back) */
  setBackBlocker: (fn: BackBlocker | null) => void;
};

const NavContext = createContext<NavValue | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTabState] = useState<Tab>('home');
  const [section, setSection] = useState<NavValue['section']>(null);
  const [stack, setStack] = useState<Route[]>([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const blocker = useRef<BackBlocker | null>(null);

  const push = useCallback((r: Route) => setStack(s => [...s, r]), []);
  const replace = useCallback((r: Route) => setStack(s => [...s.slice(0, -1), r]), []);
  const pop = useCallback(() => setStack(s => s.slice(0, -1)), []);
  const popToRoot = useCallback(() => setStack([]), []);
  const setTab = useCallback((t: Tab, value?: string) => {
    setStack([]);
    setTabState(t);
    if (value) setSection({ tab: t, value, at: Date.now() });
  }, []);
  const setBackBlocker = useCallback((fn: BackBlocker | null) => { blocker.current = fn; }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (blocker.current && blocker.current()) return true;
      if (stackRef.current.length > 0) { pop(); return true; }
      if (tabRef.current !== 'home') { setTabState('home'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [pop]);

  const value = useMemo(() => ({ tab, setTab, section, stack, push, replace, pop, popToRoot, setBackBlocker }), [tab, setTab, section, stack, push, replace, pop, popToRoot, setBackBlocker]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const v = useContext(NavContext);
  if (!v) throw new Error('useNav outside NavProvider');
  return v;
}

/** The section another screen asked this tab to show (e.g. Tests → Typing). */
export function useTabSection(tab: Tab, onSection: (value: string) => void) {
  const { section } = useNav();
  const seen = useRef(0);
  useEffect(() => {
    if (section && section.tab === tab && section.at !== seen.current) {
      seen.current = section.at;
      onSection(section.value);
    }
  }, [section, tab, onSection]);
}
