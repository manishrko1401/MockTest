"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Check, Clock, Copy, Crown, DoorOpen, Link2, Loader2, LogIn, MessageCircle, MessageSquare, Play, Plus, Radio, Share2, UserCheck, UserPlus, Users, X, XCircle } from 'lucide-react';
import { PersonAvatar } from '../FriendsTab';
import { useAuth } from '../../AuthContext';
import { SiteHeader, SiteFooter, PageTitle, SectionCard, StatusBadge, btnPrimary, btnSecondary, inputCls, pageBg, container } from '../../components/SiteUI';
import MathJaxLoader from '../../components/MathJaxLoader';
import { generateExamSession } from '../../lib/examUtils';
import type { Question } from '../../useTestEngine';
import Comparison from './Comparison';
import QuestionDiscussion from './QuestionDiscussion';
import { RoomData, RoomError, SITE_ORIGIN, colorFor, initials, roomApi, roomUrl, timeLeft } from '../shared';

// -----------------------------------------------------------------------------
// One friends room: invite friends, the lobby (live rooms), taking the test, and after you
// finish, the comparison with everyone and a discussion on each question.
// The page refreshes itself every few seconds (who joined / finished, live start).
// -----------------------------------------------------------------------------

export default function FriendsRoomPage() {
  const params = useParams();
  const code = String(params?.code || '').toUpperCase();
  const router = useRouter();
  const { currentUser: savedUser, language, examCatalog } = useAuth();
  const hi = language === 'hi';
  // Decide signed in / out only in the browser (the server can't know), so the first
  // screen matches the server's
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const currentUser = mounted ? savedUser : null;
  const [data, setData] = useState<RoomData | null>(null);
  const [error, setError] = useState<RoomError | null>(null);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState('');
  const [openQ, setOpenQ] = useState<number | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [questions, setQuestions] = useState<Record<string, Question> | null>(null);
  const prevStatus = useRef<string | null>(null);
  const [limitDraft, setLimitDraft] = useState('');
  const [limitNote, setLimitNote] = useState('');
  const [friendBusy, setFriendBusy] = useState('');
  const [friendNote, setFriendNote] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await roomApi<RoomData>('room-get', { code });
      setData(r);
      setError(null);
      if (r.messageCounts) setCounts(r.messageCounts);
      // Live room: the host pressed Start while you were waiting in the lobby
      if (prevStatus.current === 'lobby' && r.room.status === 'open' && r.me.isMember && !r.me.finished) {
        router.push(`/exam/${r.room.testId}`);
      }
      prevStatus.current = r.room.status;
    } catch (e: any) {
      setError(e instanceof RoomError ? e : new RoomError(String(e?.message || e)));
    }
  }, [code, router]);

  useEffect(() => {
    if (!currentUser) return;
    load();
  }, [currentUser, load]);

  // Keep it fresh: quickly in the lobby, slower once you're looking at results
  const finished = !!data?.me.finished;
  const status = data?.room.status;
  useEffect(() => {
    if (!currentUser || !data || status === 'closed') return;
    const every = status === 'lobby' ? 3000 : finished ? 20000 : 6000;
    const t = setInterval(() => { if (document.visibilityState === 'visible' && openQ === null) load(); }, every);
    return () => clearInterval(t);
  }, [currentUser, data, status, finished, openQ, load]);

  // Question text for the discussion view (answers are included once you've submitted)
  useEffect(() => {
    if (!finished || questions || !data) return;
    fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get-custom-questions', data: { testId: data.room.testId } }) })
      .then(r => r.json())
      .then(j => {
        if (!j?.success || !j.questions) return;
        const session = generateExamSession(data.room.testId, examCatalog, {
          questions: j.questions, positiveMarks: j.positiveMarks, negativeMarks: j.negativeMarks, durationMinutes: j.durationMinutes,
          questionsCount: j.questionsCount, maxMarks: j.maxMarks, sections: j.sections,
        });
        setQuestions(Object.fromEntries(session.questions.map(q => [q.id, q])));
      })
      .catch(() => {});
  }, [finished, questions, data, examCatalog]);

  const saveLimit = async () => {
    setLimitNote('');
    try {
      await roomApi('room-set-limit', { code, maxMembers: Number(limitDraft) });
      setLimitDraft('');
      setLimitNote(hi ? 'सेव हो गया' : 'Saved');
      await load();
    } catch (e: any) {
      setLimitNote(e.message);
    }
  };

  // Friend requests from the member list, and adding friends straight into the room
  const friendAct = async (action: string, userId: string, extra: Record<string, unknown> = {}) => {
    setFriendBusy(action + userId); setFriendNote('');
    try { await roomApi(action, { friendId: userId, ...extra }); await load(); }
    catch (e: any) { setFriendNote(e.message); }
    finally { setFriendBusy(''); }
  };
  const addFriend = (userId: string) => friendAct('room-add-friend', userId, { code });

  const act = async (action: string, then?: () => void) => {
    setBusy(action); setActionError('');
    try { await roomApi(action, { code }); then ? then() : await load(); }
    catch (e: any) { setActionError(e.message); }
    finally { setBusy(''); }
  };

  const link = `${SITE_ORIGIN}${roomUrl(code)}`;
  const inviteText = data
    ? (hi
      ? `मेरे साथ Mock Test Hub पर "${data.room.testTitle}" दो! रूम कोड: ${code}\n${link}`
      : `Take "${data.room.testTitle}" with me on Mock Test Hub! Room code: ${code}\n${link}`)
    : link;
  const copy = async (what: 'code' | 'link') => {
    try { await navigator.clipboard.writeText(what === 'code' ? code : link); setCopied(what); setTimeout(() => setCopied(''), 1800); } catch {}
  };
  const share = async () => {
    try { await navigator.share({ title: 'Mock Test Hub', text: inviteText }); } catch { /* closed */ }
  };
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const moveQ = useCallback((d: number) => setOpenQ(i => (i === null || !data?.comparison ? i : Math.min(data.comparison.questions.length - 1, Math.max(0, i + d)))), [data?.comparison]);
  const onCount = useCallback((qid: string, n: number) => setCounts(c => (c[qid] === n ? c : { ...c, [qid]: n })), []);

  const members = data?.members || [];
  const doneCount = members.filter(m => m.finished).length;
  const crumbs = [{ label: hi ? 'होम' : 'Home', href: '/' }, { label: hi ? 'दोस्तों के साथ टेस्ट' : 'Test with Friends', href: '/friends' }, { label: code }];

  const shell = (body: React.ReactNode) => (
    <div className={`min-h-screen flex flex-col ${pageBg} font-sans`}>
      <SiteHeader />
      <MathJaxLoader />
      {body}
      <SiteFooter />
    </div>
  );

  if (!mounted) return shell(<main className="flex-1" />);

  if (!currentUser) {
    return shell(
      <main className={`${container} w-full flex-1 py-16`}>
        <SectionCard className="max-w-md mx-auto">
          <div className="text-center py-4 space-y-3">
            <Users className="h-9 w-9 text-[#1e4e79] mx-auto" />
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">{hi ? 'आपको एक टेस्ट रूम में बुलाया गया है' : "You've been invited to a test room"}</h1>
            <p className="text-sm text-slate-500">{hi ? 'जुड़ने के लिए लॉग इन करें या खाता बनाएं।' : 'Log in or create a free account to join.'} <span className="font-mono">{code}</span></p>
            <Link href={`/auth?redirect=${encodeURIComponent(roomUrl(code))}`} className={btnPrimary}><LogIn className="h-4 w-4" />{hi ? 'लॉग इन' : 'Log in'}</Link>
          </div>
        </SectionCard>
      </main>
    );
  }

  if (error && !data) {
    return shell(
      <main className={`${container} w-full flex-1 py-16`}>
        <SectionCard className="max-w-md mx-auto">
          <div className="text-center py-4 space-y-3">
            <XCircle className="h-8 w-8 text-slate-400 mx-auto" />
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">{error.status === 404 ? (hi ? 'रूम नहीं मिला' : 'Room not found') : (hi ? 'रूम नहीं खुल सका' : "Couldn't open the room")}</h1>
            <p className="text-sm text-slate-500">{error.message}</p>
            <div className="flex justify-center gap-2">
              <button type="button" onClick={load} className={btnSecondary}>{hi ? 'फिर कोशिश करें' : 'Try again'}</button>
              <Link href="/friends" className={btnPrimary}>{hi ? 'मेरे रूम' : 'My rooms'}</Link>
            </div>
          </div>
        </SectionCard>
      </main>
    );
  }

  if (!data) {
    return shell(
      <main className="flex-1 flex items-center justify-center py-24 text-sm text-slate-500 gap-2"><Loader2 className="h-5 w-5 animate-spin" />{hi ? 'रूम खुल रहा है…' : 'Opening the room…'}</main>
    );
  }

  const { room, me } = data;
  const modeBadge = room.mode === 'live'
    ? <StatusBadge tone="blue"><Radio className="h-3 w-3 inline mr-1" />{hi ? 'लाइव' : 'Live'}</StatusBadge>
    : <StatusBadge tone="slate"><Clock className="h-3 w-3 inline mr-1" />{hi ? 'कभी भी' : 'Anytime'}</StatusBadge>;
  const statusText = room.status === 'closed' ? (hi ? 'रूम बंद हो गया' : 'Room closed')
    : room.status === 'lobby' ? (hi ? 'होस्ट के शुरू करने का इंतज़ार' : 'Waiting for the host to start')
    : room.closesAt ? timeLeft(room.closesAt, hi) : '';

  // ---- Not a member yet: join card ----
  if (!me.isMember) {
    const host = members.find(m => m.isHost);
    return shell(
      <main className={`${container} w-full flex-1 py-12`}>
        <SectionCard className="max-w-lg mx-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2">{modeBadge}<span className="text-xs text-slate-500">{statusText}</span></div>
            <div>
              <p className="text-sm text-slate-500">{hi ? `${host?.name || 'आपके दोस्त'} ने आपको बुलाया है` : `${host?.name || 'Your friend'} invited you to take`}</p>
              <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{room.testTitle}</h1>
              <p className="text-sm text-slate-500 mt-1">{room.durationMinutes} min · {members.length}/{room.maxMembers} {hi ? 'दोस्त जुड़े' : 'joined'}{room.locked ? ' · PRO' : ''}</p>
            </div>
            <div className="flex -space-x-2">
              {members.slice(0, 10).map((m, i) => (
                <span key={i} title={m.name} className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 text-[11px] font-bold text-white flex items-center justify-center" style={{ background: colorFor(m.name + i) }}>{initials(m.name)}</span>
              ))}
            </div>
            {actionError && <p className="text-sm text-[#b02a37]">{actionError}</p>}
            {room.status === 'closed' ? (
              <p className="text-sm text-slate-500">{hi ? 'यह रूम बंद हो चुका है।' : 'This room has closed.'}</p>
            ) : members.length >= room.maxMembers ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">{hi ? `यह रूम भर गया है (${room.maxMembers} दोस्त)। होस्ट से सीमा बढ़ाने को कहें।` : `This room is full (${room.maxMembers} friends). Ask the host to raise the limit.`}</p>
            ) : (
              <button type="button" onClick={() => act('room-join')} disabled={!!busy} className={`${btnPrimary} w-full`}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}{hi ? 'रूम में जुड़ें' : 'Join room'}
              </button>
            )}
            {room.locked && <p className="text-xs text-slate-500">{hi ? 'यह PRO टेस्ट है, इसमें जुड़ने के लिए PRO चाहिए।' : 'This is a PRO test; you need PRO to join.'}</p>}
          </div>
        </SectionCard>
      </main>
    );
  }

  const comparison = data.comparison;
  return shell(
    <>
      <PageTitle
        crumbs={crumbs}
        title={room.testTitle}
        subtitle={<span className="flex flex-wrap items-center gap-2">{modeBadge}<span>{statusText}</span><span>· {doneCount}/{members.length} {hi ? 'ने पूरा किया' : 'finished'}</span></span>}
        actions={me.isHost && room.status !== 'closed'
          ? <button type="button" onClick={() => { if (confirm(hi ? 'रूम बंद करें? इसके बाद कोई नया दोस्त नहीं जुड़ सकेगा।' : 'Close the room? Nobody new can join or take the test for this room after that.')) act('room-close'); }} disabled={!!busy} className={btnSecondary}><DoorOpen className="h-4 w-4" />{hi ? 'रूम बंद करें' : 'Close room'}</button>
          : (!me.isHost && !me.finished ? <button type="button" onClick={() => act('room-leave', () => router.push('/friends'))} disabled={!!busy} className={btnSecondary}>{hi ? 'रूम छोड़ें' : 'Leave room'}</button> : undefined)}
      />

      <main className={`${container} w-full flex-1 py-6 space-y-6`}>
        {actionError && <p className="text-sm text-[#b02a37]">{actionError}</p>}

        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* What to do now */}
          <SectionCard>
            {me.finished ? (
              <div className="flex items-start gap-3">
                <span className="h-10 w-10 rounded-full bg-green-50 dark:bg-green-950/30 text-[#1e7e34] flex items-center justify-center shrink-0"><Check className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">{hi ? 'आपने टेस्ट पूरा कर लिया' : "You've finished the test"}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {doneCount < members.length
                      ? (hi ? 'जैसे-जैसे दोस्त टेस्ट पूरा करेंगे, नीचे की तुलना अपने आप अपडेट होगी।' : 'The comparison below updates by itself as your friends finish.')
                      : (hi ? 'सबने टेस्ट पूरा कर लिया। नीचे तुलना देखें और प्रश्नों पर चर्चा करें।' : 'Everyone has finished. Compare below and discuss the questions.')}
                  </p>
                </div>
              </div>
            ) : room.status === 'closed' ? (
              <p className="text-sm text-slate-500">{hi ? 'यह रूम बंद हो गया और आपका टेस्ट इसमें नहीं गिना गया।' : "This room has closed before you finished, so your result isn't in it."}</p>
            ) : room.status === 'lobby' ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="h-10 w-10 rounded-full bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-blue-300 flex items-center justify-center shrink-0"><Radio className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">{me.isHost ? (hi ? 'जब सब आ जाएं, टेस्ट शुरू करें' : 'Start when everyone is here') : (hi ? 'होस्ट के शुरू करने का इंतज़ार…' : 'Waiting for the host to start…')}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{me.isHost
                      ? (hi ? 'Start दबाते ही सबके लिए टेस्ट खुल जाएगा।' : 'When you press Start, the test opens for everyone in the room.')
                      : (hi ? 'यह पेज खुला रखें; टेस्ट अपने आप खुल जाएगा।' : 'Keep this page open; the test opens by itself.')}</p>
                  </div>
                </div>
                {me.isHost && (
                  <button type="button" onClick={() => act('room-start')} disabled={!!busy} className={btnPrimary}>
                    {busy === 'room-start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{hi ? 'सबके लिए टेस्ट शुरू करें' : 'Start the test for everyone'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">{room.mode === 'live' ? (hi ? 'टेस्ट शुरू हो गया!' : 'The test has started!') : (hi ? 'जब तैयार हों, टेस्ट दें' : 'Take the test when you are ready')}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {room.mode === 'live'
                      ? (hi ? 'अभी शुरू करें। रूम बंद होने से पहले जमा किया गया टेस्ट गिना जाएगा।' : 'Start now. Your test counts if you submit before the room closes.')
                      : (hi ? 'इस टेस्ट का आपका पहला प्रयास गिना जाएगा। जमा करने के बाद यहां लौटकर तुलना देखें।' : 'Your first attempt at this test counts. After submitting, come back here to compare.')}
                  </p>
                </div>
                <Link href={`/exam/${room.testId}`} className={btnPrimary}><Play className="h-4 w-4" />{hi ? 'टेस्ट शुरू करें' : 'Take the test'}</Link>
              </div>
            )}
          </SectionCard>

          {/* Invite */}
          <SectionCard title={hi ? 'दोस्तों को बुलाएं' : 'Invite friends'} description={`${members.length}/${room.maxMembers} ${hi ? 'जुड़े' : 'joined'}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-4 py-2.5">
                <span className="font-mono text-2xl font-semibold tracking-[0.25em] text-slate-900 dark:text-white">{code}</span>
                <button type="button" onClick={() => copy('code')} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label={hi ? 'कोड कॉपी करें' : 'Copy code'}>
                  {copied === 'code' ? <Check className="h-4 w-4 text-[#1e7e34]" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              {members.length >= room.maxMembers && room.status !== 'closed' && (
                <p className="text-xs text-amber-700 dark:text-amber-400">{hi ? 'रूम भर गया है।' : 'The room is full.'}{me.isHost ? (hi ? ' और दोस्तों के लिए सीमा बढ़ाएं।' : ' Raise the limit to let more friends in.') : ''}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`} target="_blank" rel="noopener noreferrer" className={`${btnSecondary} justify-center`}><MessageCircle className="h-4 w-4 text-[#1e7e34]" />WhatsApp</a>
                <button type="button" onClick={() => copy('link')} className={`${btnSecondary} justify-center`}>{copied === 'link' ? <Check className="h-4 w-4 text-[#1e7e34]" /> : <Link2 className="h-4 w-4" />}{copied === 'link' ? (hi ? 'कॉपी हुआ' : 'Copied') : (hi ? 'लिंक कॉपी' : 'Copy link')}</button>
                {canShare && <button type="button" onClick={share} className={`${btnSecondary} justify-center col-span-2`}><Share2 className="h-4 w-4" />{hi ? 'शेयर करें' : 'Share'}</button>}
              </div>
              {room.status !== 'closed' && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{hi ? 'अपने मित्रों में से जोड़ें' : 'Add from your friends'}</div>
                  {(data.friendsToAdd || []).length === 0 ? (
                    <p className="text-xs text-slate-500">
                      {hi ? 'जोड़ने के लिए कोई मित्र नहीं। ' : 'No friends to add. '}
                      <Link href="/friends?tab=friends" className="text-[#1e4e79] dark:text-blue-400 hover:underline">{hi ? 'मित्र जोड़ें' : 'Add friends'}</Link>
                    </p>
                  ) : (
                    <ul className="space-y-1 max-h-56 overflow-y-auto -mx-1 px-1">
                      {(data.friendsToAdd || []).map(f => (
                        <li key={f.userId} className="flex items-center gap-2.5 py-1">
                          <PersonAvatar id={f.userId} name={f.name} online={f.online} size={30} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-slate-800 dark:text-slate-200 truncate">{f.name}</span>
                            <span className={`block text-[11px] ${f.online ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>{f.online ? (hi ? 'ऑनलाइन' : 'Online') : (hi ? 'ऑफ़लाइन' : 'Offline')}</span>
                          </span>
                          <button type="button" onClick={() => addFriend(f.userId)} disabled={!!friendBusy || members.length >= room.maxMembers}
                            className={`${btnSecondary} h-8 px-2.5 text-xs`}>
                            {friendBusy === 'room-add-friend' + f.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}{hi ? 'जोड़ें' : 'Add'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {me.isHost && room.status !== 'closed' && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{hi ? `कितने दोस्त जुड़ सकते हैं (${room.minLimit}–${room.maxLimit})` : `Friends limit (${room.minLimit}–${room.maxLimit})`}</label>
                  <div className="flex gap-2">
                    <input type="number" inputMode="numeric" min={Math.max(room.minLimit, members.length)} max={room.maxLimit}
                      value={limitDraft || String(room.maxMembers)}
                      onChange={e => { setLimitDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 2)); setLimitNote(''); }}
                      className={`${inputCls} h-9`} aria-label={hi ? 'दोस्तों की सीमा' : 'Friends limit'} />
                    <button type="button" onClick={saveLimit} disabled={!limitDraft || Number(limitDraft) === room.maxMembers} className={`${btnSecondary} shrink-0`}>{hi ? 'सेव' : 'Save'}</button>
                  </div>
                  {limitNote && <p className={`mt-1.5 text-xs ${limitNote === 'Saved' || limitNote === 'सेव हो गया' ? 'text-[#1e7e34]' : 'text-[#b02a37]'}`}>{limitNote}</p>}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Members */}
        <SectionCard title={hi ? 'रूम में' : 'In this room'} bodyClass="px-5 sm:px-6 py-4">
          <ul className="flex flex-wrap gap-2.5">
            {members.map(m => (
              <li key={m.userId} className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 pl-1 pr-3 py-1 text-sm">
                <span className="h-7 w-7 rounded-full text-[11px] font-bold text-white flex items-center justify-center" style={{ background: colorFor(m.userId || m.name) }}>{initials(m.name)}</span>
                <span className="text-slate-800 dark:text-slate-200">{m.userId === currentUser.id ? (hi ? 'आप' : 'You') : m.name}</span>
                {m.isHost && <Crown className="h-3.5 w-3.5 text-amber-500" aria-label={hi ? 'होस्ट' : 'Host'} />}
                {m.finished ? <Check className="h-3.5 w-3.5 text-[#1e7e34]" aria-label={hi ? 'पूरा' : 'Finished'} /> : <span className="text-xs text-slate-400">{hi ? 'बाकी' : 'pending'}</span>}
                {m.userId && m.relation === 'none' && (
                  <button type="button" onClick={() => friendAct('friends-request', m.userId!)} disabled={!!friendBusy} title={hi ? 'मित्र अनुरोध भेजें' : 'Send friend request'}
                    className="ml-1 inline-flex items-center gap-1 h-6 px-2 rounded-full bg-[#eef3f8] dark:bg-slate-800 text-[#1e4e79] dark:text-blue-300 text-xs font-medium hover:bg-[#dfe9f3] cursor-pointer">
                    <UserPlus className="h-3 w-3" />{hi ? 'मित्र बनाएं' : 'Add friend'}
                  </button>
                )}
                {m.relation === 'outgoing' && <span className="ml-1 text-xs text-slate-400">{hi ? 'अनुरोध भेजा' : 'Requested'}</span>}
                {m.userId && m.relation === 'incoming' && (
                  <button type="button" onClick={() => friendAct('friends-respond', m.userId!, { accept: true })} disabled={!!friendBusy}
                    className="ml-1 inline-flex items-center gap-1 h-6 px-2 rounded-full bg-[#1e4e79] text-white text-xs font-medium cursor-pointer">
                    <UserCheck className="h-3 w-3" />{hi ? 'अनुरोध स्वीकारें' : 'Accept request'}
                  </button>
                )}
                {m.userId && m.relation === 'incoming' && (
                  <button type="button" onClick={() => friendAct('friends-respond', m.userId!, { accept: false })} disabled={!!friendBusy}
                    className="h-6 w-6 inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-[#b02a37] hover:border-[#b02a37]/40 cursor-pointer"
                    aria-label={hi ? 'अनुरोध अस्वीकार करें' : 'Reject request'} title={hi ? 'अनुरोध अस्वीकार करें' : 'Reject request'}>
                    <X className="h-3 w-3" />
                  </button>
                )}
                {m.userId && m.relation === 'friends' && (
                  <Link href={`/friends?tab=friends&chat=${encodeURIComponent(m.userId)}`} title={hi ? 'चैट' : 'Chat'} className="ml-1 text-slate-400 hover:text-[#1e4e79]"><MessageSquare className="h-3.5 w-3.5" /></Link>
                )}
              </li>
            ))}
          </ul>
          {friendNote && <p className="mt-3 text-sm text-[#b02a37]">{friendNote}</p>}
        </SectionCard>

        {/* Results */}
        {me.finished && comparison ? (
          <Comparison data={comparison} members={members} meId={currentUser.id} hi={hi} messageCounts={counts} onOpenQuestion={setOpenQ} />
        ) : me.finished ? (
          <SectionCard><p className="text-sm text-slate-500">{hi ? 'तुलना लोड नहीं हो सकी।' : "The comparison couldn't be loaded."}</p></SectionCard>
        ) : (
          <SectionCard>
            <p className="text-sm text-slate-500">{hi
              ? 'निष्पक्षता के लिए दोस्तों के अंक, उत्तर और चर्चा आपका टेस्ट जमा होने के बाद दिखेंगे।'
              : "For fair play, your friends' marks, answers and the discussion appear after you submit your test."}</p>
          </SectionCard>
        )}
      </main>

      {openQ !== null && comparison && (
        <QuestionDiscussion
          code={code} index={openQ} comparison={comparison} members={members}
          question={questions ? questions[comparison.questions[openQ].id] || null : null}
          lang={hi ? 'hi' : 'en'} hi={hi} onClose={() => setOpenQ(null)} onMove={moveQ} onCountChange={onCount}
        />
      )}
    </>
  );
}
