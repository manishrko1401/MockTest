"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CheckCheck, Copy, Loader2, MessageSquare, Search, Send, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { SectionCard, StatusBadge, btnPrimary, btnSecondary, inputCls } from '../components/SiteUI';
import { ChatMessage, Friend, FriendsData, Person, Relation, colorFor, initials, lastSeenText, roomApi, roomUrl } from './shared';

// -----------------------------------------------------------------------------
// Friends tab of /friends: your Friend code, add a friend (exact code or email), requests
// to accept / reject, the friend list with online / offline, and one-to-one chat.
// /friends?tab=friends&chat=<userId> opens a chat.
// -----------------------------------------------------------------------------

export function PersonAvatar({ id, name, online, size = 36 }: { id: string; name: string; online?: boolean; size?: number }) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full font-bold text-white flex items-center justify-center" style={{ background: colorFor(id), fontSize: size * 0.36 }}>{initials(name)}</span>
      {online !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white dark:border-slate-900 ${online ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
          style={{ width: Math.max(10, size * 0.32), height: Math.max(10, size * 0.32) }} aria-label={online ? 'Online' : 'Offline'} />
      )}
    </span>
  );
}

/** The ✕ (reject request) button */
export const rejectCls = 'h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-[#b02a37] hover:border-[#b02a37]/40 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-60 cursor-pointer';

