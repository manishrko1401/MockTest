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
  PanResponder
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  Pin
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { ApiClient } from '../api';
import { ThemeColors } from '../theme';

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
  isDark?: boolean;
  onToggleTheme?: (dark: boolean) => void;
  onOpenSupportChat: () => void;
  activeTab: 'home' | 'tests' | 'notices' | 'bookmarks' | 'profile';
  setActiveTab: (tab: 'home' | 'tests' | 'notices' | 'bookmarks' | 'profile') => void;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  onToggleBookmark?: (testId: string, questionId: string) => void;
}

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

const getCategoryStyle = (name: string, isDark: boolean) => {
  // Pick icon based on name but keep colors UNIFIED
  const norm = name.toLowerCase();
  let iconName = 'Sparkles';
  if (norm.includes('ssc'))                            iconName = 'Award';
  else if (norm.includes('railway') || norm.includes('rrb')) iconName = 'Activity';
  else if (norm.includes('bank') || norm.includes('lic'))    iconName = 'Coins';
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
  onToggleBookmark,
}: DashboardScreenProps) {

  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showCongratsPopup, setShowCongratsPopup] = useState(false);
  const [claiming, setClaiming] = useState(false);

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
    let timer: any;
    const checkNewSignup = async () => {
      try {
        const isNew = await AsyncStorage.getItem('show_signup_congrats_popup');
        if (isNew === 'true') {
          timer = setTimeout(() => {
            setShowCongratsPopup(true);
            AsyncStorage.removeItem('show_signup_congrats_popup');
          }, 7000); // 7 seconds delay
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkNewSignup();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleClaimPassPro = async () => {
    if (!currentUser) return;
    setClaiming(true);
    try {
      const expiry = new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0];
      const purchasedAt = new Date().toISOString().split('T')[0];

      const res = await ApiClient.saveProfileAdmin({
        userId: currentUser.id,
        name: currentUser.name || currentUser.fullName,
        email: currentUser.email,
        mobile: currentUser.mobile,
        referralCode: currentUser.referralCode,
        referredBy: currentUser.referredBy,
        referralsCount: currentUser.referralsCount,
        role: currentUser.role,
        tier: 'Testbook Pass Pro',
        purchasedAt,
        expiry
      });

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
    const missingIds = uniqueTestIds.filter(id => !bookmarkQsCache[id]);
    if (missingIds.length === 0) return;

    setBookmarkQsLoading(true);
    Promise.all(
      missingIds.map(async (testId) => {
        try {
          const res = await ApiClient.getCustomQuestions(testId);
          if (res.success && Array.isArray(res.questions) && res.questions.length > 0) {
            return { testId, questions: res.questions };
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
    if (showReferredFriends && currentUser?.referralCode) {
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
  }, [showReferredFriends, currentUser?.referralCode]);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefreshUser(currentUser.id);
    setRefreshing(false);
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
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
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
                        { width: Dimensions.get('window').width - 32 },
                        ann.imageUrl ? { height: 180, minHeight: 180, padding: 0, overflow: 'hidden' } : {},
                        isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }
                      ]}
                    >
                      {ann.imageUrl ? (
                        <TouchableOpacity
                          activeOpacity={ann.url ? 0.9 : 1}
                          onPress={() => ann.url && Linking.openURL(ann.url)}
                          style={{ width: Dimensions.get('window').width - 32, height: 180, justifyContent: 'center', alignItems: 'center' }}
                        >
                          <Image
                            source={{ uri: ann.imageUrl.trim().replace(/^http:\/\//i, 'https://') }}
                            style={{ width: Dimensions.get('window').width - 34, height: 178 }}
                            resizeMode="contain"
                          />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.announcementCardContent}>
                          <View style={styles.announcementCardHeader}>
                            <Text style={[styles.announcementTypeBadge, isDark && { backgroundColor: ThemeColors.dark.bg, color: '#60A5FA', borderColor: '#334155' }]}>{ann.type || 'NEWS'}</Text>
                            <Text style={styles.announcementDateText}>{ann.date}</Text>
                          </View>
                          <Text style={[styles.announcementTitleText, isDark && { color: ThemeColors.dark.text }]}>{ann.title}</Text>
                          {ann.url && (
                            <TouchableOpacity
                              style={styles.announcementLinkBtn}
                              onPress={() => Linking.openURL(ann.url)}
                            >
                              <Text style={[styles.announcementLinkText, isDark && { color: '#60A5FA' }]}>View Details</Text>
                              <ExternalLink size={12} color={isDark ? '#60A5FA' : '#2563EB'} />
                            </TouchableOpacity>
                          )}
                        </View>
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
                  elevation: 4
                },
                isDark && { borderWidth: 1 }
              ]}>
                {/* Translucent background circle art */}
                <View style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, borderRadius: 30, backgroundColor: badgeColor, opacity: 0.12 }} />
                <View style={{ position: 'absolute', bottom: -10, left: 60, width: 35, height: 35, borderRadius: 17.5, backgroundColor: badgeColor, opacity: 0.08 }} />
                
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
                
                <Text style={[styles.liveUpdatesTitle, isDark ? { color: '#FFFFFF' } : { color: '#1E293B', fontWeight: '900' }]} numberOfLines={2}>
                  {activeNotice.title}
                </Text>
                
                <View style={styles.liveUpdatesFooter}>
                  <Text style={[styles.liveUpdatesDate, isDark ? { color: '#94A3B8' } : { color: '#475569', fontWeight: '600' }]}>
                    Uploaded: {activeNotice.date}
                  </Text>
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

        {/* Section 3: Explore Categories */}
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, isDark && { color: ThemeColors.dark.text }]}>Explore Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
            {[...examCatalog].sort((a, b) => {
              const aPinned = pinnedCategoryIds.includes(a.id);
              const bPinned = pinnedCategoryIds.includes(b.id);
              if (aPinned && !bPinned) return -1;
              if (!aPinned && bPinned) return 1;
              return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
            }).map((cat) => {
              const catStyle = getCategoryStyle(cat.name, isDark);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryBadge,
                    {
                      backgroundColor: catStyle.colors[0],
                      borderColor: catStyle.borderColor,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => {
                    setExamSearchQuery('');
                    setSelectedCategoryId(cat.id);
                    setActiveTab('tests');
                  }}
                >
                  <Text style={[styles.categoryBadgeText, { color: catStyle.iconColor, fontWeight: 'bold' }]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Explore Test Series */}
        <Text style={[styles.sectionTitle, isDark && { color: ThemeColors.dark.text }]}>Popular Test Series</Text>
        {featuredExams.map((exam) => {
          const catStyle = getCategoryStyle(exam.categoryName || '', isDark);
          return (
            <TouchableOpacity
              key={exam.id}
              style={[
                styles.seriesCard,
                {
                  backgroundColor: catStyle.colors[0],
                  borderColor: catStyle.borderColor,
                  borderLeftWidth: 4,
                  borderLeftColor: catStyle.iconColor,
                  position: 'relative',
                  overflow: 'hidden',
                },
              ]}
              onPress={() => onSelectTestSeries(exam)}
            >
              {/* Decorative background circles */}
              <View style={{ position: 'absolute', top: -25, right: -25, width: 70, height: 70, borderRadius: 35, backgroundColor: catStyle.iconColor, opacity: isDark ? 0.12 : 0.05 }} />
              <View style={{ position: 'absolute', bottom: -15, left: 40, width: 45, height: 45, borderRadius: 22.5, backgroundColor: catStyle.iconColor, opacity: isDark ? 0.08 : 0.03 }} />

              <View style={styles.seriesCardLeft}>
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: catStyle.borderColor, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <BookOpen color={catStyle.iconColor} size={18} />
                </View>
                <View style={styles.seriesDetails}>
                  <Text style={[styles.seriesTitle, isDark ? { color: '#FFFFFF' } : { color: '#1E293B' }]}>{exam.name} Series</Text>
                  <Text style={[styles.seriesMeta, isDark ? { color: '#94A3B8' } : { color: '#64748B' }]}>
                    {exam.categoryName} • {exam.tests?.length || 0} practice papers
                  </Text>
                </View>
              </View>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center' }}>
                <ChevronRight color={catStyle.iconColor} size={14} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderTestsTab = () => {
    if (selectedCategoryId === null) {
      // Filter exam categories by search query
      const sortedCatalog = [...examCatalog].sort((a, b) => {
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
              placeholder="Search exam name..."
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
                Swipe right exam to pin to top, swipe left exam to unpin
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
                        },
                      ]}
                      activeOpacity={0.82}
                      onPress={() => {
                        setExamSearchQuery('');
                        setSelectedCategoryId(category.id);
                      }}
                    >
                      <View style={styles.categoryCardLeft}>
                        {/* Icon/Logo circle */}
                        <View style={[
                          styles.categoryIconCircle,
                          {
                            backgroundColor: isDark ? '#111D38' : '#FFFFFF',
                            borderColor: catStyle.borderColor,
                            overflow: 'hidden',
                          }
                        ]}>
                          {category.logoUrl ? (
                            <Image
                              source={{ uri: category.logoUrl }}
                              style={{ width: '100%', height: '100%', borderRadius: 27 }}
                              resizeMode="cover"
                            />
                          ) : (
                            <CategoryIcon name={catStyle.iconName} color={catStyle.iconColor} size={24} />
                          )}
                        </View>

                        {/* Text info */}
                        <View style={styles.categoryDetails}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.categoryTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                              {category.name}
                            </Text>
                            {isPinned && (
                              <Pin size={11} color="#10B981" style={{ transform: [{ rotate: '45deg' }] }} />
                            )}
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

    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={[styles.backToCatBtn, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border, borderBottomColor: ThemeColors.dark.border }]}
          onPress={() => setSelectedCategoryId(null)}
        >
          <ChevronLeft color={isDark ? '#60A5FA' : '#2563EB'} size={16} />
          <Text style={[styles.backToCatText, isDark && { color: '#60A5FA' }]}>Back to Exam Categories</Text>
        </TouchableOpacity>

        <FlatList
          data={[...selectedCategory.subCategories].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: sub }) => {
            const catStyle = getCategoryStyle(selectedCategory.name, isDark);
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
                onPress={() => onSelectTestSeries({ ...sub, categoryName: selectedCategory.name })}
              >
                <View style={styles.seriesCardLeft}>
                  {/* Icon box */}
                  <View style={{
                    width: 44, height: 44, borderRadius: 12,
                    backgroundColor: isDark ? '#111D38' : '#FFFFFF',
                    borderColor: catStyle.borderColor, borderWidth: 1.5,
                    justifyContent: 'center', alignItems: 'center', marginRight: 12,
                    shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
                  }}>
                    <BookOpen color={catStyle.iconColor} size={20} />
                  </View>
                  <View style={styles.seriesDetails}>
                    <Text style={[styles.seriesTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                      {sub.name}
                    </Text>
                    <Text style={[styles.seriesMeta, { color: isDark ? '#64748B' : '#6B7280' }]}>
                      {sub.tests?.length || 0} Mock Tests
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
        <Text style={[styles.noticeTitle, isDark ? { color: '#FFFFFF' } : { color: '#1E293B' }]}>{notice.title}</Text>
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
      if (!qs) return null;
      return qs.find((q: any) => q.id === questionId) || null;
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
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={{ marginTop: 12, fontSize: 12, fontWeight: '600', color: isDark ? '#64748B' : '#94A3B8' }}>
              Loading bookmarked questions...
            </Text>
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
                      {decode(questionTextEn)}
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
                        <Text style={{ fontSize: 12, color: isDark ? '#E2E8F0' : '#1E293B', lineHeight: 19 }}>
                          {decode(questionTextEn)}
                        </Text>
                        {questionTextHi && questionTextHi !== questionTextEn && (
                          <>
                            <View style={{ height: 1, backgroundColor: isDark ? '#1E293B' : '#E2E8F0', marginVertical: 8 }} />
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#6366F1', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.4 }}>
                              हिंदी
                            </Text>
                            <Text style={{ fontSize: 12, color: isDark ? '#CBD5E1' : '#374151', lineHeight: 19 }}>
                              {decode(questionTextHi)}
                            </Text>
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
                                    <Text style={{
                                      flex: 1, fontSize: 12, lineHeight: 18,
                                      fontWeight: isCorrect ? '700' : '500',
                                      color: isCorrect
                                        ? (isDark ? '#34D399' : '#065F46')
                                        : (isDark ? '#94A3B8' : '#374151')
                                    }}>
                                      {String.fromCharCode(65 + oIdx)}. {decode(textEn)}
                                    </Text>
                                    {isCorrect && <CheckSquare size={16} color={isDark ? '#34D399' : '#059669'} />}
                                  </View>
                                  {textHi && textHi !== textEn && (
                                    <Text style={{ fontSize: 10, color: isDark ? '#64748B' : '#9CA3AF', marginTop: 3 }}>
                                      {decode(textHi)}
                                    </Text>
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
                            <Text style={{ fontSize: 11, color: isDark ? '#CBD5E1' : '#1E293B', lineHeight: 17 }}>
                              {decode(explanationEn)}
                            </Text>
                          )}
                          {explanationHi && explanationHi !== explanationEn && (
                            <>
                              <View style={{ height: 1, backgroundColor: isDark ? '#1D4ED8' : '#BFDBFE', marginVertical: 6 }} />
                              <Text style={{ fontSize: 11, color: isDark ? '#93C5FD' : '#1D4ED8', lineHeight: 17 }}>
                                {decode(explanationHi)}
                              </Text>
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
              <Text style={[styles.sysDetailLabel, { marginBottom: 0, textTransform: 'none', fontWeight: '700' }, isDark && { color: ThemeColors.dark.textMuted }]}>System Role</Text>
            </View>
            <Text style={[styles.sysDetailVal, isDark ? { color: '#E2E8F0' } : { color: '#1F2937' }, { fontWeight: 'bold' }]}>{currentUser.role}</Text>
          </View>

          <View style={[styles.sysDetailItem, { borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Trophy size={16} color="#F59E0B" />
              <Text style={[styles.sysDetailLabel, { marginBottom: 0, textTransform: 'none', fontWeight: '700' }, isDark && { color: ThemeColors.dark.textMuted }]}>Pass Status</Text>
            </View>
            <Text style={[
              styles.sysDetailVal,
              { color: isPro ? '#EC4899' : (isDark ? '#E2E8F0' : '#475569'), fontWeight: 'bold' }
            ]}>
              {currentUser.subscriptionTier === 'None' ? 'No Active Pass' : currentUser.subscriptionTier.replace('Testbook', 'Mock Test')}
            </Text>
          </View>

          {currentUser.subscriptionPurchasedAt && (
            <View style={[styles.sysDetailItem, { borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} color="#10B981" />
                <Text style={[styles.sysDetailLabel, { marginBottom: 0, textTransform: 'none', fontWeight: '700' }, isDark && { color: ThemeColors.dark.textMuted }]}>Purchased At</Text>
              </View>
              <Text style={[styles.sysDetailVal, isDark && { color: ThemeColors.dark.text }]}>{currentUser.subscriptionPurchasedAt}</Text>
            </View>
          )}

          {currentUser.subscriptionExpiresAt && (
            <View style={[styles.sysDetailItem, { borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} color="#EF4444" />
                <Text style={[styles.sysDetailLabel, { marginBottom: 0, textTransform: 'none', fontWeight: '700' }, isDark && { color: ThemeColors.dark.textMuted }]}>Expires At</Text>
              </View>
              <Text style={[styles.sysDetailVal, isDark && { color: ThemeColors.dark.text }]}>{currentUser.subscriptionExpiresAt}</Text>
            </View>
          )}

          <View style={[styles.sysDetailItem, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} color={isDark ? '#94A3B8' : '#64748B'} />
              <Text style={[styles.sysDetailLabel, { marginBottom: 0, textTransform: 'none', fontWeight: '700' }, isDark && { color: ThemeColors.dark.textMuted }]}>Registered On</Text>
            </View>
            <Text style={[styles.sysDetailVal, isDark && { color: ThemeColors.dark.text }]}>{currentUser.registeredDate || 'Recently'}</Text>
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

          <Text style={[styles.formCardTitle, isDark && { color: ThemeColors.dark.text }]}>🎁 Referral Program</Text>
          <Text style={[styles.sysDetailLabel, { marginTop: 6, marginBottom: 12, textTransform: 'none', lineHeight: 16 }, isDark && { color: ThemeColors.dark.textMuted }]}>
            Invite your friends to prepare with MockTest Hub. Share your referral code below:
          </Text>

          <View style={[
            styles.referralCodeRow,
            isDark ? { backgroundColor: '#111827', borderColor: '#374151' } : { backgroundColor: '#FFFDF5', borderColor: '#FDE68A' },
            { borderStyle: 'dashed', borderWidth: 1.5 }
          ]}>
            <Text style={[styles.referralCodeText, { color: '#D97706', letterSpacing: 1.5, fontSize: 16 }]}>{currentUser.referralCode}</Text>
            <TouchableOpacity style={[styles.copyReferralBtn, { backgroundColor: '#F59E0B' }]} onPress={shareReferralCode}>
              <Text style={styles.copyReferralBtnText}>Share & Copy</Text>
            </TouchableOpacity>
          </View>

          {/* Collapsible View Rules */}
          <TouchableOpacity 
            style={[styles.collapsibleHeader, { marginTop: 16, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#F3F4F6', paddingTop: 12 }]} 
            onPress={() => setShowReferralRules(!showReferralRules)}
          >
            <Text style={[styles.formCardTitle, { fontSize: 12 }, isDark && { color: ThemeColors.dark.text }]}>📋 How It Works & Rules</Text>
            <Text style={[styles.expandToggleText, isDark && { color: '#60A5FA' }]}>{showReferralRules ? '▲ Hide' : '▼ View'}</Text>
          </TouchableOpacity>

          {showReferralRules && (
            <View style={{ marginTop: 10, gap: 10 }}>
              <View style={[styles.ruleStepItem, isDark && { backgroundColor: '#0B1329', borderColor: ThemeColors.dark.border }]}>
                <View style={styles.ruleStepNumberContainer}><Text style={styles.ruleStepNumber}>1</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ruleStepTitle, isDark && { color: ThemeColors.dark.text }]}>Share Invite Code</Text>
                  <Text style={[styles.ruleStepDesc, isDark && { color: ThemeColors.dark.textMuted }]}>Copy your code and share it with friends who are preparing for competitive exams.</Text>
                </View>
              </View>

              <View style={[styles.ruleStepItem, isDark && { backgroundColor: '#0B1329', borderColor: ThemeColors.dark.border }]}>
                <View style={[styles.ruleStepNumberContainer, { backgroundColor: '#C084FC' }]}><Text style={styles.ruleStepNumber}>2</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ruleStepTitle, isDark && { color: ThemeColors.dark.text }]}>Friend Registers</Text>
                  <Text style={[styles.ruleStepDesc, isDark && { color: ThemeColors.dark.textMuted }]}>Your friend signs up on Mock Test and enters your referral code on the signup screen.</Text>
                </View>
              </View>

              <View style={[styles.ruleStepItem, isDark && { backgroundColor: '#0B1329', borderColor: ThemeColors.dark.border }]}>
                <View style={[styles.ruleStepNumberContainer, { backgroundColor: '#FBBF24' }]}><Text style={styles.ruleStepNumber}>3</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ruleStepTitle, isDark && { color: ThemeColors.dark.text }]}>Complete First Mock Test</Text>
                  <Text style={[styles.ruleStepDesc, isDark && { color: ThemeColors.dark.textMuted }]}>Once they complete any full-length or practice mock test sitting on the CBT interface.</Text>
                </View>
              </View>

              <View style={[styles.ruleStepItem, isDark && { backgroundColor: '#0B1329', borderColor: ThemeColors.dark.border }]}>
                <View style={[styles.ruleStepNumberContainer, { backgroundColor: '#34D399' }]}><Text style={styles.ruleStepNumber}>4</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ruleStepTitle, isDark && { color: ThemeColors.dark.text }]}>Both Receive Coins</Text>
                  <Text style={[styles.ruleStepDesc, isDark && { color: ThemeColors.dark.textMuted }]}>You get 20 Coins and your friend gets 10 Coins instantly credited!</Text>
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
              <Text style={[styles.formCardTitle, { fontSize: 12 }, isDark && { color: ThemeColors.dark.text }]}>👥 Referred Friends Tracker</Text>
              <View style={styles.referredCountBadge}>
                <Text style={styles.referredCountBadgeText}>
                  {currentUser.referralsCount}
                </Text>
              </View>
            </View>
            <Text style={[styles.expandToggleText, isDark && { color: '#60A5FA' }]}>{showReferredFriends ? '▲ Hide' : '▼ Track'}</Text>
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
                <View style={{ marginTop: 10, padding: 16, alignItems: 'center', backgroundColor: isDark ? '#0B1329' : '#F9FAFB', borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#6B7280', fontStyle: 'italic' }}>
                    You haven't referred any candidates yet.
                  </Text>
                </View>
              );
            }

            return (
              <View style={{ marginTop: 10, gap: 10 }}>
                {referredFriends.map((friend: any) => {
                  const hasCompletedTest = friend.hasCompletedTest;
                  
                  return (
                    <View key={friend.id} style={[styles.friendTrackerCard, isDark && { backgroundColor: '#0B1329', borderColor: ThemeColors.dark.border }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.friendNameText, isDark && { color: ThemeColors.dark.text }]}>{friend.name || 'Candidate'}</Text>
                        <Text style={[styles.friendProgressText, { color: hasCompletedTest ? '#10B981' : '#F59E0B' }]}>
                          {hasCompletedTest ? 'Completed! 20 Coins' : 'Pending Test Attempt'}
                        </Text>
                      </View>
                      
                      {/* Progress Bar */}
                      <View style={styles.friendProgressBarBg}>
                        <View style={[styles.friendProgressBarFill, { width: hasCompletedTest ? '100%' : '50%', backgroundColor: hasCompletedTest ? '#10B981' : '#FBBF24' }]} />
                      </View>

                      {/* Steps detail */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={styles.stepDetailLabel}>✓ Registered</Text>
                        <Text style={[styles.stepDetailLabel, { color: hasCompletedTest ? '#10B981' : '#6B7280' }]}>
                          {hasCompletedTest ? '✓ Test Completed' : '⌛ Attempting test...'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })()}
        </View>

        {/* Support Chat Card */}
        <View style={[styles.formCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
          <Text style={[styles.formCardTitle, isDark && { color: ThemeColors.dark.text }]}>💬 Talk to Support Team</Text>
          <Text style={[styles.sysDetailLabel, { marginTop: 6, marginBottom: 12, textTransform: 'none' }, isDark && { color: ThemeColors.dark.textMuted }]}>
            Have any questions, doubts, or technical issues? Get in touch with our support representatives directly.
          </Text>
          <TouchableOpacity 
            style={[styles.formSubmitBtn, { backgroundColor: '#2563EB', marginTop: 0 }]} 
            onPress={onOpenSupportChat}
          >
            <Text style={styles.formSubmitBtnText}>Start Chatting</Text>
          </TouchableOpacity>
        </View>

        {/* App Theme Settings */}
        <View style={[styles.formCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
          <Text style={[styles.formCardTitle, isDark && { color: ThemeColors.dark.text }]}>🎨 App Theme Settings</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[
                styles.themeToggleBtn,
                !isDark ? styles.themeToggleBtnActive : (isDark ? styles.themeToggleBtnInactiveDark : styles.themeToggleBtnInactiveLight)
              ]}
              onPress={() => onToggleTheme && onToggleTheme(false)}
            >
              <Text style={[styles.themeToggleText, !isDark ? styles.themeToggleTextActive : styles.themeToggleTextInactive]}>☀️ Light Mode</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[
                styles.themeToggleBtn,
                isDark ? styles.themeToggleBtnActive : styles.themeToggleBtnInactiveLight
              ]}
              onPress={() => onToggleTheme && onToggleTheme(true)}
            >
              <Text style={[styles.themeToggleText, isDark ? styles.themeToggleTextActive : styles.themeToggleTextInactive]}>🌙 Dark Mode</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Edit details form */}
        <View style={[styles.formCard, isDark && { backgroundColor: ThemeColors.dark.card, borderColor: ThemeColors.dark.border }]}>
          <TouchableOpacity 
            style={[styles.collapsibleHeader, showUpdateProfile && { borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F3F4F6', paddingBottom: 8 }]} 
            onPress={() => setShowUpdateProfile(!showUpdateProfile)}
          >
            <Text style={[styles.formCardTitle, isDark && { color: ThemeColors.dark.text }]}>👤 Update Profile Details</Text>
            <Text style={[styles.expandToggleText, isDark && { color: '#60A5FA' }]}>{showUpdateProfile ? '▲ Collapse' : '▼ Expand'}</Text>
          </TouchableOpacity>

          {showUpdateProfile && (
            <View style={{ marginTop: 12 }}>
              <View style={styles.formInputGroup}>
                <Text style={[styles.formInputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Full Name</Text>
                <TextInput
                  style={[styles.formInput, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder, color: ThemeColors.dark.text }]}
                  placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                  value={profileName}
                  onChangeText={setProfileName}
                />
              </View>
              <View style={styles.formInputGroup}>
                <Text style={[styles.formInputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Email Address</Text>
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
                <Text style={[styles.formInputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Mobile Number</Text>
                <TextInput
                  style={[styles.formInput, isDark && { backgroundColor: ThemeColors.dark.inputBg, borderColor: ThemeColors.dark.inputBorder, color: ThemeColors.dark.text }]}
                  placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                  value={profileMobile}
                  onChangeText={setProfileMobile}
                  keyboardType="phone-pad"
                />
              </View>
              <TouchableOpacity style={styles.formSubmitBtn} onPress={handleUpdateProfile}>
                <Text style={styles.formSubmitBtnText}>Save Profile Details</Text>
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
            <Text style={[styles.formCardTitle, isDark && { color: ThemeColors.dark.text }]}>🔑 Change Account Password</Text>
            <Text style={[styles.expandToggleText, isDark && { color: '#60A5FA' }]}>{showChangePassword ? '▲ Collapse' : '▼ Expand'}</Text>
          </TouchableOpacity>

          {showChangePassword && (
            <View style={{ marginTop: 12 }}>
              <View style={styles.formInputGroup}>
                <Text style={[styles.formInputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Old Password</Text>
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
                    <Text style={[styles.pwToggleText, isDark && { color: '#60A5FA' }]}>{showOldPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.formInputGroup}>
                <Text style={[styles.formInputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>New Password</Text>
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
                    <Text style={[styles.pwToggleText, isDark && { color: '#60A5FA' }]}>{showNewPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.formInputGroup}>
                <Text style={[styles.formInputLabel, isDark && { color: ThemeColors.dark.textMuted }]}>Confirm New Password</Text>
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
                    <Text style={[styles.pwToggleText, isDark && { color: '#60A5FA' }]}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={[styles.formSubmitBtn, { backgroundColor: '#2563EB' }]} onPress={handleUpdatePassword}>
                <Text style={styles.formSubmitBtnText}>Update Account Password</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity style={[styles.logoutBtn, isDark && { backgroundColor: '#3F1F1F', borderColor: '#EF4444' }]} onPress={onLogout}>
          <LogOut size={16} color="#EF4444" />
          <Text style={[styles.logoutText, isDark && { color: '#FCA5A5' }]}>Log Out Account</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const totalTestsGiven = useMemo(() => {
    const catalogTestsMap = new Map<string, any>();
    (examCatalog || []).forEach(cat => {
      (cat.subCategories || []).forEach((sub: any) => {
        (sub.tests || []).forEach((t: any) => {
          catalogTestsMap.set(t.id, t);
        });
        (sub.subSubCategories || []).forEach((subsub: any) => {
          (subsub.tests || []).forEach((t: any) => {
            catalogTestsMap.set(t.id, t);
          });
        });
      });
    });

    const uniqueTests = new Set<string>();
    (currentUser.testSessions || []).forEach((s: any) => {
      if (s.status !== 'COMPLETED' && s.status !== 'AUTO_SUBMITTED') {
        return;
      }

      // Prioritize durationMinutes from the session object, then catalog, then guess, then fallback
      let durationMinutes = 60;
      if (typeof s.durationMinutes === 'number') {
        durationMinutes = s.durationMinutes;
      } else if (s.mockTest && typeof s.mockTest.durationMinutes === 'number') {
        durationMinutes = s.mockTest.durationMinutes;
      } else {
        const test = catalogTestsMap.get(s.testId);
        if (test && typeof test.durationMinutes === 'number') {
          durationMinutes = test.durationMinutes;
        } else {
          const tid = (s.testId || '').toLowerCase();
          if (tid.includes('ssc')) {
            durationMinutes = 60;
          } else if (tid.includes('rrb')) {
            durationMinutes = 90;
          } else if (tid.includes('ctet')) {
            durationMinutes = 150;
          } else if (tid.includes('ugc_net')) {
            durationMinutes = tid.includes('paper1') ? 60 : 120;
          }
        }
      }

      const totalSec = durationMinutes * 60;
      const spentSec = Number(s.durationSeconds ?? s.timeSpentSeconds ?? 0);
      if (spentSec >= totalSec * 0.75) {
        uniqueTests.add(s.testId);
      }
    });

    return uniqueTests.size;
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
          ]}>Home</Text>
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
          ]}>Tests</Text>
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
          ]}>Notices</Text>
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
          ]}>Saved</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navBtn, 
            activeTab === 'profile' && styles.navBtnActive,
            activeTab === 'profile' && isDark && { borderTopColor: '#60A5FA' }
          ]}
          onPress={() => setActiveTab('profile')}
        >
          <User size={20} color={activeTab === 'profile' ? (isDark ? '#60A5FA' : '#2563EB') : (isDark ? '#94A3B8' : '#6B7280')} />
          <Text style={[
            styles.navText, 
            activeTab === 'profile' && styles.navTextActive,
            isDark && activeTab === 'profile' && { color: '#60A5FA' },
            isDark && activeTab !== 'profile' && { color: '#94A3B8' }
          ]}>Me</Text>
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
    padding: 16,
    minHeight: 180,
    justifyContent: 'center',
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
