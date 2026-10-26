import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Dimensions, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, CalendarCheck, GraduationCap, Keyboard, Trophy, UserRound, Users } from 'lucide-react-native';
import { request } from './api';
import { useI18n } from './i18n';
import { useSession } from './session';
import { useTheme } from './theme';
import { Button } from './ui';

// -----------------------------------------------------------------------------
// App tour. Welcome slides on the first start (what the app can do), then a few tips on the
// main screens the first time each is opened: the screen dims and a bubble points at the real
// button. Each part shows once per account (saved on the server, so not again after a
// reinstall or on another phone); Me → "Replay app tour" shows everything again.
// -----------------------------------------------------------------------------

export type AppTour = 'app_welcome' | 'app_home' | 'app_tests' | 'app_test_info' | 'app_analysis';
const ALL: AppTour[] = ['app_welcome', 'app_home', 'app_tests', 'app_test_info', 'app_analysis'];

/** fixed: the target never scrolls (e.g. the tab bar), so the page isn't scrolled for it */
export type TourStep = { target?: string; title: string; text: string; fixed?: boolean };

type Scroller = { ref: React.RefObject<any>; offset: number };
type Active = { tour: AppTour; steps: TourStep[]; index: number };

type TourValue = {
  /** Finished tours are known (from the server copy of the account) */
  known: boolean;
  isDone: (tour: AppTour) => boolean;
  /** The welcome slides are still to come or a tour is open (other pop-ups wait) */
  busy: boolean;
  start: (tour: AppTour, steps: TourStep[]) => void;
  register: (id: string, ref: React.RefObject<View | null>) => () => void;
  registerScroller: (tour: AppTour, s: Scroller) => () => void;
  replay: () => void;
};

const Ctx = createContext<TourValue | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user, patchUser } = useSession();
  const serverDone = user?.appTours;
  const known = Array.isArray(serverDone);
  const [localDone, setLocalDone] = useState<Set<string>>(new Set());
  const [replaying, setReplaying] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Active | null>(null);
  const targets = useRef(new Map<string, React.RefObject<View | null>>());
  const scrollers = useRef(new Map<AppTour, Scroller>());

  const isDone = useCallback((tour: AppTour) => {
    if (replaying.has(tour)) return false;
    return localDone.has(tour) || !!serverDone?.includes(tour);
  }, [localDone, replaying, serverDone]);

  const complete = useCallback((tour: AppTour) => {
    setLocalDone(s => new Set(s).add(tour));
    setReplaying(s => { const n = new Set(s); n.delete(tour); return n; });
    if (user && !user.appTours?.includes(tour)) {
      patchUser({ appTours: [...(user.appTours || []), tour] });
      request('complete-tour', { userId: user.id, tour }).catch(() => {});
    }
  }, [user, patchUser]);

  const value = useMemo<TourValue>(() => ({
    known,
    isDone,
    busy: !!active || (known && !isDone('app_welcome')),
    start: (tour, steps) => setActive(a => a || { tour, steps, index: 0 }),
    register: (id, ref) => { targets.current.set(id, ref); return () => { if (targets.current.get(id) === ref) targets.current.delete(id); }; },
    registerScroller: (tour, s) => { scrollers.current.set(tour, s); return () => { if (scrollers.current.get(tour) === s) scrollers.current.delete(tour); }; },
    replay: () => { setActive(null); setReplaying(new Set(ALL)); },
  }), [known, isDone, active]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {known && !isDone('app_welcome') ? <WelcomeSlides onDone={() => complete('app_welcome')} /> : null}
      {active ? (
        <Spotlight
          key={active.tour}
          active={active}
          targets={targets.current}
          scroller={scrollers.current.get(active.tour)}
          onIndex={index => setActive(a => (a ? { ...a, index } : a))}
          onClose={() => { complete(active.tour); setActive(null); }}
        />
      ) : null}
    </Ctx.Provider>
  );
}

export function useTour() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTour outside TourProvider');
  return v;
}

/** Marks a view the tour can point at. */
export function TourTarget({ id, children, style }: { id: string; children: React.ReactNode; style?: any }) {
  const tour = useContext(Ctx);
  const ref = useRef<View>(null);
  useEffect(() => tour?.register(id, ref), [tour, id]);
  return <View ref={ref} collapsable={false} style={style}>{children}</View>;
}

/** Props for the screen's ScrollView / FlatList, so the tour can scroll a tip's target into view. */
export function useTourScroll(tour: AppTour) {
  const ctx = useContext(Ctx);
  const ref = useRef<any>(null);
  const scroller = useRef<Scroller>({ ref, offset: 0 }).current;
  useEffect(() => ctx?.registerScroller(tour, scroller), [ctx, tour, scroller]);
  return {
    ref,
    scrollEventThrottle: 32,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => { scroller.offset = e.nativeEvent.contentOffset.y; },
  };
}

