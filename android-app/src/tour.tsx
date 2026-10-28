import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Dimensions, LayoutChangeEvent, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, CalendarCheck, CloudDownload, GraduationCap, Keyboard, MonitorCheck, Radio, Trophy, UserRound, Users } from 'lucide-react-native';
import { request } from './api';
import { useI18n } from './i18n';
import { useSession } from './session';
import { useTheme } from './theme';
import { Button } from './ui';

// -----------------------------------------------------------------------------
// App tour. Welcome slides on the first start (what the app can do), then tips on each main
// screen the first time it is opened: the screen dims and a bubble points at the real button.
// Each part shows once per account (saved on the server, so not again after a reinstall or on
// another phone); Me → "Replay app tour" shows everything again.
// -----------------------------------------------------------------------------

export type AppTour =
  | 'app_welcome' | 'app_home' | 'app_tests' | 'app_typing' | 'app_test_info' | 'app_exam' | 'app_analysis'
  | 'app_planner' | 'app_friends' | 'app_me';
const ALL: AppTour[] = ['app_welcome', 'app_home', 'app_tests', 'app_typing', 'app_test_info', 'app_exam', 'app_analysis', 'app_planner', 'app_friends', 'app_me'];

/** fixed: the target never scrolls (header, tab bar, exam bars), so the page isn't scrolled for it */
export type TourStep = { target?: string; title: string; text: string; fixed?: boolean };

type Scroller = { ref: React.RefObject<any>; offset: number };
type Active = { tour: AppTour; steps: TourStep[]; index: number };

