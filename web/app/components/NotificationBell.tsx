"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, UserPlus, MessageCircle, Users, Headphones, CheckCheck } from 'lucide-react';

// -----------------------------------------------------------------------------
// The bell in the header: the student's notifications (friend requests and messages, room
// invites / joins / starts, support replies) with an unread count. Loaded on opening the page,
// when the tab comes back into view and every few minutes while it's visible; the Windows
// app's minute-by-minute check (DesktopBridge) also refreshes it.
// -----------------------------------------------------------------------------

type Item = { id: string; type: string; title: string; body: string; data: Record<string, string>; read: boolean; createdAt: string };

const api = async (action: string, data: Record<string, unknown> = {}) => {
  const res = await fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || 'Request failed');
  return json;
};

const ICON: Record<string, React.ElementType> = {
  friend_request: UserPlus, friend_accepted: UserPlus, friend_message: MessageCircle,
  room_invite: Users, room_joined: Users, room_started: Users, support_reply: Headphones,
};

/** Where a notification leads on the website. */
export function notificationHref(data: Record<string, string>) {
  switch (data.screen) {
    case 'chat': return data.friendId ? `/friends?tab=friends&chat=${encodeURIComponent(data.friendId)}` : '/friends?tab=friends';
    case 'friends': return '/friends?tab=friends';
    case 'room': return data.code ? `/friends/${encodeURIComponent(data.code)}` : '/friends';
    case 'support': return '/?support=1';
    default: return '/';
  }
}

const ago = (iso: string, hi: boolean) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return hi ? 'अभी' : 'now';
  if (s < 3600) return hi ? `${Math.floor(s / 60)} मिनट` : `${Math.floor(s / 60)}m`;
  if (s < 86400) return hi ? `${Math.floor(s / 3600)} घंटे` : `${Math.floor(s / 3600)}h`;
  return new Date(iso).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' });
};

export function NotificationBell({ hi }: { hi: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [unread, setUnread] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api('notif-list').then(r => { setItems(r.items); setUnread(r.unread); }).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    const timer = setInterval(onVisible, 3 * 60 * 1000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('mth-notifications', load);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('mth-notifications', load); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const go = (n: Item) => {
    setOpen(false);
    if (!n.read) {
      setItems(list => list?.map(x => (x.id === n.id ? { ...x, read: true } : x)) || null);
      setUnread(u => Math.max(0, u - 1));
      api('notif-read', { ids: [n.id] }).catch(() => {});
    }
    router.push(notificationHref(n.data || {}));
  };
  const readAll = () => {
    setItems(list => list?.map(x => ({ ...x, read: true })) || null);
    setUnread(0);
    api('notif-read', { all: true }).catch(() => {});
  };

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); if (!open) load(); }}
        className={`relative flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer ${open ? 'bg-[#eef3f8] dark:bg-slate-800' : ''}`}
        aria-label={hi ? `सूचनाएं${unread ? ` (${unread} नई)` : ''}` : `Notifications${unread ? ` (${unread} new)` : ''}`}
        aria-haspopup="dialog" aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-[18px] text-center tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label={hi ? 'सूचनाएं' : 'Notifications'}
          className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-10 sm:w-[22rem] z-50 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{hi ? 'सूचनाएं' : 'Notifications'}</p>
            {unread > 0 && (
              <button type="button" onClick={readAll} className="text-xs font-medium text-[#1e4e79] dark:text-blue-300 hover:underline inline-flex items-center gap-1 cursor-pointer">
                <CheckCheck className="h-3.5 w-3.5" />{hi ? 'सब पढ़ा हुआ' : 'Mark all read'}
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items === null ? (
              <p className="px-3 py-6 text-center text-xs text-slate-500">{hi ? 'लोड हो रहा है…' : 'Loading…'}</p>
            ) : items.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <Bell className="h-6 w-6 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hi ? 'अभी कोई सूचना नहीं। दोस्तों के अनुरोध, संदेश और रूम यहां दिखेंगे।' : 'Nothing yet. Friend requests, messages and rooms show up here.'}</p>
              </div>
            ) : items.map(n => {
              const Icon = ICON[n.type] || Bell;
              return (
                <button key={n.id} type="button" onClick={() => go(n)}
                  className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer ${n.read ? '' : 'bg-[#f5f8fc] dark:bg-slate-800/40'}`}>
                  <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-blue-300 flex items-center justify-center"><Icon className="h-3.5 w-3.5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`text-xs truncate ${n.read ? 'font-medium text-slate-700 dark:text-slate-200' : 'font-semibold text-slate-900 dark:text-white'}`}>{n.title}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{ago(n.createdAt, hi)}</span>
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{n.body}</span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-[#1e4e79] dark:bg-blue-400 shrink-0" aria-label={hi ? 'नई' : 'new'} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