const timeOf = (iso: string, hi: boolean) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return d.toLocaleString(hi ? 'hi-IN' : 'en-IN', today ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

function ChatPane({ friend, hi, onBack, onRemoved, onActivity }: {
  friend: Friend; hi: boolean; onBack: () => void; onRemoved: () => void; onActivity: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [person, setPerson] = useState<Person>(friend);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const lastId = useRef('');

  // After the first load only changes are fetched (new, read or deleted messages)
  const cursor = useRef<string | null>(null);
  const known = useRef<Map<string, ChatMessage>>(new Map());
  const activeFriend = useRef(friend.userId);
  const load = useCallback(async () => {
    try {
      const r = await roomApi<{ friend: Person | null; messages: (ChatMessage & { deleted?: boolean })[]; partial?: boolean; cursor?: string | null }>(
        'friends-messages', { friendId: friend.userId, ...(cursor.current ? { since: cursor.current } : {}) });
      if (activeFriend.current !== friend.userId) return; // switched to another chat meanwhile
      if (!r.partial) known.current = new Map();
      for (const m of r.messages) {
        if (m.deleted) known.current.delete(m.id);
        else known.current.set(m.id, m);
      }
      const list = [...known.current.values()].sort((x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime());
      setMessages(list);
      if (r.cursor) cursor.current = r.cursor;
      if (r.friend) setPerson(r.friend);
      const newest = list[list.length - 1]?.id || '';
      if (newest !== lastId.current) {
        lastId.current = newest;
        requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
      }
    } catch (e: any) {
      if (e.code === 'NOT_FRIENDS') onRemoved();
      else setError(e.message);
    }
  }, [friend.userId, onRemoved]);

  // New messages and read ticks appear within a few seconds
  useEffect(() => {
    setMessages(null); setError(''); lastId.current = ''; cursor.current = null; known.current = new Map(); activeFriend.current = friend.userId; setPerson(friend);
    load().then(onActivity);
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 3500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friend.userId]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true); setError('');
    try {
      await roomApi('friends-send', { friendId: friend.userId, text: t });
      setText('');
      await load();
      onActivity();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const remove = async () => {
    if (!confirm(hi ? `${friend.name} को मित्र सूची से हटाएं?` : `Remove ${friend.name} from your friends?`)) return;
    try { await roomApi('friends-remove', { friendId: friend.userId }); onRemoved(); } catch (e: any) { setError(e.message); }
  };

  const del = async (id: string) => {
    try { await roomApi('friends-delete-message', { id }); await load(); } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="flex flex-col h-[70vh] min-h-[420px]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <button type="button" onClick={onBack} className="md:hidden p-1 -ml-1 text-slate-500 cursor-pointer" aria-label={hi ? 'वापस' : 'Back'}><ArrowLeft className="h-5 w-5" /></button>
        <PersonAvatar id={person.userId} name={person.name} online={person.online} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{person.name}</div>
          <div className={`text-xs ${person.online ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>{lastSeenText(person, hi)}{person.code ? <span className="text-slate-400"> · {person.code}</span> : null}</div>
        </div>
        <button type="button" onClick={remove} className="p-1.5 rounded-md text-slate-400 hover:text-[#b02a37] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title={hi ? 'मित्र हटाएं' : 'Remove friend'} aria-label={hi ? 'मित्र हटाएं' : 'Remove friend'}>
          <UserMinus className="h-4.5 w-4.5" />
        </button>
      </div>

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2.5 bg-slate-50/70 dark:bg-slate-950/30">
        {messages === null ? (
          <div className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{hi ? 'लोड हो रहा है…' : 'Loading…'}</div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-sm text-slate-500 gap-2">
            <MessageSquare className="h-8 w-8 text-slate-300" />
            {hi ? `${person.name.split(' ')[0]} को नमस्ते कहें 👋` : `Say hello to ${person.name.split(' ')[0]} 👋`}
          </div>
        ) : messages.map(m => (
          <div key={m.id} className={`group flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-xs ${m.mine ? 'bg-[#1e4e79] text-white rounded-br-md' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-md'}`}>
              {m.kind === 'room' && m.meta?.code ? (
                <div className="space-y-2">
                  <div className={`text-xs ${m.mine ? 'text-white/75' : 'text-slate-500'}`}>{m.mine ? (hi ? 'आपने रूम में जोड़ा' : 'You added them to a test room') : (hi ? 'आपको एक टेस्ट रूम में जोड़ा' : 'Added you to a test room')}</div>
                  <div className="font-semibold">📝 {m.meta.testTitle}</div>
                  <Link href={roomUrl(m.meta.code)} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium ${m.mine ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-[#1e4e79] hover:bg-[#163c5e] text-white'}`}>
                    {hi ? 'रूम खोलें' : 'Open room'} · <span className="font-mono">{m.meta.code}</span>
                  </Link>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words select-text">{m.text}</p>
              )}
              <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${m.mine ? 'text-white/70' : 'text-slate-400'}`}>
                {m.mine && <button type="button" onClick={() => del(m.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 mr-1 cursor-pointer" aria-label={hi ? 'हटाएं' : 'Delete'}><Trash2 className="h-3 w-3" /></button>}
                {timeOf(m.createdAt, hi)}
                {m.mine && (m.read ? <CheckCheck className="h-3.5 w-3.5 text-sky-300" aria-label={hi ? 'पढ़ा गया' : 'Read'} /> : <Check className="h-3.5 w-3.5" aria-label={hi ? 'भेजा गया' : 'Sent'} />)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        {error && <p className="text-xs text-[#b02a37] mb-2">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={e => setText(e.target.value.slice(0, 2000))} rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            className={`${inputCls} h-auto min-h-10 max-h-32 py-2 resize-none`} placeholder={hi ? 'संदेश लिखें…' : 'Write a message…'} aria-label={hi ? 'संदेश' : 'Message'} />
          <button type="button" onClick={send} disabled={sending || !text.trim()} className={`${btnPrimary} h-10 px-3`} aria-label={hi ? 'भेजें' : 'Send'}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FriendsTab({ hi, chatWith, onChat }: { hi: boolean; chatWith: string | null; onChat: (userId: string | null) => void }) {
  const [data, setData] = useState<FriendsData | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<(Person & { relation: Relation }) | null | undefined>(undefined);
  const [searchError, setSearchError] = useState('');
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try { setData(await roomApi<FriendsData>('friends-get')); setError(''); }
    catch (e: any) { setError(e.message); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15000);
    return () => clearInterval(t);
  }, [load]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true); setSearchError(''); setFound(undefined);
    try { setFound((await roomApi<{ user: (Person & { relation: Relation }) | null }>('friends-search', { query })).user); }
    catch (err: any) { setSearchError(err.message); }
    finally { setSearching(false); }
  };

  const act = async (action: string, userId: string, extra: Record<string, unknown> = {}) => {
    setBusy(action + userId);
    try {
      const r = await roomApi<{ relation?: Relation }>(action, { friendId: userId, ...extra });
      if (found && found.userId === userId && r.relation) setFound({ ...found, relation: r.relation });
      await load();
    } catch (e: any) {
      setSearchError(e.message);
    } finally {
      setBusy('');
    }
  };

  const friends = useMemo(() => {
    const list = [...(data?.friends || [])];
    list.sort((a, b) => (b.unread - a.unread) || (Number(b.online) - Number(a.online))
      || ((b.lastMessage ? new Date(b.lastMessage.at).getTime() : 0) - (a.lastMessage ? new Date(a.lastMessage.at).getTime() : 0))
      || a.name.localeCompare(b.name));
    const f = filter.trim().toLowerCase();
    return f ? list.filter(x => x.name.toLowerCase().includes(f) || x.code.toLowerCase().includes(f)) : list;
  }, [data, filter]);
  const active = data?.friends.find(f => f.userId === chatWith) || null;
  const onlineCount = (data?.friends || []).filter(f => f.online).length;

  const copyCode = async () => {
    if (!data?.myCode) return;
    try { await navigator.clipboard.writeText(data.myCode); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };

  const relationButton = (p: Person & { relation: Relation }) => {
    const b = busy.endsWith(p.userId);
    switch (p.relation) {
      case 'self': return <StatusBadge tone="slate">{hi ? 'यह आप हैं' : "That's you"}</StatusBadge>;
      case 'friends': return <button type="button" onClick={() => onChat(p.userId)} className={`${btnSecondary} h-8 px-3 text-xs`}><MessageSquare className="h-3.5 w-3.5" />{hi ? 'चैट' : 'Chat'}</button>;
      case 'outgoing': return <button type="button" onClick={() => act('friends-remove', p.userId)} disabled={b} className={`${btnSecondary} h-8 px-3 text-xs`}>{hi ? 'अनुरोध रद्द करें' : 'Cancel request'}</button>;
      case 'incoming': return (
        <span className="flex items-center gap-1.5">
          <button type="button" onClick={() => act('friends-respond', p.userId, { accept: true })} disabled={b} className={`${btnPrimary} h-8 px-3 text-xs`}><Check className="h-3.5 w-3.5" />{hi ? 'स्वीकार' : 'Accept'}</button>
          <button type="button" onClick={() => act('friends-respond', p.userId, { accept: false })} disabled={b} className={rejectCls} aria-label={hi ? 'अस्वीकार' : 'Reject'} title={hi ? 'अस्वीकार' : 'Reject'}><X className="h-4 w-4" /></button>
        </span>
      );
      default: return <button type="button" onClick={() => act('friends-request', p.userId)} disabled={b} className={`${btnPrimary} h-8 px-3 text-xs`}><UserPlus className="h-3.5 w-3.5" />{hi ? 'अनुरोध भेजें' : 'Send request'}</button>;
    }
  };

  if (!data) {
    return <SectionCard><div className="text-sm text-slate-500 flex items-center gap-2">{error || <><Loader2 className="h-4 w-4 animate-spin" />{hi ? 'लोड हो रहा है…' : 'Loading…'}</>}</div></SectionCard>;
  }

  return (
    <div className="grid md:grid-cols-[360px_1fr] gap-6 items-start">
      {/* Left: one card with your code, add a friend, requests and the friend list
          (hidden on phones while a chat is open) */}
      <section data-tour="fr-friends" className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden ${active ? 'hidden md:block' : ''}`}>
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{hi ? 'मेरे मित्र' : 'My friends'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hi ? `${data.friends.length} मित्र · ` : `${data.friends.length} ${data.friends.length === 1 ? 'friend' : 'friends'} · `}
              <span className={onlineCount ? 'text-green-600 dark:text-green-400' : ''}>{onlineCount} {hi ? 'ऑनलाइन' : 'online'}</span>
            </p>
          </div>
          {data.myCode && (
            <div className="text-right" data-tour="fr-code">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{hi ? 'आपका मित्र कोड' : 'Your Friend code'}</div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-sm font-semibold tracking-wider text-slate-900 dark:text-white">{data.myCode}</span>
                <button type="button" onClick={copyCode} className="p-1 rounded text-slate-400 hover:text-[#1e4e79] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title={hi ? 'कॉपी करें' : 'Copy'} aria-label={hi ? 'कोड कॉपी करें' : 'Copy code'}>
                  {copied ? <Check className="h-3.5 w-3.5 text-[#1e7e34]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add a friend */}
        <div data-tour="fr-add" className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/60 dark:bg-slate-900/40">
          <form onSubmit={search} className="flex gap-2">
            <div className="relative flex-1">
              <UserPlus className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input value={query} onChange={e => { setQuery(e.target.value); setFound(undefined); setSearchError(''); }} className={`${inputCls} pl-9`}
                placeholder={hi ? 'मित्र कोड या ईमेल से जोड़ें' : 'Add by Friend code or email'} aria-label={hi ? 'मित्र कोड या ईमेल' : 'Friend code or email'} />
            </div>
            <button type="submit" disabled={searching || query.trim().length < 4} className={`${btnPrimary} shrink-0 px-3`} aria-label={hi ? 'खोजें' : 'Search'}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </form>
          {searchError && <p className="text-xs text-[#b02a37]">{searchError}</p>}
          {found === null && <p className="text-xs text-slate-500">{hi ? 'इस कोड या ईमेल से कोई नहीं मिला।' : 'No one found with that code or email.'}</p>}
          {found && (
            <div className="flex items-center gap-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
              <PersonAvatar id={found.userId} name={found.name} online={found.online} size={32} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{found.name}</div>
                <div className="text-[11px] font-mono text-slate-500 truncate">{found.code}</div>
              </div>
              {relationButton(found)}
            </div>
          )}
        </div>

        {/* Requests to you */}
        {data.incoming.length > 0 && (
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {hi ? 'मित्र अनुरोध' : 'Friend requests'}
              <span className="h-4.5 min-w-4.5 px-1 rounded-full bg-[#b02a37] text-white text-[10px] flex items-center justify-center normal-case">{data.incoming.length}</span>
            </div>
            <ul>
              {data.incoming.map(r => (
                <li key={r.userId} className="px-4 py-2 flex items-center gap-3">
                  <PersonAvatar id={r.userId} name={r.name} online={r.online} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.name}</div>
                    <div className="text-[11px] text-slate-500">{hi ? 'आपको मित्र बनाना चाहते हैं' : 'Wants to be your friend'}</div>
                  </div>
                  <button type="button" onClick={() => act('friends-respond', r.userId, { accept: true })} disabled={!!busy} className={`${btnPrimary} h-8 px-3 text-xs`}><Check className="h-3.5 w-3.5" />{hi ? 'स्वीकार' : 'Accept'}</button>
                  <button type="button" onClick={() => act('friends-respond', r.userId, { accept: false })} disabled={!!busy} className={rejectCls} aria-label={hi ? 'अस्वीकार' : 'Reject'} title={hi ? 'अस्वीकार' : 'Reject'}><X className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Friend list */}
        {data.friends.length > 8 && (
          <div className="px-4 pt-3"><input value={filter} onChange={e => setFilter(e.target.value)} className={`${inputCls} h-9`} placeholder={hi ? 'मित्र खोजें' : 'Find a friend'} aria-label={hi ? 'मित्र खोजें' : 'Find a friend'} /></div>
        )}
        {data.friends.length === 0 ? (
          <div data-tour="fr-list" className="px-5 py-8 text-center text-sm text-slate-500 space-y-2">
            <Users className="h-8 w-8 text-slate-300 mx-auto" />
            <p>{hi ? 'अभी कोई मित्र नहीं। अपना मित्र कोड दोस्तों को भेजें या ऊपर उनका कोड डालें।' : 'No friends yet. Send your Friend code to friends, or enter theirs above.'}</p>
          </div>
        ) : (
          <ul data-tour="fr-list" className="max-h-[60vh] overflow-y-auto py-1">
            {friends.map(f => (
              <li key={f.userId}>
                <button type="button" onClick={() => onChat(f.userId)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 cursor-pointer border-l-2 ${chatWith === f.userId ? 'bg-[#eef3f8] dark:bg-slate-800 border-[#1e4e79]' : 'border-transparent hover:bg-[#f8fafc] dark:hover:bg-slate-800/40'}`}>
                  <PersonAvatar id={f.userId} name={f.name} online={f.online} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${f.unread ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-800 dark:text-slate-200'}`}>{f.name}</span>
                      {f.lastMessage && <span className="text-[11px] text-slate-400 shrink-0">{timeOf(f.lastMessage.at, hi)}</span>}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`text-xs truncate ${f.unread ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500'}`}>
                        {f.lastMessage ? `${f.lastMessage.mine ? (hi ? 'आप: ' : 'You: ') : ''}${f.lastMessage.text}` : <span className={f.online ? 'text-green-600 dark:text-green-400' : ''}>{lastSeenText(f, hi)}</span>}
                      </span>
                      {f.unread > 0 && <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#1e4e79] text-white text-[11px] font-semibold flex items-center justify-center shrink-0">{f.unread}</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Requests you sent */}
        {data.outgoing.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-800 pb-1">
            <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{hi ? 'भेजे गए अनुरोध' : 'Requests you sent'}</div>
            <ul>
              {data.outgoing.map(r => (
                <li key={r.userId} className="px-4 py-2 flex items-center gap-3">
                  <PersonAvatar id={r.userId} name={r.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-800 dark:text-slate-200 truncate">{r.name}</div>
                    <div className="text-[11px] text-slate-500">{hi ? 'जवाब का इंतज़ार' : 'Waiting for a reply'}</div>
                  </div>
                  <button type="button" onClick={() => act('friends-remove', r.userId)} disabled={!!busy} className={`${btnSecondary} h-8 px-3 text-xs`}>{hi ? 'रद्द करें' : 'Cancel'}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Right: chat */}
      <div className={active ? '' : 'hidden md:block'}>
        <section data-tour="fr-chat" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          {active ? (
            <ChatPane key={active.userId} friend={active} hi={hi} onBack={() => onChat(null)} onRemoved={() => { onChat(null); load(); }} onActivity={load} />
          ) : (
            <div className="h-[70vh] min-h-[420px] flex flex-col items-center justify-center text-center gap-3 px-6 text-slate-500">
              <MessageSquare className="h-10 w-10 text-slate-300" />
              <p className="text-sm">{hi ? 'चैट शुरू करने के लिए कोई मित्र चुनें।' : 'Choose a friend to start chatting.'}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