/** Starts a screen's tips once, when the screen is showing and ready. */
export function useScreenTour(tour: AppTour, steps: TourStep[], ready: boolean) {
  const ctx = useContext(Ctx);
  const startable = !!ctx && ready && ctx.known && !ctx.busy && !ctx.isDone(tour);
  useEffect(() => {
    if (!startable) return;
    const timer = setTimeout(() => ctx!.start(tour, steps), 700); // after the screen has drawn
    return () => clearTimeout(timer);
  }, [startable]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ---- Welcome slides -------------------------------------------------------------------------------

function WelcomeSlides({ onDone }: { onDone: () => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const insets = useSafeAreaInsets();
  const width = Dimensions.get('window').width;
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const slides: [any, string, string][] = hi ? [
    [Trophy, 'MockTest Hub में आपका स्वागत है', 'सरकारी परीक्षा की पूरी तैयारी एक ही ऐप में: मॉक टेस्ट, टाइपिंग टेस्ट, नौकरी की सूचनाएं और बहुत कुछ।'],
    [GraduationCap, 'मॉक टेस्ट', 'एसएससी, बैंकिंग, रेलवे, राज्य परीक्षाएं और भी। असली परीक्षा जैसी स्क्रीन, फिर पूरा विश्लेषण और हर प्रश्न का हल।'],
    [Keyboard, 'टाइपिंग टेस्ट', 'असली परीक्षा की तरह टाइपिंग का अभ्यास, अंग्रेज़ी और हिंदी में, गति और शुद्धता के साथ।'],
    [Bell, 'नौकरी की सूचनाएं', 'नए फ़ॉर्म, एडमिट कार्ड और रिज़ल्ट। नौकरियां सेव करें और जिनमें आवेदन किया उन्हें चिह्नित करें।'],
    [CalendarCheck, 'स्टडी प्लानर', 'अपनी परीक्षा की तारीख और रोज़ के लक्ष्य रखें, काम पूरे करें और अपनी प्रगति देखें।'],
    [Users, 'दोस्तों के साथ', 'टेस्ट रूम बनाएं, दोस्तों को बुलाएं, हर प्रश्न पर अंक और समय की तुलना करें और चैट करें।'],
    [UserRound, 'सब कुछ "मैं" में', 'ऑफ़लाइन टेस्ट के लिए डाउनलोड, डॉक्यूमेंट लॉकर, रेफ़र करके कमाएं, पास प्रो और सहायता: सब "मैं" टैब में।'],
  ] : [
    [Trophy, 'Welcome to MockTest Hub', 'Your complete government exam preparation in one app: mock tests, typing tests, job notices and more.'],
    [GraduationCap, 'Mock tests', 'SSC, Banking, Railways, State exams and more. A real exam screen, then a full analysis and the solution to every question.'],
    [Keyboard, 'Typing tests', 'Practise typing just like the real exam, in English and Hindi, with your speed and accuracy.'],
    [Bell, 'Job notices', 'New forms, admit cards and results. Save jobs and mark the ones you have applied for.'],
    [CalendarCheck, 'Study Planner', 'Set your exam date and daily targets, tick off tasks and watch your progress.'],
    [Users, 'With Friends', 'Create a test room, invite friends, compare marks and time on every question, and chat.'],
    [UserRound, 'Everything under Me', 'Downloads for offline tests, the Document Locker, refer & earn, Pass Pro and support: all in the Me tab.'],
  ];
  const last = page === slides.length - 1;
  const go = (p: number) => { pager.current?.scrollTo({ x: p * width, animated: true }); setPage(p); };

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onDone}>
      <View style={{ flex: 1, backgroundColor: '#1e4e79', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, height: 52, alignItems: 'center' }}>
          {!last ? (
            <Pressable onPress={onDone} hitSlop={10} accessibilityRole="button" style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 15 }}>{hi ? 'छोड़ें' : 'Skip'}</Text>
            </Pressable>
          ) : null}
        </View>
        <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ flex: 1 }}
          onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
          {slides.map(([Icon, title, text], i) => (
            <View key={i} style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }} accessible accessibilityLabel={`${title}. ${text}`}>
              <View style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={44} color="#1e4e79" strokeWidth={2.2} />
                </View>
              </View>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', marginTop: 32, lineHeight: 32 }}>{title}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, textAlign: 'center', marginTop: 14, lineHeight: 24 }}>{text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 22 }}>
          {slides.map((_, i) => <View key={i} style={{ width: i === page ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i === page ? '#fff' : 'rgba(255,255,255,0.35)' }} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 18 }}>
          {page > 0 ? <Button style={{ flex: 1, backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.6)' }} outline textColor="#fff" title={hi ? 'पीछे' : 'Back'} onPress={() => go(page - 1)} /> : null}
          <Button style={{ flex: 1.6, backgroundColor: '#fff' }} textColor="#1e4e79" title={last ? (hi ? 'शुरू करें' : 'Get started') : (hi ? 'आगे' : 'Next')} onPress={() => (last ? onDone() : go(page + 1))} />
        </View>
      </View>
    </Modal>
  );
}

// ---- Spotlight tips ------------------------------------------------------------------------------

type Rect = { x: number; y: number; w: number; h: number };

function measure(ref?: React.RefObject<View | null>): Promise<Rect | null> {
  return new Promise(resolve => {
    const node = ref?.current;
    if (!node) return resolve(null);
    node.measureInWindow((x, y, w, h) => resolve(w > 0 && h > 0 ? { x, y, w, h } : null));
  });
}
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

function Spotlight({ active, targets, scroller, onIndex, onClose }: {
  active: Active; targets: Map<string, React.RefObject<View | null>>; scroller?: Scroller; onIndex: (i: number) => void; onClose: () => void;
}) {
  const t = useTheme();
  const { hi } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = Dimensions.get('window');
  const [rect, setRect] = useState<Rect | null | undefined>(undefined);
  // Steps whose target isn't on this screen (e.g. no "Download" for a locked test) are left out
  const steps = useMemo(() => active.steps.filter(s => !s.target || targets.has(s.target)), [active.steps, targets]);
  const index = Math.min(active.index, steps.length - 1);
  const step = steps[index];
  const lastIndex = useRef(index);

  useEffect(() => {
    let alive = true;
    setRect(undefined);
    (async () => {
      const ref = step?.target ? targets.get(step.target) : undefined;
      let r = await measure(ref);
      // Bring it into view: not under the header, with room for the bubble
      if (r && !step?.fixed && scroller?.ref.current && (r.y < insets.top + 70 || r.y + r.h > H - 220)) {
        const y = Math.max(0, scroller.offset + r.y - H * 0.32);
        if (scroller.ref.current.scrollTo) scroller.ref.current.scrollTo({ y, animated: true });
        else scroller.ref.current.scrollToOffset?.({ offset: y, animated: true });
        await wait(420);
        r = await measure(ref);
      }
      if (!alive) return;
      // Its button isn't showing (e.g. no Download for this test): go on to the next tip
      if (!r && step?.target) {
        const back = index < lastIndex.current;
        const next = back ? index - 1 : index + 1;
        if (next < 0 || next >= steps.length) { if (back) onIndex(index + 1); else onClose(); }
        else onIndex(next);
        return;
      }
      lastIndex.current = index;
      setRect(r);
    })();
    return () => { alive = false; };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [onClose]);

  useEffect(() => { if (!step) onClose(); }, [step, onClose]);
  if (!step) return null;
  const last = index === steps.length - 1;
  const pad = 8;
  const hole = rect ? { x: Math.max(4, rect.x - pad), y: Math.max(4, rect.y - pad), w: Math.min(W - 8, rect.w + pad * 2), h: rect.h + pad * 2 } : null;
  const dim = 'rgba(4, 12, 24, 0.72)';
  const below = hole ? hole.y + hole.h + 14 : 0;
  const placeBelow = hole ? H - below > 230 : true;
  const bubbleStyle = hole
    ? (placeBelow ? { top: below } : { bottom: H - hole.y + 14 })
    : { top: H * 0.3 };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {rect === undefined ? <View style={{ flex: 1, backgroundColor: dim }} /> : hole ? (
          <>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: hole.y, backgroundColor: dim }} />
            <View style={{ position: 'absolute', left: 0, right: 0, top: hole.y + hole.h, bottom: 0, backgroundColor: dim }} />
            <View style={{ position: 'absolute', left: 0, width: hole.x, top: hole.y, height: hole.h, backgroundColor: dim }} />
            <View style={{ position: 'absolute', left: hole.x + hole.w, right: 0, top: hole.y, height: hole.h, backgroundColor: dim }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: 16, borderWidth: 2.5, borderColor: '#fff' }} />
          </>
        ) : <View style={{ flex: 1, backgroundColor: dim }} />}

        {rect !== undefined ? (
          <View style={{ position: 'absolute', left: 16, right: 16, ...bubbleStyle, backgroundColor: t.card, borderRadius: 18, padding: 18, elevation: 8 }} accessibilityLiveRegion="polite">
            <Text style={{ color: t.primary, fontSize: 12, fontWeight: '800' }}>{index + 1} / {steps.length}</Text>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '900', marginTop: 4 }}>{step.title}</Text>
            <Text style={{ color: t.textSoft, fontSize: 14.5, lineHeight: 21, marginTop: 6 }}>{step.text}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 }}>
              {!last ? (
                <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" style={{ paddingVertical: 8, paddingRight: 8 }}>
                  <Text style={{ color: t.textMuted, fontWeight: '800' }}>{hi ? 'छोड़ें' : 'Skip'}</Text>
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }} />
              {index > 0 ? <Button small outline title={hi ? 'पीछे' : 'Back'} onPress={() => onIndex(index - 1)} /> : null}
              <Button small title={last ? (hi ? 'समझ गया' : 'Got it') : (hi ? 'आगे' : 'Next')} onPress={() => (last ? onClose() : onIndex(index + 1))} />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