type TourValue = {
  /** Finished tours are known (from the server copy of the account) */
  known: boolean;
  isDone: (tour: AppTour) => boolean;
  /** The welcome slides are still to come or a tour is open (other pop-ups wait) */
  busy: boolean;
  /** The tour showing now (the exam pauses its timer for it) */
  activeTour: AppTour | null;
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
    activeTour: active?.tour ?? null,
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
          // A tour counts as seen only if at least one tip was shown (otherwise it comes back next time)
          onClose={shown => { if (shown) complete(active.tour); setActive(null); }}
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
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  useEffect(() => {
    if (!startable) return;
    const timer = setTimeout(() => ctx!.start(tour, stepsRef.current), 800); // after the screen has drawn
    return () => clearTimeout(timer);
  }, [startable]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ---- Welcome slides -------------------------------------------------------------------------------

function WelcomeSlides({ onDone }: { onDone: () => void }) {
  const { hi } = useI18n();
  const insets = useSafeAreaInsets();
  const width = Dimensions.get('window').width;
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const slides: [any, string, string][] = hi ? [
    [Trophy, 'MockTest Hub में आपका स्वागत है', 'सरकारी परीक्षा की पूरी तैयारी एक ही ऐप में: मॉक टेस्ट, लाइव टेस्ट, टाइपिंग टेस्ट, नौकरी की सूचनाएं और स्टडी प्लानर।'],
    [GraduationCap, 'मॉक टेस्ट', 'एसएससी, बैंकिंग, रेलवे, राज्य परीक्षाएं और भी। हर टेस्ट हिंदी और अंग्रेज़ी में, हर बार प्रश्न और विकल्प नए क्रम में।'],
    [MonitorCheck, 'असली परीक्षा जैसी स्क्रीन', 'टाइमर, प्रश्न सूची, रिव्यू के लिए मार्क और सेक्शन: बिल्कुल असली CBT जैसा। बीच में छोड़ें तो बाद में वहीं से जारी रखें।'],
    [Radio, 'लाइव टेस्ट', 'हर बार प्रश्न बैंक से बिल्कुल नया प्रश्न पत्र। परिणाम और हल तुरंत देखें। पास प्रो सदस्यों के लिए।'],
    [Keyboard, 'टाइपिंग टेस्ट', 'असली परीक्षा की तरह टाइपिंग का अभ्यास, अंग्रेज़ी और हिंदी में, गति (WPM) और गलतियों के पूरे विवरण के साथ।'],
    [CalendarCheck, 'स्टडी प्लानर', 'परीक्षा की तारीख डालें, रोज़ के टास्क और लक्ष्य बनाएं, पूरे होने पर टिक करें और अपनी प्रगति देखें।'],
    [Users, 'दोस्तों के साथ', 'टेस्ट रूम बनाएं, दोस्तों को कोड भेजें, एक ही टेस्ट दें और अंक, रैंक व समय की तुलना करें। दोस्तों से चैट भी करें।'],
    [CloudDownload, 'ऑफ़लाइन भी', 'टेस्ट डाउनलोड करें और बिना इंटरनेट दें। नौकरी की सूचनाएं, डॉक्यूमेंट लॉकर, रेफ़र करके कमाएं और सहायता: सब "मैं" टैब में।'],
  ] : [
    [Trophy, 'Welcome to MockTest Hub', 'Your complete government exam preparation in one app: mock tests, live tests, typing tests, job notices and a study planner.'],
    [GraduationCap, 'Mock tests', 'SSC, Banking, Railways, State exams and more. Every test in Hindi and English, with questions and options in a new order each time.'],
    [MonitorCheck, 'A real exam screen', 'Timer, question palette, mark for review and sections, just like the real CBT. Leave in the middle and continue later where you stopped.'],
    [Radio, 'Live tests', 'A brand-new paper from the question bank every time. See your result and the solutions straight away. For Pass Pro members.'],
    [Keyboard, 'Typing tests', 'Practise typing just like the real exam, in English and Hindi, with your speed (WPM) and every mistake shown.'],
    [CalendarCheck, 'Study Planner', 'Add your exam date, make daily tasks and targets, tick them off and watch your progress.'],
    [Users, 'With Friends', 'Create a test room, send friends the code, take the same test and compare marks, rank and time. Chat with friends too.'],
    [CloudDownload, 'Works offline too', 'Download tests and take them without internet. Job notices, the Document Locker, refer & earn and support: all under the Me tab.'],
  ];
  const last = page === slides.length - 1;
  const go = (p: number) => { pager.current?.scrollTo({ x: p * width, animated: true }); setPage(p); };

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onDone}>
      <View style={{ flex: 1, backgroundColor: '#1e4e79', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 52 }}>
          <Text style={{ flex: 1, color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: 13 }}>{page + 1} / {slides.length}</Text>
          {!last ? (
            <Pressable onPress={onDone} hitSlop={10} accessibilityRole="button" style={{ paddingHorizontal: 4, paddingVertical: 8 }}>
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
              <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 16, textAlign: 'center', marginTop: 14, lineHeight: 24 }}>{text}</Text>
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

/** The target, measured a few times while the screen finishes drawing. */
async function measureWithRetry(ref?: React.RefObject<View | null>): Promise<Rect | null> {
  for (let i = 0; i < 6; i++) {
    const r = await measure(ref);
    if (r) return r;
    await wait(150);
  }
  return null;
}

function Spotlight({ active, targets, scroller, onIndex, onClose }: {
  active: Active; targets: Map<string, React.RefObject<View | null>>; scroller?: Scroller; onIndex: (i: number) => void; onClose: (shown: boolean) => void;
}) {
  const t = useTheme();
  const { hi } = useI18n();
  const insets = useSafeAreaInsets();
  // Where this overlay sits in the window. Button positions are measured in the window too, and the
  // overlay (drawn under the status bar) may not start at 0: everything is placed relative to it.
  const rootRef = useRef<View>(null);
  const [frame, setFrame] = useState<Rect | null>(null);
  const [rect, setRect] = useState<Rect | null | undefined>(undefined);
  const [bubbleH, setBubbleH] = useState(0);
  const shownRef = useRef(false);
  // Only the tips whose button is really on this screen (e.g. no "Download" for a locked test),
  // checked once the overlay is up, so the count and the last "Got it" are right
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  useEffect(() => {
    if (!frame || steps) return;
    let alive = true;
    (async () => {
      const out: TourStep[] = [];
      for (const s of active.steps) {
        if (!s.target) { out.push(s); continue; }
        if (!targets.has(s.target)) continue;
        if (await measureWithRetry(targets.get(s.target))) out.push(s);
      }
      if (alive) setSteps(out);
    })();
    return () => { alive = false; };
  }, [frame]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = steps || [];
  const index = Math.min(active.index, Math.max(0, list.length - 1));
  const step: TourStep | undefined = list[index];
  const lastIndex = useRef(index);
  const close = useCallback(() => onClose(shownRef.current), [onClose]);

  const onRootLayout = (_e: LayoutChangeEvent) => {
    rootRef.current?.measureInWindow((x, y, w, h) => setFrame({ x, y, w: w || Dimensions.get('window').width, h: h || Dimensions.get('window').height }));
  };

  useEffect(() => {
    if (!frame || !steps || !step) return;
    let alive = true;
    setRect(undefined);
    (async () => {
      const ref = step.target ? targets.get(step.target) : undefined;
      let r = step.target ? await measureWithRetry(ref) : null;
      // Bring it into view: below the header, with room for the bubble
      const H = frame.h;
      if (r && !step.fixed && scroller?.ref.current) {
        const top = r.y - frame.y;
        if (top < insets.top + 64 || top + Math.min(r.h, H * 0.45) > H - 240) {
          const y = Math.max(0, scroller.offset + top - H * 0.22);
          if (scroller.ref.current.scrollTo) scroller.ref.current.scrollTo({ y, animated: true });
          else scroller.ref.current.scrollToOffset?.({ offset: y, animated: true });
          await wait(450);
          r = await measureWithRetry(ref);
        }
      }
      if (!alive) return;
      // Its button isn't showing (e.g. no Download for this test): go on to the next tip
      if (!r && step.target) {
        const back = index < lastIndex.current;
        const next = back ? index - 1 : index + 1;
        if (next < 0 || next >= list.length) { if (back) onIndex(index + 1); else close(); }
        else onIndex(next);
        return;
      }
      lastIndex.current = index;
      shownRef.current = true;
      setRect(r);
    })();
    return () => { alive = false; };
  }, [step, frame, steps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => sub.remove();
  }, [close]);

  // Nothing to show on this screen: close without counting the tour as seen
  useEffect(() => { if (steps && !step) close(); }, [steps, step, close]);

  const last = index === list.length - 1;
  const H = frame?.h || Dimensions.get('window').height;
  const W = frame?.w || Dimensions.get('window').width;
  const pad = 8;
  // The highlighted area, in this overlay's coordinates, kept on screen
  const hole = rect && frame ? (() => {
    const x = Math.max(4, rect.x - frame.x - pad);
    const y = Math.max(4, rect.y - frame.y - pad);
    const right = Math.min(W - 4, rect.x - frame.x + rect.w + pad);
    const bottom = Math.min(H - 4, rect.y - frame.y + rect.h + pad);
    return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
  })() : null;
  const dim = 'rgba(4, 12, 24, 0.74)';
  const need = (bubbleH || 210) + 18;
  const topLimit = insets.top + 8;
  const bottomLimit = H - insets.bottom - 8;
  const placement: 'below' | 'above' | 'over' | 'center' = !hole ? 'center'
    : bottomLimit - (hole.y + hole.h) >= need ? 'below'
      : hole.y - topLimit >= need ? 'above' : 'over';
  const bubbleTop = !hole ? Math.max(topLimit, H * 0.3)
    : placement === 'below' ? hole.y + hole.h + 14
      : placement === 'above' ? hole.y - 14 - (bubbleH || 210)
        : bottomLimit - (bubbleH || 210);
  const arrowX = hole ? Math.max(28, Math.min(W - 44, hole.x + hole.w / 2 - 16 - 8)) : 0;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View ref={rootRef} collapsable={false} onLayout={onRootLayout} style={{ flex: 1 }}>
        {rect === undefined || !hole ? <View style={{ flex: 1, backgroundColor: dim }} /> : (
          <>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: hole.y, backgroundColor: dim }} />
            <View style={{ position: 'absolute', left: 0, right: 0, top: hole.y + hole.h, bottom: 0, backgroundColor: dim }} />
            <View style={{ position: 'absolute', left: 0, width: hole.x, top: hole.y, height: hole.h, backgroundColor: dim }} />
            <View style={{ position: 'absolute', left: hole.x + hole.w, right: 0, top: hole.y, height: hole.h, backgroundColor: dim }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: 16, borderWidth: 2.5, borderColor: '#fff' }} />
          </>
        )}

        {rect !== undefined && step ? (
          <View
            onLayout={e => { const h = e.nativeEvent.layout.height; if (Math.abs(h - bubbleH) > 1) setBubbleH(h); }}
            style={{ position: 'absolute', left: 16, right: 16, top: bubbleTop, backgroundColor: t.card, borderRadius: 18, padding: 18, elevation: 10, opacity: bubbleH ? 1 : 0 }}
            accessibilityLiveRegion="polite">
            {placement === 'below' ? <View style={{ position: 'absolute', top: -8, left: arrowX, width: 16, height: 16, backgroundColor: t.card, transform: [{ rotate: '45deg' }] }} /> : null}
            {placement === 'above' ? <View style={{ position: 'absolute', bottom: -8, left: arrowX, width: 16, height: 16, backgroundColor: t.card, transform: [{ rotate: '45deg' }] }} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {list.map((_, i) => <View key={i} style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? t.primary : t.border }} />)}
              <Text style={{ color: t.textMuted, fontSize: 12, fontWeight: '800', marginLeft: 4 }}>{index + 1} / {list.length}</Text>
            </View>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '900', marginTop: 8 }}>{step.title}</Text>
            <Text style={{ color: t.textSoft, fontSize: 14.5, lineHeight: 21, marginTop: 6 }}>{step.text}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 }}>
              {!last ? (
                <Pressable onPress={close} hitSlop={8} accessibilityRole="button" style={{ paddingVertical: 8, paddingRight: 8 }}>
                  <Text style={{ color: t.textMuted, fontWeight: '800' }}>{hi ? 'छोड़ें' : 'Skip'}</Text>
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }} />
              {index > 0 ? <Button small outline title={hi ? 'पीछे' : 'Back'} onPress={() => onIndex(index - 1)} /> : null}
              <Button small title={last ? (hi ? 'समझ गया' : 'Got it') : (hi ? 'आगे' : 'Next')} onPress={() => (last ? close() : onIndex(index + 1))} />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
