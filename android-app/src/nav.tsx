import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

// -----------------------------------------------------------------------------
// Bottom tabs plus a stack of screens on top. The Android back button closes the top screen
// first (a screen can block it, e.g. a running exam asks before leaving).
// -----------------------------------------------------------------------------

export type Tab = 'home' | 'tests' | 'typing' | 'notices' | 'profile';

export type Route =
  | { name: 'notice'; notice: any }
  | { name: 'savedJobs' }
  | { name: 'support' }
  | { name: 'editProfile' }
  | { name: 'changePassword' }
  | { name: 'referrals' }
  | { name: 'category'; categoryId: string }
  | { name: 'exam'; categoryId: string; examId: string }
  | { name: 'testInfo'; testId: string }
  | { name: 'examRun'; testId: string; resume?: boolean; lang?: 'en' | 'hi'; l1?: string; l2?: string; offline?: boolean }
  | { name: 'cbatRun'; testId: string; offline?: boolean }
  | { name: 'analysis'; testId: string; attemptId?: string; offline?: boolean }
  | { name: 'bookmarks' }
  | { name: 'typingCategory'; categoryId: string }
  | { name: 'typingRun'; testId: string; offline?: boolean }
  | { name: 'planner' }
  | { name: 'locker' }
  | { name: 'offline' }
  | { name: 'pass' };

type BackBlocker = () => boolean;

type NavValue = {
  tab: Tab;
  setTab: (t: Tab) => void;
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
  const setTab = useCallback((t: Tab) => { setStack([]); setTabState(t); }, []);
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

  const value = useMemo(() => ({ tab, setTab, stack, push, replace, pop, popToRoot, setBackBlocker }), [tab, setTab, stack, push, replace, pop, popToRoot, setBackBlocker]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const v = useContext(NavContext);
  if (!v) throw new Error('useNav outside NavProvider');
  return v;
}
