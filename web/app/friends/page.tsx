"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Clock, Crown, HelpCircle, LogIn, MessageSquare, Radio, Search, Trash2, Trophy, Users, X, Zap } from 'lucide-react';
import { useAuth, MockTestItem } from '../AuthContext';
import { SiteHeader, SiteFooter, BackButton, SectionCard, StatusBadge, Field, btnPrimary, btnSecondary, inputCls, pageBg, container } from '../components/SiteUI';
import { isCbatTest } from '../lib/examScoring';
import { LIMIT_MAX, LIMIT_MIN, LIMIT_PICKS, MyRoom, RoomMode, roomApi, roomUrl, timeLeft } from './shared';
import FriendsTab from './FriendsTab';
import FriendsTour, { requestFriendsTourStart } from './FriendsTour';

// -----------------------------------------------------------------------------
// Test with Friends. Rooms tab: join a room with a code, create a room for any mock test
// (live or anytime), and see your rooms; /friends?test=<id> opens the create form for that
// test. Friends tab (/friends?tab=friends[&chat=<userId>]): friend list, requests and chat.
// -----------------------------------------------------------------------------

type PickTest = MockTestItem & { path: string };

const HOURS = [
  { value: 24, en: '1 day', hi: '1 दिन' },
  { value: 72, en: '3 days', hi: '3 दिन' },
  { value: 168, en: '7 days', hi: '7 दिन' },
];

