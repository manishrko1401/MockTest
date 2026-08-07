import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
  Linking,
  TextInput,
  Image,
  Share,
  Modal,
  ActivityIndicator,
  PanResponder,
  RefreshControl
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SpinningDotsLoader } from '../SpinningDotsLoader';
import {
  Trophy,
  BookOpen,
  Bell,
  User,
  Award,
  CheckCircle,
  Calendar,
  Share2,
  LogOut,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  ExternalLink,
  RotateCcw,
  Eye,
  EyeOff,
  Gift,
  KeyRound,
  Lock,
  Coins,
  Search,
  X,
  Sparkles,
  Activity,
  MapPin,
  Bookmark,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Shield,
  Target,
  Pin,
  LogIn,
  Star,
  Clock,
  Play
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { ApiClient, BASE_URL } from '../api';
import { getCachedQuestions, saveQuestionsToCache } from '../cache';
import { ThemeColors } from '../theme';
import { HtmlText } from '../HtmlText';
import { getLocalizedName } from '../utils/localization';

interface DashboardScreenProps {
  currentUser: any;
  notices: any[];
  examCatalog: any[];
  usersList?: any[];
  onLogout: () => void;
  onSelectTestSeries: (series: any) => void;
  onOpenAttemptAnalysis: (attempt: any) => void;
  onOpenExam: (testId: string) => void;
  onRefreshUser: (userId: string) => Promise<void>;
  onRefreshCatalog?: () => Promise<void>;
  isDark?: boolean;
  onToggleTheme?: (dark: boolean) => void;
  onOpenSupportChat: () => void;
  activeTab: 'home' | 'tests' | 'notices' | 'bookmarks' | 'profile';
  setActiveTab: (tab: 'home' | 'tests' | 'notices' | 'bookmarks' | 'profile') => void;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  selectedSubCategoryId?: string | null;
  setSelectedSubCategoryId?: (id: string | null) => void;
  onToggleBookmark?: (testId: string, questionId: string) => void;
  language: 'en' | 'hi';
  onChangeLanguage: (lang: 'en' | 'hi') => void;
  unreadSupportCount?: number;
}

const LOCALIZATION = {
  en: {
    exploreCategories: 'Explore Categories',
    practiceExams: 'Practice Exams',
    notices: 'Notices',
    bookmarks: 'Bookmarks',
    profile: 'Profile',
    recentAttempts: 'Recent Attempts',
    noAttemptsYet: 'No attempts yet.',
    buyPass: 'Unlock Premium Pass',
    passStatus: 'Pass Status',
    coinsBalance: 'Coins Balance',
    referralCode: 'Referral Code',
    copyCode: 'Copy',
    copied: 'Copied!',
    logout: 'Logout',
    systemRole: 'System Role',
    changePassword: 'Change Account Password',
    oldPassword: 'Old Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password',
    savePassword: 'Save Password',
    pinInstruction: 'Swipe right exam to pin to top, swipe left exam to unpin',
    congrats: 'Congratulations!',
    claimPass: 'Claim Pass Pro',
    backToCat: 'Back to Exam Categories',
    searchExams: 'Search exam name...',
    activePass: 'Active Pass',
    noActivePass: 'No Active Pass',
    registeredOn: 'Registered On',
    language: 'App Language',
    switchLanguage: 'हिन्दी (Hindi)',
    welcomeBack: 'Welcome Back,',
    learnMore: 'Learn More',
    officialAnnouncements: '📢 Official Announcements',
    exploreTestSeries: '⚡ Explore Test Series',
    featuredToppers: '🏆 Featured Toppers (Selections)',
    liveUpdates: '📢 Live Updates',
    viewInfo: 'View Info',
    admitCard: 'Admit Cards',
    results: 'Results',
    answerKeys: 'Answer Keys',
    noNotices: 'No notices available in this category.',
    noBookmarks: 'No bookmarked questions yet.',
    editProfile: 'Edit profile and check subscription pass details below',
    inviteFriends: '🎁 Invite Friends & Earn Coins',
    shareCode: 'Share Code',
    supportTeam: '💬 Live Chat Support',
    supportSub: 'Instant resolutions from our support experts',
  },
  hi: {
    exploreCategories: 'परीक्षा श्रेणियां खोजें',
    practiceExams: 'अभ्यास परीक्षाएं',
    notices: 'सूचनाएं',
    bookmarks: 'बुकमार्क',
    profile: 'प्रोफाइल',
    recentAttempts: 'हाल के प्रयास',
    noAttemptsYet: 'अभी तक कोई प्रयास नहीं किया गया।',
    buyPass: 'प्रीमियम पास अनलॉक करें',
    passStatus: 'पास की स्थिति',
    coinsBalance: 'सिक्के का संतुलन',
    referralCode: 'रेफरल कोड',
    copyCode: 'कॉपी करें',
    copied: 'कॉपी किया गया!',
    logout: 'लॉगआउट',
    systemRole: 'सिस्टम भूमिका',
    changePassword: 'खाता पासवर्ड बदलें',
    oldPassword: 'पुराना पासवर्ड',
    newPassword: 'नया पासवर्ड',
    confirmPassword: 'नए पासवर्ड की पुष्टि करें',
    savePassword: 'पासवर्ड सहेजें',
    pinInstruction: 'पिन करने के लिए परीक्षा को दाएं स्वाइप करें, अनपिन करने के लिए बाएं स्वाइप करें',
    congrats: 'बधाई हो!',
    claimPass: 'पास प्रो प्राप्त करें',
    backToCat: 'परीक्षा श्रेणियों पर वापस जाएं',
    searchExams: 'परीक्षा का नाम खोजें...',
    activePass: 'सक्रिय पास',
    noActivePass: 'कोई सक्रिय पास नहीं',
    registeredOn: 'पंजीकरण तिथि',
    language: 'ऐप की भाषा',
    switchLanguage: 'English (अंग्रेज़ी)',
    welcomeBack: 'स्वागत है,',
    learnMore: 'अधिक जानें',
    officialAnnouncements: '📢 आधिकारिक घोषणाएं',
    exploreTestSeries: '⚡ परीक्षा सीरीज खोजें',
    featuredToppers: '🏆 हमारे सफल छात्र',
    liveUpdates: '📢 लाइव अपडेट',
    viewInfo: 'जानकारी देखें',
    admitCard: 'प्रवेश पत्र',
    results: 'परिणाम',
    answerKeys: 'उत्तर कुंजी',
    noNotices: 'इस श्रेणी में कोई सूचना उपलब्ध नहीं है।',
    noBookmarks: 'अभी तक कोई बुकमार्क किया गया प्रश्न नहीं है।',
    editProfile: 'नीचे अपनी प्रोफाइल संपादित करें और सदस्यता पास विवरण जांचें',
    inviteFriends: '🎁 दोस्तों को आमंत्रित करें और सिक्के कमाएं',
    shareCode: 'कोड साझा करें',
    supportTeam: '💬 लाइव चैट सहायता',
    supportSub: 'हमारे सहायता विशेषज्ञों से तुरंत समाधान पाएं',
  }
};

const SUCCESS_STORIES = [
  {
    id: 's1',
    name: 'Aniket Verma',
    exam: 'SSC CGL 2025 (Selected: Excise Inspector)',
    initials: 'AV',
    gradient: 'from-blue-600 to-cyan-500',
    quote: "Pass Pro was absolute key for my prep. The custom state machine of the test simulator exactly models the live CBT screen. I gave 50 sittings and cleared CGL easily!"
  },
  {
    id: 's2',
    name: 'Surbhi Mishra',
    exam: 'SBI PO 2025 (Selected: Probationary Officer)',
    initials: 'SM',
    gradient: 'from-purple-600 to-pink-500',
    quote: "Sectional Speed analytics inside the profile screen showed me exactly where I was spending too much time (Quantitative Aptitude). Resetting attempts let me re-verify my weak topics."
  },
  {
    id: 's3',
    name: 'Karan Mehra',
    exam: 'UGC NET 2025 (Selected: Assistant Professor)',
    initials: 'KM',
    gradient: 'from-orange-600 to-amber-500',
    quote: "Paper-1 was a massive hurdle for me. Giving mock tests on a platform that simulates the actual bilingual pattern (English & Hindi) of UGC NET gave me immense confidence on exam day."
  }
];

// Unified premium color system — all tiles use the same deep navy/indigo palette
// with a single accent color for a consistent, premium look
const BRAND = {
  // Core brand blues — used for all backgrounds
  darkBg1:   '#0F1C35',   // deep navy card bg (dark mode)
  darkBg2:   '#0A1222',   // deeper navy (dark mode)
  lightBg1:  '#FAF9F6',   // warm white card bg (light mode)
  lightBg2:  '#F5F3ED',   // slightly darker warm white (light mode)
  // Accent — vibrant indigo-blue used for left border, icons, text highlights
  accent:    '#4F6EF7',   // rich indigo-blue (main accent)
  accentHover: '#3B55DD',
  // Border colours per mode
  darkBorder:  '#2A3F70',
  lightBorder: '#E5E7EB',   // soft grey border
  // Decorative orb colour
  orb: '#4F6EF7',
};

/**
 * Reliable fallback logo URLs for well-known exam categories.
 * These are used when the database logoUrl is missing, hotlink-blocked, or returns an error.
 * Keys are lowercase substrings matched against the category name.
 */
const CATEGORY_LOGO_OVERRIDES: Array<{ match: string[]; logoUrl: string }> = [
  {
    match: ['ssc', 'staff selection commission'],
    logoUrl: 'https://image.pngaaa.com/279/10279-middle.png',
  },
  {
    match: ['cbse', 'ctet'],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/29/CBSE_new_logo.svg/200px-CBSE_new_logo.svg.png',
  },
  {
    match: ['railway', 'rrb'],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Indian_Railways_official_Logo.svg/200px-Indian_Railways_official_Logo.svg.png',
  },
  {
    match: ['upsc'],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/UPSC_Logo.svg/200px-UPSC_Logo.svg.png',
  },
  {
    match: ['isro', 'indian space research organisation', 'space'],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Indian_Space_Research_Organisation_Logo.svg/200px-Indian_Space_Research_Organisation_Logo.svg.png',
  },
  {
    match: ['drdo'],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6f/Defence_Research_and_Development_Organisation_Logo.png/200px-Defence_Research_and_Development_Organisation_Logo.png',
  },
];

export function formatLogoUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';

  // Convert Wikipedia/Wikimedia SVG links to PNG thumbnails for React Native Image rendering
  if (url.includes('upload.wikimedia.org') && url.endsWith('.svg') && !url.includes('/thumb/')) {
    const filename = url.substring(url.lastIndexOf('/') + 1);
    url = url.replace('/commons/', '/commons/thumb/').replace('/en/', '/en/thumb/') + `/200px-${filename}.png`;
  }

  if (url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const base = (BASE_URL || '').replace(/\/+$/, '');
  const path = url.replace(/^\/+/, '');
  return `${base}/${path}`;
}

export function formatRelativeOrDate(dateStr?: string, lang: 'en' | 'hi' = 'en'): string {
  if (!dateStr) return lang === 'hi' ? 'हाल ही में' : 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 2) return lang === 'hi' ? 'अभी' : 'Just now';
    if (diffMins < 60) return lang === 'hi' ? `${diffMins} मि. पहले` : `${diffMins}m ago`;
    if (diffHours < 24) return lang === 'hi' ? `${diffHours} घंटे पहले` : `${diffHours}h ago`;
    if (diffDays === 1) return lang === 'hi' ? 'कल' : 'Yesterday';
    if (diffDays < 7) return lang === 'hi' ? `${diffDays} दिन पहले` : `${diffDays}d ago`;

    const day = d.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${monthNames[d.getMonth()]}`;
  } catch {
    return dateStr;
  }
}

/**
 * Returns the best logo URL to display for a category:
 * - If the DB logo URL is non-empty, format it and use it as primaryUrl
 * - Uses CATEGORY_LOGO_OVERRIDES map as secondary fallbackUrl
 */
function getEffectiveLogoUrl(categoryName: string, dbLogoUrl?: string | null): { primaryUrl: string; fallbackUrl: string } {
  const norm = (categoryName || '').toLowerCase();
  const override = CATEGORY_LOGO_OVERRIDES.find(o => o.match.some(m => norm.includes(m)));
  const overrideUrl = override?.logoUrl || '';

  const formattedDbUrl = formatLogoUrl(dbLogoUrl);

  if (!formattedDbUrl) {
    return { primaryUrl: overrideUrl, fallbackUrl: '' };
  }

  return { primaryUrl: formattedDbUrl, fallbackUrl: overrideUrl };
}

const getCategoryStyle = (name: string, isDark: boolean) => {
  // Pick icon based on name but keep colors UNIFIED
  const norm = name.toLowerCase();
  let iconName = 'Sparkles';
  if (norm.includes('ssc'))                            iconName = 'Award';
  else if (norm.includes('railway') || norm.includes('rrb')) iconName = 'Activity';
  else if (norm.includes('bank') || norm.includes('lic') || norm.includes('rbi'))    iconName = 'Coins';
  else if (norm.includes('teach') || norm.includes('ctet'))  iconName = 'BookOpen';
  else if (norm.includes('ugc') || norm.includes('net'))     iconName = 'GraduationCap';
  else if (norm.includes('police') || norm.includes('upsc')) iconName = 'Shield';
  else if (norm.includes('defence') || norm.includes('nda')) iconName = 'Target';
  else if (norm.includes('state') || norm.includes('psc'))   iconName = 'MapPin';

  return {
    colors: isDark
      ? [BRAND.darkBg1, BRAND.darkBg2]
      : [BRAND.lightBg1, BRAND.lightBg2],
    borderColor:  isDark ? BRAND.darkBorder  : BRAND.lightBorder,
    iconColor:    BRAND.accent,
    iconName,
  };
};

const CategoryIcon = ({ name, color, size }: { name: string; color: string; size: number }) => {
  switch (name) {
    case 'Award':        return <Award color={color} size={size} />;
    case 'Activity':     return <Activity color={color} size={size} />;
    case 'Coins':        return <Coins color={color} size={size} />;
    case 'BookOpen':     return <BookOpen color={color} size={size} />;
    case 'GraduationCap': return <GraduationCap color={color} size={size} />;
    case 'MapPin':       return <MapPin color={color} size={size} />;
    case 'Shield':       return <Shield color={color} size={size} />;
    case 'Target':       return <Target color={color} size={size} />;
    default:             return <Sparkles color={color} size={size} />;
  }
};

const CategoryLogoImage = React.memo(({ logoUrl, fallbackLogoUrl, fallbackIcon }: { logoUrl: string; fallbackLogoUrl?: string; fallbackIcon: React.ReactNode }) => {
  const [currentUriIndex, setCurrentUriIndex] = useState(0);

  useEffect(() => {
    setCurrentUriIndex(0);
  }, [logoUrl, fallbackLogoUrl]);

  const cleanUrl = React.useMemo(() => formatLogoUrl(logoUrl), [logoUrl]);
  const cleanFallbackUrl = React.useMemo(() => formatLogoUrl(fallbackLogoUrl), [fallbackLogoUrl]);

  const candidateUris = React.useMemo(() => {
    const list: string[] = [];
    if (cleanUrl) list.push(cleanUrl);
    if (cleanFallbackUrl && cleanFallbackUrl !== cleanUrl) list.push(cleanFallbackUrl);
    return list;
  }, [cleanUrl, cleanFallbackUrl]);

  const activeUri = candidateUris[currentUriIndex];

  if (!activeUri || currentUriIndex >= candidateUris.length) {
    return <>{fallbackIcon}</>;
  }

  return (
    <Image
      source={{ uri: activeUri, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }}
      style={{ width: '100%', height: '100%', borderRadius: 10, resizeMode: 'contain' }}
      onError={() => {
        setCurrentUriIndex((prev) => prev + 1);
      }}
    />
  );
});

const SwipeableCategoryCard = ({
  children,
  isPinned,
  onPin,
  onUnpin,
  isDark
}: {
  children: React.ReactNode;
  isPinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  isDark: boolean;
}) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;
        if (dx > 90) {
          // Swipe right -> Pin
          if (!isPinned) {
            onPin();
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8
          }).start();
        } else if (dx < -90) {
          // Swipe left -> Unpin
          if (isPinned) {
            onUnpin();
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8
          }).start();
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 12
          }).start();
        }
      }
    })
  ).current;

  return (
    <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, marginBottom: 12 }}>
      {/* Background action hints */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
        borderRadius: 16,
      }}>
        {/* Swiping Right (to Pin) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.85 }}>
          <Pin size={16} color="#10B981" />
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#10B981' }}>Pin to Top</Text>
        </View>

        {/* Swiping Left (to Unpin) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.85 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#EF4444' }}>Remove Pin</Text>
          <Pin size={16} color="#EF4444" style={{ transform: [{ rotate: '45deg' }] }} />
        </View>
      </View>

      {/* Foreground Card */}
      <Animated.View
        style={{
          transform: [{ translateX }],
          backgroundColor: isDark ? '#0F1C35' : '#FAF9F6',
        }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};


export default function DashboardScreen({
  currentUser,
  notices,
  examCatalog,
  usersList = [],
  onLogout,
  onSelectTestSeries,
  onOpenAttemptAnalysis,
  onOpenExam,
  onRefreshUser,
  isDark = false,
  onToggleTheme,
  onOpenSupportChat,
  activeTab,
  setActiveTab,
  selectedCategoryId,
  setSelectedCategoryId,
  selectedSubCategoryId = null,
  setSelectedSubCategoryId = () => {},
  onToggleBookmark,
  language,
  onChangeLanguage,
  unreadSupportCount = 0,
  onRefreshCatalog,
}: DashboardScreenProps) {

  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [localOngoingSessions, setLocalOngoingSessions] = useState<any[]>([]);

  // Load locally-cached ongoing/paused test sessions so Resume Test button appears immediately
  useEffect(() => {
    const loadLocalOngoing = async () => {
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const ongoingKeys = allKeys.filter(k => k.startsWith('ongoing_test_'));
        const list: any[] = [];
        for (const key of ongoingKeys) {
          const raw = await AsyncStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed?.testId && (parsed?.status === 'ONGOING' || parsed?.status === 'PAUSED')) {
                list.push({
                  ...parsed,
                  id: `local_${parsed.testId}`,
                  testId: parsed.testId,
                  status: 'ONGOING',
                  startedAt: parsed.updatedAt || parsed.startedAt || new Date().toISOString(),
                });
              }
            } catch {}
          }
        }
        setLocalOngoingSessions(list);
      } catch (err) {
        console.warn('[Dashboard] Failed to load local ongoing sessions:', err);
      }
    };
    loadLocalOngoing();
  }, [activeTab, currentUser?.id, currentUser?.testSessions]);

  const catalogTestsMap = useMemo(() => {
    const map = new Map<string, { title: string; categoryName: string; maxMarks: number; questionsCount: number; durationMinutes: number }>();
    (examCatalog || []).forEach((cat: any) => {
      (cat.tests || []).forEach((t: any) => {
        map.set(t.id, {
          title: t.title || cat.name,
          categoryName: cat.name,
          maxMarks: t.maxMarks || 200,
          questionsCount: t.questionsCount || 100,
          durationMinutes: t.durationMinutes || 60,
        });
      });
      (cat.subCategories || []).forEach((sub: any) => {
        (sub.tests || []).forEach((t: any) => {
          map.set(t.id, {
            title: t.title || sub.name || cat.name,
            categoryName: cat.name,
            maxMarks: t.maxMarks || 200,
            questionsCount: t.questionsCount || 100,
            durationMinutes: t.durationMinutes || 60,
          });
        });
        (sub.subSubCategories || []).forEach((subsub: any) => {
          (subsub.tests || []).forEach((t: any) => {
            map.set(t.id, {
              title: t.title || subsub.title || sub.name,
              categoryName: cat.name,
              maxMarks: t.maxMarks || 200,
              questionsCount: t.questionsCount || 100,
              durationMinutes: t.durationMinutes || 60,
            });
          });
        });
      });
    });
    return map;
  }, [examCatalog]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (onRefreshUser && currentUser?.id) {
        await onRefreshUser(currentUser.id);
      }
      if (onRefreshCatalog) {
        await onRefreshCatalog();
      }
    } catch (err) {
      console.warn('Pull-to-refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };
  const [showCongratsPopup, setShowCongratsPopup] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [testCatalogMode, setTestCatalogMode] = useState<'mock_tests' | 'practice_series'>('mock_tests');

  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [suggCategory, setSuggCategory] = useState('General');
  const [suggMessage, setSuggMessage] = useState('');
  const [suggSubmitting, setSuggSubmitting] = useState(false);
  const [suggSuccess, setSuggSuccess] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const handleAppSuggestionSubmit = async () => {
    if (!suggMessage.trim() || suggSubmitting) return;
    setSuggSubmitting(true);
    try {
      const res = await ApiClient.submitSuggestion({
        userId: currentUser.id,
        name: currentUser.name || 'Registered Candidate',
        email: currentUser.email || '',
        category: suggCategory,
        message: suggMessage.trim(),
        source: 'app',
      });
      if (res && res.success) {
        setSuggSuccess(true);
        setSuggMessage('');
        setTimeout(() => {
          setSuggSuccess(false);
          setSuggestionModalOpen(false);
        }, 2000);
      } else {
        Alert.alert('Error', res?.error || 'Failed to submit suggestion');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to submit suggestion. Please try again.');
    } finally {
      setSuggSubmitting(false);
    }
  };

  const [pinnedCategoryIds, setPinnedCategoryIds] = useState<string[]>([]);
  useEffect(() => {
    const loadPinned = async () => {
      try {
        const raw = await AsyncStorage.getItem('pinned_categories');
        if (raw) {
          setPinnedCategoryIds(JSON.parse(raw));
        }
      } catch (e) {
        console.warn('Failed to load pinned categories', e);
      }
    };
    loadPinned();
  }, []);

  const handlePinCategory = async (catId: string) => {
    try {
      if (pinnedCategoryIds.length >= 5) {
        Alert.alert('Pin Limit Reached', 'You can only pin up to 5 exams to the top. Please unpin an exam first.');
        return;
      }
      const next = [...pinnedCategoryIds.filter(id => id !== catId), catId];
      setPinnedCategoryIds(next);
      await AsyncStorage.setItem('pinned_categories', JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to pin category', e);
    }
  };

  const handleUnpinCategory = async (catId: string) => {
    try {
      const next = pinnedCategoryIds.filter(id => id !== catId);
      setPinnedCategoryIds(next);
      await AsyncStorage.setItem('pinned_categories', JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to unpin category', e);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setShowCongratsPopup(false);
      return;
    }

    if (currentUser.subscriptionTier === 'Testbook Pass Pro') {
      setShowCongratsPopup(false);
      return;
    }

    // Show popup every time user opens dashboard/app if user hasn't claimed 1-Year Pass Pro yet
    const timer = setTimeout(() => {
      setShowCongratsPopup(true);
    }, 1500); // 1.5s delay for smooth UI load

    return () => clearTimeout(timer);
  }, [currentUser?.id, currentUser?.subscriptionTier]);

  const handleClaimPassPro = async () => {
    if (!currentUser) return;
    setClaiming(true);
    try {
      const res = await ApiClient.claimPassPro(currentUser.id, 'Testbook Pass Pro');

      if (res.success) {
        await onRefreshUser(currentUser.id);
        Alert.alert('Success', 'Your 1-Year Mock Test Pass Pro has been claimed and activated!');
        setShowCongratsPopup(false);
        setActiveTab('profile'); // Redirect to profile
      } else {
        Alert.alert('Error', res.error || 'Claim failed.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Claim failed. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  // Announcement auto-sliding states & refs
  const announcementScrollRef = React.useRef<ScrollView>(null);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [userHasSwiped, setUserHasSwiped] = useState(false);

  // Live updates states (notices, results, answer keys, admit cards - last 5 days)
  const [recentNoticeIndex, setRecentNoticeIndex] = useState(0);

  const recentNotices = React.useMemo(() => {
    return notices.filter(n => {
      if (!['notice', 'result', 'answer_key', 'admit_card'].includes(n.category)) return false;
      if (!n.publishDate) return false;
      try {
        const now = new Date();
        const pubDate = new Date(n.publishDate);
        pubDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        const diffTime = now.getTime() - pubDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 5;
      } catch (e) {
        return false;
      }
    });
  }, [notices]);

  useEffect(() => {
    if (recentNotices.length <= 1) return;
    const interval = setInterval(() => {
      setRecentNoticeIndex(prev => (prev + 1) % recentNotices.length);
    }, 4000); // cycle every 4 seconds
    return () => clearInterval(interval);
  }, [recentNotices]);

  const announcementsList = React.useMemo(() => {
    return notices.filter(n => n.category === 'announcement');
  }, [notices]);

  useEffect(() => {
    if (announcementsList.length <= 1 || userHasSwiped) return;

    const interval = setInterval(() => {
      setAnnouncementIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % announcementsList.length;
        const slideWidth = Dimensions.get('window').width - 32;
        announcementScrollRef.current?.scrollTo({
          x: nextIndex * slideWidth,
          animated: true,
        });
        return nextIndex;
      });
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [announcementsList, userHasSwiped]);

  // Notice badges and seen states
  const [seenNoticeIds, setSeenNoticeIds] = useState<string[]>([]);

  // Exam search state (Tests tab)
  const [examSearchQuery, setExamSearchQuery] = useState('');

  useEffect(() => {
    const loadSeenNotices = async () => {
      try {
        const seenStr = await SecureStore.getItemAsync('seen_notice_ids');
        if (seenStr) {
          setSeenNoticeIds(JSON.parse(seenStr));
        }
      } catch (err) {
        console.error('Failed to load seen notices', err);
      }
    };
    loadSeenNotices();
  }, []);

  const markAllNoticesAsSeen = async () => {
    if (!notices || notices.length === 0) return;
    const allNoticeIds = notices.map(n => n.id).filter(Boolean);
    const updatedSeen = Array.from(new Set([...seenNoticeIds, ...allNoticeIds]));
    setSeenNoticeIds(updatedSeen);
    try {
      await SecureStore.setItemAsync('seen_notice_ids', JSON.stringify(updatedSeen));
    } catch (err) {
      console.error('Failed to save seen notices', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'notices') {
      markAllNoticesAsSeen();
    }
  }, [activeTab, notices]);

  const unseenCount = notices.filter(n => n.id && !seenNoticeIds.includes(n.id)).length;

  // App states

  const [showUpdateProfile, setShowUpdateProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showReferralRules, setShowReferralRules] = useState(false);
  const [showReferredFriends, setShowReferredFriends] = useState(false);

  const [referredFriends, setReferredFriends] = useState<any[]>([]);
  const [loadingReferred, setLoadingReferred] = useState(false);

  // Bookmark tab state
  const [bookmarkQsCache, setBookmarkQsCache] = useState<Record<string, any[]>>({});
  const [bookmarkQsLoading, setBookmarkQsLoading] = useState(false);
  const [expandedBookmarks, setExpandedBookmarks] = useState<Record<string, boolean>>({});

  const toggleExpandBookmark = (qId: string) => {
    setExpandedBookmarks(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Fetch custom questions for each unique testId in bookmarks when the bookmark tab opens
  useEffect(() => {
    if (activeTab !== 'bookmarks') return;
    const bookmarks: any[] = currentUser?.bookmarkedQuestions || [];
    if (bookmarks.length === 0) return;

    const uniqueTestIds = [...new Set(bookmarks.map((b: any) => b.testId as string))];
    // Always re-check all test IDs — don't skip if already in cache (may have stale empty arrays)
    const missingIds = uniqueTestIds.filter(id => !bookmarkQsCache[id] || bookmarkQsCache[id].length === 0);
    if (missingIds.length === 0) return;

    setBookmarkQsLoading(true);
    Promise.all(
      missingIds.map(async (testId) => {
        try {
          // Normalize helper: ensure every question has a stable string id
          const normalizeQs = (qs: any[]): any[] =>
            qs.map((q: any, idx: number) => ({
              ...q,
              id: q.id !== undefined && q.id !== null && q.id !== ''
                ? String(q.id)
                : `q_custom_${idx}`,
            }));

          // 1. Check local device storage first (0ms latency, works offline)
          const cached = await getCachedQuestions(testId);
          if (cached && Array.isArray(cached) && cached.length > 0) {
            return { testId, questions: normalizeQs(cached) };
          }
          // 2. Fetch from server if not cached locally
          const res = await ApiClient.getCustomQuestions(testId);
          if (res.success && Array.isArray(res.questions) && res.questions.length > 0) {
            const normalized = normalizeQs(res.questions);
            await saveQuestionsToCache(testId, normalized);
            return { testId, questions: normalized };
          }
        } catch (e) { /* ignore */ }
        return { testId, questions: [] };
      })
    ).then(results => {
      const newCache: Record<string, any[]> = {};
      results.forEach(r => { if (r) newCache[r.testId] = r.questions; });
      setBookmarkQsCache(prev => ({ ...prev, ...newCache }));
      setBookmarkQsLoading(false);
    });
  }, [activeTab, currentUser?.bookmarkedQuestions]);

  useEffect(() => {
    if ((showReferredFriends || activeTab === 'profile') && currentUser?.referralCode) {
      setLoadingReferred(true);
      ApiClient.getReferredFriends(currentUser.referralCode)
        .then((res: any) => {
          if (res.success && res.referredFriends) {
            setReferredFriends(res.referredFriends);
          }
        })
        .catch((err: any) => {
          console.error("Error fetching referred friends:", err);
        })
        .finally(() => {
          setLoadingReferred(false);
        });
    }
  }, [showReferredFriends, activeTab, currentUser?.referralCode]);

  // Form and tab states
  const [activeNoticeTab, setActiveNoticeTab] = useState<'notice' | 'result' | 'admit_card' | 'answer_key'>('notice');
  const [noticeSearchQuery, setNoticeSearchQuery] = useState('');

  // Swipe pager ref for the notices screen
  const noticeScrollRef = React.useRef<ScrollView>(null);
  const NOTICE_TABS: Array<'notice' | 'result' | 'admit_card' | 'answer_key'> = ['notice', 'result', 'admit_card', 'answer_key'];

  const scrollNoticeToTab = (tab: 'notice' | 'result' | 'admit_card' | 'answer_key') => {
    const idx = NOTICE_TABS.indexOf(tab);
    const pageWidth = Dimensions.get('window').width;
    noticeScrollRef.current?.scrollTo({ x: idx * pageWidth, animated: true });
    setActiveNoticeTab(tab);
    setNoticeSearchQuery('');
  };

  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
  const [profileMobile, setProfileMobile] = useState(currentUser?.mobile || '');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name);
      setProfileEmail(currentUser.email);
      setProfileMobile(currentUser.mobile || '');
    }
  }, [currentUser]);



  const handleUpdateProfile = async () => {
    if (!profileName.trim() || !profileEmail.trim() || !profileMobile.trim()) {
      Alert.alert('Error', 'Fields cannot be empty.');
      return;
    }
    if (!/^\d{10}$/.test(profileMobile.trim())) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const res = await ApiClient.updateProfile(currentUser.id, profileName, profileEmail, profileMobile.trim());
    if (res.success) {
      Alert.alert('Success', 'Profile details updated successfully!');
      await onRefreshUser(currentUser.id);
    } else {
      Alert.alert('Error', res.error || 'Failed to update profile.');
    }
  };

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Password fields cannot be empty.');
      return;
    }
    if (oldPassword !== currentUser.password) {
      Alert.alert('Error', 'Old password verification failed.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    const res = await ApiClient.updatePassword(currentUser.id, newPassword);
    if (res.success) {
      Alert.alert('Success', 'Account password successfully updated!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await onRefreshUser(currentUser.id);
    } else {
      Alert.alert('Error', res.error || 'Failed to update password.');
    }
  };

  const shareReferralCode = async () => {
    const shareMessage = `Hey! Start preparing for exams with MockTest Hub. Use my referral code: ${currentUser.referralCode} to get free coins!`;
    try {
      await Share.share({
        message: shareMessage,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleResetAttempt = async (sessionId: string) => {
    Alert.alert(
      'Reset Attempt?',
      'This will delete your previous attempt data and allow you to re-take this mock test. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset & Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await ApiClient.resetAttempt(currentUser.id, sessionId);
            if (res.success) {
              Alert.alert('Success', 'Attempt has been reset. You can now retake this test.');
              handleRefresh();
            } else {
              Alert.alert('Error', res.error || 'Failed to reset attempt.');
            }
          }
        }
      ]
    );
  };

  // Render Tabs
  const renderHomeTab = () => {
    // Flatten exams from the catalog to show a quick explore list
    const featuredExams = examCatalog.flatMap(cat => 
      cat.subCategories.map((sub: any) => ({
        ...sub,
        categoryName: cat.name
      }))
    ).slice(0, 5);

    return (
      <ScrollView 
        contentContainerStyle={styles.tabContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
            tintColor={isDark ? '#60A5FA' : '#2563EB'}
          />
        }
      >
        {/* Section 1: Swipable Announcements Slider */}
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, isDark && { color: ThemeColors.dark.text }]}>📢 Official Announcements</Text>
          {(() => {
            const announcements = notices.filter(n => n.category === 'announcement');
            if (announcements.length === 0) {
              return (
                <View style={[styles.emptyAnnouncementCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
                  <Text style={[styles.emptyAnnouncementText, isDark && { color: ThemeColors.dark.textMuted }]}>No active announcements at the moment.</Text>
                </View>
              );
            }

            return (
              <View>
                <ScrollView
                  ref={announcementScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={styles.carouselScrollView}
                  onScrollBeginDrag={() => {
                    setUserHasSwiped(true);
                  }}
                  onMomentumScrollEnd={(event) => {
                    const slideWidth = Dimensions.get('window').width - 32;
                    const offset = event.nativeEvent.contentOffset.x;
                    const newIdx = Math.round(offset / slideWidth);
                    setAnnouncementIndex(newIdx);
                  }}
                >
                  {announcements.map((ann, idx) => (
                    <View 
                      key={ann.id || idx} 
                      style={[
                        styles.carouselSlide, 
                        { width: Dimensions.get('window').width - 32, overflow: 'hidden' },
                        isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }
                      ]}
                    >
                      {/* Show Proper Announcement Image Banner & Hide Details Section */}
                      {ann.imageUrl && ann.imageUrl.trim() ? (
                        <TouchableOpacity
                          activeOpacity={ann.url ? 0.9 : 1}
                          onPress={() => ann.url && Linking.openURL(ann.url)}
                          style={{ width: '100%', height: 185, overflow: 'hidden', borderRadius: 14 }}
                        >
                          <Image
                            source={{ uri: ann.imageUrl.trim().replace(/^http:\/\//i, 'https://') }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ) : (
                        /* Text fallback if no image banner exists */
                        <TouchableOpacity
                          activeOpacity={ann.url ? 0.9 : 1}
                          onPress={() => ann.url && Linking.openURL(ann.url)}
                          style={[styles.announcementCardContent, { padding: 14, minHeight: 100, justifyContent: 'center' }]}
                        >
                          <View style={styles.announcementCardHeader}>
                            <Text style={[styles.announcementTypeBadge, isDark && { backgroundColor: ThemeColors.dark.bg, color: '#60A5FA', borderColor: '#334155' }]}>{ann.type || 'NEWS'}</Text>
                            <Text style={styles.announcementDateText}>{ann.date}</Text>
                          </View>
                          <Text style={[styles.announcementTitleText, isDark && { color: ThemeColors.dark.text }]} numberOfLines={2}>{language === 'hi' && ann.titleHi ? ann.titleHi : ann.title}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </ScrollView>
                
                {/* Hiding the indicators to adjust spacing, but functionality remains active */}
                {/* 
                <View style={styles.storyDotRow}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    {announcements.map((_, i) => (
                      <View 
                        key={i} 
                        style={[
                          styles.storyIndicatorDot, 
                          announcementIndex === i 
                            ? { backgroundColor: '#3B82F6', width: 12 } 
                            : { backgroundColor: isDark ? '#475569' : '#D1D5DB', width: 6 }
                        ]} 
                      />
                    ))}
                  </View>
                  <Text style={[styles.swipeIndicatorText, isDark && { color: ThemeColors.dark.textMuted }]}>
                    Swipe card to read other announcements ({announcementIndex + 1}/{announcements.length})
                  </Text>
                </View>
                */}
              </View>
            );
          })()}
        </View>

        {/* Section 2: Live Updates slideshow (Last 5 Days notices) */}
        {(() => {
          if (recentNotices.length === 0) return null;

          const activeNoticeIdx = recentNoticeIndex % recentNotices.length;
          const activeNotice = recentNotices[activeNoticeIdx];

          let badgeColor = '#3B82F6';
          let badgeBg = isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF';
          let badgeBorderColor = isDark ? '#1E3A8A' : '#DBEAFE';
          
          if (activeNotice.category === 'result') {
            badgeColor = '#10B981';
            badgeBg = isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5';
            badgeBorderColor = isDark ? '#065F46' : '#D1FAE5';
          } else if (activeNotice.category === 'admit_card') {
            badgeColor = '#F59E0B';
            badgeBg = isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7';
            badgeBorderColor = isDark ? '#78350F' : '#FDE68A';
          } else if (activeNotice.category === 'answer_key') {
            badgeColor = '#8B5CF6';
            badgeBg = isDark ? 'rgba(139,92,246,0.15)' : '#F5F3FF';
            badgeBorderColor = isDark ? '#5B21B6' : '#EDE9FE';
          }

          return (
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, isDark && { color: ThemeColors.dark.text }]}>🔥 Live Updates</Text>
              <View style={[
                styles.liveUpdatesCard, 
                { 
                  borderColor: badgeBorderColor, 
                  backgroundColor: isDark ? ThemeColors.dark.card : badgeBg,
                  borderLeftWidth: 5,
                  borderLeftColor: badgeColor,
                  shadowColor: badgeColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.18,
                  shadowRadius: 8,
                  elevation: 4,
                  height: 152,
                  justifyContent: 'space-between',
                },
                isDark && { borderWidth: 1 }
              ]}>
                {/* Translucent background circle art */}
                <View style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, borderRadius: 30, backgroundColor: badgeColor, opacity: 0.12 }} />
                <View style={{ position: 'absolute', bottom: -10, left: 60, width: 35, height: 35, borderRadius: 17.5, backgroundColor: badgeColor, opacity: 0.08 }} />
                
                {/* Fixed Top Header Row */}
                <View style={styles.liveUpdatesHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.liveCategoryBadge, { backgroundColor: '#FFFFFF', borderColor: badgeBorderColor, borderWidth: 1 }]}>
                      <Text style={[styles.liveCategoryBadgeText, { color: badgeColor }]}>
                        {activeNotice.category === 'admit_card' ? 'Admit Card' : activeNotice.category === 'answer_key' ? 'Answer Key' : activeNotice.category.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' }} />
                      <Text style={{ color: '#EF4444', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 }}>LIVE</Text>
                    </View>
                  </View>
                  <Text style={[styles.liveUpdatesCounter, { color: isDark ? '#94A3B8' : '#475569', fontWeight: 'bold' }]}>
                    {activeNoticeIdx + 1} of {recentNotices.length}
                  </Text>
                </View>
                
                {/* Title Slot (Full vertical space, no clipping) */}
                <View style={{ flex: 1, justifyContent: 'center', marginVertical: 4 }}>
                  <Text style={[styles.liveUpdatesTitle, isDark ? { color: '#FFFFFF' } : { color: '#1E293B', fontWeight: '900' }]} numberOfLines={2}>
                    {language === 'hi' && activeNotice.titleHi ? activeNotice.titleHi : activeNotice.title}
                  </Text>
                </View>
                
                {/* Footer Row: Last Date in place of uploaded date on left, View Info on right */}
                <View style={styles.liveUpdatesFooter}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    {activeNotice.lastDate ? (
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }} numberOfLines={1}>
                        {language === 'en' ? 'Last Date: ' : 'अंतिम तिथि: '}{activeNotice.lastDate}
                      </Text>
                    ) : (
                      <Text style={[styles.liveUpdatesDate, isDark ? { color: '#94A3B8' } : { color: '#64748B', fontWeight: '600' }]} numberOfLines={1}>
                        {activeNotice.date || ''}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={[styles.liveUpdatesBtn, { backgroundColor: badgeColor }]}
                    onPress={() => {
                      if (activeNotice.url) {
                        Linking.openURL(activeNotice.url);
                      } else {
                        // Navigate to notice screen
                        setActiveTab('notices');
                      }
                    }}
                  >
                    <Text style={styles.liveUpdatesBtnText}>View Info</Text>
                    <ExternalLink size={11} color="#FFFFFF" style={{ marginLeft: 3 }} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })()}

        {/* Section 2.5: Recent Test Attempts (Last 5 attempts - including Ongoing / Paused tests) */}
        {(() => {
          const rawSessions = currentUser?.testSessions || [];
          
          // Map testIds to combine server sessions and locally cached ongoing sessions
          const sessionsMap = new Map<string, any>();

          // 1. Add server sessions
          (Array.isArray(rawSessions) ? rawSessions : []).forEach((s: any) => {
            if (s && s.testId) {
              sessionsMap.set(s.testId, s);
            }
          });

          // 2. Add or update with local ongoing sessions
          localOngoingSessions.forEach((ls: any) => {
            if (ls && ls.testId) {
              const existing = sessionsMap.get(ls.testId);
              // Only overwrite or add if not already marked as completed recently
              if (!existing || existing.status === 'ONGOING' || existing.status === 'PAUSED') {
                sessionsMap.set(ls.testId, { ...existing, ...ls });
              }
            }
          });

          const allRecentSessions = Array.from(sessionsMap.values())
            .filter((s: any) => s && (
              s.status === 'ONGOING' ||
              s.status === 'PAUSED' ||
              s.status === 'COMPLETED' ||
              s.status === 'AUTO_SUBMITTED' ||
              s.score !== undefined
            ))
            .sort((a: any, b: any) => {
              // Prioritize ongoing/paused tests at the beginning
              const isOngoingA = a.status === 'ONGOING' || a.status === 'PAUSED';
              const isOngoingB = b.status === 'ONGOING' || b.status === 'PAUSED';
              if (isOngoingA && !isOngoingB) return -1;
              if (!isOngoingA && isOngoingB) return 1;

              const timeA = new Date(a.updatedAt || a.completedAt || a.startedAt || a.createdAt || 0).getTime();
              const timeB = new Date(b.updatedAt || b.completedAt || b.startedAt || b.createdAt || 0).getTime();
              return timeB - timeA;
            })
            .slice(0, 5);

          if (allRecentSessions.length === 0) return null;

          return (
            <View style={{ marginBottom: 14 }}>
              {/* Section Header (without View All option) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingRight: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <RotateCcw size={15} color="#3B82F6" />
                  <Text style={[styles.sectionTitle, isDark && { color: ThemeColors.dark.text }, { marginBottom: 0, fontSize: 13 }]}>
                    {language === 'hi' ? 'हाल के टेस्ट प्रयास' : 'Recent Test Attempts'}
                  </Text>
                  <View style={{
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF',
                    borderColor: isDark ? '#1E3A8A' : '#BFDBFE',
                    borderWidth: 1,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 8,
                  }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? '#60A5FA' : '#2563EB' }}>
                      {allRecentSessions.length} {language === 'hi' ? 'प्रयास' : 'Recent'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Horizontal Scroll of Compact Recent Attempt Cards */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 12 }}
              >
                {allRecentSessions.map((attempt: any, idx: number) => {
                  const isOngoing = attempt.status === 'ONGOING' || attempt.status === 'PAUSED';
                  const testInfo = catalogTestsMap.get(attempt.testId);
                  const title = attempt.testTitle || attempt.title || attempt.mockTest?.title || testInfo?.title || `Mock Test #${idx + 1}`;
                  const categoryName = testInfo?.categoryName || attempt.categoryName || 'Competitive Exam';
                  const score = attempt.score ?? 0;
                  const maxMarks = attempt.maxScore || attempt.mockTest?.maxMarks || testInfo?.maxMarks || 200;
                  const scorePercent = maxMarks > 0 ? Math.round((score / maxMarks) * 100) : 0;
                  const accuracy = attempt.accuracy !== undefined
                    ? Math.round(attempt.accuracy)
                    : (attempt.correctCount && attempt.totalAttempted ? Math.round((attempt.correctCount / attempt.totalAttempted) * 100) : null);
                  const dateLabel = formatRelativeOrDate(attempt.updatedAt || attempt.completedAt || attempt.startedAt || attempt.createdAt, language);

                  const isGoodScore = scorePercent >= 60;
                  const scoreBadgeBg = isDark
                    ? (isGoodScore ? 'rgba(16,185,129,0.18)' : 'rgba(59,130,246,0.18)')
                    : (isGoodScore ? '#ECFDF5' : '#EFF6FF');
                  const scoreBadgeBorder = isDark
                    ? (isGoodScore ? '#065F46' : '#1E3A8A')
                    : (isGoodScore ? '#A7F3D0' : '#BFDBFE');
                  const scoreBadgeColor = isGoodScore ? '#10B981' : '#3B82F6';

                  // Attempted questions in ongoing session
                  const attemptedCount = attempt.responses
                    ? Object.values(attempt.responses).filter((r: any) => r?.selectedOptionIndex !== null && r?.selectedOptionIndex !== undefined).length
                    : (attempt.totalAttempted || 0);

                  return (
                    <View
                      key={`recent-att-${attempt.testId || attempt.id || idx}`}
                      style={{
                        width: 215,
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderRadius: 14,
                        padding: 10,
                        marginRight: 10,
                        borderColor: isOngoing ? (isDark ? '#2563EB' : '#3B82F6') : (isDark ? '#334155' : '#E2E8F0'),
                        borderWidth: isOngoing ? 1.6 : 1.2,
                        shadowColor: isOngoing ? '#3B82F6' : '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.08,
                        shadowRadius: 4,
                        elevation: 2,
                        justifyContent: 'space-between',
                      }}
                    >
                      {/* Top Row: Category Pill & Status/Date */}
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                          <View style={{
                            backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                            paddingHorizontal: 6,
                            paddingVertical: 1.5,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                            maxWidth: 110,
                          }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: isDark ? '#94A3B8' : '#475569' }} numberOfLines={1}>
                              {categoryName}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Clock size={9} color={isOngoing ? '#F59E0B' : (isDark ? '#94A3B8' : '#64748B')} />
                            <Text style={{ fontSize: 9, color: isOngoing ? '#F59E0B' : (isDark ? '#94A3B8' : '#64748B'), fontWeight: '700' }}>
                              {isOngoing ? (language === 'hi' ? 'जारी है' : 'Paused') : dateLabel}
                            </Text>
                          </View>
                        </View>

                        {/* Test Title (Reduced font size and compact height) */}
                        <Text
                          style={{
                            fontSize: 11.5,
                            fontWeight: '700',
                            color: isDark ? '#FFFFFF' : '#0F172A',
                            lineHeight: 15,
                            marginBottom: 6,
                            minHeight: 28,
                          }}
                          numberOfLines={2}
                        >
                          {title}
                        </Text>

                        {/* Performance Badges Row or Ongoing Badge */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                          {isOngoing ? (
                            <>
                              <View style={{
                                backgroundColor: isDark ? 'rgba(245,158,11,0.18)' : '#FEF3C7',
                                borderColor: isDark ? '#78350F' : '#FDE68A',
                                borderWidth: 1,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 6,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 3,
                              }}>
                                <Clock size={10} color="#D97706" />
                                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#D97706' }}>
                                  {language === 'hi' ? 'प्रगति पर' : 'In Progress'}
                                </Text>
                              </View>
                              {attemptedCount > 0 && (
                                <View style={{
                                  backgroundColor: isDark ? 'rgba(59,130,246,0.18)' : '#EFF6FF',
                                  borderColor: isDark ? '#1E3A8A' : '#BFDBFE',
                                  borderWidth: 1,
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}>
                                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#2563EB' }}>
                                    {attemptedCount} {language === 'hi' ? 'हल किए' : 'Answered'}
                                  </Text>
                                </View>
                              )}
                            </>
                          ) : (
                            <>
                              {/* Score Pill */}
                              <View style={{
                                backgroundColor: scoreBadgeBg,
                                borderColor: scoreBadgeBorder,
                                borderWidth: 1,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 6,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 3,
                              }}>
                                <Award size={10} color={scoreBadgeColor} />
                                <Text style={{ fontSize: 9.5, fontWeight: '800', color: scoreBadgeColor }}>
                                  {score} <Text style={{ fontSize: 8.5, fontWeight: '600' }}>/ {maxMarks}</Text>
                                </Text>
                              </View>

                              {/* Accuracy / Completed Pill */}
                              {accuracy !== null ? (
                                <View style={{
                                  backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7',
                                  borderColor: isDark ? '#78350F' : '#FDE68A',
                                  borderWidth: 1,
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}>
                                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#D97706' }}>
                                    Acc: {accuracy}%
                                  </Text>
                                </View>
                              ) : (
                                <View style={{
                                  backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5',
                                  borderColor: isDark ? '#065F46' : '#A7F3D0',
                                  borderWidth: 1,
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}>
                                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#10B981' }}>
                                    {language === 'hi' ? 'पूर्ण' : 'Done'}
                                  </Text>
                                </View>
                              )}
                            </>
                          )}
                        </View>
                      </View>

                      {/* Action Buttons Row */}
                      {isOngoing ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={{
                            width: '100%',
                            backgroundColor: '#10B981',
                            paddingVertical: 6.5,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                            shadowColor: '#10B981',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.25,
                            shadowRadius: 3,
                            elevation: 2,
                          }}
                          onPress={() => {
                            onOpenExam(attempt.testId);
                          }}
                        >
                          <Play size={12} color="#FFFFFF" fill="#FFFFFF" />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                            {language === 'hi' ? 'टेस्ट जारी रखें' : 'Resume Test'}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {/* Analysis / Solutions Button */}
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={{
                              flex: 1,
                              backgroundColor: '#2563EB',
                              paddingVertical: 6,
                              borderRadius: 8,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              shadowColor: '#2563EB',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.15,
                              shadowRadius: 2,
                              elevation: 1,
                            }}
                            onPress={() => {
                              onOpenAttemptAnalysis(attempt);
                            }}
                          >
                            <Eye size={11} color="#FFFFFF" />
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' }}>
                              {language === 'hi' ? 'विश्लेषण' : 'Analysis'}
                            </Text>
                          </TouchableOpacity>

                          {/* Re-attempt Button */}
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={{
                              backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                              borderColor: isDark ? '#334155' : '#CBD5E1',
                              borderWidth: 1,
                              paddingVertical: 5.5,
                              paddingHorizontal: 8,
                              borderRadius: 8,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 3,
                            }}
                            onPress={() => {
                              onOpenExam(attempt.testId);
                            }}
                          >
                            <RotateCcw size={10} color={isDark ? '#60A5FA' : '#2563EB'} />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? '#60A5FA' : '#2563EB' }}>
                              {language === 'hi' ? 'पुनः' : 'Re-take'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          );
        })()}

        {/* Section 3: Popular Exam Categories */}
        {(() => {
          const nonPracticeCats = (examCatalog || []).filter((c: any) =>
            !c.isPracticeSeries &&
            !c.id?.includes('_practice') &&
            !c.name?.toLowerCase().includes('practice')
          );
          const popularList = nonPracticeCats.filter((c: any) => c.isPopular === true);
          const displayPopular = popularList.length > 0 ? popularList : nonPracticeCats.slice(0, 6);

          if (displayPopular.length === 0) return null;

          return (
            <View style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingRight: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Star size={16} color="#F59E0B" fill="#F59E0B" />
                  <Text style={[styles.sectionTitle, isDark && { color: ThemeColors.dark.text }, { marginBottom: 0 }]}>
                    {language === 'hi' ? 'लोकप्रिय परीक्षा श्रेणियां' : 'Popular Exam Categories'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setExamSearchQuery('');
                    setSelectedCategoryId(null);
                    setActiveTab('tests');
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563EB' }}>
                    {language === 'hi' ? 'सभी देखें →' : 'View All →'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
                {displayPopular.map((cat) => {
                  const catStyle = getCategoryStyle(cat.name, isDark);
                  const subPreview = (cat.subCategories || [])
                    .slice(0, 3)
                    .map((s: any) => s.title || s.name)
                    .join(' • ');

                  return (
                    <TouchableOpacity
                      key={`popular-card-${cat.id}`}
                      activeOpacity={0.85}
                      style={{
                        width: 210,
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderRadius: 18,
                        padding: 14,
                        marginRight: 12,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        borderWidth: 1.5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: isDark ? 0.3 : 0.06,
                        shadowRadius: 6,
                        elevation: 3,
                      }}
                      onPress={() => {
                        setExamSearchQuery('');
                        setSelectedCategoryId(cat.id);
                        setActiveTab('tests');
                      }}
                    >
                      {/* Top Row: Icon + Popular Badge */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <View style={{
                          width: 42,
                          height: 42,
                          borderRadius: 13,
                          backgroundColor: '#FFFFFF',
                          borderColor: isDark ? '#334155' : catStyle.borderColor,
                          borderWidth: 1.5,
                          justifyContent: 'center',
                          alignItems: 'center',
                          overflow: 'hidden',
                          padding: 2,
                        }}>
                          <CategoryLogoImage
                            logoUrl={(() => { const { primaryUrl } = getEffectiveLogoUrl(cat.name, cat.logoUrl); return primaryUrl; })()}
                            fallbackLogoUrl={(() => { const { fallbackUrl } = getEffectiveLogoUrl(cat.name, cat.logoUrl); return fallbackUrl; })()}
                            fallbackIcon={<CategoryIcon name={catStyle.iconName} color={catStyle.iconColor} size={22} />}
                          />
                        </View>

                        <View style={{
                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7',
                          borderColor: isDark ? '#78350F' : '#FDE68A',
                          borderWidth: 1,
                          paddingHorizontal: 7,
                          paddingVertical: 2.5,
                          borderRadius: 9,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                        }}>
                          <Star size={9} color="#D97706" fill="#D97706" />
                          <Text style={{ fontSize: 9, fontWeight: '900', color: '#D97706', letterSpacing: 0.3 }}>
                            POPULAR
                          </Text>
                        </View>
                      </View>

                      {/* Category Name */}
                      <Text style={{
                        fontSize: 14.5,
                        fontWeight: '900',
                        color: isDark ? '#FFFFFF' : '#0F172A',
                        marginBottom: 4,
                      }} numberOfLines={1}>
                        {cat.name}
                      </Text>

                      {/* Description / Subcategories preview */}
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: isDark ? '#94A3B8' : '#64748B',
                        marginBottom: 10,
                        minHeight: 26,
                      }} numberOfLines={2}>
                        {cat.countText ? `${cat.countText} • ` : ''}{subPreview || (language === 'hi' ? 'सभी मॉक टेस्ट उपलब्ध' : 'All Mock Tests Available')}
                      </Text>

                      {/* Bottom action button */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: isDark ? '#334155' : '#F1F5F9',
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563EB' }}>
                          {language === 'hi' ? 'टेस्ट देखें' : 'Explore Tests'}
                        </Text>
                        <View style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <ChevronRight size={13} color="#2563EB" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );
        })()}

      </ScrollView>
    );
  };

  const renderTestsTab = () => {
    if (selectedCategoryId === null) {
      const baseCatalog = examCatalog || [];

      const sortedCatalog = [...baseCatalog].sort((a, b) => {
        const aPinned = pinnedCategoryIds.includes(a.id);
        const bPinned = pinnedCategoryIds.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
      });
      const filteredCatalog = examSearchQuery.trim()
        ? sortedCatalog.filter(cat =>
            cat.name?.toLowerCase().includes(examSearchQuery.toLowerCase())
          )
        : sortedCatalog;

      return (
        <View style={{ flex: 1 }}>

          {/* Search Bar */}
          <View style={[styles.examSearchContainer, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
            <Search size={16} color={isDark ? '#60A5FA' : '#6B7280'} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.examSearchInput, isDark && { color: ThemeColors.dark.text }]}
              placeholder={testCatalogMode === 'practice_series' ? (language === 'hi' ? 'अभ्यास श्रेणी खोजें...' : 'Search practice series...') : LOCALIZATION[language].searchExams}
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              value={examSearchQuery}
              onChangeText={setExamSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
            {examSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setExamSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Swipe instruction helper */}
          {examSearchQuery.trim() === '' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4, opacity: 0.65 }}>
              <Pin size={10} color={isDark ? '#94A3B8' : '#64748B'} style={{ transform: [{ rotate: '45deg' }] }} />
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: isDark ? '#94A3B8' : '#64748B' }}>
                {LOCALIZATION[language].pinInstruction}
              </Text>
            </View>
          )}

          {filteredCatalog.length === 0 ? (
            <View style={styles.examSearchEmpty}>
              <Search size={36} color={isDark ? '#374151' : '#D1D5DB'} />
              <Text style={[styles.examSearchEmptyText, isDark && { color: ThemeColors.dark.textMuted }]}>
                No exams found for "{examSearchQuery}"
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredCatalog}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContainer, { paddingTop: 4 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={true}
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={5}
              extraData={pinnedCategoryIds}
              renderItem={({ item: category }) => {
                const catStyle = getCategoryStyle(category.name, isDark);
                const isPinned = pinnedCategoryIds.includes(category.id);
                return (
                  <SwipeableCategoryCard
                    key={category.id}
                    isPinned={isPinned}
                    onPin={() => handlePinCategory(category.id)}
                    onUnpin={() => handleUnpinCategory(category.id)}
                    isDark={isDark}
                  >
                    <TouchableOpacity
                      style={[
                        styles.categoryCard,
                        {
                          backgroundColor: catStyle.colors[0],
                          borderColor: catStyle.borderColor,
                          borderLeftWidth: 4,
                          borderLeftColor: catStyle.iconColor,
                          marginBottom: 0,
                          position: 'relative',
                        },
                      ]}
                      activeOpacity={0.82}
                      onPress={() => {
                        setExamSearchQuery('');
                        const isPracticeCat = !!(category.isPracticeSeries || category.id?.includes('practice') || category.name?.toLowerCase().includes('practice'));
                        if (isPracticeCat && category.subCategories && category.subCategories.length === 1) {
                          const sub = category.subCategories[0];
                          onSelectTestSeries({ ...sub, categoryName: category.name, logoUrl: sub.logoUrl || category.logoUrl });
                        } else {
                          setSelectedCategoryId(category.id);
                        }
                      }}
                    >
                      {/* Top-Right Pin Badge */}
                      {isPinned && (
                        <View style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.12)',
                          justifyContent: 'center',
                          alignItems: 'center',
                          zIndex: 10,
                        }}>
                          <Pin size={10} color="#10B981" style={{ transform: [{ rotate: '45deg' }] }} />
                        </View>
                      )}
                      <View style={styles.categoryCardLeft}>
                        {/* Icon/Logo circle */}
                        <View style={[
                          styles.categoryIconCircle,
                          {
                            backgroundColor: '#FFFFFF',
                            borderColor: isDark ? '#334155' : catStyle.borderColor,
                            overflow: 'hidden',
                            padding: 2,
                          }
                        ]}>
                          <CategoryLogoImage
                            logoUrl={(() => { const { primaryUrl } = getEffectiveLogoUrl(category.name, category.logoUrl); return primaryUrl; })()}
                            fallbackLogoUrl={(() => { const { fallbackUrl } = getEffectiveLogoUrl(category.name, category.logoUrl); return fallbackUrl; })()}
                            fallbackIcon={
                              (category.isPracticeSeries || category.id?.includes('practice') || category.name?.toLowerCase().includes('practice')) ? (
                                <Trophy color="#F59E0B" size={24} />
                              ) : (
                                <CategoryIcon name={catStyle.iconName} color={catStyle.iconColor} size={24} />
                              )
                            }
                          />
                        </View>

                        {/* Text info */}
                        <View style={styles.categoryDetails}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.categoryTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                              {getLocalizedName(category, language)}
                            </Text>
                          </View>
                          <Text style={[styles.categoryMeta, { color: isDark ? '#64748B' : '#6B7280' }]}>
                            {category.subCategories?.length || 0} exam types available
                          </Text>
                        </View>
                      </View>

                      {/* Chevron */}
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: isDark ? 'rgba(79,110,247,0.15)' : 'rgba(79,110,247,0.1)',
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        <ChevronRight color={catStyle.iconColor} size={16} />
                      </View>
                    </TouchableOpacity>
                  </SwipeableCategoryCard>
                );
              }}
            />
          )}
        </View>
      );
    }

    const selectedCategory = examCatalog.find(c => c.id === selectedCategoryId);
    if (!selectedCategory) {
      setSelectedCategoryId(null);
      return null;
    }

    if (selectedSubCategoryId) {
      const selectedSubCategory = (selectedCategory.subCategories || []).find((s: any) => s.id === selectedSubCategoryId);
      if (!selectedSubCategory) {
        setSelectedSubCategoryId(null);
        return null;
      }

      const sortedSubSubList = [...(selectedSubCategory.subSubCategories || [])].sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

      return (
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.backToCatBtn, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border, borderBottomColor: ThemeColors.dark.border }]}
            onPress={() => setSelectedSubCategoryId(null)}
          >
            <ChevronLeft color={isDark ? '#60A5FA' : '#2563EB'} size={16} />
            <Text style={[styles.backToCatText, isDark && { color: '#60A5FA' }]}>
              {language === 'hi' ? `${getLocalizedName(selectedCategory, language)} पर वापस जाएं` : `Back to ${getLocalizedName(selectedCategory, language)}`}
            </Text>
          </TouchableOpacity>

          <FlatList
            data={sortedSubSubList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
            getItemLayout={(data, index) => ({ length: 78, offset: 78 * index, index })}
            renderItem={({ item: subSub }) => {
              const catStyle = getCategoryStyle(selectedCategory.name, isDark);
              const { primaryUrl: logoUri } = getEffectiveLogoUrl(
                selectedCategory.name,
                (subSub.logoUrl && subSub.logoUrl.trim()) || (selectedSubCategory.logoUrl && selectedSubCategory.logoUrl.trim()) || (selectedCategory.logoUrl && selectedCategory.logoUrl.trim()) || null
              );
              return (
                <TouchableOpacity
                  style={[
                    styles.seriesCard,
                    {
                      backgroundColor: catStyle.colors[0],
                      borderColor: catStyle.borderColor,
                      borderLeftWidth: 4,
                      borderLeftColor: catStyle.iconColor,
                    },
                  ]}
                  activeOpacity={0.82}
                  onPress={() => onSelectTestSeries({
                    ...subSub,
                    categoryName: selectedCategory.name,
                    subCategoryName: selectedSubCategory.name,
                    logoUrl: logoUri,
                  })}
                >
                  <View style={styles.seriesCardLeft}>
                    {/* Icon / Logo circle */}
                    <View style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: '#FFFFFF',
                      borderColor: isDark ? '#334155' : catStyle.borderColor, borderWidth: 1.5,
                      justifyContent: 'center', alignItems: 'center', marginRight: 12,
                      overflow: 'hidden',
                      padding: 2,
                      shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
                    }}>
                      <CategoryLogoImage
                        logoUrl={logoUri || ''}
                        fallbackIcon={
                          (selectedCategory.isPracticeSeries || selectedCategory.id?.includes('practice') || selectedCategory.name?.toLowerCase().includes('practice')) ? (
                            <Trophy color="#F59E0B" size={22} />
                          ) : (
                            <BookOpen color={catStyle.iconColor} size={20} />
                          )
                        }
                      />
                    </View>
                    <View style={styles.seriesDetails}>
                      <Text style={[styles.seriesTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                        {getLocalizedName(subSub, language)}
                      </Text>
                      <Text style={[styles.seriesMeta, { color: isDark ? '#64748B' : '#6B7280' }]}>
                        {subSub.tests?.length || 0} Mock Tests
                      </Text>
                    </View>
                  </View>
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: isDark ? 'rgba(79,110,247,0.15)' : 'rgba(79,110,247,0.1)',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <ChevronRight color={catStyle.iconColor} size={16} />
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{
                padding: 24,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 20,
                backgroundColor: isDark ? 'rgba(15,23,42,0.6)' : '#FFFFFF',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
              }}>
                <View style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}>
                  <Clock size={26} color="#3B82F6" />
                </View>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  textAlign: 'center',
                  marginBottom: 4,
                }}>
                  {language === 'hi' ? '🚀 जल्द ही नए मॉक टेस्ट अपलोड हो रहे हैं!' : '🚀 Uploading Mock Tests Soon!'}
                </Text>
                <Text style={{
                  fontSize: 11,
                  fontWeight: '500',
                  color: isDark ? '#94A3B8' : '#64748B',
                  textAlign: 'center',
                  lineHeight: 16,
                  maxWidth: 270,
                }}>
                  {language === 'hi'
                    ? 'हमारी विशेषज्ञ टीम इस श्रेणी के लिए उच्च-गुणवत्ता वाले मॉक टेस्ट, अभ्यास सेट और विस्तृत समाधान तैयार कर रही है। जल्द ही नए टेस्ट उपलब्ध होंगे!'
                    : 'Our expert team is actively creating high-quality mock tests, practice sets, and detailed solutions for this category. Stay tuned — new tests are uploaded regularly!'}
                </Text>
              </View>
            }
          />
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={[styles.backToCatBtn, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border, borderBottomColor: ThemeColors.dark.border }]}
          onPress={() => setSelectedCategoryId(null)}
        >
          <ChevronLeft color={isDark ? '#60A5FA' : '#2563EB'} size={16} />
          <Text style={[styles.backToCatText, isDark && { color: '#60A5FA' }]}>
            {language === 'hi' ? 'परीक्षा श्रेणियों पर वापस जाएं' : 'Back to Exam Categories'}
          </Text>
        </TouchableOpacity>

        <FlatList
          data={[...selectedCategory.subCategories].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          getItemLayout={(data, index) => ({ length: 78, offset: 78 * index, index })}
          renderItem={({ item: sub }) => {
            const catStyle = getCategoryStyle(selectedCategory.name, isDark);
            const { primaryUrl: logoUri } = getEffectiveLogoUrl(
              selectedCategory.name,
              (sub.logoUrl && sub.logoUrl.trim()) || (selectedCategory.logoUrl && selectedCategory.logoUrl.trim()) || null
            );

            const subSubCount = sub.subSubCategories?.length || 0;
            const directTestsCount = sub.tests?.length || 0;
            const totalTestsCount = subSubCount > 0
              ? (sub.subSubCategories || []).reduce((acc: number, ss: any) => acc + (ss.tests?.length || 0), 0)
              : directTestsCount;

            return (
              <TouchableOpacity
                style={[
                  styles.seriesCard,
                  {
                    backgroundColor: catStyle.colors[0],
                    borderColor: catStyle.borderColor,
                    borderLeftWidth: 4,
                    borderLeftColor: catStyle.iconColor,
                  },
                ]}
                activeOpacity={0.82}
                onPress={() => {
                  if (sub.subSubCategories && sub.subSubCategories.length > 0) {
                    setSelectedSubCategoryId(sub.id);
                  } else {
                    onSelectTestSeries({ ...sub, categoryName: selectedCategory.name, logoUrl: logoUri });
                  }
                }}
              >
                <View style={styles.seriesCardLeft}>
                  {/* Icon / Logo circle */}
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: '#FFFFFF',
                    borderColor: isDark ? '#334155' : catStyle.borderColor, borderWidth: 1.5,
                    justifyContent: 'center', alignItems: 'center', marginRight: 12,
                    overflow: 'hidden',
                    padding: 2,
                    shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
                  }}>
                    <CategoryLogoImage
                      logoUrl={logoUri || ''}
                      fallbackIcon={
                        (selectedCategory.isPracticeSeries || selectedCategory.id?.includes('practice') || selectedCategory.name?.toLowerCase().includes('practice')) ? (
                          <Trophy color="#F59E0B" size={22} />
                        ) : (
                          <BookOpen color={catStyle.iconColor} size={20} />
                        )
                      }
                    />
                  </View>
                  <View style={styles.seriesDetails}>
                    <Text style={[styles.seriesTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                      {getLocalizedName(sub, language)}
                    </Text>
                    <Text style={[styles.seriesMeta, { color: isDark ? '#64748B' : '#6B7280' }]}>
                      {subSubCount > 0
                        ? (language === 'hi' ? `${subSubCount} उप-श्रेणियां (${totalTestsCount} टेस्ट)` : `${subSubCount} Sub-categories (${totalTestsCount} Tests)`)
                        : `${directTestsCount} Mock Tests`}
                    </Text>
                  </View>
                </View>
                <View style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: isDark ? 'rgba(79,110,247,0.15)' : 'rgba(79,110,247,0.1)',
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <ChevronRight color={catStyle.iconColor} size={16} />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{
              padding: 24,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 20,
              backgroundColor: isDark ? 'rgba(15,23,42,0.6)' : '#FFFFFF',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            }}>
              <View style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}>
                <Clock size={26} color="#3B82F6" />
              </View>
              <Text style={{
                fontSize: 14,
                fontWeight: '800',
                color: isDark ? '#F8FAFC' : '#0F172A',
                textAlign: 'center',
                marginBottom: 4,
              }}>
                {language === 'hi' ? '🚀 जल्द ही नए मॉक टेस्ट अपलोड हो रहे हैं!' : '🚀 Uploading Mock Tests Soon!'}
              </Text>
              <Text style={{
                fontSize: 11,
                fontWeight: '500',
                color: isDark ? '#94A3B8' : '#64748B',
                textAlign: 'center',
                lineHeight: 16,
                maxWidth: 270,
              }}>
                {language === 'hi'
                  ? 'हमारी विशेषज्ञ टीम इस श्रेणी के लिए उच्च-गुणवत्ता वाले मॉक टेस्ट, अभ्यास सेट और विस्तृत समाधान तैयार कर रही है। जल्द ही नए टेस्ट उपलब्ध होंगे!'
                  : 'Our expert team is actively creating high-quality mock tests, practice sets, and detailed solutions for this category. Stay tuned — new tests are uploaded regularly!'}
              </Text>
            </View>
          }
        />
      </View>
    );
  };

  const renderNoticeCard = (notice: any) => {
    let catColor = '#3B82F6'; // general notice
    let catBg = isDark ? '#11293B' : '#EFF6FF';
    let catBorderColor = isDark ? '#1E3A8A' : '#DBEAFE';

    if (notice.category === 'result') {
      catColor = '#10B981';
      catBg = isDark ? '#062C1E' : '#ECFDF5';
      catBorderColor = isDark ? '#065F46' : '#D1FAE5';
    } else if (notice.category === 'admit_card') {
      catColor = '#F59E0B';
      catBg = isDark ? '#3B2E11' : '#FEF3C7';
      catBorderColor = isDark ? '#78350F' : '#FDE68A';
    } else if (notice.category === 'answer_key') {
      catColor = '#8B5CF6';
      catBg = isDark ? '#2D1F47' : '#F5F3FF';
      catBorderColor = isDark ? '#5B21B6' : '#EDE9FE';
    }

    const isNew = (() => {
      if (!notice.publishDate) return false;
      try {
        const now = new Date();
        const pubDate = new Date(notice.publishDate);
        pubDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(now.getTime() - pubDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
      } catch (e) {
        return false;
      }
    })();

    return (
      <View
        key={notice.id}
        style={[
          styles.noticeCard,
          {
            backgroundColor: catBg,
            borderColor: catBorderColor,
            borderLeftColor: catColor,
            borderLeftWidth: 4,
            position: 'relative',
            overflow: 'hidden',
          },
        ]}
      >
        {/* Decorative background circles */}
        <View style={{ position: 'absolute', top: -25, right: -25, width: 70, height: 70, borderRadius: 35, backgroundColor: catColor, opacity: isDark ? 0.12 : 0.05 }} />
        <View style={{ position: 'absolute', bottom: -15, left: 40, width: 45, height: 45, borderRadius: 22.5, backgroundColor: catColor, opacity: isDark ? 0.08 : 0.03 }} />
        <View style={styles.noticeHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.noticeBadge, { color: catColor, borderColor: catColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
              {notice.type || notice.category.toUpperCase()}
            </Text>
            {isNew && (
              <View style={{ backgroundColor: '#EF4444', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 8, fontWeight: '900' }}>NEW</Text>
              </View>
            )}
          </View>
          <Text style={[styles.noticeDate, { color: isDark ? '#94A3B8' : '#64748B' }]}>{notice.date}</Text>
        </View>
        <Text style={[styles.noticeTitle, isDark ? { color: '#FFFFFF' } : { color: '#1E293B' }]}>{language === 'hi' && notice.titleHi ? notice.titleHi : notice.title}</Text>
        {notice.lastDate && (
          <Text style={[styles.noticeSubText, { color: '#EF4444', fontWeight: 'bold' }]}>Last Date: {notice.lastDate}</Text>
        )}
        {notice.url && (
          <TouchableOpacity
            style={[styles.noticeLinkBtn, { borderColor: catColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF' }]}
            onPress={() => Linking.openURL(notice.url)}
          >
            <Text style={[styles.noticeLinkText, { color: catColor }]}>Official Link</Text>
            <ExternalLink size={12} color={catColor} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderNoticesTab = () => {
    const pageWidth = Dimensions.get('window').width;

    return (
      <View style={{ flex: 1 }}>
        {/* Tab Switcher — tapping scrolls pager to that page */}
        <View style={[styles.noticeFilterTabs, isDark && { backgroundColor: ThemeColors.dark.card, borderBottomColor: ThemeColors.dark.border }]}>
          {NOTICE_TABS.map((tab) => {
            const label = tab === 'notice' ? 'Notices' : tab === 'result' ? 'Results' : tab === 'admit_card' ? 'Admit Cards' : 'Answer Key';
            const activeStyle =
              tab === 'notice' ? styles.noticeTabNoticeActive
              : tab === 'result' ? styles.noticeTabResultActive
              : tab === 'admit_card' ? styles.noticeTabAdmitActive
              : styles.noticeTabAnswerActive;
            const isActive = activeNoticeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.noticeFilterTab, isActive && activeStyle]}
                onPress={() => scrollNoticeToTab(tab)}
              >
                <Text style={[
                  styles.noticeFilterText,
                  isActive && styles.noticeTabTextActive,
                  isDark && isActive && { color: '#60A5FA' },
                  isDark && !isActive && { color: ThemeColors.dark.textMuted }
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search Bar — filters the active page */}
        <View style={[styles.examSearchContainer, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
          <Search size={16} color={isDark ? '#60A5FA' : '#6B7280'} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.examSearchInput, isDark && { color: ThemeColors.dark.text }]}
            placeholder={
              activeNoticeTab === 'notice' ? 'Search live notices...'
              : activeNoticeTab === 'result' ? 'Search results...'
              : activeNoticeTab === 'admit_card' ? 'Search admit cards...'
              : 'Search answer keys...'
            }
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            value={noticeSearchQuery}
            onChangeText={setNoticeSearchQuery}
            returnKeyType="search"
            clearButtonMode="never"
            autoCorrect={false}
          />
          {noticeSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setNoticeSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Swipeable pager — one page per tab category */}
        <ScrollView
          ref={noticeScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
          bounces={false}
          keyboardShouldPersistTaps="handled"
          onMomentumScrollEnd={(e) => {
            const pageIndex = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
            const newTab = NOTICE_TABS[pageIndex];
            if (newTab && newTab !== activeNoticeTab) {
              setActiveNoticeTab(newTab);
              setNoticeSearchQuery('');
            }
          }}
          style={{ flex: 1 }}
        >
          {NOTICE_TABS.map((tab) => {
            const tabNotices = notices
              .filter(n => n.category === tab)
              .filter(n =>
                activeNoticeTab !== tab || noticeSearchQuery.trim() === '' ||
                (n.title || '').toLowerCase().includes(noticeSearchQuery.toLowerCase())
              );

            return (
              <View key={tab} style={{ width: pageWidth, flex: 1 }}>
                <FlatList
                  data={tabNotices}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                  removeClippedSubviews={true}
                  initialNumToRender={8}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  renderItem={({ item }) => renderNoticeCard(item)}
                  ListEmptyComponent={
                    <Text style={[styles.noNoticesText, isDark && { color: ThemeColors.dark.textMuted }]}>
                      {noticeSearchQuery.trim() !== '' && activeNoticeTab === tab
                        ? 'No results match your search.'
                        : 'No announcements in this category.'}
                    </Text>
                  }
                />
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderBookmarksTab = () => {
    const bookmarks: any[] = currentUser?.bookmarkedQuestions || [];

    // Helper: find a question from cache by testId + questionId
    const findQ = (testId: string, questionId: string) => {
      const qs = bookmarkQsCache[testId];
      if (!qs || !Array.isArray(qs)) return null;
      const targetStr = String(questionId || '').trim();
      return qs.find((q: any, idx: number) => {
        if (!q) return false;
        const qIdStr = String(q.id || q.questionId || q._id || `q_${idx + 1}` || `q_custom_${idx}`).trim();
        return qIdStr === targetStr || String(idx + 1) === targetStr || (targetStr.startsWith('q_custom_') && targetStr === `q_custom_${idx}`);
      }) || null;
    };

    // Helper: find test title from catalog
    const getTestTitle = (testId: string) => {
      for (const cat of examCatalog) {
        for (const sub of cat.subCategories || []) {
          const found = (sub.tests || []).find((t: any) => t.id === testId);
          if (found) return found.title;
          for (const ss of (sub.subSubCategories || [])) {
            const f2 = (ss.tests || []).find((t: any) => t.id === testId);
            if (f2) return f2.title;
          }
        }
      }
      return testId;
    };

    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Bookmark size={20} color={isDark ? '#F59E0B' : '#D97706'} fill={isDark ? '#F59E0B' : '#D97706'} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#F1F5F9' : '#0F172A' }}>
              Bookmarked Questions
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: isDark ? '#64748B' : '#94A3B8', marginTop: 4 }}>
            {bookmarks.length} question{bookmarks.length !== 1 ? 's' : ''} saved for review
          </Text>
        </View>

        {bookmarks.length === 0 ? (
          <View style={{
            alignItems: 'center', paddingVertical: 40,
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderRadius: 16, borderWidth: 1,
            borderColor: isDark ? '#334155' : '#E2E8F0'
          }}>
            <Bookmark size={36} color={isDark ? '#475569' : '#CBD5E1'} />
            <Text style={{ marginTop: 12, fontSize: 13, fontWeight: '700', color: isDark ? '#64748B' : '#94A3B8' }}>
              No bookmarks yet
            </Text>
            <Text style={{ marginTop: 4, fontSize: 11, color: isDark ? '#475569' : '#CBD5E1', textAlign: 'center', paddingHorizontal: 24 }}>
              Tap the bookmark icon on any question during a test or analysis to save it here.
            </Text>
          </View>
        ) : bookmarkQsLoading ? (
          <View style={{
            alignItems: 'center', paddingVertical: 40,
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderRadius: 16, borderWidth: 1,
            borderColor: isDark ? '#334155' : '#E2E8F0'
          }}>
            <SpinningDotsLoader size={48} isDark={isDark} message="Loading bookmarked questions..." />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {bookmarks.map((bm: any, index: number) => {
              const rawQ = findQ(bm.testId, bm.questionId);
              if (!rawQ) return null;

              // Normalise both API raw format and engine format
              const questionTextEn: string = rawQ.textEn || rawQ.content?.en?.questionText || '';
              const questionTextHi: string = rawQ.textHi || rawQ.content?.hi?.questionText || questionTextEn;
              const optionsEn: string[] = rawQ.optionsEn || rawQ.content?.en?.options || [];
              const optionsHi: string[] = rawQ.optionsHi || rawQ.content?.hi?.options || optionsEn;
              const correctIdx: number = rawQ.correctIndex !== undefined ? rawQ.correctIndex : (rawQ.correctOptionIndex ?? 0);
              const explanationEn: string = rawQ.explanationEn || '';
              const explanationHi: string = rawQ.explanationHi || '';
              const testTitle = getTestTitle(bm.testId);
              const isExpanded = !!expandedBookmarks[bm.questionId];

              // Decode simple HTML entities
              const decode = (s: string) => s
                .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');

              const stripHtml = (html: string) => {
                if (!html) return '';
                const decoded = decode(html);
                return decoded.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
              };

              return (
                <View key={bm.questionId} style={{
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderRadius: 14, borderWidth: 1,
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                  overflow: 'hidden',
                  elevation: 1, shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06, shadowRadius: 4,
                }}>
                  {/* Top strip */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => toggleExpandBookmark(bm.questionId)}
                    style={{ padding: 14 }}
                  >
                    {/* Test badge row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{
                        backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF',
                        borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
                        borderWidth: 1, borderColor: isDark ? '#1D4ED8' : '#BFDBFE',
                        maxWidth: '75%'
                      }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: isDark ? '#93C5FD' : '#1D4ED8', textTransform: 'uppercase' }} numberOfLines={1}>
                          {testTitle}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: isDark ? '#64748B' : '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Q#{index + 1}
                        </Text>
                        {onToggleBookmark && (
                          <TouchableOpacity
                            onPress={() => onToggleBookmark(bm.testId, bm.questionId)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 size={14} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Question preview */}
                    <Text
                      style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#CBD5E1' : '#1E293B', lineHeight: 18 }}
                      numberOfLines={2}
                    >
                      {stripHtml(questionTextEn)}
                    </Text>

                    {/* Expand toggle */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                        {isExpanded ? 'Hide Solution' : 'Show Solution & Options'}
                      </Text>
                      {isExpanded ? <ChevronUp size={12} color="#3B82F6" /> : <ChevronDown size={12} color="#3B82F6" />}
                    </View>
                  </TouchableOpacity>

                  {/* Expanded content */}
                  {isExpanded && (
                    <View style={{
                      borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#F1F5F9',
                      padding: 14, gap: 12
                    }}>
                      {/* Full question */}
                      <View style={{
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderRadius: 10, padding: 12,
                        borderWidth: 1, borderColor: isDark ? '#1E293B' : '#E2E8F0'
                      }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#3B82F6', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.4 }}>
                          Question
                        </Text>
                        <HtmlText
                          html={questionTextEn}
                          isDark={isDark}
                          style={{ fontSize: 12, color: isDark ? '#E2E8F0' : '#1E293B', lineHeight: 19 }}
                        />
                        {questionTextHi && questionTextHi !== questionTextEn && (
                          <>
                            <View style={{ height: 1, backgroundColor: isDark ? '#1E293B' : '#E2E8F0', marginVertical: 8 }} />
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#6366F1', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.4 }}>
                              हिंदी
                            </Text>
                            <HtmlText
                              html={questionTextHi}
                              isDark={isDark}
                              style={{ fontSize: 12, color: isDark ? '#CBD5E1' : '#374151', lineHeight: 19 }}
                            />
                          </>
                        )}
                      </View>

                      {/* Options */}
                      {optionsEn.length > 0 && (
                        <View>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: isDark ? '#64748B' : '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.4 }}>
                            Options & Answer
                          </Text>
                          <View style={{ gap: 6 }}>
                            {optionsEn.map((opt: any, oIdx: number) => {
                              const textEn = typeof opt === 'string' ? opt : opt?.text || String(opt);
                              const rawHi = optionsHi[oIdx];
                              const textHi = typeof rawHi === 'string' ? rawHi : (rawHi as any)?.text || textEn;
                              const isCorrect = oIdx === correctIdx;
                              return (
                                <View key={oIdx} style={{
                                  padding: 10, borderRadius: 10, borderWidth: 1,
                                  backgroundColor: isCorrect
                                    ? (isDark ? 'rgba(16,185,129,0.12)' : '#F0FDF4')
                                    : (isDark ? '#0F172A' : '#F8FAFC'),
                                  borderColor: isCorrect
                                    ? (isDark ? '#059669' : '#86EFAC')
                                    : (isDark ? '#1E293B' : '#E2E8F0'),
                                }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 4 }}>
                                      <Text style={{
                                        fontSize: 12, lineHeight: 18,
                                        fontWeight: isCorrect ? '700' : '500',
                                        color: isCorrect
                                          ? (isDark ? '#34D399' : '#065F46')
                                          : (isDark ? '#94A3B8' : '#374151')
                                      }}>
                                        {String.fromCharCode(65 + oIdx)}.
                                      </Text>
                                      <View style={{ flex: 1 }}>
                                        <HtmlText
                                          html={textEn}
                                          isDark={isDark}
                                          style={{
                                            fontSize: 12, lineHeight: 18,
                                            fontWeight: isCorrect ? '700' : '500',
                                            color: isCorrect
                                              ? (isDark ? '#34D399' : '#065F46')
                                              : (isDark ? '#94A3B8' : '#374151')
                                          }}
                                        />
                                      </View>
                                    </View>
                                    {isCorrect && <CheckSquare size={16} color={isDark ? '#34D399' : '#059669'} />}
                                  </View>
                                  {textHi && textHi !== textEn && (
                                    <View style={{ marginLeft: 16, marginTop: 4 }}>
                                      <HtmlText
                                        html={textHi}
                                        isDark={isDark}
                                        style={{ fontSize: 10, color: isDark ? '#64748B' : '#9CA3AF' }}
                                      />
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {/* Explanation */}
                      {(explanationEn || explanationHi) && (
                        <View style={{
                          backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF',
                          borderRadius: 10, padding: 12,
                          borderWidth: 1, borderColor: isDark ? '#1D4ED8' : '#BFDBFE'
                        }}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: isDark ? '#60A5FA' : '#1D4ED8', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.4 }}>
                            Explanation
                          </Text>
                          {explanationEn && (
                            <HtmlText
                              html={explanationEn}
                              isDark={isDark}
                              style={{ fontSize: 11, color: isDark ? '#CBD5E1' : '#1E293B', lineHeight: 17 }}
                            />
                          )}
                          {explanationHi && explanationHi !== explanationEn && (
                            <>
                              <View style={{ height: 1, backgroundColor: isDark ? '#1D4ED8' : '#BFDBFE', marginVertical: 6 }} />
                              <HtmlText
                                html={explanationHi}
                                isDark={isDark}
                                style={{ fontSize: 11, color: isDark ? '#93C5FD' : '#1D4ED8', lineHeight: 17 }}
                              />
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderProfileTab = () => {
    if (currentUser.isGuest) {
      return (
        <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
          {/* Guest Greeting Card */}
          <View style={[
            styles.profileHeaderCard,
            isDark ? { backgroundColor: '#1E293B', borderColor: '#334155', borderTopColor: '#3B82F6' } : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderTopColor: '#2563EB' },
            { borderTopWidth: 6, position: 'relative', overflow: 'hidden', padding: 24 }
          ]}>
            {/* Decorative Floating Spheres */}
            <View style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(59,130,246,0.06)' }} />
            
            <View style={[styles.avatar, { backgroundColor: '#64748B', borderWidth: 2, borderColor: '#FFFFFF', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 }]}>
              <User color="#FFF" size={32} />
            </View>
            <Text style={[styles.profileName, isDark && { color: ThemeColors.dark.text }]}>
              {language === 'en' ? 'Guest Mode' : 'अतिथि मोड'}
            </Text>
            <Text style={[styles.profileEmail, { textAlign: 'center', marginTop: 8, paddingHorizontal: 12 }, isDark && { color: ThemeColors.dark.textMuted }]}>
              {language === 'en' 
                ? 'You are browsing the catalog as a guest. Sign in to your account to save mock test sessions, unlock premium test series, and track statistics.' 
                : 'आप अतिथि के रूप में कैटलॉग ब्राउज़ कर रहे हैं। मॉक टेस्ट सत्रों को सहेजने, प्रीमियम टेस्ट श्रृंखला अनलॉक करने और आंकड़ों को ट्रैक करने के लिए अपने खाते में साइन इन करें।'}
            </Text>
          </View>

          {/* App Theme Settings (Accessible to Guest) */}
          <View style={[styles.formCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
            <Text style={[styles.formCardTitle, isDark && { color: ThemeColors.dark.text }]}>
              {language === 'en' ? '🎨 App Theme Settings' : '🎨 ऐप थीम सेटिंग्स'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity 
                activeOpacity={0.8}
                style={[
                  styles.themeToggleBtn,
                  !isDark ? styles.themeToggleBtnActive : (isDark ? styles.themeToggleBtnInactiveDark : styles.themeToggleBtnInactiveLight)
                ]}
                onPress={() => onToggleTheme && onToggleTheme(false)}
              >
                <Text style={[styles.themeToggleText, !isDark ? styles.themeToggleTextActive : styles.themeToggleTextInactive]}>
                  {language === 'en' ? '☀️ Light Mode' : '☀️ लाइट मोड'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                activeOpacity={0.8}
                style={[
                  styles.themeToggleBtn,
                  isDark ? styles.themeToggleBtnActive : styles.themeToggleBtnInactiveLight
                ]}
                onPress={() => onToggleTheme && onToggleTheme(true)}
              >
                <Text style={[styles.themeToggleText, isDark ? styles.themeToggleTextActive : styles.themeToggleTextInactive]}>
                  {language === 'en' ? '🌙 Dark Mode' : '🌙 डार्क मोड'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action button to sign in */}
          <TouchableOpacity 
            style={[styles.logoutBtn, { backgroundColor: '#2563EB', borderColor: '#2563EB', marginTop: 16 }]} 
            onPress={onLogout}
          >
            <LogIn size={16} color="#FFF" />
            <Text style={[styles.logoutText, { color: '#FFF' }]}>
              {language === 'en' ? 'Sign In / Register' : 'साइन इन / पंजीकरण'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    const isPro = currentUser.subscriptionTier !== 'None';
    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={[
          styles.profileHeaderCard,
          isDark ? { backgroundColor: '#1E293B', borderColor: '#334155', borderTopColor: '#6366F1' } : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderTopColor: '#3B82F6' },
          { borderTopWidth: 6, position: 'relative', overflow: 'hidden' }
        ]}>
          {/* Decorative Floating Spheres */}
          <View style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: 45, backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.06)' }} />
          <View style={{ position: 'absolute', bottom: -20, left: -20, width: 70, height: 70, borderRadius: 35, backgroundColor: isDark ? 'rgba(236,72,153,0.15)' : 'rgba(236,72,153,0.06)' }} />

          <View style={[styles.avatar, { backgroundColor: isPro ? '#EC4899' : '#3B82F6', borderWidth: 2, borderColor: '#FFFFFF', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 }]}>
            {isPro ? <Sparkles color="#FFF" size={32} /> : <User color="#FFF" size={32} />}
          </View>
          <Text style={[styles.profileName, isDark && { color: ThemeColors.dark.text }]}>{currentUser.name}</Text>
          <Text style={[styles.profileEmail, isDark && { color: ThemeColors.dark.textMuted }]}>{currentUser.email}</Text>
          
          <View style={styles.badgeRow}>
            <View style={{ backgroundColor: isDark ? '#111827' : '#F1F5F9', borderColor: isDark ? '#374151' : '#E2E8F0', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 }}>
              <Text style={{ color: isDark ? '#E2E8F0' : '#475569', fontSize: 11, fontWeight: 'bold' }}>Hub ID: {currentUser.candidateCode}</Text>
            </View>
            <View style={{ backgroundColor: isDark ? '#111827' : '#FFFDF5', borderColor: '#F59E0B', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 }}>
              <Text style={{ color: '#D97706', fontSize: 11, fontWeight: 'bold' }}>🪙 {currentUser.coins || 0} Coins</Text>
            </View>
          </View>
        </View>

        {/* System Details */}
        <View style={[
          styles.sysDetailsCard,
          isDark ? { backgroundColor: '#1E293B', borderColor: '#334155' } : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
          { borderLeftWidth: 4, borderLeftColor: isPro ? '#EC4899' : '#2563EB', padding: 16 }
        ]}>
          <View style={[styles.sysDetailItem, { borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <KeyRound size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
              <Text style={[styles.sysDetailLabel, { marginBottom: 0, textTransform: 'none', fontWeight: '700' }, isDark && { color: ThemeColors.dark.textMuted }]}>
                {language === 'en' ? 'System Role' : 'सिस्टम भूमिका'}
              </Text>
            </View>
            <Text style={[styles.sysDetailVal, isDark ? { color: '#E2E8F0' } : { color: '#1F2937' }, { fontWeight: 'bold' }]}>{currentUser.role}</Text>
          </View>

          <View style={[styles.sysDetailItem, { borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Trophy size={16} color="#F59E0B" />
              <Text style={[styles.sysDetailLabel, { marginBottom: 0, textTransform: 'none', fontWeight: '700' }, isDark && { color: ThemeColors.dark.textMuted }]}>
                {language === 'en' ? 'Pass Status' : 'पास की स्थिति'}
              </Text>
            </View>
            <Text style={[
              styles.sysDetailVal,
              { color: isPro ? '#EC4899' : (isDark ? '#E2E8F0' : '#475569'), fontWeight: 'bold' }
            ]}>
              {currentUser.subscriptionTier === 'None' 
                ? (language === 'en' ? 'No Active Pass' : 'कोई सक्रिय पास नहीं') 
                : currentUser.subscriptionTier.replace('Testbook', 'Mock Test')}
            </Text>
          </View>

          {currentUser.subscriptionPurchasedAt && (
            <View style={[styles.sysDetailItem, { borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} color="#10B981" />
                <Text style={[styles.sysDetailLabel, { marginBottom: 0, textTransform: 'none', fontWeight: '700' }, isDark && { color: ThemeColors.dark.textMuted }]}>
                  {language === 'en' ? 'Purchased At' : 'खरीद तिथि'}
                </Text>
              </View>
              <Text style={[styles.sysDetailVal, isDark && { color: ThemeColors.dark.text }]}>{currentUser.subscriptionPurchasedAt}</Text>
            </View>
          )}

          {currentUser.subscriptionExpiresAt && (
            <View style={[styles.sysDetailItem, { borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} color="#EF4444" />
                <Text style={[styles.sysDetailLabel, { marginBottom: 0, textTransform: 'none', fontWeight: '700' }, isDark && { color: ThemeColors.dark.textMuted }]}>
                  {language === 'en' ? 'Expires At' : 'समाप्ति तिथि'}
                </Text>
              </View>
              <Text style={[styles.sysDetailVal, isDark && { color: ThemeColors.dark.text }]}>{currentUser.subscriptionExpiresAt}</Text>
            </View>
          )}

          <View style={[styles.sysDetailItem, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} color={isDark ? '#94A3B8' : '#64748B'} />
              <Text style={[styles.sysDetailLabel, { marginBottom: 0, textTransform: 'none', fontWeight: '700' }, isDark && { color: ThemeColors.dark.textMuted }]}>
                {language === 'en' ? 'Registered On' : 'पंजीकरण तिथि'}
              </Text>
            </View>
            <Text style={[styles.sysDetailVal, isDark && { color: ThemeColors.dark.text }]}>{currentUser.registeredDate || 'Recently'}</Text>
          </View>
        </View>

        {/* Language Settings Card */}
        <View style={[
          styles.formCard,
          isDark ? { backgroundColor: '#1E293B', borderColor: '#334155' } : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
          { borderLeftWidth: 4, borderLeftColor: '#10B981', padding: 16 }
        ]}>
          <Text style={[styles.formCardTitle, isDark && { color: ThemeColors.dark.text }]}>
            🌐 {LOCALIZATION[language].language}
          </Text>
          <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', marginBottom: 12, lineHeight: 16 }}>
            {language === 'en' ? 'Select your preferred language for the application interface.' : 'एप्लिकेशन इंटरफ़ेस के लिए अपनी पसंदीदा भाषा चुनें।'}
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: language === 'en' ? '#10B981' : (isDark ? '#334155' : '#E2E8F0'),
                backgroundColor: language === 'en' ? 'rgba(16,185,129,0.1)' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => onChangeLanguage('en')}
            >
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: language === 'en' ? '#10B981' : (isDark ? '#CBD5E1' : '#475569') }}>
                English (अंग्रेज़ी)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: language === 'hi' ? '#10B981' : (isDark ? '#334155' : '#E2E8F0'),
                backgroundColor: language === 'hi' ? 'rgba(16,185,129,0.1)' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => onChangeLanguage('hi')}
            >
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: language === 'hi' ? '#10B981' : (isDark ? '#CBD5E1' : '#475569') }}>
                हिन्दी (Hindi)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Referral Card */}
        <View style={[
          styles.formCard,
          isDark ? { backgroundColor: '#1E293B', borderColor: '#334155' } : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
          { borderLeftWidth: 4, borderLeftColor: '#F59E0B', position: 'relative' }
        ]}>
          {/* Decorative Floating Spheres */}
          <View style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(245,158,11,0.06)' }} />

          <Text style={[styles.formCardTitle, isDark && { color: ThemeColors.dark.text }]}>
            {language === 'en' ? '🎁 Referral Program' : '🎁 रेफरल प्रोग्राम'}
          </Text>
          <Text style={[styles.sysDetailLabel, { marginTop: 6, marginBottom: 12, textTransform: 'none', lineHeight: 16 }, isDark && { color: ThemeColors.dark.textMuted }]}>
            {language === 'en' 
              ? 'Invite your friends to prepare with MockTest Hub. Share your referral code below:' 
              : 'अपने दोस्तों को मॉक टेस्ट के साथ तैयारी करने के लिए आमंत्रित करें। नीचे अपना रेफरल कोड साझा करें:'}
          </Text>

          <View style={[
            styles.referralCodeRow,
            isDark ? { backgroundColor: '#111827', borderColor: '#374151' } : { backgroundColor: '#FFFDF5', borderColor: '#FDE68A' },
            { borderStyle: 'dashed', borderWidth: 1.5 }
          ]}>
            <Text style={[styles.referralCodeText, { color: '#D97706', letterSpacing: 1.5, fontSize: 16 }]}>{currentUser.referralCode}</Text>
            <TouchableOpacity style={[styles.copyReferralBtn, { backgroundColor: '#F59E0B' }]} onPress={shareReferralCode}>
              <Text style={styles.copyReferralBtnText}>
                {language === 'en' ? 'Share & Copy' : 'साझा और कॉपी करें'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Collapsible View Rules */}
          <TouchableOpacity 
            style={[styles.collapsibleHeader, { marginTop: 16, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#F3F4F6', paddingTop: 12 }]} 
            onPress={() => setShowReferralRules(!showReferralRules)}
          >
            <Text style={[styles.formCardTitle, { fontSize: 12 }, isDark && { color: ThemeColors.dark.text }]}>
              {language === 'en' ? '📋 How It Works & Rules' : '📋 यह कैसे काम करता है और नियम'}
            </Text>
            <Text style={[styles.expandToggleText, isDark && { color: '#60A5FA' }]}>
              {showReferralRules 
                ? (language === 'en' ? '▲ Hide' : '▲ छिपाएं') 
                : (language === 'en' ? '▼ View' : '▼ देखें')}
            </Text>
          </TouchableOpacity>

          {showReferralRules && (
            <View style={{ marginTop: 10, gap: 10 }}>
              <View style={[styles.ruleStepItem, isDark && { backgroundColor: '#0B1329', borderColor: ThemeColors.dark.border }]}>
                <View style={styles.ruleStepNumberContainer}><Text style={styles.ruleStepNumber}>1</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ruleStepTitle, isDark && { color: ThemeColors.dark.text }]}>
                    {language === 'en' ? 'Share Invite Code' : 'इनवाइट कोड साझा करें'}
                  </Text>
                  <Text style={[styles.ruleStepDesc, isDark && { color: ThemeColors.dark.textMuted }]}>
                    {language === 'en' 
                      ? 'Copy your code and share it with friends who are preparing for competitive exams.' 
                      : 'अपना कोड कॉपी करें और उन दोस्तों के साथ साझा करें जो प्रतियोगी परीक्षाओं की तैयारी कर रहे हैं।'}
                  </Text>
                </View>
              </View>

              <View style={[styles.ruleStepItem, isDark && { backgroundColor: '#0B1329', borderColor: ThemeColors.dark.border }]}>
                <View style={[styles.ruleStepNumberContainer, { backgroundColor: '#C084FC' }]}><Text style={styles.ruleStepNumber}>2</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ruleStepTitle, isDark && { color: ThemeColors.dark.text }]}>
                    {language === 'en' ? 'Friend Registers' : 'मित्र का पंजीकरण'}
                  </Text>
                  <Text style={[styles.ruleStepDesc, isDark && { color: ThemeColors.dark.textMuted }]}>
                    {language === 'en' 
                      ? 'Your friend signs up on Mock Test and enters your referral code on the signup screen.' 
                      : 'आपका मित्र मॉक टेस्ट पर साइन अप करता है और साइनअप स्क्रीन पर आपका रेफरल कोड दर्ज करता है।'}
                  </Text>
                </View>
              </View>

              <View style={[styles.ruleStepItem, isDark && { backgroundColor: '#0B1329', borderColor: ThemeColors.dark.border }]}>
                <View style={[styles.ruleStepNumberContainer, { backgroundColor: '#FBBF24' }]}><Text style={styles.ruleStepNumber}>3</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ruleStepTitle, isDark && { color: ThemeColors.dark.text }]}>
                    {language === 'en' ? 'Complete First Mock Test' : 'पहला मॉक टेस्ट पूरा करें'}
                  </Text>
                  <Text style={[styles.ruleStepDesc, isDark && { color: ThemeColors.dark.textMuted }]}>
                    {language === 'en' 
                      ? 'Once they complete any full-length or practice mock test sitting on the CBT interface.' 
                      : 'जैसे ही वे सीबीटी इंटरफ़ेस पर कोई भी पूर्ण या अभ्यास मॉक टेस्ट प्रयास पूरा करते हैं।'}
                  </Text>
                </View>
              </View>

              <View style={[styles.ruleStepItem, isDark && { backgroundColor: '#0B1329', borderColor: ThemeColors.dark.border }]}>
                <View style={[styles.ruleStepNumberContainer, { backgroundColor: '#34D399' }]}><Text style={styles.ruleStepNumber}>4</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ruleStepTitle, isDark && { color: ThemeColors.dark.text }]}>
                    {language === 'en' ? 'Both Receive Coins' : 'दोनों को सिक्के प्राप्त होंगे'}
                  </Text>
                  <Text style={[styles.ruleStepDesc, isDark && { color: ThemeColors.dark.textMuted }]}>
                    {language === 'en' 
                      ? 'You get 20 Coins and your friend gets 10 Coins instantly credited!' 
                      : 'आपको तुरंत 20 सिक्के और आपके मित्र को 10 सिक्के प्राप्त होंगे!'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Collapsible Invites Tracker */}
          <TouchableOpacity 
            style={[styles.collapsibleHeader, { marginTop: 12, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#F3F4F6', paddingTop: 12 }]} 
            onPress={() => setShowReferredFriends(!showReferredFriends)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.formCardTitle, { fontSize: 12 }, isDark && { color: ThemeColors.dark.text }]}>
                {language === 'en' ? '👥 Referred Friends Tracker' : '👥 आमंत्रित मित्रों की सूची'}
              </Text>
              <View style={styles.referredCountBadge}>
                <Text style={styles.referredCountBadgeText}>
                  {referredFriends.length || currentUser.referralsCount || 0}
                </Text>
              </View>
            </View>
            <Text style={[styles.expandToggleText, isDark && { color: '#60A5FA' }]}>
              {showReferredFriends 
                ? (language === 'en' ? '▲ Hide' : '▲ छिपाएं') 
                : (language === 'en' ? '▼ Track Progress' : '▼ प्रगति देखें')}
            </Text>
          </TouchableOpacity>

          {showReferredFriends && (() => {
            if (loadingReferred) {
              return (
                <View style={{ marginTop: 10, padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                </View>
              );
            }

            if (referredFriends.length === 0) {
              return (
                <View style={{ marginTop: 10, padding: 16, alignItems: 'center', backgroundColor: isDark ? '#0B1329' : '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#1E293B' : '#E5E7EB' }}>
                  <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#6B7280', fontStyle: 'italic', textAlign: 'center' }}>
                    {language === 'en' 
                      ? "You haven't referred any candidates yet. Share your code to start earning coins!" 
                      : 'आपने अभी तक किसी उम्मीदवार को आमंत्रित नहीं किया है। सिक्के अर्जित करना शुरू करने के लिए अपना कोड साझा करें!'}
                  </Text>
                </View>
              );
            }

            const totalInvited = referredFriends.length;
            const completedCount = referredFriends.filter((f: any) => f.hasCompletedTest).length;
            const pendingCount = Math.max(0, totalInvited - completedCount);
            const totalCoinsEarned = completedCount * 20;
            const overallPercent = totalInvited > 0 ? Math.round((completedCount / totalInvited) * 100) : 0;

            return (
              <View style={{ marginTop: 10, gap: 12 }}>
                {/* Summary Progress Box */}
                <View style={{
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#0F172A' : '#FEF3C7',
                  borderWidth: 1,
                  borderColor: isDark ? '#334155' : '#FDE68A',
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#F59E0B' : '#B45309' }}>
                      {language === 'en' ? '📊 Overall Referral Progress' : '📊 समग्र रेफरल प्रगति'}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#10B981' : '#047857' }}>
                      +{totalCoinsEarned} {language === 'en' ? 'Coins Earned' : 'सिक्के अर्जित'}
                    </Text>
                  </View>

                  {/* Summary Bar */}
                  <View style={{ height: 8, backgroundColor: isDark ? '#1E293B' : '#FDE68A', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                    <View style={{ height: '100%', width: `${overallPercent}%`, backgroundColor: '#10B981', borderRadius: 4 }} />
                  </View>

                  {/* Summary Metrics Row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Text style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#78350F' }}>
                        {language === 'en' ? `Invited: ${totalInvited}` : `आमंत्रित: ${totalInvited}`}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#10B981', fontWeight: 'bold' }}>
                        {language === 'en' ? `Completed: ${completedCount}` : `पूर्ण: ${completedCount}`}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: 'bold' }}>
                        {language === 'en' ? `Pending: ${pendingCount}` : `लंबित: ${pendingCount}`}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: isDark ? '#94A3B8' : '#78350F' }}>
                      {overallPercent}%
                    </Text>
                  </View>
                </View>

                {/* Individual Friend Cards */}
                {referredFriends.map((friend: any) => {
                  const hasCompletedTest = friend.hasCompletedTest;
                  const friendInitials = (friend.name || 'C').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                  const maskedEmail = friend.email ? friend.email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : '';

                  return (
                    <View 
                      key={friend.id} 
                      style={[
                        styles.friendTrackerCard, 
                        isDark 
                          ? { backgroundColor: '#0B1329', borderColor: hasCompletedTest ? '#059669' : ThemeColors.dark.border } 
                          : { backgroundColor: '#F9FAFB', borderColor: hasCompletedTest ? '#A7F3D0' : '#E5E7EB' }
                      ]}
                    >
                      {/* Top Row: User Avatar & Name & Status */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <View style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: hasCompletedTest ? '#10B981' : '#3B82F6',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>{friendInitials}</Text>
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={[styles.friendNameText, isDark && { color: ThemeColors.dark.text }]} numberOfLines={1}>
                              {friend.name || 'Candidate'}
                            </Text>
                            {maskedEmail ? (
                              <Text style={{ fontSize: 9, color: isDark ? '#94A3B8' : '#6B7280' }}>
                                {maskedEmail} {friend.candidateCode ? `• ${friend.candidateCode}` : ''}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        {/* Status Badge */}
                        <View style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 12,
                          backgroundColor: hasCompletedTest ? (isDark ? '#064E3B' : '#D1FAE5') : (isDark ? '#451A03' : '#FEF3C7'),
                          borderWidth: 1,
                          borderColor: hasCompletedTest ? '#10B981' : '#F59E0B',
                        }}>
                          <Text style={{
                            fontSize: 9,
                            fontWeight: 'bold',
                            color: hasCompletedTest ? (isDark ? '#6EE7B7' : '#065F46') : (isDark ? '#FDE68A' : '#92400E'),
                          }}>
                            {hasCompletedTest 
                              ? (language === 'en' ? '✓ 100% Completed (+20 Coins)' : '✓ 100% पूरा हुआ (+20 सिक्के)') 
                              : (language === 'en' ? '⌛ 50% Registered (Pending Test)' : '⌛ 50% पंजीकृत (टेस्ट लंबित)')}
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.friendProgressBarBg}>
                        <View 
                          style={[
                            styles.friendProgressBarFill, 
                            { 
                              width: hasCompletedTest ? '100%' : '50%', 
                              backgroundColor: hasCompletedTest ? '#10B981' : '#F59E0B' 
                            }
                          ]} 
                        />
                      </View>

                      {/* Milestone Step Details */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                        <Text style={[styles.stepDetailLabel, { color: '#10B981' }]}>
                          {language === 'en' ? '✓ Step 1: Registered (50%)' : '✓ चरण 1: पंजीकृत (50%)'}
                        </Text>
                        <Text style={[styles.stepDetailLabel, { color: hasCompletedTest ? '#10B981' : (isDark ? '#94A3B8' : '#6B7280') }]}>
                          {hasCompletedTest 
                            ? (language === 'en' ? '✓ Step 2: Test Done (+20 Coins)' : '✓ चरण 2: टेस्ट पूरा (+20 सिक्के)') 
                            : (language === 'en' ? '⌛ Step 2: Awaiting CBT Test' : '⌛ चरण 2: टेस्ट का प्रयास लंबित')}
                        </Text>
                      </View>

                      {/* Registration Date Footer */}
                      {friend.registeredDate ? (
                        <Text style={{ fontSize: 8, color: isDark ? '#64748B' : '#9CA3AF', marginTop: 4, fontStyle: 'italic' }}>
                          {language === 'en' ? `Joined: ${friend.registeredDate}` : `शामिल हुए: ${friend.registeredDate}`}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })()}
        </View>

        {/* Suggestion Box Card */}
        <View style={[styles.formCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.formCardTitle, isDark && { color: ThemeColors.dark.text }, { flex: 1 }]}>
              {language === 'en' ? '💡 Suggestion Box' : '💡 सुझाव पेटिका'}
            </Text>
          </View>

          <Text style={[styles.sysDetailLabel, { marginTop: 6, marginBottom: 12, textTransform: 'none', lineHeight: 16 }, isDark && { color: ThemeColors.dark.textMuted }]}>
            {language === 'en' 
              ? 'Share your valuable suggestions, feature requests, or new exam requests with the MockTest Hub Team.' 
              : 'मॉकटेस्ट हब टीम के साथ अपने बहुमूल्य सुझाव या नई परीक्षा के अनुरोध साझा करें।'}
          </Text>
          <TouchableOpacity 
            style={[styles.formSubmitBtn, { backgroundColor: '#F59E0B', marginTop: 0 }]} 
            onPress={() => setSuggestionModalOpen(true)}
          >
            <Text style={styles.formSubmitBtnText}>
              {language === 'en' ? 'Submit Suggestion' : 'सुझाव भेजें'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUGGESTION BOX MODAL */}
        <Modal
          visible={suggestionModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSuggestionModalOpen(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#E2E8F0',
              elevation: 10,
            }}>
              {/* Modal Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18 }}>💡</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#FFF' : '#0F172A' }}>
                      {language === 'en' ? 'Suggestion Box' : 'सुझाव पेटिका'}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B' }}>
                      {language === 'en' ? 'Share feedback with MockTest Hub Team' : 'मॉकटेस्ट हब टीम को सुझाव भेजें'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSuggestionModalOpen(false)} style={{ padding: 6 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#94A3B8' : '#64748B' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {suggSuccess ? (
                <View style={{ paddingVertical: 24, alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 40 }}>✅</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? '#FFF' : '#0F172A', textAlign: 'center' }}>
                    {language === 'en' ? 'Thank You! Suggestion Sent' : 'धन्यवाद! सुझाव भेजा गया'}
                  </Text>
                  <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', textAlign: 'center', lineHeight: 18 }}>
                    {language === 'en'
                      ? 'Your valuable suggestion has been submitted to MockTest Hub Team.'
                      : 'आपका बहुमूल्य सुझाव मॉकटेस्ट हब टीम को प्राप्त हो गया है।'}
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  {/* User Default Details Badge (Read-Only) */}
                  <View style={{
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    padding: 12,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14 }}>
                          {(currentUser.name || currentUser.email || 'U').slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: isDark ? '#FFF' : '#0F172A' }} numberOfLines={1}>
                          {currentUser.name || 'Registered Candidate'}
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B' }} numberOfLines={1}>
                          {currentUser.email || 'Registered User'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#D97706' }}>📱 APP</Text>
                    </View>
                  </View>

                  {/* Category Dropdown Selection (Matching Website) */}
                  <Text style={{ fontSize: 10, fontWeight: '900', color: isDark ? '#94A3B8' : '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                    Category / श्रेणी
                  </Text>
                  <View style={{ marginBottom: 14 }}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      style={{
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: showCategoryDropdown ? '#F59E0B' : (isDark ? '#334155' : '#CBD5E1'),
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#FFF' : '#0F172A' }} numberOfLines={1}>
                        {[
                          { id: 'General', label: 'General Suggestion / सामान्य सुझाव' },
                          { id: 'New Exam Request', label: 'New Exam Request / नई परीक्षा का अनुरोध' },
                          { id: 'Feature Request', label: 'Feature Request / नई सुविधा का अनुरोध' },
                          { id: 'UI/UX Improvement', label: 'UI/UX Improvement / वेबसाइट डिज़ाइन सुधार' },
                          { id: 'Bug Report', label: 'Bug Report / त्रुटि रिपोर्ट' },
                        ].find(c => c.id === suggCategory)?.label || 'General Suggestion / सामान्य सुझाव'}
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: isDark ? '#94A3B8' : '#64748B' }}>
                        {showCategoryDropdown ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>

                    {showCategoryDropdown && (
                      <View style={{
                        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        marginTop: 6,
                        overflow: 'hidden',
                        elevation: 6,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 8,
                      }}>
                        {[
                          { id: 'General', label: 'General Suggestion / सामान्य सुझाव' },
                          { id: 'New Exam Request', label: 'New Exam Request / नई परीक्षा का अनुरोध' },
                          { id: 'Feature Request', label: 'Feature Request / नई सुविधा का अनुरोध' },
                          { id: 'UI/UX Improvement', label: 'UI/UX Improvement / वेबसाइट डिज़ाइन सुधार' },
                          { id: 'Bug Report', label: 'Bug Report / त्रुटि रिपोर्ट' },
                        ].map((cat, idx, arr) => {
                          const isSelected = suggCategory === cat.id;
                          return (
                            <TouchableOpacity
                              key={cat.id}
                              onPress={() => {
                                setSuggCategory(cat.id);
                                setShowCategoryDropdown(false);
                              }}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 11,
                                backgroundColor: isSelected ? (isDark ? '#1E293B' : '#FEF3C7') : 'transparent',
                                borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                                borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Text style={{
                                fontSize: 11,
                                fontWeight: isSelected ? '800' : '600',
                                color: isSelected ? '#D97706' : (isDark ? '#E2E8F0' : '#334155'),
                                flex: 1,
                              }}>
                                {cat.label}
                              </Text>
                              {isSelected && <Text style={{ color: '#D97706', fontWeight: '900', fontSize: 12, marginLeft: 6 }}>✓</Text>}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  {/* Message Textarea */}
                  <Text style={{ fontSize: 10, fontWeight: '900', color: isDark ? '#94A3B8' : '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                    Your Suggestion
                  </Text>
                  <TextInput
                    multiline
                    numberOfLines={4}
                    value={suggMessage}
                    onChangeText={setSuggMessage}
                    placeholder={language === 'en' ? 'Type your suggestion or request here...' : 'यहाँ अपना सुझाव या अनुरोध लिखें...'}
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    style={{
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                      padding: 12,
                      fontSize: 13,
                      color: isDark ? '#FFF' : '#0F172A',
                      minHeight: 90,
                      textAlignVertical: 'top',
                      marginBottom: 16,
                    }}
                  />

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setSuggestionModalOpen(false)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isDark ? '#334155' : '#CBD5E1',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#CBD5E1' : '#475569' }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={!suggMessage.trim() || suggSubmitting}
                      onPress={handleAppSuggestionSubmit}
                      style={{
                        backgroundColor: suggMessage.trim() ? '#F59E0B' : '#94A3B8',
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFF' }}>
                        {suggSubmitting ? 'Submitting...' : 'Submit'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Support Chat Card */}
        <View style={[styles.formCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.formCardTitle, isDark && { color: ThemeColors.dark.text }, { flex: 1 }]}>
              {language === 'en' ? '💬 Talk to Support Team' : '💬 सहायता टीम से बात करें'}
            </Text>
            {unreadSupportCount > 0 && (
              <View style={{
                backgroundColor: '#EF4444',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4
              }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' }} />
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>
                  {unreadSupportCount} {language === 'en' ? 'New' : 'नया'}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.sysDetailLabel, { marginTop: 6, marginBottom: 12, textTransform: 'none', lineHeight: 16 }, isDark && { color: ThemeColors.dark.textMuted }]}>
            {language === 'en' 
              ? 'Have any questions, doubts, or technical issues? Get in touch with our support representatives directly.' 
              : 'कोई प्रश्न, संदेह या तकनीकी समस्या है? सीधे हमारे सहायता प्रतिनिधियों से संपर्क करें।'}
          </Text>
          <TouchableOpacity 
            style={[styles.formSubmitBtn, { backgroundColor: '#2563EB', marginTop: 0 }]} 
            onPress={onOpenSupportChat}
          >
            <Text style={styles.formSubmitBtnText}>
              {language === 'en' 
                ? (unreadSupportCount > 0 ? `Start Chatting (${unreadSupportCount} New)` : 'Start Chatting')
                : (unreadSupportCount > 0 ? `चैट शुरू करें (${unreadSupportCount} नया)` : 'चैट शुरू करें')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Theme Settings */}
        <View style={[styles.formCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
          <Text style={[styles.formCardTitle, isDark && { color: ThemeColors.dark.text }]}>
            {language === 'en' ? '🎨 App Theme Settings' : '🎨 ऐप थीम सेटिंग्स'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[
                styles.themeToggleBtn,
                !isDark ? styles.themeToggleBtnActive : (isDark ? styles.themeToggleBtnInactiveDark : styles.themeToggleBtnInactiveLight)
              ]}
              onPress={() => onToggleTheme && onToggleTheme(false)}
            >
              <Text style={[styles.themeToggleText, !isDark ? styles.themeToggleTextActive : styles.themeToggleTextInactive]}>
                {language === 'en' ? '☀️ Light Mode' : '☀️ लाइट मोड'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[
                styles.themeToggleBtn,
                isDark ? styles.themeToggleBtnActive : styles.themeToggleBtnInactiveLight
              ]}
              onPress={() => onToggleTheme && onToggleTheme(true)}
            >
              <Text style={[styles.themeToggleText, isDark ? styles.themeToggleTextActive : styles.themeToggleTextInactive]}>
                {language === 'en' ? '🌙 Dark Mode' : '🌙 डार्क मोड'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Edit details form */}
        <View style={[styles.formCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
          <TouchableOpacity 
            style={[styles.collapsibleHeader, showUpdateProfile && { borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F3F4F6', paddingBottom: 8 }]} 
            onPress={() => setShowUpdateProfile(!showUpdateProfile)}
          >
            <Text style={[styles.formCardTitle, isDark && { color: ThemeColors.dark.text }]}>
              {language === 'en' ? '👤 Update Profile Details' : '👤 प्रोफ़ाइल विवरण अपडेट करें'}
            </Text>
            <Text style={[styles.expandToggleText, isDark && { color: '#60A5FA' }]}>
              {showUpdateProfile 
                ? (language === 'en' ? '▲ Collapse' : '▲ समेटें') 
                : (language === 'en' ? '▼ Expand' : '▼ फैलाएं')}
            </Text>
          </TouchableOpacity>

          {showUpdateProfile && (
            <View style={{ marginTop: 12 }}>
              <View style={styles.formInputGroup}>
                <Text style={[styles.formInputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>
                  {language === 'en' ? 'Full Name' : 'पूरा नाम'}
                </Text>
                <TextInput
                  style={[styles.formInput, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder, color: ThemeColors.dark.text }]}
                  placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                  value={profileName}
                  onChangeText={setProfileName}
                />
              </View>
              <View style={styles.formInputGroup}>
                <Text style={[styles.formInputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>
                  {language === 'en' ? 'Email Address' : 'ईमेल पता'}
                </Text>
                <TextInput
                  style={[styles.formInput, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder, color: ThemeColors.dark.text }]}
                  placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                  value={profileEmail}
                  onChangeText={setProfileEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.formInputGroup}>
                <Text style={[styles.formInputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>
                  {language === 'en' ? 'Mobile Number' : 'मोबाइल नंबर'}
                </Text>
                <TextInput
                  style={[styles.formInput, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder, color: ThemeColors.dark.text }]}
                  placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                  value={profileMobile}
                  onChangeText={setProfileMobile}
                  keyboardType="phone-pad"
                />
              </View>
              <TouchableOpacity style={styles.formSubmitBtn} onPress={handleUpdateProfile}>
                <Text style={styles.formSubmitBtnText}>
                  {language === 'en' ? 'Save Profile Details' : 'प्रोफ़ाइल विवरण सहेजें'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Reset Password form */}
        <View style={[styles.formCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
          <TouchableOpacity 
            style={[styles.collapsibleHeader, showChangePassword && { borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F3F4F6', paddingBottom: 8 }]} 
            onPress={() => setShowChangePassword(!showChangePassword)}
          >
            <Text style={[styles.formCardTitle, isDark && { color: ThemeColors.dark.text }]}>
              {language === 'en' ? '🔑 Change Account Password' : '🔑 खाता पासवर्ड बदलें'}
            </Text>
            <Text style={[styles.expandToggleText, isDark && { color: '#60A5FA' }]}>
              {showChangePassword 
                ? (language === 'en' ? '▲ Collapse' : '▲ समेटें') 
                : (language === 'en' ? '▼ Expand' : '▼ फैलाएं')}
            </Text>
          </TouchableOpacity>

          {showChangePassword && (
            <View style={{ marginTop: 12 }}>
              <View style={styles.formInputGroup}>
                <Text style={[styles.formInputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>
                  {language === 'en' ? 'Old Password' : 'पुराना पासवर्ड'}
                </Text>
                <View style={[styles.pwInputRow, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder }]}>
                  <TextInput
                    style={[styles.pwInput, isDark && { color: ThemeColors.dark.text }]}
                    placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    secureTextEntry={!showOldPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)}>
                    <Text style={[styles.pwToggleText, isDark && { color: '#60A5FA' }]}>
                      {showOldPassword 
                        ? (language === 'en' ? 'Hide' : 'छिपाएं') 
                        : (language === 'en' ? 'Show' : 'दिखाएं')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.formInputGroup}>
                <Text style={[styles.formInputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>
                  {language === 'en' ? 'New Password' : 'नया पासवर्ड'}
                </Text>
                <View style={[styles.pwInputRow, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder }]}>
                  <TextInput
                    style={[styles.pwInput, isDark && { color: ThemeColors.dark.text }]}
                    placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Text style={[styles.pwToggleText, isDark && { color: '#60A5FA' }]}>
                      {showNewPassword 
                        ? (language === 'en' ? 'Hide' : 'छिपाएं') 
                        : (language === 'en' ? 'Show' : 'दिखाएं')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.formInputGroup}>
                <Text style={[styles.formInputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>
                  {language === 'en' ? 'Confirm New Password' : 'नए पासवर्ड की पुष्टि करें'}
                </Text>
                <View style={[styles.pwInputRow, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder }]}>
                  <TextInput
                    style={[styles.pwInput, isDark && { color: ThemeColors.dark.text }]}
                    placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Text style={[styles.pwToggleText, isDark && { color: '#60A5FA' }]}>
                      {showConfirmPassword 
                        ? (language === 'en' ? 'Hide' : 'छिपाएं') 
                        : (language === 'en' ? 'Show' : 'दिखाएं')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={[styles.formSubmitBtn, { backgroundColor: '#2563EB' }]} onPress={handleUpdatePassword}>
                <Text style={styles.formSubmitBtnText}>
                  {language === 'en' ? 'Update Account Password' : 'खाता पासवर्ड अपडेट करें'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>



        <TouchableOpacity style={[styles.logoutBtn, isDark && { backgroundColor: '#3F1F1F', borderColor: '#EF4444' }]} onPress={onLogout}>
          <LogOut size={16} color="#EF4444" />
          <Text style={[styles.logoutText, isDark && { color: '#FCA5A5' }]}>
            {language === 'en' ? 'Log Out Account' : 'खाता लॉगआउट करें'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const totalTestsGiven = useMemo(() => {
    let count = 0;
    (currentUser.testSessions || []).forEach((s: any) => {
      if (s.status !== 'COMPLETED' && s.status !== 'AUTO_SUBMITTED') {
        return;
      }

      // Resolve total allotted duration in minutes — must be > 0
      // Priority: session.durationMinutes (from DB join) > catalog > testId guess > 60min fallback
      let durationMinutes = 60;
      if (typeof s.durationMinutes === 'number' && s.durationMinutes > 0) {
        durationMinutes = s.durationMinutes;
      } else if (s.mockTest && typeof s.mockTest.durationMinutes === 'number' && s.mockTest.durationMinutes > 0) {
        durationMinutes = s.mockTest.durationMinutes;
      } else {
        const test = catalogTestsMap.get(s.testId);
        if (test && typeof test.durationMinutes === 'number' && test.durationMinutes > 0) {
          durationMinutes = test.durationMinutes;
        } else {
          const tid = (s.testId || '').toLowerCase();
          if (tid.includes('ssc'))          durationMinutes = 60;
          else if (tid.includes('rrb'))     durationMinutes = 90;
          else if (tid.includes('ctet'))    durationMinutes = 150;
          else if (tid.includes('ugc_net')) durationMinutes = tid.includes('paper1') ? 60 : 120;
          else                              durationMinutes = 60;
        }
      }

      // durationMinutes must be positive
      if (durationMinutes <= 0) return;

      const totalSec = durationMinutes * 60;

      // Resolve how many seconds the user actually spent (totalDuration - timeLeft at submission).
      // null/undefined means the field was never saved — skip rather than assume 0 spent.
      const rawSpent = s.durationSeconds ?? s.timeSpentSeconds;
      if (rawSpent === null || rawSpent === undefined) return;
      const spentSec = Number(rawSpent);
      if (!isFinite(spentSec) || spentSec <= 0) return;

      // Only count this test if user utilized >= 75% of the allotted time
      if (spentSec >= totalSec * 0.75) {
        count += 1;
      }
    });

    return count;
  }, [examCatalog, currentUser.testSessions]);

  return (
    <View style={[styles.container, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={isDark ? ThemeColors.dark.headerBg : '#E0F2FE'} 
      />

      {/* Decorative Blur Orbs */}
      <View style={[styles.blurOrbLeft, isDark && { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]} />
      <View style={[styles.blurOrbRight, isDark && { backgroundColor: 'rgba(99, 102, 241, 0.08)' }]} />

      {/* Header Banner */}
      <View style={[
        styles.dashHeader, 
        isDark ? { backgroundColor: ThemeColors.dark.headerBg, borderBottomColor: '#1F2E54' } : { backgroundColor: '#E0F2FE', borderBottomColor: '#BAE6FD' },
        { paddingTop: insets.top + 10 }
      ]}>
        {/* Header Decorative Glows */}
        <View style={styles.headerGlowLeft} />
        <View style={styles.headerGlowRight} />
        
        <View style={styles.dashHeaderRow}>
          <View style={styles.dashHeaderLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Trophy size={18} color={isDark ? '#FBBF24' : '#D97706'} />
              <Text style={[styles.dashTitle, isDark ? { color: '#FFF' } : { color: '#0F172A' }]}>
                MockTest <Text style={{ color: isDark ? '#38BDF8' : '#2563EB' }}>Hub</Text>
              </Text>
            </View>
            <Text style={[styles.dashSub, isDark ? { color: ThemeColors.dark.textMuted } : { color: '#334155' }]}>
              Candidate: <Text style={{ fontWeight: 'bold', color: isDark ? '#E2E8F0' : '#0F172A' }}>{currentUser.name}</Text>
            </Text>
          </View>
          
          <View style={styles.dashHeaderRight}>
            <View style={[styles.headerTestBadge, isDark ? { backgroundColor: '#16223F', borderColor: '#1F2E54' } : { backgroundColor: '#FFFFFF', borderColor: '#BAE6FD' }]}>
              <BookOpen size={13} color={isDark ? '#60A5FA' : '#0284C7'} />
              <Text style={[styles.headerTestText, isDark ? { color: '#60A5FA' } : { color: '#0284C7' }]}>
                Tests: {totalTestsGiven}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main View Area */}
      <View style={[styles.mainView, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
        {activeTab === 'home' && renderHomeTab()}
        {activeTab === 'tests' && renderTestsTab()}
        {activeTab === 'notices' && renderNoticesTab()}
        {activeTab === 'bookmarks' && renderBookmarksTab()}
        {activeTab === 'profile' && renderProfileTab()}
      </View>

      {/* Bottom Nav bar */}
      <View style={[
        styles.bottomNav, 
        isDark && { backgroundColor: ThemeColors.dark.bottomNavBg, borderTopColor: ThemeColors.dark.bottomNavBorder },
        { height: 56 + insets.bottom, paddingBottom: insets.bottom }
      ]}>
        <TouchableOpacity
          style={[
            styles.navBtn, 
            activeTab === 'home' && styles.navBtnActive,
            activeTab === 'home' && isDark && { borderTopColor: '#60A5FA' }
          ]}
          onPress={() => setActiveTab('home')}
        >
          <Trophy size={20} color={activeTab === 'home' ? (isDark ? '#60A5FA' : '#2563EB') : (isDark ? '#94A3B8' : '#6B7280')} />
          <Text style={[
            styles.navText, 
            activeTab === 'home' && styles.navTextActive,
            isDark && activeTab === 'home' && { color: '#60A5FA' },
            isDark && activeTab !== 'home' && { color: '#94A3B8' }
          ]}>{language === 'en' ? 'Home' : 'होम'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navBtn, 
            activeTab === 'tests' && styles.navBtnActive,
            activeTab === 'tests' && isDark && { borderTopColor: '#60A5FA' }
          ]}
          onPress={() => setActiveTab('tests')}
        >
          <BookOpen size={20} color={activeTab === 'tests' ? (isDark ? '#60A5FA' : '#2563EB') : (isDark ? '#94A3B8' : '#6B7280')} />
          <Text style={[
            styles.navText, 
            activeTab === 'tests' && styles.navTextActive,
            isDark && activeTab === 'tests' && { color: '#60A5FA' },
            isDark && activeTab !== 'tests' && { color: '#94A3B8' }
          ]}>{language === 'en' ? 'Tests' : 'परीक्षाएं'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navBtn, 
            activeTab === 'notices' && styles.navBtnActive,
            activeTab === 'notices' && isDark && { borderTopColor: '#60A5FA' }
          ]}
          onPress={() => setActiveTab('notices')}
        >
          <View style={styles.iconBadgeContainer}>
            <Bell size={20} color={activeTab === 'notices' ? (isDark ? '#60A5FA' : '#2563EB') : (isDark ? '#94A3B8' : '#6B7280')} />
            {unseenCount > 0 && (
              <View style={[styles.badge, isDark && { borderColor: ThemeColors.dark.bottomNavBg }]}>
                <Text style={styles.badgeText}>{unseenCount}</Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.navText, 
            activeTab === 'notices' && styles.navTextActive,
            isDark && activeTab === 'notices' && { color: '#60A5FA' },
            isDark && activeTab !== 'notices' && { color: '#94A3B8' }
          ]}>{language === 'en' ? 'Notices' : 'सूचनाएं'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navBtn, 
            activeTab === 'bookmarks' && styles.navBtnActive,
            activeTab === 'bookmarks' && isDark && { borderTopColor: '#F59E0B' }
          ]}
          onPress={() => setActiveTab('bookmarks')}
        >
          <View style={styles.iconBadgeContainer}>
            <Bookmark
              size={20}
              color={activeTab === 'bookmarks' ? (isDark ? '#F59E0B' : '#D97706') : (isDark ? '#94A3B8' : '#6B7280')}
              fill={activeTab === 'bookmarks' ? (isDark ? '#F59E0B' : '#D97706') : 'none'}
            />
            {(currentUser?.bookmarkedQuestions?.length || 0) > 0 && (
              <View style={[styles.badge, { backgroundColor: '#F59E0B' }, isDark && { borderColor: ThemeColors.dark.bottomNavBg }]}>
                <Text style={styles.badgeText}>{currentUser?.bookmarkedQuestions?.length}</Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.navText, 
            activeTab === 'bookmarks' && styles.navTextActive,
            activeTab === 'bookmarks' && { color: isDark ? '#F59E0B' : '#D97706' },
            isDark && activeTab !== 'bookmarks' && { color: '#94A3B8' }
          ]}>{language === 'en' ? 'Saved' : 'बुकमार्क'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navBtn, 
            activeTab === 'profile' && styles.navBtnActive,
            activeTab === 'profile' && isDark && { borderTopColor: '#60A5FA' }
          ]}
          onPress={() => setActiveTab('profile')}
        >
          <View style={{ position: 'relative' }}>
            <User size={20} color={activeTab === 'profile' ? (isDark ? '#60A5FA' : '#2563EB') : (isDark ? '#94A3B8' : '#6B7280')} />
            {unreadSupportCount > 0 && (
              <View style={{
                position: 'absolute',
                top: -4,
                right: -6,
                backgroundColor: '#EF4444',
                borderRadius: 7,
                minWidth: 14,
                height: 14,
                paddingHorizontal: 2,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: isDark ? ThemeColors.dark.headerBg : '#FFFFFF',
              }}>
                <Text style={{ color: '#FFF', fontSize: 8, fontWeight: '900', lineHeight: 10 }}>
                  {unreadSupportCount > 9 ? '9+' : unreadSupportCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.navText, 
            activeTab === 'profile' && styles.navTextActive,
            isDark && activeTab === 'profile' && { color: '#60A5FA' },
            isDark && activeTab !== 'profile' && { color: '#94A3B8' }
          ]}>{language === 'en' ? 'Me' : 'प्रोफाइल'}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Welcome Congrats Popup Modal */}
      {showCongratsPopup && renderCongratsModal()}
    </View>
  );

  function renderCongratsModal() {
    return (
      <Modal
        visible={showCongratsPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCongratsPopup(false)}
      >
        <View style={modalStyles.modalContainer}>
          <View style={[modalStyles.modalContent, isDark && { backgroundColor: '#0F172A', borderColor: '#1F2E54' }]}>
            {/* Top Close Button */}
            <TouchableOpacity 
              style={[modalStyles.closeCross, isDark && { backgroundColor: '#1E293B' }]} 
              onPress={() => setShowCongratsPopup(false)}
            >
              <X size={16} color={isDark ? '#94A3B8' : '#9CA3AF'} />
            </TouchableOpacity>

            {/* Gift Icon */}
            <View style={[modalStyles.iconContainer, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
              <Gift size={32} color={isDark ? '#38BDF8' : '#2563EB'} />
              <View style={[modalStyles.sparkleBadge, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
                <Sparkles size={12} color="#F59E0B" />
              </View>
            </View>

            {/* Header Details */}
            <Text style={[modalStyles.modalTitle, isDark && { color: '#FFF' }]}>
              Congratulations! 🎉
            </Text>
            <Text style={modalStyles.modalSubtitle}>
              Gift from Mock Test Hub Team
            </Text>
            <Text style={[modalStyles.modalDesc, isDark && { color: ThemeColors.dark.textMuted }]}>
              A 1-Year Mock Test Pass Pro subscription has been credited to your account! Explore all features and premium tests immediately.
            </Text>

            {/* Benefits List */}
            <ScrollView 
              style={modalStyles.benefitsList}
              contentContainerStyle={{ gap: 12, paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={modalStyles.benefitItem}>
                <View style={[modalStyles.benefitEmoji, isDark && { backgroundColor: '#16223F' }]}>
                  <Text style={{ fontSize: 14 }}>🔓</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[modalStyles.benefitTitle, isDark && { color: '#E2E8F0' }]}>Unlimited Premium Tests</Text>
                  <Text style={[modalStyles.benefitDesc, isDark && { color: ThemeColors.dark.textMuted }]}>Access all SSC, Banking, Railways & State level exams without restriction.</Text>
                </View>
              </View>

              <View style={modalStyles.benefitItem}>
                <View style={[modalStyles.benefitEmoji, isDark && { backgroundColor: '#16223F' }]}>
                  <Text style={{ fontSize: 14 }}>📝</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[modalStyles.benefitTitle, isDark && { color: '#E2E8F0' }]}>Custom Paper Creator</Text>
                  <Text style={[modalStyles.benefitDesc, isDark && { color: ThemeColors.dark.textMuted }]}>Build customizable exam papers focused on your weak subjects.</Text>
                </View>
              </View>

              <View style={modalStyles.benefitItem}>
                <View style={[modalStyles.benefitEmoji, isDark && { backgroundColor: '#16223F' }]}>
                  <Text style={{ fontSize: 14 }}>📊</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[modalStyles.benefitTitle, isDark && { color: '#E2E8F0' }]}>Advanced Speed Analytics</Text>
                  <Text style={[modalStyles.benefitDesc, isDark && { color: ThemeColors.dark.textMuted }]}>Track sectional timing averages and topper comparative speed details.</Text>
                </View>
              </View>
            </ScrollView>

            {/* Claim button */}
            <TouchableOpacity 
              style={[modalStyles.claimBtn, claiming && { opacity: 0.7 }]} 
              onPress={handleClaimPassPro}
              disabled={claiming}
            >
              {claiming ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Gift size={16} color="#FFF" />
                  <Text style={modalStyles.claimBtnText}>Claim 1 Year Pass Pro 🎁</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  blurOrbLeft: {
    position: 'absolute',
    top: '15%',
    left: '-20%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(37, 99, 235, 0.04)',
    zIndex: -1,
  },
  blurOrbRight: {
    position: 'absolute',
    bottom: '15%',
    right: '-20%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(79, 70, 229, 0.04)',
    zIndex: -1,
  },
  dashHeader: {
    backgroundColor: '#0B1329',
    paddingHorizontal: 20,
    paddingVertical: 10,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2E54',
  },
  headerGlowLeft: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -50,
    left: -50,
    backgroundColor: '#3B82F6',
    opacity: 0.25,
    zIndex: 0,
  },
  headerGlowRight: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    bottom: -40,
    right: -30,
    backgroundColor: '#6366F1',
    opacity: 0.3,
    zIndex: 0,
  },
  dashHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  dashHeaderLeft: {
    flex: 1,
  },
  dashHeaderRight: {
    marginLeft: 12,
  },
  headerTestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  headerTestText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: 'bold',
  },
  dashTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  dashSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  mainView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
    paddingBottom: 40,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  passCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  passTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  passTierText: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  passExpiryText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  passUpgradeText: {
    color: '#38BDF8',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    flexDirection: 'row',
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  referCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referInfo: {
    flex: 1,
    paddingRight: 10,
  },
  referTitle: {
    color: '#1E40AF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  referSub: {
    fontSize: 12,
    color: '#1E3A8A',
    marginTop: 4,
    lineHeight: 16,
  },
  referCode: {
    fontWeight: 'bold',
    color: '#2563EB',
  },
  referSubCount: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '700',
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  categoriesRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '700',
  },
  seriesCard: {
    backgroundColor: '#FAF9F6',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#4F6EF7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  seriesCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  seriesDetails: {
    flex: 1,
  },
  seriesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.1,
  },
  seriesMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
    fontWeight: '500',
  },
  catGroup: {
    marginBottom: 20,
  },
  catGroupName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  noticeCard: {
    backgroundColor: '#FFF',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noticeBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noticeDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  noticeTitle: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: 'bold',
    lineHeight: 18,
  },
  noticeSubText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  noticeLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  noticeLinkText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: 'bold',
  },
  profileHeaderCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  profileEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  profileCodeBadge: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 11,
    color: '#4B5563',
    fontWeight: 'bold',
  },
  profileCoinsBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 11,
    color: '#D97706',
    fontWeight: 'bold',
  },
  noticeFilterTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 10,
    margin: 16,
    marginBottom: 8,
  },
  noticeFilterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  noticeTabNoticeActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noticeTabResultActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noticeTabAdmitActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noticeTabAnswerActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noticeFilterText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  noticeTabTextActive: {
    color: '#1F2937',
  },
  noticeGroupHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  noticeGroupTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E3A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noNoticesText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginVertical: 40,
    fontStyle: 'italic',
  },
  sysDetailsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  sysDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sysDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  sysDetailVal: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: 'bold',
  },
  profileReferralCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  referCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  referralCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 8,
  },
  referralCodeText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: '#1F2937',
  },
  copyReferralBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  copyReferralBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  referCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referCountLabel: {
    fontSize: 12,
    color: '#1E3A8A',
  },
  referCountVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563EB',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  formInputGroup: {
    marginBottom: 12,
  },
  formInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1F2937',
    backgroundColor: '#FAFAFA',
  },
  formSubmitBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  formSubmitBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  pwInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingRight: 12,
    backgroundColor: '#FAFAFA',
  },
  pwInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1F2937',
  },
  pwToggleText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: 'bold',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 30,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: 'bold',
  },
  bottomNav: {
    height: 56,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingTop: 6,
  },
  navBtnActive: {
    borderTopWidth: 2,
    borderTopColor: '#2563EB',
  },
  navText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  navTextActive: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  // Collapsible and Swipable Announcements Carousel Styles
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandToggleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  emptyAnnouncementCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyAnnouncementText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  announcementCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  announcementCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  announcementTypeBadge: {
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  announcementDateText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  liveUpdatesCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  liveUpdatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveCategoryBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  liveUpdatesCounter: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  liveUpdatesTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
    lineHeight: 18,
    marginVertical: 4,
  },
  liveUpdatesFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  liveUpdatesDate: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  liveUpdatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  liveUpdatesBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  announcementTitleText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
    lineHeight: 18,
  },
  announcementLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  announcementLinkText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  carouselScrollView: {
    marginBottom: 20,
  },
  carouselSlide: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  storyDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  storyIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  swipeIndicatorText: {
    fontSize: 8,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF9F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#4F6EF7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  categoryIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    shadowColor: '#4F6EF7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.1,
  },
  categoryMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
    fontWeight: '500',
  },
  examSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  examSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 0,
    fontWeight: '400',
  },
  examSearchEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  examSearchEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  backToCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 10,
  },
  backToCatText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  themeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  themeToggleBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  themeToggleBtnInactiveLight: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  themeToggleBtnInactiveDark: {
    backgroundColor: '#0B1329',
    borderColor: '#1F2E54',
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  themeToggleTextActive: {
    color: '#FFF',
  },
  themeToggleTextInactive: {
    color: '#6B7280',
  },
  iconBadgeContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
    lineHeight: 11,
    textAlign: 'center',
  },
  ruleStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    padding: 10,
  },
  ruleStepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleStepNumber: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ruleStepTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  ruleStepDesc: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 14,
  },
  referredCountBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  referredCountBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  friendTrackerCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  friendNameText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  friendProgressText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  friendProgressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  friendProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepDetailLabel: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: 'bold',
  },
});

const modalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    width: '100%',
    maxWidth: 340,
    maxHeight: '80%',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  closeCross: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  sparkleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  modalDesc: {
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  benefitsList: {
    width: '100%',
    flexGrow: 0,
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  benefitEmoji: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  benefitDesc: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 1,
    lineHeight: 12,
  },
  claimBtn: {
    width: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  claimBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
