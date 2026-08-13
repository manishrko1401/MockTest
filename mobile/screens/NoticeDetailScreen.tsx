import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Share2,
  ExternalLink,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  Globe,
  Video,
  MessageCircle,
  AlertTriangle,
  Bell,
  Trophy,
  ShieldCheck,
  Bookmark,
} from 'lucide-react-native';
import { Alert } from 'react-native';
import { ApiClient } from '../api';
import { HtmlText } from '../HtmlText';
import { scheduleJobDeadlineReminders } from '../notifications';

interface NoticeDetailScreenProps {
  initialNotice: any;
  onBack: () => void;
  isDark?: boolean;
  language: 'en' | 'hi';
  currentUser?: any;
  onUpdateUser?: (updatedUser: any) => void;
}

interface ParsedActionLink {
  label: string;
  url: string;
  iconType: 'apply' | 'download' | 'official' | 'video' | 'channel' | 'general';
  priority: number;
}

function getRojgarLinkPriority(label: string, url: string, iconType: string): number {
  const lowerLabel = label.toLowerCase();
  const lowerUrl = url.toLowerCase();

  // 1. Primary Action Links (Apply Online, Online Form, Registration, Check Result, Download Admit Card)
  if (lowerLabel.includes('apply online') || lowerLabel.includes('online apply') || lowerLabel.includes('online form')) return 10;
  if (lowerLabel.includes('check result') || lowerLabel.includes('download result') || lowerLabel.includes('merit list') || lowerLabel.includes('result 202')) return 12;
  if (lowerLabel.includes('download admit card') || lowerLabel.includes('admit card') || lowerLabel.includes('call letter') || lowerLabel.includes('exam city')) return 14;
  if (lowerLabel.includes('download answer key') || lowerLabel.includes('answer key') || lowerLabel.includes('objection key')) return 16;
  if (lowerLabel.includes('registration') || lowerLabel.includes('register') || iconType === 'apply') return 18;

  // 2. Secondary Application / Server Links (Server 1, Server 2, Backlog, Login, Re-Print, Correction Window)
  if (lowerLabel.includes('server') || lowerLabel.includes('backlog') || lowerLabel.includes('login') || lowerLabel.includes('re-print') || lowerLabel.includes('correction')) return 25;

  // 3. Official Notification PDF & Detailed Circulars
  if (lowerLabel.includes('download notification') || lowerLabel.includes('official notification') || lowerLabel.includes('notification pdf') || lowerLabel.includes('detailed advt') || lowerLabel.includes('advertisement') || lowerLabel.includes('circular')) return 30;

  // 4. Download Syllabus & Exam Pattern
  if (lowerLabel.includes('syllabus') || lowerLabel.includes('exam pattern')) return 40;

  // 5. Other Downloads (PDFs, Documents)
  if (iconType === 'download' || lowerLabel.includes('download') || lowerLabel.includes('pdf')) return 50;

  // 6. Video Tutorials & Guides (How to Fill Form, Watch Video)
  if (iconType === 'video' || lowerLabel.includes('video') || lowerLabel.includes('how to fill') || lowerLabel.includes('watch') || lowerUrl.includes('youtube') || lowerUrl.includes('youtu.be')) return 60;

  // 7. Information & Social Channels (WhatsApp, Telegram)
  if (iconType === 'channel' || lowerLabel.includes('whatsapp') || lowerLabel.includes('telegram') || lowerLabel.includes('channel') || lowerLabel.includes('group')) return 70;

  // 8. Official Website / Official Portal (Placed near bottom)
  if (iconType === 'official' || lowerLabel.includes('official website') || lowerLabel.includes('official portal') || lowerLabel.includes('official site') || lowerLabel.includes('board website')) return 80;

  return 90;
}

