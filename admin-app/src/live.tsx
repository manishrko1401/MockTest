import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from './api';
import { AlertType, showLocalAlert } from './push';

// -----------------------------------------------------------------------------
// Live inbox while the app is open: checks the server every few seconds (and at once when a
// push arrives or the app comes back to the front), keeps the unread counts, alerts for each
// new message, and tells open screens to reload. Stops in the background, where Firebase
// pushes take over.
// -----------------------------------------------------------------------------

export type Counts = { supportUnread: number; supportThreads: number; reports: number; inquiries: number; suggestions: number; feedback24h: number };
type LiveEvent = { type: AlertType; id: string; ref: string; title: string; body: string; createdAt: string };

type LiveValue = {
  counts: Counts | null;
  /** Increases whenever something new arrives: screens reload their data when it changes */
  version: number;
  online: boolean;
  pollNow: () => void;
  /** The chat on screen (its new messages refresh the chat instead of raising an alert) */
  setActiveChat: (userId: string | null) => void;
};

const POLL_MS = 4000;
const LiveContext = createContext<LiveValue | null>(null);

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [version, setVersion] = useState(0);
  const [online, setOnline] = useState(true);
  const countsRef = useRef<Counts | null>(null);
  const since = useRef<string | null>(null);
  const seen = useRef(new Set<string>());
  const activeChat = useRef<string | null>(null);
  const busy = useRef(false);
  const again = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(AppState.currentState === 'active');

  const tick = useCallback(async () => {
    if (busy.current) { again.current = true; return; }
    busy.current = true;
    try {
      const res = await api<{ serverTime: string; counts: Counts; events: LiveEvent[] }>('summary', { since: since.current }, 10000);
      setOnline(true);
      const changed = !!countsRef.current && JSON.stringify(countsRef.current) !== JSON.stringify(res.counts);
      countsRef.current = res.counts;
      setCounts(res.counts);
      if (changed) setVersion(v => v + 1);
      const first = since.current === null;
      since.current = res.serverTime;
      const fresh = res.events.filter(e => !seen.current.has(`${e.type}:${e.id}`));
      fresh.forEach(e => seen.current.add(`${e.type}:${e.id}`));
      if (!first && fresh.length) {
        setVersion(v => v + 1);
        const toAlert = fresh.filter(e => !(e.type === 'support' && e.ref === activeChat.current));
        if (toAlert.length !== fresh.length) Vibration.vibrate(60); // message in the open chat
        // Oldest first, at most 5 separate alerts (more → one summary)
        const list = toAlert.slice(0, 5).reverse();
        for (const e of list) {
          await showLocalAlert(e.type, e.title, e.body, e.type === 'support' ? { screen: 'chat', userId: e.ref } : { screen: e.type });
        }
        if (toAlert.length > 5) {
          await showLocalAlert('support', `${toAlert.length} new messages`, 'Open the inbox to see them all.', { screen: 'chats' });
        }
      }
      const unread = res.counts.supportUnread + res.counts.reports + res.counts.inquiries + res.counts.suggestions;
      Notifications.setBadgeCountAsync(unread).catch(() => {});
    } catch {
      setOnline(false);
    } finally {
      busy.current = false;
      if (again.current) { again.current = false; tick(); }
    }
  }, []);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!active.current) return;
    timer.current = setTimeout(async () => { await tick(); schedule(); }, POLL_MS);
  }, [tick]);

  const pollNow = useCallback(() => { tick().then(schedule); }, [tick, schedule]);

  useEffect(() => {
    pollNow();
    const appSub = AppState.addEventListener('change', state => {
      active.current = state === 'active';
      if (active.current) pollNow();
      else if (timer.current) clearTimeout(timer.current);
    });
    // A push arrived while the app is open: check now (the alert comes from the check)
    const pushSub = Notifications.addNotificationReceivedListener(n => {
      if ((n.request.trigger as any)?.type === 'push') pollNow();
    });
    return () => {
      appSub.remove();
      pushSub.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pollNow]);

  const setActiveChat = useCallback((userId: string | null) => { activeChat.current = userId; }, []);
  const value = useMemo(() => ({ counts, version, online, pollNow, setActiveChat }), [counts, version, online, pollNow, setActiveChat]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const v = useContext(LiveContext);
  if (!v) throw new Error('useLive outside LiveProvider');
  return v;
}

/** Re-runs `load` whenever something new arrives (and on first render). */
export function useLiveReload(load: () => void) {
  const { version } = useLive();
  const ref = useRef(load);
  ref.current = load;
  useEffect(() => { ref.current(); }, [version]);
}