function FriendsHub() {
  const { currentUser: savedUser, language, examCatalog } = useAuth();
  const hi = language === 'hi';
  // The server doesn't know who's signed in; decide only once running in the browser
  // (otherwise the first screen differs from the server's and React re-draws it)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const currentUser = mounted ? savedUser : null;
  const router = useRouter();
  const params = useSearchParams();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [rooms, setRooms] = useState<MyRoom[] | null>(null);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<PickTest | null>(null);
  const [mode, setMode] = useState<RoomMode>('anytime');
  const [hours, setHours] = useState(72);
  const [limit, setLimit] = useState('20');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const tab = params.get('tab') === 'friends' ? 'friends' : 'rooms';
  const chatWith = params.get('chat');
  const [badge, setBadge] = useState({ requests: 0, unread: 0 });
  const go = useCallback((t: 'rooms' | 'friends', chat?: string | null) =>
    router.replace(t === 'rooms' ? '/friends' : `/friends?tab=friends${chat ? `&chat=${encodeURIComponent(chat)}` : ''}`, { scroll: false }), [router]);
  const showRooms = useCallback(() => go('rooms'), [go]);
  const showFriends = useCallback(() => go('friends'), [go]);

  // Requests / unread messages on the Friends tab
  useEffect(() => {
    if (!currentUser) return;
    const check = () => roomApi<{ requests: number; unread: number }>('friends-badge').then(setBadge).catch(() => {});
    check();
    const t = setInterval(() => { if (document.visibilityState === 'visible') check(); }, 20000);
    return () => clearInterval(t);
  }, [currentUser, tab, chatWith]);

  // Every mock test in the catalog (CBAT can't be taken in a room)
  const allTests = useMemo<PickTest[]>(() => {
    const out: PickTest[] = [];
    const seen = new Set<string>();
    const add = (t: MockTestItem, path: string) => {
      if (!t?.id || seen.has(t.id) || isCbatTest(t.id, examCatalog)) return;
      seen.add(t.id);
      out.push({ ...t, path });
    };
    for (const cat of examCatalog || []) {
      for (const sub of cat.subCategories || []) {
        for (const ss of sub.subSubCategories || []) (ss.tests || []).forEach(t => add(t, `${sub.name} · ${ss.name}`));
        (sub.tests || []).forEach(t => add(t, `${cat.name} · ${sub.name}`));
      }
      (cat.tests || []).forEach(t => add(t, cat.name));
    }
    return out;
  }, [examCatalog]);

  // ?test=<id> (from a test card or the analysis page)
  useEffect(() => {
    const id = params.get('test');
    if (id && !picked) {
      const t = allTests.find(x => x.id === id);
      if (t) setPicked(t);
    }
  }, [params, allTests, picked]);

  useEffect(() => {
    if (!currentUser) return;
    roomApi<{ rooms: MyRoom[] }>('room-mine').then(r => setRooms(r.rooms)).catch(() => setRooms([]));
  }, [currentUser]);

  const results = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return allTests.filter(t => {
      const hay = `${t.title} ${t.titleHi || ''} ${t.path}`.toLowerCase();
      return words.every(w => hay.includes(w));
    }).slice(0, 30);
  }, [search, allTests]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(code)) { setJoinError(hi ? 'कोड 6 अक्षरों का होता है।' : 'A room code has 6 letters and numbers.'); return; }
    setJoining(true); setJoinError('');
    router.push(roomUrl(code));
  };

  const create = async () => {
    if (!picked) return;
    const maxMembers = Number(limit);
    if (!Number.isInteger(maxMembers) || maxMembers < LIMIT_MIN || maxMembers > LIMIT_MAX) {
      setCreateError(hi ? `दोस्तों की संख्या ${LIMIT_MIN} से ${LIMIT_MAX} के बीच चुनें।` : `Choose between ${LIMIT_MIN} and ${LIMIT_MAX} friends.`);
      return;
    }
    setCreating(true); setCreateError('');
    try {
      const r = await roomApi<{ code: string }>('room-create', { testId: picked.id, mode, hours, maxMembers });
      router.push(roomUrl(r.code));
    } catch (err: any) {
      setCreateError(err.message);
      setCreating(false);
    }
  };

  // Removes the room from your list only; it carries on for your friends
  const hideRoom = async (r: MyRoom) => {
    const msg = hi
      ? `"${r.testTitle}" (${r.code}) को मेरे रूम से हटाएं? यह सिर्फ़ आपकी सूची से हटेगा; दोस्तों के लिए रूम चलता रहेगा।`
      : `Remove "${r.testTitle}" (${r.code}) from My rooms? It's removed from your list only; the room carries on for your friends.`;
    if (!confirm(msg)) return;
    setRooms(list => (list || []).filter(x => x.code !== r.code));
    try { await roomApi('room-hide', { code: r.code }); }
    catch { roomApi<{ rooms: MyRoom[] }>('room-mine').then(x => setRooms(x.rooms)).catch(() => {}); }
  };

  const active = (rooms || []).filter(r => r.status !== 'closed');
  const past = (rooms || []).filter(r => r.status === 'closed');

  return (
    <div className={`min-h-screen flex flex-col ${pageBg} font-sans`}>
      <SiteHeader />
      <main className={`${container} w-full flex-1 py-6 space-y-6`}>
        {!mounted ? (
          <div className="py-16" />
        ) : !currentUser ? (
          <>
          <BackButton href="/" label={hi ? 'होम पर वापस जाएं' : 'Back to Home'} />
          <SectionCard>
            <div className="text-center py-6 space-y-3">
              <Users className="h-9 w-9 text-[#1e4e79] mx-auto" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{hi ? 'दोस्तों के साथ टेस्ट देने के लिए लॉग इन करें' : 'Log in to take tests with friends'}</h2>
              <Link href="/auth" className={btnPrimary}><LogIn className="h-4 w-4" />{hi ? 'लॉग इन' : 'Log in'}</Link>
            </div>
          </SectionCard>
          </>
        ) : (
          <>
            <FriendsTour ready={mounted && !!currentUser} showRooms={showRooms} showFriends={showFriends} />
            <div className="flex items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-end gap-2">
            <BackButton href="/" label={hi ? 'होम पर वापस जाएं' : 'Back to Home'} className="mb-1.5" />
            <div role="tablist" data-tour="fr-tabs" className="flex gap-1">
              {([
                { id: 'rooms', en: 'Test rooms', hi: 'टेस्ट रूम', n: 0 },
                { id: 'friends', en: 'Friends & chat', hi: 'मित्र और चैट', n: badge.requests + badge.unread },
              ] as const).map(t => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => go(t.id)}
                  className={`relative h-10 px-4 text-sm font-medium cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${tab === t.id ? 'border-[#1e4e79] text-[#1e4e79] dark:text-blue-300 dark:border-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                  {t.id === 'rooms' ? <Users className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                  {hi ? t.hi : t.en}
                  {t.n > 0 && <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#b02a37] text-white text-[11px] font-semibold flex items-center justify-center">{t.n > 99 ? '99+' : t.n}</span>}
                </button>
              ))}
            </div>
            </div>
              <button type="button" onClick={requestFriendsTourStart} className="mb-1.5 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-[#eef3f8] hover:text-[#1e4e79] dark:hover:bg-slate-800 cursor-pointer" title={hi ? 'यह कैसे काम करता है' : 'How it works'}>
                <HelpCircle className="h-4 w-4" /><span className="hidden sm:inline">{hi ? 'यह कैसे काम करता है' : 'How it works'}</span>
              </button>
            </div>

            {tab === 'friends' ? (
              <FriendsTab hi={hi} chatWith={chatWith} onChat={id => go('friends', id)} />
            ) : (
            <>
            <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
              <div className="space-y-6">
              {/* Create */}
              <div data-tour="fr-create"><SectionCard title={hi ? 'नया रूम बनाएं' : 'Create a room'} description={hi ? 'टेस्ट चुनें, फिर दोस्तों को लिंक भेजें।' : 'Pick a test, then send the link to your friends.'}>
                {!picked ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                      <input value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} pl-9`} placeholder={hi ? 'टेस्ट खोजें, जैसे SSC CGL Full Test 3' : 'Search a test, e.g. SSC CGL Full Test 3'} autoFocus />
                    </div>
                    {search && !results.length && <p className="text-sm text-slate-500">{hi ? 'कोई टेस्ट नहीं मिला।' : 'No tests found.'}</p>}
                    {results.length > 0 && (
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-md max-h-96 overflow-y-auto">
                        {results.map(t => (
                          <li key={t.id}>
                            <button type="button" onClick={() => setPicked(t)} className="w-full text-left px-4 py-3 hover:bg-[#eef3f8] dark:hover:bg-slate-800 flex items-center justify-between gap-3 cursor-pointer">
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-slate-900 dark:text-white truncate">{hi && t.titleHi ? t.titleHi : t.title}</span>
                                <span className="block text-xs text-slate-500 truncate">{t.path} · {t.questionsCount} Qs · {t.durationMinutes} min</span>
                              </span>
                              {t.requiredTier && t.requiredTier !== 'None' && <StatusBadge tone="amber">PRO</StatusBadge>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-3 rounded-md border border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-900/60">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{hi && picked.titleHi ? picked.titleHi : picked.title}</div>
                        <div className="text-xs text-slate-500">{picked.path} · {picked.questionsCount} Qs · {picked.durationMinutes} min</div>
                      </div>
                      <button type="button" onClick={() => { setPicked(null); setCreateError(''); }} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label={hi ? 'बदलें' : 'Change test'}><X className="h-4 w-4" /></button>
                    </div>

                    <Field label={hi ? 'कैसे देंगे?' : 'How will you take it?'}>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {([
                          { id: 'live', icon: Radio, en: 'Live, together', hi: 'लाइव, एक साथ', den: 'Everyone waits in a lobby; you press Start and all begin at the same time.', dhi: 'सब लॉबी में रुकते हैं; आप Start दबाते हैं और सब एक साथ शुरू करते हैं।' },
                          { id: 'anytime', icon: Clock, en: 'Anytime', hi: 'कभी भी', den: 'Friends take it whenever they like before the room closes.', dhi: 'रूम बंद होने से पहले दोस्त जब चाहें टेस्ट दें।' },
                        ] as const).map(o => (
                          <button key={o.id} type="button" onClick={() => setMode(o.id)}
                            className={`text-left rounded-md border px-4 py-3 cursor-pointer transition ${mode === o.id ? 'border-[#1e4e79] ring-2 ring-[#1e4e79]/15 bg-[#eef3f8] dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><o.icon className="h-4 w-4 text-[#1e4e79] dark:text-blue-400" />{hi ? o.hi : o.en}</span>
                            <span className="block mt-1 text-xs text-slate-500 dark:text-slate-400">{hi ? o.dhi : o.den}</span>
                          </button>
                        ))}
                      </div>
                    </Field>

                    {mode === 'anytime' && (
                      <Field label={hi ? 'रूम कितने समय खुला रहे' : 'Room stays open for'}>
                        <div className="flex gap-2">
                          {HOURS.map(h => (
                            <button key={h.value} type="button" onClick={() => setHours(h.value)}
                              className={`h-9 px-4 rounded-md border text-sm cursor-pointer ${hours === h.value ? 'border-[#1e4e79] bg-[#1e4e79] text-white' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>{hi ? h.hi : h.en}</button>
                          ))}
                        </div>
                      </Field>
                    )}

                    <Field label={hi ? 'कितने दोस्त जुड़ सकते हैं (आप सहित)' : 'How many friends can join (including you)'} hint={hi ? `${LIMIT_MIN} से ${LIMIT_MAX} तक। बाद में भी बदल सकते हैं।` : `${LIMIT_MIN} to ${LIMIT_MAX}. You can change it later.`}>
                      <div className="flex flex-wrap items-center gap-2">
                        {LIMIT_PICKS.map(n => (
                          <button key={n} type="button" onClick={() => setLimit(String(n))}
                            className={`h-9 min-w-12 px-3 rounded-md border text-sm cursor-pointer ${limit === String(n) ? 'border-[#1e4e79] bg-[#1e4e79] text-white' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>{n}</button>
                        ))}
                        <input type="number" inputMode="numeric" min={LIMIT_MIN} max={LIMIT_MAX} value={limit}
                          onChange={e => setLimit(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                          className="h-9 w-20 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#1e4e79] focus:ring-2 focus:ring-[#1e4e79]/15" aria-label={hi ? 'दोस्तों की संख्या' : 'Number of friends'} />
                      </div>
                    </Field>

                    {picked.requiredTier && picked.requiredTier !== 'None' && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">{hi ? 'यह PRO टेस्ट है: हर दोस्त के पास PRO होना चाहिए।' : 'This is a PRO test: each friend needs PRO to take it.'}</p>
                    )}
                    {createError && <p className="text-sm text-[#b02a37]">{createError}</p>}
                    <button type="button" onClick={create} disabled={creating} className={btnPrimary}>
                      <Users className="h-4 w-4" />{creating ? (hi ? 'बन रहा है…' : 'Creating…') : (hi ? 'रूम बनाएं' : 'Create room')}
                    </button>
                  </div>
                )}
              </SectionCard></div>

              {/* My rooms */}
              <div data-tour="fr-myrooms"><SectionCard title={hi ? 'मेरे रूम' : 'My rooms'} bodyClass="p-0">
                {rooms === null ? (
                  <p className="px-6 py-6 text-sm text-slate-500">{hi ? 'लोड हो रहा है…' : 'Loading…'}</p>
                ) : rooms.length === 0 ? (
                  <p className="px-6 py-6 text-sm text-slate-500">{hi ? 'अभी कोई रूम नहीं। ऊपर एक बनाएं या कोड से जुड़ें।' : 'No rooms yet. Create one above or join with a code.'}</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[...active, ...past].map(r => (
                      <li key={r.code} className="flex items-stretch hover:bg-[#f8fafc] dark:hover:bg-slate-800/40">
                        <Link href={roomUrl(r.code)} className="flex-1 min-w-0 pl-5 sm:pl-6 pr-2 py-3.5 flex items-center justify-between gap-4">
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                              <span className="truncate">{r.testTitle}</span>
                              {r.isHost && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-label={hi ? 'होस्ट' : 'Host'} />}
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-mono">{r.code}</span> · {r.mode === 'live' ? (hi ? 'लाइव' : 'Live') : (hi ? 'कभी भी' : 'Anytime')} · {r.members} {hi ? 'दोस्त' : r.members === 1 ? 'member' : 'members'}
                              {r.status === 'open' && r.closesAt ? ` · ${timeLeft(r.closesAt, hi)}` : ''}
                            </span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            {r.finished ? <StatusBadge tone="green">{hi ? 'पूरा' : 'Finished'}</StatusBadge>
                              : r.status === 'closed' ? <StatusBadge tone="slate">{hi ? 'बंद' : 'Closed'}</StatusBadge>
                              : r.status === 'lobby' ? <StatusBadge tone="blue">{hi ? 'लॉबी' : 'Lobby'}</StatusBadge>
                              : <StatusBadge tone="amber">{hi ? 'टेस्ट बाकी' : 'Test pending'}</StatusBadge>}
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                          </span>
                        </Link>
                      <button type="button" onClick={() => hideRoom(r)} className="shrink-0 px-3 sm:px-4 text-slate-400 hover:text-[#b02a37] cursor-pointer"
                        title={hi ? 'मेरे रूम से हटाएं' : 'Remove from My rooms'} aria-label={hi ? `${r.code} को मेरे रूम से हटाएं` : `Remove ${r.code} from My rooms`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                    ))}
                  </ul>
                )}
              </SectionCard></div>
              </div>

              <div className="space-y-6">
                {/* Join */}
                <div data-tour="fr-join"><SectionCard title={hi ? 'रूम में जुड़ें' : 'Join a room'}>
                  <form onSubmit={join} className="space-y-3">
                    <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                      className={`${inputCls} font-mono tracking-[0.3em] text-center text-lg uppercase`} placeholder="ABC123" aria-label={hi ? 'रूम कोड' : 'Room code'} />
                    {joinError && <p className="text-sm text-[#b02a37]">{joinError}</p>}
                    <button type="submit" disabled={joining} className={`${btnPrimary} w-full`}>{hi ? 'जुड़ें' : 'Join'}<ArrowRight className="h-4 w-4" /></button>
                  </form>
                </SectionCard></div>

                {/* How it works */}
                <SectionCard title={hi ? 'कैसे काम करता है' : 'How it works'}>
                  <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    {[
                      { icon: Users, en: 'Create a room and share the link or code.', hi: 'रूम बनाएं और लिंक या कोड शेयर करें।' },
                      { icon: Zap, en: 'Everyone takes the same test on their own device.', hi: 'सब अपने डिवाइस पर वही टेस्ट देते हैं।' },
                      { icon: Trophy, en: 'See the leaderboard, sections and time on every question.', hi: 'लीडरबोर्ड, विषय और हर प्रश्न पर समय देखें।' },
                      { icon: MessageSquare, en: 'Discuss any question with your friends.', hi: 'किसी भी प्रश्न पर दोस्तों से चर्चा करें।' },
                    ].map((s, i) => (
                      <li key={i} className="flex gap-3"><s.icon className="h-4 w-4 mt-0.5 shrink-0 text-[#1e4e79] dark:text-blue-400" />{hi ? s.hi : s.en}</li>
                    ))}
                  </ol>
                  <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{hi ? 'निष्पक्षता: दूसरों के उत्तर और चर्चा अपना टेस्ट जमा करने के बाद ही दिखते हैं।' : "Fair play: friends' answers and the discussion open only after you submit your own test."}</p>
                </SectionCard>
              </div>
            </div>

            </>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

export default function FriendsPage() {
  return <Suspense fallback={null}><FriendsHub /></Suspense>;
}