function extractParsedLinks(notice: any, html: string): ParsedActionLink[] {
  if (!html && !notice) return [];
  const links: ParsedActionLink[] = [];
  const seenUrls = new Set<string>();

  function addLink(label: string, url: string, iconType: 'apply' | 'download' | 'official' | 'video' | 'channel' | 'general' = 'general') {
    if (!url || typeof url !== 'string') return;
    let cleanUrl = url.trim();
    if (!cleanUrl || cleanUrl === '#' || cleanUrl.startsWith('javascript:')) return;
    if (cleanUrl.startsWith('//')) cleanUrl = 'https:' + cleanUrl;
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) return;

    const normUrl = cleanUrl.toLowerCase().replace(/\/$/, '');
    if (seenUrls.has(normUrl)) return;
    seenUrls.add(normUrl);

    let cleanLabel = label
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#8211;/g, '-')
      .replace(/&amp;/g, '&')
      .replace(/&#038;/g, '&')
      .replace(/&#8217;/g, "'")
      .replace(/&rsquo;/g, "'")
      .trim();
    cleanLabel = cleanLabel.replace(/\s+/g, ' ');
    cleanLabel = cleanLabel.replace(/^[|:;\s-]+|[|:;\s-]+$/g, '').trim();
    cleanLabel = cleanLabel.replace(/^(?:Click\s*Here|Link|Server\s*[I|1|2|3|4]+|Direct\s*Link)\s*:?\s*/gi, '');
    cleanLabel = cleanLabel.replace(/\s*:?\s*(?:Click\s*Here|Link|Server\s*[I|1|2|3|4]+|Direct\s*Link)$/gi, '');
    cleanLabel = cleanLabel.replace(/^[|:;\s-]+|[|:;\s-]+$/g, '').trim();
    if (!cleanLabel || cleanLabel.length < 2) cleanLabel = 'Official Portal Link';

    const lowerLabel = cleanLabel.toLowerCase();
    const lowerUrl = cleanUrl.toLowerCase();

    // 1. REJECT INSTRUCTIONAL PARAGRAPH BLOCKS (>75 CHARS or LONG HOW-TO PARAGRAPHS)
    if (
      cleanLabel.length > 75 ||
      lowerLabel.includes('candidate read') ||
      lowerLabel.includes('while applying') ||
      lowerLabel.includes('before submitting') ||
      lowerLabel.includes('after submitting') ||
      lowerLabel.includes('re-check all') ||
      lowerLabel.includes('qualification details') ||
      lowerLabel.includes('take a print') ||
      lowerLabel.includes('name of the candidate') ||
      lowerLabel.includes('father') ||
      lowerLabel.includes('mother') ||
      lowerLabel.includes('date of birth') ||
      lowerLabel.includes('step to fill') ||
      lowerLabel.includes('step by step') ||
      lowerLabel.includes('instructions') ||
      lowerLabel.includes('guidelines')
    ) {
      return;
    }

    // Auto-detect iconType if set to general
    if (iconType === 'general') {
      if (lowerLabel.includes('apply') || lowerLabel.includes('online form') || lowerLabel.includes('registration') || lowerLabel.includes('register')) {
        iconType = 'apply';
      } else if (lowerLabel.includes('whatsapp') || lowerLabel.includes('telegram') || lowerLabel.includes('channel') || lowerLabel.includes('group')) {
        iconType = 'channel';
      } else if (lowerLabel.includes('video') || lowerLabel.includes('how to fill') || lowerLabel.includes('watch') || lowerUrl.includes('youtube') || lowerUrl.includes('youtu.be')) {
        iconType = 'video';
      } else if (lowerLabel.includes('download') || lowerLabel.includes('notification') || lowerLabel.includes('pdf') || lowerLabel.includes('syllabus') || lowerLabel.includes('result') || lowerLabel.includes('admit') || lowerLabel.includes('key') || lowerLabel.includes('schedule') || lowerLabel.includes('city')) {
        iconType = 'download';
      } else if (lowerLabel.includes('official') || lowerLabel.includes('website') || lowerLabel.includes('portal') || lowerLabel.includes('board')) {
        iconType = 'official';
      }
    }

    const priority = getRojgarLinkPriority(cleanLabel, cleanUrl, iconType);
    links.push({ label: cleanLabel, url: cleanUrl, iconType, priority });
  }

  // 1. Primary Direct Portal link from notice.url if present
  if (notice && notice.url && typeof notice.url === 'string' && notice.url.startsWith('http')) {
    const isJob = !notice.category || notice.category === 'notice' || notice.category === 'job';
    const isResult = notice.category === 'result';
    const isAdmit = notice.category === 'admit_card';
    const isKey = notice.category === 'answer_key';

    const defaultLabel = isResult ? 'Check Result / Official Portal' :
                         isAdmit ? 'Download Admit Card / Portal' :
                         isKey ? 'Download Answer Key / Portal' :
                         'Apply Online / Direct Portal';
                         
    addLink(defaultLabel, notice.url, isJob ? 'apply' : 'download');
  }

  // 2. Parse HTML table rows & standalone links from notice.contentHtml
  if (html && typeof html === 'string') {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const rowHtml = rowMatch[1];
      const aMatches = Array.from(rowHtml.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi));
      if (aMatches.length === 0) continue;

      const tds = Array.from(rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(m => m[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim());
      const firstColText = tds[0] || '';

      for (const aMatch of aMatches) {
        const url = aMatch[1];
        const anchorText = aMatch[2].replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
        
        let label = '';
        const isGenericAnchor = /^(?:click\s*here|link|download|open|server\s*[i|1|2|3|4]*|watch\s*video)$/i.test(anchorText);

        if (firstColText && !isGenericAnchor && anchorText && firstColText.toLowerCase() !== anchorText.toLowerCase()) {
          label = `${firstColText} (${anchorText})`;
        } else if (firstColText) {
          label = firstColText;
        } else {
          label = anchorText || 'Click Here';
        }

        if (/notification|pdf|advt|circular|advertisement/i.test(label) || /notification|pdf/i.test(url)) {
          if (!/official notification/i.test(label) && label.length < 40) {
            label = `Official Notification Link: ${label}`;
          }
        }
        addLink(label, url);
      }
    }

    // Scan standalone links (e.g. Official Website: https://...)
    const urlRegex = /(?:Official\s*Website|Portal|Website)\s*:?\s*(https?:\/\/[^\s<"']+)/gi;
    let uMatch;
    while ((uMatch = urlRegex.exec(html)) !== null) {
      addLink('Official Website', uMatch[1], 'official');
    }
  }

  // 3. Fallback Raw Notification Source link from notice.rawUrl if present
  if (notice && notice.rawUrl && typeof notice.rawUrl === 'string' && notice.rawUrl.startsWith('http')) {
    addLink('Official Notification Source & Full Circular', notice.rawUrl, 'download');
  }

  // 4. Sort links in exact RojgarResult standard priority order (Apply Online -> Notification PDF -> Syllabus -> Channels -> Official Website)
  return links.sort((a, b) => (a.priority ?? 90) - (b.priority ?? 90));
}

/**
 * Strips HTML tags and converts HTML blocks into clean structured text lines
 */
function parseCleanTextBlocks(html: string): string[] {
  if (!html) return [];
  let clean = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8211;/g, '-')
    .replace(/&#038;/g, '&')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  return clean.split('\n\n').map(b => b.trim()).filter(Boolean);
}

export default function NoticeDetailScreen({
  initialNotice,
  onBack,
  isDark = false,
  language = 'en',
  currentUser,
  onUpdateUser,
}: NoticeDetailScreenProps) {
  const [notice, setNotice] = useState<any>(initialNotice);
  const [loading, setLoading] = useState(false);

  // Tracked jobs (Saved & Applied) state
  const [isTrackedSaved, setIsTrackedSaved] = useState(false);
  const [isTrackedApplied, setIsTrackedApplied] = useState(false);

  // Intercept device hardware back button & system back gesture to navigate back to notification list screen
  useEffect(() => {
    const onBackPress = () => {
      onBack();
      return true; // Prevents default app exit or root navigation
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [onBack]);

  useEffect(() => {
    if (!notice?.id || !currentUser) {
      setIsTrackedSaved(false);
      setIsTrackedApplied(false);
      return;
    }
    const trackedList = currentUser.trackedJobs || [];
    const item = trackedList.find((j: any) => j.noticeId === notice.id);
    if (item) {
      setIsTrackedSaved(!!item.isSaved);
      setIsTrackedApplied(!!item.isApplied);
    } else {
      setIsTrackedSaved(false);
      setIsTrackedApplied(false);
    }
  }, [notice?.id, currentUser?.trackedJobs]);

  const saveToTrackedJobs = async (newSaved: boolean, newApplied: boolean) => {
    if (!currentUser) {
      Alert.alert(
        language === 'hi' ? 'साइन इन आवश्यक' : 'Sign In Required',
        language === 'hi'
          ? 'जॉब सेव/मार्क करने के लिए कृपया अपने खाते में साइन इन करें।'
          : 'Please sign in to save or track jobs on your account.'
      );
      return;
    }
    if (!notice?.id) return;

    try {
      const list = currentUser.trackedJobs || [];
      const index = list.findIndex((j: any) => j.noticeId === notice.id);

      const updatedObj = {
        noticeId: notice.id,
        title: notice.title,
        category: notice.category || 'notice',
        date: notice.date || '',
        lastDate: notice.lastDate || '',
        isSaved: newSaved,
        isApplied: newApplied,
        appliedDate: newApplied ? new Date().toISOString().split('T')[0] : '',
        updatedAt: new Date().toISOString(),
      };

      let updatedList = [...list];
      if (!newSaved && !newApplied) {
        updatedList = updatedList.filter((j: any) => j.noticeId !== notice.id);
      } else if (index >= 0) {
        updatedList[index] = { ...updatedList[index], ...updatedObj };
      } else {
        updatedList.push(updatedObj);
      }

      if (onUpdateUser) {
        onUpdateUser({ ...currentUser, trackedJobs: updatedList });
      }

      await ApiClient.updateTrackedJobs(currentUser.id, updatedList);
    } catch (e) {
      console.log('[NoticeDetail] updateTrackedJobs error:', e);
    }
  };

  const handleToggleSave = () => {
    const nextSaved = !isTrackedSaved;
    setIsTrackedSaved(nextSaved);
    saveToTrackedJobs(nextSaved, isTrackedApplied);

    if (nextSaved && notice?.lastDate) {
      scheduleJobDeadlineReminders(notice.id, notice.title || 'Job Notification', notice.lastDate);
      Alert.alert(
        language === 'hi' ? 'जॉब सेव हुआ & रिमाइंडर सेट' : 'Job Saved & Reminder Set! ⏰',
        language === 'hi'
          ? `अंतिम तिथि (${notice.lastDate}) से पहले आपके मोबाइल पर अलर्ट नोटिफिकेशन प्राप्त होगा।`
          : `You will receive a mobile push alert before the application last date (${notice.lastDate}).`
      );
    }
  };

  const handleToggleApplied = () => {
    const nextApplied = !isTrackedApplied;
    setIsTrackedApplied(nextApplied);
    saveToTrackedJobs(isTrackedSaved, nextApplied);
  };

  useEffect(() => {
    if (!initialNotice?.id) return;
    if (initialNotice.contentHtml && initialNotice.contentHtml.length > 200 && !initialNotice.contentHtml.startsWith('tigris://')) {
      return;
    }

    setLoading(true);
    ApiClient.getSingleNoticeContent(initialNotice.id)
      .then((res: any) => {
        if (res && res.success && res.notice) {
          setNotice((prev: any) => ({
            ...prev,
            ...res.notice,
          }));
        }
      })
      .catch((err) => {
        console.log('[NoticeDetail] Fetch content error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [initialNotice?.id]);

  const parsedLinks = useMemo(() => {
    return extractParsedLinks(notice, notice?.contentHtml || '');
  }, [notice]);

  const textBlocks = useMemo(() => {
    return parseCleanTextBlocks(notice?.contentHtml || '');
  }, [notice?.contentHtml]);

  const handleShare = async () => {
    try {
      const noticeId = notice?.id || '';
      const shareUrl = noticeId
        ? `https://mock-test-three-indol.vercel.app/updates/${encodeURIComponent(noticeId)}`
        : (notice?.rawUrl || notice?.url || 'https://mock-test-three-indol.vercel.app/updates');
      const title = language === 'hi' && notice?.titleHi ? notice.titleHi : notice?.title || 'Job Notification';
      await Share.share({
        title,
        message: `${title}\n\nCheck full notification details on MockTest Hub:\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (e) {}
  };

  const catColor =
    notice?.category === 'result' ? '#10B981' :
    notice?.category === 'admit_card' ? '#F59E0B' :
    notice?.category === 'answer_key' ? '#8B5CF6' :
    '#3B82F6';

  const catBg =
    isDark
      ? (notice?.category === 'result' ? '#062C1E' : notice?.category === 'admit_card' ? '#3B2E11' : notice?.category === 'answer_key' ? '#2D1F47' : '#11293B')
      : (notice?.category === 'result' ? '#ECFDF5' : notice?.category === 'admit_card' ? '#FEF3C7' : notice?.category === 'answer_key' ? '#F5F3FF' : '#EFF6FF');

  const insets = useSafeAreaInsets();
  const bgColor = isDark ? '#0B0F19' : '#F8FAFC';
  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const textColor = isDark ? '#F3F4F6' : '#1E293B';
  const mutedTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#1F2937' : '#E2E8F0';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* TOP NAVBAR */}
      <View style={[styles.navbar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color={textColor} />
          <Text style={[styles.backText, { color: textColor }]}>
            {language === 'hi' ? 'वापस' : 'Back'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: textColor }]} numberOfLines={1}>
          {notice?.category ? notice.category.replace('_', ' ').toUpperCase() : 'NOTIFICATION'}
        </Text>

        <TouchableOpacity onPress={handleShare} style={styles.iconBtn} activeOpacity={0.7}>
          <Share2 size={18} color={catColor} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HERO TITLE CARD */}
        <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor: borderColor }]}>
          <View style={styles.badgeRow}>
            <View style={[styles.catBadge, { backgroundColor: catBg, borderColor: catColor }]}>
              <Text style={[styles.catBadgeText, { color: catColor }]}>
                {notice?.type || (notice?.category || 'NOTICE').toUpperCase()}
              </Text>
            </View>
            {notice?.date && (
              <View style={styles.dateChip}>
                <Calendar size={12} color={mutedTextColor} />
                <Text style={[styles.dateChipText, { color: mutedTextColor }]}>{notice.date}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.noticeTitle, { color: textColor }]}>
            {language === 'hi' && notice?.titleHi ? notice.titleHi : notice?.title}
          </Text>

          {notice?.lastDate && (
            <View style={styles.lastDateBanner}>
              <AlertTriangle size={14} color="#EF4444" />
              <Text style={styles.lastDateText}>
                {language === 'hi' ? 'अंतिम तिथि:' : 'Last Date to Apply:'} {notice.lastDate}
              </Text>
            </View>
          )}

          {/* Share & Quick Action */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: catColor }]}
              onPress={() => {
                const targetUrl = notice?.rawUrl || notice?.url || 'https://rojgarresult.com/';
                Linking.openURL(targetUrl).catch(() => {});
              }}
              activeOpacity={0.85}
            >
              <ExternalLink size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>
                {notice?.category === 'result' ? (language === 'hi' ? 'रिजल्ट पोर्टल खोलें' : 'Open Result Portal') :
                 notice?.category === 'admit_card' ? (language === 'hi' ? 'एडमिट कार्ड डाउनलोड करें' : 'Download Admit Card') :
                 (language === 'hi' ? 'ऑनलाइन आवेदन करें' : 'Apply Online')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOutlineBtn, { borderColor: borderColor }]}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Share2 size={16} color={catColor} />
              <Text style={[styles.shareOutlineText, { color: catColor }]}>
                {language === 'hi' ? 'शेयर' : 'Share'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* TRACKING ACTION BUTTONS: SAVE JOB & MARK AS APPLIED */}
          <View style={styles.trackingButtonsRow}>
            <TouchableOpacity
              style={[
                styles.trackBtn,
                isTrackedSaved
                  ? { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF', borderColor: '#3B82F6' }
                  : { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: borderColor },
              ]}
              onPress={handleToggleSave}
              activeOpacity={0.8}
            >
              <Bookmark
                size={15}
                color={isTrackedSaved ? '#3B82F6' : mutedTextColor}
                fill={isTrackedSaved ? '#3B82F6' : 'transparent'}
              />
              <Text
                style={[
                  styles.trackBtnText,
                  { color: isTrackedSaved ? '#3B82F6' : textColor, fontWeight: isTrackedSaved ? '900' : '700' },
                ]}
              >
                {isTrackedSaved
                  ? (language === 'hi' ? 'सेव किया गया' : 'Saved')
                  : (language === 'hi' ? 'जॉब सेव करें' : 'Save Job')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.trackBtn,
                isTrackedApplied
                  ? { backgroundColor: isDark ? '#064E3B' : '#ECFDF5', borderColor: '#10B981' }
                  : { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: borderColor },
              ]}
              onPress={handleToggleApplied}
              activeOpacity={0.8}
            >
              <CheckCircle2
                size={15}
                color={isTrackedApplied ? '#10B981' : mutedTextColor}
              />
              <Text
                style={[
                  styles.trackBtnText,
                  { color: isTrackedApplied ? '#10B981' : textColor, fontWeight: isTrackedApplied ? '900' : '700' },
                ]}
              >
                {isTrackedApplied
                  ? (language === 'hi' ? 'आवेदन किया गया' : 'Applied')
                  : (language === 'hi' ? 'आवेदन मार्क करें' : 'Mark as Applied')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* USEFUL IMPORTANT LINKS SECTION */}
        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: borderColor }]}>
          <View style={styles.sectionHeader}>
            <Sparkles size={18} color={catColor} />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {language === 'hi' ? 'महत्वपूर्ण उपयोगी लिंक्स' : 'Some Useful Important Links'}
            </Text>
          </View>

          <View style={styles.linksContainer}>
            {parsedLinks.length > 0 ? (
              parsedLinks.map((link, idx) => {
                let linkColor = '#3B82F6';
                let linkBg = isDark ? '#11293B' : '#EFF6FF';
                let LinkIcon = ExternalLink;

                if (link.iconType === 'apply') {
                  linkColor = '#10B981';
                  linkBg = isDark ? '#062C1E' : '#ECFDF5';
                  LinkIcon = ExternalLink;
                } else if (link.iconType === 'official') {
                  linkColor = '#6366F1';
                  linkBg = isDark ? '#1E1B4B' : '#EEF2FF';
                  LinkIcon = Globe;
                } else if (link.iconType === 'download') {
                  linkColor = '#3B82F6';
                  linkBg = isDark ? '#172554' : '#EFF6FF';
                  LinkIcon = Download;
                }

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.linkTile, { backgroundColor: linkBg, borderColor: linkColor + '40' }]}
                    onPress={() => Linking.openURL(link.url).catch(() => {})}
                    activeOpacity={0.8}
                  >
                    <View style={styles.linkTileLeft}>
                      <View style={[styles.linkIconBadge, { backgroundColor: linkColor }]}>
                        <LinkIcon size={14} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.linkTileText, { color: textColor }]} numberOfLines={2}>
                        {link.label}
                      </Text>
                    </View>
                    <View style={[styles.clickHereBadge, { backgroundColor: linkColor }]}>
                      <Text style={styles.clickHereText}>
                        {language === 'hi' ? 'क्लिक करें' : 'Click Here'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <TouchableOpacity
                style={[styles.linkTile, { backgroundColor: catBg, borderColor: catColor + '40' }]}
                onPress={() => {
                  const targetUrl = notice?.rawUrl || notice?.url || 'https://rojgarresult.com/';
                  Linking.openURL(targetUrl).catch(() => {});
                }}
                activeOpacity={0.8}
              >
                <View style={styles.linkTileLeft}>
                  <View style={[styles.linkIconBadge, { backgroundColor: catColor }]}>
                    <ExternalLink size={14} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.linkTileText, { color: textColor }]}>
                    {language === 'hi' ? 'आधिकारिक पोर्टल लिंक खोलें' : 'Open Official Portal / Notification Link'}
                  </Text>
                </View>
                <View style={[styles.clickHereBadge, { backgroundColor: catColor }]}>
                  <Text style={styles.clickHereText}>Click Here</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* DETAILED OVERVIEW CONTENT */}
        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: borderColor }]}>
          <View style={styles.sectionHeader}>
            <FileText size={18} color={catColor} />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {language === 'hi' ? 'अधिसूचना का पूरा विवरण' : 'Notification Overview & Details'}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={catColor} />
              <Text style={[styles.loadingText, { color: mutedTextColor }]}>
                {language === 'hi' ? 'विवरण लोड हो रहा है...' : 'Loading notification details...'}
              </Text>
            </View>
          ) : notice?.contentHtml && notice.contentHtml.trim().length > 0 ? (
            <HtmlText html={notice.contentHtml} isDark={isDark} />
          ) : (
            <Text style={[styles.noContentText, { color: mutedTextColor }]}>
              {language === 'hi'
                ? 'इस अधिसूचना का संक्षिप्त विवरण सीधे ऊपर दिए गए लिंक्स से देखें।'
                : 'Direct official links and details are listed above.'}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 10,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  navTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 80,
  },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  lastDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  lastDateText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  trackingButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  trackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  trackBtnText: {
    fontSize: 12,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  shareOutlineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareOutlineText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  linksContainer: {
    gap: 10,
  },
  linkTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  linkTileLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTileText: {
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  clickHereBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  clickHereText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textBlocksContainer: {
    gap: 10,
  },
  textBlockCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  textBlockContent: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  noContentText: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    borderTopWidth: 1,
  },
  bottomPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bottomPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
