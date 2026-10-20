import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

// -----------------------------------------------------------------------------
// Small navigator: bottom tabs plus a stack of detail screens on top, with the Android back
// button closing the top screen first. (No navigation library: fewer native modules.)
// -----------------------------------------------------------------------------

export type Tab = 'inbox' | 'dashboard' | 'users' | 'notices' | 'more';
export type InboxSection = 'chats' | 'reports' | 'inquiries' | 'suggestions' | 'feedback';

export type Route =
  | { name: 'chat'; userId: string; title?: string }
  | { name: 'report'; report: any }
  | { name: 'inquiry'; item: any }
  | { name: 'suggestion'; item: any }
  | { name: 'feedbackItem'; item: any }
  | { name: 'user'; id: string }
  | { name: 'notice'; notice?: any }
  | { name: 'test'; test: any }
  | { name: 'settings' };

type NavValue = {
  tab: Tab;
  setTab: (t: Tab) => void;
  inboxSection: InboxSection;
  setInboxSection: (s: InboxSection) => void;
  stack: Route[];
  push: (r: Route) => void;
  pop: () => void;
  /** Opens what a notification is about (chat, a list, settings). */
  openTarget: (data: Record<string, any> | undefined) => void;
};

const NavContext = createContext<NavValue | null>(null);

export function NavProvider({ children, firstTab }: { children: React.ReactNode; firstTab: Tab }) {
  const [tab, setTab] = useState<Tab>(firstTab);
  const [inboxSection, setInboxSection] = useState<InboxSection>('chats');
  const [stack, setStack] = useState<Route[]>([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const push = useCallback((r: Route) => setStack(s => {
    // Re-opening the chat that's on top just keeps it
    const top = s[s.length - 1];
    if (top && top.name === 'chat' && r.name === 'chat' && top.userId === r.userId) return s;
    return [...s, r];
  }), []);
  const pop = useCallback(() => setStack(s => s.slice(0, -1)), []);

  const openTarget = useCallback((data: Record<string, any> | undefined) => {
    if (!data) return;
    const screen = data.screen || data.type;
    if ((screen === 'chat' || screen === 'support') && (data.userId || data.ref)) {
      setTab('inbox'); setInboxSection('chats');
      setStack([{ name: 'chat', userId: data.userId || data.ref }]);
      return;
    }
    const sections: Record<string, InboxSection> = {
      reports: 'reports', report: 'reports', inquiries: 'inquiries', inquiry: 'inquiries',
      suggestions: 'suggestions', suggestion: 'suggestions', feedback: 'feedback',
    };
    if (sections[screen]) { setTab('inbox'); setInboxSection(sections[screen]); setStack([]); return; }
    if (screen === 'settings') { setStack([{ name: 'settings' }]); }
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stackRef.current.length > 0) { pop(); return true; }
      if (tabRef.current !== firstTab) { setTab(firstTab); return true; }
      return false;
    });
    return () => sub.remove();
  }, [pop, firstTab]);

  const value = useMemo(() => ({ tab, setTab, inboxSection, setInboxSection, stack, push, pop, openTarget }), [tab, inboxSection, stack, push, pop, openTarget]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const v = useContext(NavContext);
  if (!v) throw new Error('useNav outside NavProvider');
  return v;
}
