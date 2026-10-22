import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Modal, Pressable, RefreshControl, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check, ChevronLeft, ChevronRight, Clock, Crown, DoorOpen, Hourglass, LogOut, MessageCircle, Play, Radio, Send, Share2, Trophy, UserPlus, X,
} from 'lucide-react-native';
import { friendlyError } from '../api';
import { setOnScreen } from '../push';
import { useData } from '../data';
import { useI18n } from '../i18n';
import { useNav } from '../nav';
import { useUser } from '../session';
import { useTheme } from '../theme';
import { Avatar, Banner, Button, Card, Chip, confirm, Empty, ErrorBox, Header, HeaderButton, IconButton, Pill, ProgressBar, SectionTitle, Skeleton, Tabs, StatusBarFor } from '../ui';
import QuestionView from '../QuestionView';
import { explanationOf, loadAnsweredSession, questionInput } from './AnalysisScreens';
import { api, colorFor, Comparison, fmtNum, fmtTime, LIMIT_PICKS, RoomData, RoomMessage, roomLink, timeLeft } from '../friendsApi';
import type { ActiveSession, Question } from '../shared/webTypes';

export default function RoomScreen({ code }: { code: string }) {
  const t = useTheme();
  // no phone banner for this room while it's open
  useEffect(() => { setOnScreen(`room-${code}`); return () => setOnScreen(null); }, [code]);
  const { hi, lang } = useI18n();
  const nav = useNav();
  const user = useUser();
  const [data, setData] = useState<RoomData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openQ, setOpenQ] = useState<number | null>(null);

  const load = useCallback(async () => {
    try { setData(await api<RoomData>('room-get', { code })); setError(''); }
    catch (e) { setError(friendlyError(e)); } finally { setRefreshing(false); }
  }, [code]);
  useEffect(() => { load(); }, [load]);
  // Fresh when coming back from the test
  const onTop = nav.stack[nav.stack.length - 1]?.name === 'room';
  useEffect(() => { if (onTop) load(); }, [onTop, load]);
  // Keep it fresh: quickly in the lobby, slower once you're looking at results
  const status = data?.room.status;
  const finished = !!data?.me.finished;
  useEffect(() => {
    if (!data || status === 'closed' || !onTop) return;
    const every = status === 'lobby' ? 3000 : finished ? 20000 : 6000;
    const timer = setInterval(() => { if (AppState.currentState === 'active' && openQ === null) load(); }, every);
    return () => clearInterval(timer);
  }, [data, status, finished, onTop, openQ, load]);

  const act = async (key: string, fn: () => Promise<any>, after?: () => void) => {
    setBusy(key);
    try { await fn(); after?.(); await load(); } catch (e) { setError(friendlyError(e)); } finally { setBusy(null); }
  };
  const invite = () => data && Share.share({
    message: hi ? `मेरे साथ "${data.room.testTitle}" दें! MockTest Hub पर रूम कोड ${code}: ${roomLink(code)}` : `Take "${data.room.testTitle}" with me! Room code ${code} on MockTest Hub: ${roomLink(code)}`,
  }).catch(() => {});

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Header title={`${hi ? 'रूम' : 'Room'} ${code}`} onBack={nav.pop} />
        {error ? <ErrorBox message={error} onRetry={load} /> : <View style={{ padding: 16 }}><Skeleton rows={3} height={110} /></View>}
      </View>
    );
  }
  const { room, me, members } = data;
  const finishedCount = members.filter(m => m.finished).length;

  // ---- Not a member: decide to join ----
  if (!me.isMember) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Header title={`${hi ? 'रूम' : 'Room'} ${code}`} onBack={nav.pop} />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {error ? <ErrorBox style={{ marginHorizontal: 0 }} message={error} /> : null}
          <Card>
            <Pill tone={room.mode === 'live' ? 'violet' : 'teal'} text={room.mode === 'live' ? (hi ? 'लाइव रूम' : 'Live room') : (hi ? 'कभी भी' : 'Anytime room')} />
            <Text style={{ color: t.text, fontSize: 19, fontWeight: '900', marginTop: 10, lineHeight: 25 }}>{room.testTitle}</Text>
            <Text style={{ color: t.textSoft, marginTop: 6 }}>{room.durationMinutes} {hi ? 'मिनट' : 'min'} · {members.length}/{room.maxMembers} {hi ? 'सदस्य' : 'members'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {members.map((m, i) => <Pill key={i} text={`${m.name}${m.isHost ? ` · ${hi ? 'होस्ट' : 'host'}` : ''}`} tone={m.isHost ? 'primary' : 'neutral'} />)}
            </View>
          </Card>
          {room.status === 'closed'
            ? <Banner style={{ marginTop: 14 }} tone="neutral" text={hi ? 'यह रूम बंद हो चुका है।' : 'This room has closed.'} />
            : <Button style={{ marginTop: 16 }} title={hi ? 'रूम में जुड़ें' : 'Join room'} icon={<DoorOpen size={18} color={t.primaryText} />} loading={busy === 'join'} onPress={() => act('join', () => api('room-join', { code }))} />}
        </ScrollView>
      </View>
    );
  }

  const startTest = () => nav.push({ name: 'examRun', testId: room.testId, lang, roomCode: code });
  const statusLine = room.status === 'lobby' ? (hi ? 'लॉबी: होस्ट के शुरू करने का इंतज़ार' : 'Lobby: waiting for the host to start')
    : room.status === 'closed' ? (hi ? 'रूम बंद' : 'Room closed')
      : room.closesAt ? timeLeft(room.closesAt, hi) : (hi ? 'टेस्ट चल रहा है' : 'Test is on');

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={`${hi ? 'रूम' : 'Room'} ${code}`} subtitle={room.testTitle} onBack={nav.pop}
        right={room.status !== 'closed' ? <HeaderButton label={hi ? 'बुलाएं' : 'Invite'} icon={<Share2 size={20} color={t.headerText} />} onPress={invite} /> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {error ? <ErrorBox style={{ marginHorizontal: 0 }} message={error} /> : null}

        {/* Status + main action */}
        <Card>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Pill tone={room.mode === 'live' ? 'violet' : 'teal'} icon={room.mode === 'live' ? <Radio size={11} color={t.violet} /> : <Clock size={11} color={t.teal} />} text={room.mode === 'live' ? (hi ? 'लाइव' : 'Live') : (hi ? 'कभी भी' : 'Anytime')} />
            {me.isHost ? <Pill tone="primary" icon={<Crown size={11} color={t.primary} />} text={hi ? 'आप होस्ट हैं' : 'You are the host'} /> : null}
            {me.finished ? <Pill tone="success" icon={<Check size={11} color={t.success} />} text={hi ? 'आपने दिया' : 'You finished'} /> : null}
          </View>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '900', marginTop: 10, lineHeight: 24 }}>{room.testTitle}</Text>
          <Text style={{ color: t.textSoft, marginTop: 4 }}>{statusLine}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1 }}><ProgressBar value={finishedCount / Math.max(1, members.length)} color={t.success} /></View>
            <Text style={{ color: t.textSoft, fontWeight: '700', fontSize: 12.5 }}>{finishedCount}/{members.length} {hi ? 'ने दिया' : 'finished'}</Text>
          </View>
          <View style={{ marginTop: 16 }}>
            {room.status === 'lobby' ? (
              me.isHost
                ? <Button title={hi ? 'सबके लिए टेस्ट शुरू करें' : 'Start the test for everyone'} icon={<Play size={18} color={t.primaryText} />} loading={busy === 'start'}
                    onPress={() => confirm(hi ? 'टेस्ट शुरू करें?' : 'Start the test?', hi ? 'सभी सदस्य अब टेस्ट शुरू कर सकेंगे।' : 'Every member can start the test now.', hi ? 'शुरू करें' : 'Start', () => act('start', () => api('room-start', { code }), startTest), false)} />
                : <Banner tone="violet" icon={<Hourglass size={18} color={t.violet} />} text={hi ? 'होस्ट के शुरू करते ही आप टेस्ट दे सकेंगे।' : 'You can start as soon as the host starts the test.'} />
            ) : !me.finished && room.status !== 'closed' ? (
              <Button title={hi ? 'टेस्ट दें' : 'Take the test'} icon={<Play size={18} color={t.primaryText} />} onPress={startTest} />
            ) : !me.finished ? (
              <Banner tone="neutral" text={hi ? 'रूम बंद हो गया, आपने टेस्ट नहीं दिया।' : 'The room closed before you took the test.'} />
            ) : null}
          </View>
        </Card>

        {/* Results */}
        {me.finished && data.comparison ? <ComparisonView data={data} meId={user.id} onOpenQuestion={setOpenQ} /> : null}
        {!me.finished && room.status !== 'lobby' && room.status !== 'closed' ? (
          <Banner style={{ marginTop: 12 }} tone="primary" icon={<Trophy size={18} color={t.primary} />}
            text={hi ? 'टेस्ट जमा करने के बाद आप सबके अंक, समय और हर प्रश्न की तुलना देखेंगे।' : 'After you submit, you’ll see everyone’s marks, time and a question-by-question comparison.'} />
        ) : null}

        {/* Invite */}
        {room.status !== 'closed' ? (
          <>
            <SectionTitle>{hi ? 'दोस्तों को बुलाएं' : 'Invite friends'}</SectionTitle>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textSoft, fontSize: 12.5, fontWeight: '700' }}>{hi ? 'रूम कोड' : 'Room code'}</Text>
                  <Text selectable style={{ color: t.text, fontSize: 26, fontWeight: '900', letterSpacing: 3 }}>{code}</Text>
                </View>
                <Button small soft title={hi ? 'शेयर' : 'Share'} icon={<Share2 size={16} color={t.primary} />} onPress={invite} />
              </View>
              {data.friendsToAdd?.length ? (
                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 10 }}>
                  <Text style={{ color: t.textSoft, fontWeight: '700', fontSize: 12.5, marginBottom: 4 }}>{hi ? 'अपनी मित्र सूची से जोड़ें' : 'Add from your friend list'}</Text>
                  {data.friendsToAdd.map(f => (
                    <View key={f.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                      <View>
                        <Avatar name={f.name} color={colorFor(f.userId)} size={36} />
                        {f.online ? <View style={{ position: 'absolute', right: -1, bottom: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: t.card }} /> : null}
                      </View>
                      <Text style={{ color: t.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>{f.name}</Text>
                      <Button small soft title={hi ? 'जोड़ें' : 'Add'} loading={busy === `add:${f.userId}`} onPress={() => act(`add:${f.userId}`, () => api('room-add-friend', { code, friendId: f.userId }))} />
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        {/* Members */}
        <SectionTitle>{hi ? 'सदस्य' : 'Members'} ({members.length}/{room.maxMembers})</SectionTitle>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {members.map((m, i) => (
            <View key={m.userId || i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
              <Avatar name={m.name} color={colorFor(m.userId || m.name)} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: '800' }} numberOfLines={1}>{m.name}{m.relation === 'self' ? (hi ? ' (आप)' : ' (you)') : ''}</Text>
                <Text style={{ color: m.finished ? t.success : t.textSoft, fontSize: 12.5, fontWeight: m.finished ? '700' : '400' }}>
                  {m.isHost ? `${hi ? 'होस्ट' : 'Host'} · ` : ''}{m.finished ? (hi ? 'टेस्ट दिया ✓' : 'Finished ✓') : (hi ? 'अभी बाकी' : 'Not yet')}
                </Text>
              </View>
              {m.userId && m.relation === 'none' ? <Button small soft title={hi ? 'मित्र बनाएं' : 'Add friend'} icon={<UserPlus size={14} color={t.primary} />} loading={busy === `fr:${m.userId}`} onPress={() => act(`fr:${m.userId}`, () => api('friends-request', { friendId: m.userId }))} /> : null}
              {m.userId && m.relation === 'incoming' ? <Button small title={hi ? 'स्वीकार' : 'Accept'} loading={busy === `fr:${m.userId}`} onPress={() => act(`fr:${m.userId}`, () => api('friends-respond', { friendId: m.userId, accept: true }))} /> : null}
              {m.relation === 'outgoing' ? <Pill text={hi ? 'अनुरोध भेजा' : 'Requested'} /> : null}
              {m.relation === 'friends' ? <Pill tone="success" text={hi ? 'मित्र' : 'Friend'} /> : null}
            </View>
          ))}
        </Card>

        {/* Host settings / leave */}
        {me.isHost && room.status !== 'closed' ? (
          <>
            <SectionTitle>{hi ? 'रूम सेटिंग' : 'Room settings'}</SectionTitle>
            <Card>
              <Text style={{ color: t.text, fontWeight: '800' }}>{hi ? 'अधिकतम सदस्य' : 'Most members'}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {LIMIT_PICKS.filter(n => n >= members.length).map(n => (
                  <Chip key={n} label={String(n)} on={room.maxMembers === n} onPress={() => act(`limit:${n}`, () => api('room-set-limit', { code, maxMembers: n }))} />
                ))}
              </View>
              <Button style={{ marginTop: 16 }} outline tone="danger" title={hi ? 'रूम बंद करें' : 'Close room'} icon={<X size={18} color={t.danger} />}
                onPress={() => confirm(hi ? 'रूम बंद करें?' : 'Close the room?', hi ? 'कोई और टेस्ट नहीं दे पाएगा। परिणाम बने रहेंगे।' : 'No one else can take the test. Results stay.', hi ? 'बंद करें' : 'Close', () => act('close', () => api('room-close', { code })))} />
            </Card>
          </>
        ) : !me.isHost && !me.finished && room.status !== 'closed' ? (
          <Button style={{ marginTop: 18 }} outline tone="neutral" title={hi ? 'रूम छोड़ें' : 'Leave room'} icon={<LogOut size={18} color={t.textSoft} />}
            onPress={() => confirm(hi ? 'रूम छोड़ें?' : 'Leave the room?', room.testTitle, hi ? 'छोड़ें' : 'Leave', () => act('leave', () => api('room-leave', { code }), nav.pop))} />
        ) : null}
      </ScrollView>

      {openQ !== null && data.comparison ? (
        <QuestionDiscussion code={code} data={data} index={openQ} meId={user.id} onIndex={setOpenQ} onClose={() => { setOpenQ(null); load(); }} />
      ) : null}
    </View>
  );
}

// ---- Comparison ---------------------------------------------------------------------------------

function ComparisonView({ data, meId, onOpenQuestion }: { data: RoomData; meId: string; onOpenQuestion: (i: number) => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const c = data.comparison as Comparison;
  const names = useMemo(() => new Map(data.members.filter(m => m.userId).map(m => [m.userId!, m.name])), [data.members]);
  // attempts under integrity review come last, without a rank
  const ranked = [...c.results].sort((a, b) => Number(!!a.underReview) - Number(!!b.underReview) || b.score - a.score || a.timeSeconds - b.timeSeconds);
  const [view, setView] = useState<'board' | 'sections' | 'questions'>('board');
  const [filter, setFilter] = useState<'all' | 'mine-wrong' | 'differ'>('all');
  const myIdx = c.results.findIndex(r => r.userId === meId);
  const counts = data.messageCounts || {};
  const rows = c.questions.map((q, i) => ({ q, i })).filter(({ i }) => {
    if (filter === 'all') return true;
    if (filter === 'mine-wrong') return myIdx >= 0 && c.results[myIdx].answers[i]?.[2] !== 1;
    const picks = new Set(c.results.map(r => r.answers[i]?.[0]));
    return picks.size > 1;
  });

  return (
    <>
      <SectionTitle>{hi ? 'परिणाम' : 'Results'}</SectionTitle>
      <Tabs options={[{ key: 'board', label: hi ? 'रैंक' : 'Ranks' }, { key: 'sections', label: hi ? 'सेक्शन' : 'Sections' }, { key: 'questions', label: hi ? 'प्रश्न' : 'Questions' }]} value={view} onChange={setView} style={{ marginBottom: 12 }} />

      {view === 'board' ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {ranked.map((r, i) => {
            const mine = r.userId === meId;
            return (
              <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderTopWidth: i ? 1 : 0, borderTopColor: t.border, backgroundColor: mine ? t.primarySoft : 'transparent' }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: r.underReview ? t.cardAlt : i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : t.cardAlt }}>
                  <Text style={{ color: !r.underReview && i < 3 ? '#fff' : t.textSoft, fontWeight: '900' }}>{r.underReview ? '–' : i + 1}</Text>
                </View>
                <Avatar name={names.get(r.userId)} color={colorFor(r.userId)} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: '800' }} numberOfLines={1}>{names.get(r.userId) || 'Student'}{mine ? (hi ? ' (आप)' : ' (you)') : ''}</Text>
                  {r.underReview ? <Text style={{ color: t.warning, fontSize: 11.5, fontWeight: '800' }}>{hi ? 'परिणाम जांच में' : 'Result under review'}</Text> : null}
                  <Text style={{ color: t.textSoft, fontSize: 12 }}>
                    <Text style={{ color: t.success }}>✓{r.correct}</Text>  <Text style={{ color: t.danger }}>✗{r.wrong}</Text>  –{r.skipped} · {fmtTime(r.timeSeconds)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: t.text, fontWeight: '900', fontSize: 17 }}>{fmtNum(r.score)}</Text>
                  <Text style={{ color: t.textMuted, fontSize: 11.5 }}>/ {fmtNum(r.maxScore)} · {Math.round(r.accuracy)}%</Text>
                </View>
              </View>
            );
          })}
        </Card>
      ) : view === 'sections' ? (
        <View style={{ gap: 10 }}>
          {c.sections.map(sec => (
            <Card key={sec.id}>
              <Text style={{ color: t.text, fontWeight: '800', marginBottom: 10 }}>{sec.name} <Text style={{ color: t.textMuted, fontWeight: '600' }}>· {sec.questions} {hi ? 'प्रश्न' : 'Qs'}</Text></Text>
              {ranked.map(r => {
                const s = r.sections[sec.id] || { score: 0, correct: 0, wrong: 0, skipped: 0, time: 0 };
                return (
                  <View key={r.userId} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <Text style={{ color: t.text, fontWeight: r.userId === meId ? '900' : '600', flex: 1 }} numberOfLines={1}>{names.get(r.userId) || 'Student'}</Text>
                      <Text style={{ color: t.text, fontWeight: '800' }}>{fmtNum(s.score)}<Text style={{ color: t.textMuted, fontWeight: '600' }}> / {fmtNum(sec.maxScore)} · {fmtTime(s.time)}</Text></Text>
                    </View>
                    <ProgressBar value={sec.maxScore ? s.score / sec.maxScore : 0} color={colorFor(r.userId)} height={7} />
                  </View>
                );
              })}
            </Card>
          ))}
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <Chip label={hi ? 'सभी' : 'All'} on={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label={hi ? 'मेरे गलत/छोड़े' : 'My wrong & skipped'} on={filter === 'mine-wrong'} onPress={() => setFilter('mine-wrong')} />
            <Chip label={hi ? 'अलग उत्तर' : 'Different answers'} on={filter === 'differ'} onPress={() => setFilter('differ')} />
          </View>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {rows.map(({ q, i }, k) => {
              const solved = c.results.filter(r => r.answers[i]?.[2] === 1).length;
              const n = counts[q.id] || 0;
              return (
                <Pressable key={q.id} onPress={() => onOpenQuestion(i)} style={({ pressed }) => ({ padding: 13, borderTopWidth: k ? 1 : 0, borderTopColor: t.border, backgroundColor: pressed ? t.cardAlt : 'transparent' })}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ color: t.text, fontWeight: '900', width: 40 }}>Q{q.n}</Text>
                    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                      {c.results.map(r => {
                        const a = r.answers[i] || [null, 0, null];
                        const bg = a[2] === 1 ? t.success : a[2] === 0 ? t.danger : t.cardAlt;
                        return (
                          <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, height: 24, borderRadius: 12, backgroundColor: bg + (a[2] === null ? '' : '22'), borderWidth: 1, borderColor: a[2] === null ? t.border : bg }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorFor(r.userId) }} />
                            <Text style={{ color: a[2] === null ? t.textMuted : bg, fontSize: 11, fontWeight: '800' }}>{a[0] === null ? '–' : String.fromCharCode(65 + a[0])} {Math.round(a[1])}s</Text>
                          </View>
                        );
                      })}
                    </View>
                    {n ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><MessageCircle size={14} color={t.primary} /><Text style={{ color: t.primary, fontWeight: '800', fontSize: 12 }}>{n}</Text></View> : <ChevronRight size={16} color={t.textMuted} />}
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: 11.5, marginTop: 5, marginLeft: 50 }}>{solved}/{c.results.length} {hi ? 'ने सही किया' : 'got it right'}</Text>
                </Pressable>
              );
            })}
            {rows.length === 0 ? <Empty title={hi ? 'कोई प्रश्न नहीं' : 'No questions here'} /> : null}
          </Card>
        </>
      )}
    </>
  );
}

// ---- One question: everyone's answers + the discussion ---------------------------------------------

function QuestionDiscussion({ code, data, index, meId, onIndex, onClose }: { code: string; data: RoomData; index: number; meId: string; onIndex: (i: number) => void; onClose: () => void }) {
  const t = useTheme();
  const { hi, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const { catalog } = useData();
  const c = data.comparison as Comparison;
  const cq = c.questions[index];
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<'question' | 'chat'>('question');
  const [messages, setMessages] = useState<RoomMessage[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const chatRef = useRef<ScrollView>(null);
  const names = useMemo(() => new Map(data.members.filter(m => m.userId).map(m => [m.userId!, m.name])), [data.members]);

  useEffect(() => { loadAnsweredSession(data.room.testId, catalog).then(setSession, e => setLoadError(friendlyError(e))); }, [data.room.testId, catalog]);
  const loadMessages = useCallback(async () => {
    try { setMessages((await api<{ messages: RoomMessage[] }>('room-messages', { code, questionId: cq.id })).messages || []); }
    catch (e) { setError(friendlyError(e)); }
  }, [code, cq.id]);
  useEffect(() => {
    setMessages(null); loadMessages();
    const timer = setInterval(() => { if (AppState.currentState === 'active') loadMessages(); }, 4000);
    return () => clearInterval(timer);
  }, [loadMessages]);

  const question: Question | undefined = session?.questions.find(x => x.id === cq.id);
  const me = c.results.find(r => r.userId === meId);
  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setError('');
    try { await api('room-send', { code, questionId: cq.id, text: body }); setText(''); await loadMessages(); setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100); }
    catch (e) { setError(friendlyError(e)); } finally { setSending(false); }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ backgroundColor: t.card, paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: t.border }}>
          <StatusBarFor color={t.card} />
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 6 }}>
            <IconButton label={hi ? 'बंद करें' : 'Close'} icon={<X size={22} color={t.text} />} onPress={onClose} style={{ backgroundColor: 'transparent' }} />
            <Text style={{ color: t.text, fontWeight: '900', fontSize: 16, flex: 1, marginLeft: 4 }}>{hi ? 'प्रश्न' : 'Question'} {cq.n} <Text style={{ color: t.textMuted, fontWeight: '700' }}>/ {c.questions.length}</Text></Text>
            <IconButton label={hi ? 'पिछला' : 'Previous'} icon={<ChevronLeft size={20} color={index === 0 ? t.textMuted : t.text} />} onPress={() => index > 0 && onIndex(index - 1)} style={{ backgroundColor: 'transparent' }} />
            <IconButton label={hi ? 'अगला' : 'Next'} icon={<ChevronRight size={20} color={index === c.questions.length - 1 ? t.textMuted : t.text} />} onPress={() => index < c.questions.length - 1 && onIndex(index + 1)} style={{ backgroundColor: 'transparent' }} />
          </View>
          {/* Everyone's answer */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 10, gap: 8 }}>
            {c.results.map(r => {
              const a = r.answers[index] || [null, 0, null];
              const col = a[2] === 1 ? t.success : a[2] === 0 ? t.danger : t.textMuted;
              return (
                <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 34, borderRadius: 17, backgroundColor: t.cardAlt }}>
                  <Avatar name={names.get(r.userId)} color={colorFor(r.userId)} size={22} />
                  <Text style={{ color: t.text, fontWeight: '700', fontSize: 12.5 }} numberOfLines={1}>{(names.get(r.userId) || '').split(' ')[0]}{r.userId === meId ? (hi ? ' (आप)' : ' (you)') : ''}</Text>
                  <Text style={{ color: col, fontWeight: '900', fontSize: 12.5 }}>{a[0] === null ? '–' : String.fromCharCode(65 + a[0])}{a[2] === 1 ? ' ✓' : a[2] === 0 ? ' ✗' : ''}</Text>
                  <Text style={{ color: t.textMuted, fontSize: 11.5 }}>{fmtTime(a[1])}</Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
            <Tabs options={[{ key: 'question', label: hi ? 'प्रश्न व हल' : 'Question & solution' }, { key: 'chat', label: `${hi ? 'चर्चा' : 'Discussion'}${messages?.length ? ` (${messages.length})` : ''}` }]} value={tab} onChange={setTab} />
          </View>
        </View>

        {tab === 'question' ? (
          question ? (
            <QuestionView
              pageKey={`${question.id}-room-${lang}`}
              {...questionInput(question, lang)}
              selected={null}
              review={{ correct: question.correctOptionIndex, chosen: me?.answers[index]?.[0] ?? null, explanation: explanationOf(question, lang) }}
              labels={{ passage: hi ? 'अनुच्छेद' : 'Passage', explanation: hi ? 'व्याख्या' : 'Solution', yourAnswer: hi ? 'आपका उत्तर' : 'Your answer', correct: hi ? 'सही उत्तर' : 'Correct answer', skipped: hi ? 'उत्तर नहीं दिया' : 'Not answered', right: hi ? 'सही' : 'Correct', wrong: hi ? 'गलत' : 'Wrong' }}
            />
          ) : loadError ? <ErrorBox message={loadError} /> : <ActivityIndicator color={t.primary} style={{ marginTop: 40 }} />
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            {error ? <ErrorBox message={error} /> : null}
            <ScrollView ref={chatRef} contentContainerStyle={{ padding: 14, gap: 8, flexGrow: 1 }} onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: false })}>
              {messages === null ? <ActivityIndicator color={t.primary} style={{ marginTop: 30 }} />
                : messages.length === 0 ? <Empty title={hi ? 'चर्चा शुरू करें' : 'Start the discussion'} text={hi ? 'अपना तरीका या शंका लिखें।' : 'Share how you solved it, or ask a doubt.'} icon={<MessageCircle size={30} color={t.textMuted} />} />
                  : messages.map(m => (
                    <Pressable key={m.id} onLongPress={m.canDelete ? () => confirm(hi ? 'संदेश हटाएं?' : 'Delete message?', m.text.slice(0, 80), hi ? 'हटाएं' : 'Delete', async () => { await api('room-delete-message', { code, id: m.id }).catch(() => {}); loadMessages(); }) : undefined}
                      style={{ flexDirection: m.mine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                      {!m.mine ? <Avatar name={m.name} color={colorFor(m.userId)} size={28} /> : null}
                      <View style={{ maxWidth: '80%', backgroundColor: m.mine ? t.primary : t.card, borderRadius: 16, borderWidth: m.mine ? 0 : 1, borderColor: t.border, paddingHorizontal: 12, paddingVertical: 8 }}>
                        {!m.mine ? <Text style={{ color: colorFor(m.userId), fontWeight: '800', fontSize: 12, marginBottom: 2 }}>{m.name}</Text> : null}
                        <Text selectable style={{ color: m.mine ? t.primaryText : t.text, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
                        <Text style={{ color: m.mine ? t.primaryText : t.textMuted, opacity: 0.75, fontSize: 10.5, marginTop: 2, alignSelf: 'flex-end' }}>{new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</Text>
                      </View>
                    </Pressable>
                  ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, paddingBottom: 10 + insets.bottom, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border }}>
              <TextInput value={text} onChangeText={setText} placeholder={hi ? 'इस प्रश्न पर लिखें…' : 'Write about this question…'} placeholderTextColor={t.textMuted} multiline maxLength={1000}
                style={{ flex: 1, maxHeight: 110, minHeight: 46, color: t.text, backgroundColor: t.bg, borderRadius: 23, paddingHorizontal: 16, paddingVertical: 11, fontSize: 15 }} />
              <Pressable onPress={send} disabled={!text.trim() || sending} accessibilityLabel={hi ? 'भेजें' : 'Send'}
                style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: text.trim() ? t.primary : t.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
                {sending ? <ActivityIndicator color={t.primaryText} size="small" /> : <Send size={20} color={text.trim() ? t.primaryText : t.textMuted} />}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

