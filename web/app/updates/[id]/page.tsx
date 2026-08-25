"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { 
  ArrowLeft, ExternalLink, ChevronRight, Trophy, Bell, FileText, 
  ShieldCheck, Sun, Moon, Calendar, Clock, Share2, Check, Sparkles, 
  Download, BookOpen, AlertCircle, Building2, User, UserCheck, CheckCircle2,
  Bookmark, BookmarkCheck, Layers, Compass, HelpCircle, ArrowUpRight, ArrowRight, ListChecks,
  LayoutDashboard, FolderLock, KeyRound, Eye, EyeOff, Copy, Edit3, FolderOpen, Plus
} from 'lucide-react';
import { TRANSLATIONS } from '../../translations';
import { useIsMobile } from '../../useIsMobile';

import { processQuestionHtml } from '../../lib/mathUtils';

interface NoticeDetailPageProps {
  params: Promise<{ id: string }>;
}

interface ParsedActionLink {
  label: string;
  url: string;
  iconType: 'apply' | 'download' | 'official' | 'video' | 'channel' | 'general';
  priority?: number;
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
    cleanLabel = cleanLabel.replace(/^(?:Click\s*Here|Link|Server\s*[I|1|2|3|4]+|Direct\s*Link)\s*:?\s*/gi, '');
    cleanLabel = cleanLabel.replace(/\s*:?\s*(?:Click\s*Here|Link|Server\s*[I|1|2|3|4]+|Direct\s*Link)$/gi, '');
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

function sanitizeNoticeHtml(html: string): string {
  if (!html) return '';
  let clean = html;

  // Run master HTML rescue processor (decodes entities, rescues broken tags, fixes // -> https://)
  clean = processQuestionHtml(clean);

  // 1. Remove <header class="entry-header">...</header>
  clean = clean.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

  // 2. Remove all top <h1>...</h1> tags
  clean = clean.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');

  // 3. Remove individual <h2> tags whose OWN text contains title keywords (prevent cross-h2 matching)
  clean = clean.replace(/<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?(?:Application\s*Form|Online\s*Form|Recruitment\s*20\d\d)(?:(?!<\/h2>)[\s\S])*?<\/h2>/gi, (match) => {
    if (/(?:overview|how\s*to|step|instruction|guide|process)/i.test(match)) return match;
    return '';
  });

  // 4. Remove Post Update Date / Post Date paragraphs ONLY within single paragraph boundary (max 300 chars)
  clean = clean.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,300}?Post\s*(?:Update\s*)?Date(?:(?!<\/p>)[\s\S]){1,300}?<\/p>/gi, '');

  // 5. Remove all Short Description / Short Details / Short Information sections safely (li, p, h2-h4, tr, text)
  clean = clean.replace(/<li[^>]*>(?:(?!<\/li>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/li>)[\s\S])*?<\/li>/gi, '');
  clean = clean.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,400}?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/p>)[\s\S]){1,400}?<\/p>/gi, '');
  clean = clean.replace(/<h[2-4][^>]*>(?:(?!<\/h[2-4]>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/h[2-4]>)[\s\S])*?<\/h[2-4]>/gi, '');
  clean = clean.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
  clean = clean.replace(/(?:<b>|<strong>)?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)\s*:?\s*(?:<\/b>|<\/strong>)?(?:[^<\n\r]{0,250})/gi, '');

  // 6. Remove video and social media promotion rows in ANY table (Watch Video, Hindi Video, Telegram/Whatsapp)
  clean = clean.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Watch\s*Video|Hindi\s*Video|Short\s*Notification\s*\(?[\w\s]*Video|Join\s*Free\s*Information|Information\s*Channel|Official\s*Whatsapp|Official\s*Telegram)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');

  // 6b. REMOVE BRANDING TEXT, STANDALONE URLS & UNWANTED "www..com" / ".Com" / "Rojgar Result" ROWS AND TAGS
  clean = clean.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:www\s*\.\s*\.\s*com|\.Com|rojgarresult\.com|Rojgar\s*Result®?)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, (match) => {
    const text = match.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
    if (/^(?:www\s*\.\s*\.\s*com|\.Com|Website|\.Com\s*Website|Website\s*\.Com|Rojgar\s*Result®?|rojgarresult\.com)$/i.test(text) || text.length < 15) {
      return '';
    }
    return match;
  });

  clean = clean.replace(/<h[1-6][^>]*>(?:(?!<\/h[1-6]>)[\s\S])*?(?:www\s*\.\s*\.\s*com|\.Com|Rojgar\s*Result®?|rojgarresult\.com)(?:(?!<\/h[1-6]>)[\s\S])*?<\/h[1-6]>/gi, '');
  clean = clean.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S])*?(?:www\s*\.\s*\.\s*com|\.Com|Rojgar\s*Result®?|rojgarresult\.com)(?:(?!<\/p>)[\s\S])*?<\/p>/gi, '');

  clean = clean.replace(/>([^<]*)(?:www\s*\.\s*\.\s*com|Rojgar\s*Result®?|rojgarresult\.com|\.Com)([^<]*)</gi, (match, p1, p2) => {
    const combined = (p1 + p2).replace(/&nbsp;/gi, ' ').trim();
    if (!combined || combined === '.') return '><';
    return `>${p1}${p2}<`;
  });

  clean = clean.replace(/<h[1-6][^>]*>\s*(?:<[^>]*>\s*)*<\/h[1-6]>/gi, '');
  clean = clean.replace(/<p[^>]*>\s*(?:<[^>]*>\s*)*<\/p>/gi, '');
  clean = clean.replace(/<tr[^>]*>\s*(?:<td[^>]*>\s*(?:<[^>]*>\s*)*<\/td>\s*)*<\/tr>/gi, '');

  // 6c. CLEAN EXCESSIVE INLINE FONT STYLING & BOLD BLOAT FROM SCRAPED HTML
  clean = clean.replace(/font-family:\s*[^;'"]+;?/gi, '');
  clean = clean.replace(/font-size:\s*[^;'"]+;?/gi, '');
  clean = clean.replace(/line-height:\s*[^;'"]+;?/gi, '');
  clean = clean.replace(/font-weight:\s*(?:bold|700|800|900);?/gi, '');
  clean = clean.replace(/style="\s*"/gi, '');
  clean = clean.replace(/style='\s*'/gi, '');

  // Clean empty and redundant bold wrappers inside table cells
  clean = clean.replace(/<td([^>]*)>\s*<(?:b|strong)>([\s\S]*?)<\/(?:b|strong)>\s*<\/td>/gi, '<td$1>$2</td>');

  // 7. Clean fixed inline width attributes from tables, th, td to prevent responsive overflow
  clean = clean.replace(/\s*width=["']?\d+(?:px|%)?["']?/gi, '');

  // 8. Wrap all table elements (like Category-wise Vacancy tables) in a responsive scroll container
  clean = clean.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match) => {
    const tableBody = match.replace(/^<table[^>]*>/i, '').replace(/<\/table>$/i, '');
    return `<div class="notice-table-wrapper overflow-x-auto max-w-full my-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900"><table class="w-full text-left">${tableBody}</table></div>`;
  });

  // 9. Remove any leftover empty paragraphs or &nbsp; at top
  clean = clean.replace(/^(?:\s*<p>\s*(?:&nbsp;|\s*)*<\/p>)*/gi, '');

  return clean.trim();
}

export default function NoticeDetailPage({ params }: NoticeDetailPageProps) {
  const { currentUser, updateTrackedJobs, noticesList, theme, toggleTheme, language, setLanguage } = useAuth();
  const router = useRouter();
  const { isMobile, isMounted } = useIsMobile();
  const [noticeId, setNoticeId] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState('overview');

  // Save & Track states
  const [isTrackedSaved, setIsTrackedSaved] = React.useState(false);
  const [isTrackedApplied, setIsTrackedApplied] = React.useState(false);
  const [appliedDate, setAppliedDate] = React.useState('');
  const [applicationNo, setApplicationNo] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rollNumber, setRollNumber] = React.useState('');
  const [examDate, setExamDate] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [saveToast, setSaveToast] = React.useState<string | null>(null);

  const [fetchedNotice, setFetchedNotice] = React.useState<any>(null);
  const [noticeLoading, setNoticeLoading] = React.useState(false);

  React.useEffect(() => {
    params.then(p => setNoticeId(p.id));
  }, [params]);

  React.useEffect(() => {
    if (!noticeId) return;
    const inList = noticesList.find(n => n.id === noticeId);
    if (inList && inList.contentHtml && !inList.contentHtml.startsWith('tigris://') && inList.contentHtml.length > 200) {
      setFetchedNotice(inList);
    } else {
      setNoticeLoading(true);
      fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-single-notice-content', data: { id: noticeId } })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.notice) {
            setFetchedNotice(data.notice);
            if (inList) {
              inList.contentHtml = data.notice.contentHtml;
            }
          } else if (inList) {
            setFetchedNotice(inList);
          }
        })
        .catch(err => {
          console.error("Fetch single notice error:", err);
          if (inList) setFetchedNotice(inList);
        })
        .finally(() => setNoticeLoading(false));
    }
  }, [noticeId, noticesList]);

  const notice = fetchedNotice || (noticeId ? noticesList.find(n => n.id === noticeId) : null);
  const parsedLinks = React.useMemo(() => notice ? extractParsedLinks(notice, notice.contentHtml || '') : [], [notice]);
  const sanitizedContent = React.useMemo(() => notice?.contentHtml ? sanitizeNoticeHtml(notice.contentHtml) : '', [notice]);

  // Load tracked state for current user
  React.useEffect(() => {
    if (!noticeId || !currentUser) {
      setIsTrackedSaved(false);
      setIsTrackedApplied(false);
      return;
    }
    try {
      const stored = currentUser.trackedJobs || [];
      const item = stored.find((j: any) => j.noticeId === noticeId);
      if (item) {
        setIsTrackedSaved(!!item.isSaved);
        setIsTrackedApplied(!!item.isApplied);
        setAppliedDate(item.appliedDate || '');
        setApplicationNo(item.applicationNo || '');
        setPassword(item.password || '');
        setRollNumber(item.rollNumber || '');
        setExamDate(item.examDate || '');
      } else {
        setIsTrackedSaved(false);
        setIsTrackedApplied(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [noticeId, currentUser]);

  const saveToTrackedJobs = (
    newSaved: boolean,
    newApplied: boolean,
    dateStr?: string,
    appNoStr?: string,
    passStr?: string,
    rollStr?: string,
    examDateStr?: string
  ) => {
    if (!notice || !currentUser) return;
    try {
      let list = currentUser.trackedJobs || [];
      const index = list.findIndex((j: any) => j.noticeId === notice.id);

      const updatedObj = {
        noticeId: notice.id,
        title: notice.title,
        category: notice.category,
        date: notice.date,
        lastDate: notice.lastDate,
        isSaved: newSaved,
        isApplied: newApplied,
        appliedDate: dateStr !== undefined ? dateStr : (newApplied ? (appliedDate || new Date().toISOString().split('T')[0]) : ''),
        applicationNo: appNoStr !== undefined ? appNoStr : applicationNo,
        password: passStr !== undefined ? passStr : password,
        rollNumber: rollStr !== undefined ? rollStr : rollNumber,
        examDate: examDateStr !== undefined ? examDateStr : examDate,
        updatedAt: new Date().toISOString()
      };

      let updatedList = [...list];
      if (!newSaved && !newApplied) {
        updatedList = updatedList.filter((j: any) => j.noticeId !== notice.id);
      } else if (index >= 0) {
        updatedList[index] = { ...updatedList[index], ...updatedObj };
      } else {
        updatedList.push(updatedObj);
      }

      updateTrackedJobs(updatedList);
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setSaveToast(language === 'hi' ? 'क्लिपबोर्ड पर कॉपी किया गया!' : 'Copied to clipboard!');
      setTimeout(() => {
        setCopiedKey(null);
        setSaveToast(null);
      }, 2500);
    }
  };

  const requireAuthOrRedirect = () => {
    if (!currentUser) {
      router.push('/auth');
      return false;
    }
    return true;
  };

  const handleToggleSave = () => {
    if (!requireAuthOrRedirect()) return;
    const nextSaved = !isTrackedSaved;
    setIsTrackedSaved(nextSaved);
    saveToTrackedJobs(nextSaved, isTrackedApplied);
    setSaveToast(nextSaved ? 'Job saved to your Profile!' : 'Removed from saved jobs.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleToggleApplied = () => {
    if (!requireAuthOrRedirect()) return;
    const nextApplied = !isTrackedApplied;
    const today = new Date().toISOString().split('T')[0];
    setIsTrackedApplied(nextApplied);
    if (nextApplied && !appliedDate) {
      setAppliedDate(today);
    }
    saveToTrackedJobs(isTrackedSaved, nextApplied, nextApplied ? (appliedDate || today) : '');
    setSaveToast(nextApplied ? 'Marked as Applied! Added to Exam Locker.' : 'Application status reset.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleCredentialsUpdate = (field: 'appNo' | 'pass' | 'roll' | 'examDate', val: string) => {
    if (field === 'appNo') {
      setApplicationNo(val);
      saveToTrackedJobs(isTrackedSaved, isTrackedApplied, appliedDate, val, password, rollNumber, examDate);
    } else if (field === 'pass') {
      setPassword(val);
      saveToTrackedJobs(isTrackedSaved, isTrackedApplied, appliedDate, applicationNo, val, rollNumber, examDate);
    } else if (field === 'roll') {
      setRollNumber(val);
      saveToTrackedJobs(isTrackedSaved, isTrackedApplied, appliedDate, applicationNo, password, val, examDate);
    } else if (field === 'examDate') {
      setExamDate(val);
      saveToTrackedJobs(isTrackedSaved, isTrackedApplied, appliedDate, applicationNo, password, rollNumber, val);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    if (typeof window !== 'undefined') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Category theme styling
  const categoryConfig: Record<string, {
    bannerBg: string;
    badgeBg: string;
    badgeText: string;
    accentBg: string;
    accentText: string;
    icon: React.ReactNode;
    label: string;
  }> = {
    notice: {
      bannerBg: 'from-blue-600 to-indigo-700',
      badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      badgeText: 'bg-blue-600 text-white',
      accentBg: 'bg-blue-50 dark:bg-blue-950/30',
      accentText: 'text-blue-600 dark:text-blue-400',
      icon: <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      label: 'Recruitment Notification',
    },
    result: {
      bannerBg: 'from-emerald-600 to-teal-700',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      badgeText: 'bg-emerald-600 text-white',
      accentBg: 'bg-emerald-50 dark:bg-emerald-950/30',
      accentText: 'text-emerald-600 dark:text-emerald-400',
      icon: <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      label: 'Exam Result & Selection List',
    },
    admit_card: {
      bannerBg: 'from-amber-600 to-orange-700',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      badgeText: 'bg-amber-600 text-white',
      accentBg: 'bg-amber-50 dark:bg-amber-950/30',
      accentText: 'text-amber-600 dark:text-amber-400',
      icon: <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      label: 'Admit Card / Hall Ticket',
    },
    answer_key: {
      bannerBg: 'from-purple-600 to-violet-700',
      badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      badgeText: 'bg-purple-600 text-white',
      accentBg: 'bg-purple-50 dark:bg-purple-950/30',
      accentText: 'text-purple-600 dark:text-purple-400',
      icon: <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
      label: 'Official Answer Key',
    },
  };

  const config = categoryConfig[notice?.category || 'notice'] || categoryConfig.notice;
  const t = TRANSLATIONS[language];

  if (!isMounted) return null;

  if (!noticeId || noticesList.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-500">Loading recruitment details...</p>
        </div>
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto animate-bounce" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notice Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">The requested recruitment page might have been updated or moved.</p>
          <Link href="/updates" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md">
            <ArrowLeft className="h-4 w-4" /> Return to Advisory Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-sky-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-955 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200 relative pb-20 overflow-x-hidden">

      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[45%] right-0 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* HEADER SECTION (EXACT MATCH WITH NOTIFICATION PAGE) */}
      <header className="h-20 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-sm sticky top-0 z-40 transition-colors duration-200">
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0">
          {/* Back Button BEFORE Logo */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer active:scale-95"
            title={language === 'hi' ? 'वापस' : 'Back'}
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            <span className="hidden xs:inline">{language === 'hi' ? 'वापस' : 'Back'}</span>
          </button>

          {/* Logo - Full Mock Test Hub Logo on All Views */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="bg-[#E6F4FE] dark:bg-slate-800 p-1.5 sm:p-2 rounded-full shadow-sm flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 border border-blue-200/50 dark:border-slate-700 shrink-0">
              <Trophy className="h-4 w-4 sm:h-5.5 sm:w-5.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-extrabold text-xs sm:text-sm leading-tight text-slate-900 dark:text-white tracking-wider truncate">{t.logoTitle}</h1>
              <p className="text-[7.5px] sm:text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase truncate">{t.logoSub}</p>
            </div>
          </Link>

          {/* Navigation Links (Desktop) */}
          {!isMobile && (
            <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-400">
              <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navTestSeries}</Link>
              <Link href="/updates" className="hover:text-blue-600 dark:hover:text-white transition-colors font-black text-blue-600">{t.navUpdates}</Link>
              {currentUser && ['ADMIN', 'TEST_CREATOR', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].includes(currentUser.role) && (
                <Link href="/admin" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t.navAdmin}</Link>
              )}
            </nav>
          )}
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2.5">
          {/* My Profile Button */}
          <Link
            href="/profile"
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer active:scale-95 shadow-2xs"
            title={language === 'hi' ? 'मेरी प्रोफ़ाइल' : 'My Profile'}
          >
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className={isMobile ? 'hidden' : ''}>{language === 'hi' ? 'प्रोफ़ाइल' : 'My Profile'}</span>
          </Link>

          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>

          {/* Theme switcher */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800"
            title={theme === 'light' ? t.themeDark : t.themeLight}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-2.5 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 relative z-10 overflow-x-hidden w-full">

        {/* HERO HEADER CARD (RESULTNOTIFY STYLE TOP CARD) */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 shadow-sm relative overflow-hidden w-full">
          
          {/* Small Share Icon Button on Top Right Corner (Mobile View Only) */}
          <button
            type="button"
            onClick={handleShare}
            className="sm:hidden absolute top-3.5 right-3.5 p-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 shrink-0 active:scale-95 transition cursor-pointer shadow-sm z-20 backdrop-blur-xs"
            title="Share Notice Link"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Share2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            
            <div className="flex items-start gap-3 sm:gap-4 md:gap-6 flex-1 min-w-0">
              {/* Category Icon Badge */}
              <div className="p-3 sm:p-3.5 md:p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 shrink-0 flex items-center justify-center">
                {config.icon}
              </div>

              {/* Content Details */}
              <div className="min-w-0 flex-1 space-y-2.5 sm:space-y-3">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pr-10 sm:pr-0">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border ${config.badgeBg}`}>
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping" />
                    {config.label}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-slate-200 dark:border-slate-700">
                    <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500" />
                    Published: {notice.date}
                  </span>

                  {notice.lastDate && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-wider animate-pulse">
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-500" />
                      Last Date: {notice.lastDate}
                    </span>
                  )}
                </div>

                <h1 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-snug sm:leading-tight tracking-tight break-words">
                  {notice.title}
                </h1>

                {/* Direct Quick Action Pills (Desktop Only) */}
                {notice.url && (
                  <div className="hidden sm:block pt-1">
                    <a
                      href={notice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs tracking-wide px-5 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-105 hover:shadow-lg hover:shadow-blue-600/30 items-center gap-2 active:translate-y-0 active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-yellow-300" /> Direct Apply / Download <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                )}

              </div>
            </div>

            {/* TOP RIGHT ACTION BUTTONS & BOTTOM RIGHT SHARE BUTTON */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 shrink-0 self-stretch lg:self-auto pt-3 lg:pt-0 border-t border-slate-100 dark:border-slate-800/80 lg:border-0">
              
              {/* Actions Row: Save Job & Mark as Applied */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                {/* Save Job Button */}
                <button
                  type="button"
                  onClick={handleToggleSave}
                  className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border text-xs font-medium tracking-wide flex items-center justify-center gap-2 transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-105 hover:shadow-md cursor-pointer active:translate-y-0 active:scale-95 shadow-2xs ${
                    isTrackedSaved
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Bookmark className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isTrackedSaved ? 'fill-white text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{isTrackedSaved ? 'Saved Job ✓' : 'Save Job'}</span>
                </button>

                {/* Mark as Applied Button */}
                <button
                  type="button"
                  onClick={handleToggleApplied}
                  className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border text-xs font-medium tracking-wide flex items-center justify-center gap-2 transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-105 hover:shadow-md cursor-pointer active:translate-y-0 active:scale-95 shadow-2xs ${
                    isTrackedApplied
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isTrackedApplied ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{isTrackedApplied ? 'Marked Applied ✓' : 'Mark as Applied'}</span>
                </button>
              </div>

              {/* Share Announcement Link Button (Desktop View Only) */}
              <div className="hidden sm:flex pt-1 sm:pt-0 sm:mt-auto justify-end w-full">
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium tracking-wide transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-105 hover:shadow-md flex items-center justify-center gap-2 cursor-pointer active:translate-y-0 active:scale-95 shadow-2xs"
                  title="Share Notice Link"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Share2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                  <span>{copied ? 'Link Copied!' : (language === 'hi' ? 'शेयर करें' : 'Share Announcement')}</span>
                </button>
              </div>

              {/* Direct Apply / Download Button at the Very Bottom (Mobile View Only) */}
              {notice.url && (
                <div className="sm:hidden pt-1 w-full">
                  <a
                    href={notice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs tracking-wide px-4 py-3 rounded-2xl shadow-md shadow-blue-600/20 transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-105 hover:shadow-lg hover:shadow-blue-600/30 flex items-center justify-center gap-2 active:translate-y-0 active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-yellow-300" /> Direct Apply / Download <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              )}

            </div>

          </div>

          {/* APPLIED EXAM CREDENTIALS & DOCUMENT LOCKER VAULT CARD */}
          {isTrackedApplied && (
            <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3 bg-purple-50/50 dark:bg-purple-950/20 p-4 sm:p-5 rounded-2xl border border-purple-200/80 dark:border-purple-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                      {language === 'hi' ? 'परीक्षा क्रेडेंशियल्स और गूगल ड्राइव लॉकर' : 'Exam Credentials & Google Drive Locker'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'hi'
                        ? 'अपने आवेदन फॉर्म, पासवर्ड और रोल नंबर को सुरक्षित रखें और Google Drive में ऑटो-सिंक करें।'
                        : 'Save credentials and sync Admit Card / Application Form directly to your Google Drive.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/locker?exam=${encodeURIComponent(notice.title)}`}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium tracking-wide transition-all duration-300 transform-gpu hover:-translate-y-0.5 hover:scale-105 hover:shadow-md hover:shadow-purple-600/20 flex items-center gap-1.5 shadow-sm shadow-purple-600/20 active:translate-y-0 active:scale-95"
                  >
                    <FolderLock className="w-3.5 h-3.5" />
                    <span>Open in Locker</span>
                  </Link>

                  <Link
                    href={`/locker?exam=${encodeURIComponent(notice.title)}&action=upload`}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 text-xs font-medium tracking-wide transition-all duration-300 transform-gpu hover:-translate-y-0.5 hover:scale-105 hover:shadow-md flex items-center gap-1.5 active:translate-y-0 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload to Drive</span>
                  </Link>
                </div>
              </div>

              {/* Quick Input Fields for Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1 text-xs">
                {/* Registration / Application ID */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Registration No / App ID
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="e.g. 2501009845"
                      value={applicationNo}
                      onChange={(e) => handleCredentialsUpdate('appNo', e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white pr-7"
                    />
                    {applicationNo && (
                      <button
                        onClick={() => copyToClipboard(applicationNo, 'appNo')}
                        className="absolute right-2 text-slate-400 hover:text-purple-600 p-0.5 cursor-pointer"
                        title="Copy Registration Number"
                      >
                        {copiedKey === 'appNo' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Portal Password / DOB */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Password / DOB
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="e.g. Pass@123"
                      value={password}
                      onChange={(e) => handleCredentialsUpdate('pass', e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white pr-12"
                    />
                    <div className="absolute right-2 flex items-center gap-1 text-slate-400">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="hover:text-purple-600 p-0.5 cursor-pointer"
                        title={showPassword ? 'Hide Password' : 'Show Password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      {password && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(password, 'pass')}
                          className="hover:text-purple-600 p-0.5 cursor-pointer"
                          title="Copy Password"
                        >
                          {copiedKey === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Roll Number */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Roll Number (After Admit Card)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="e.g. 2201019940"
                      value={rollNumber}
                      onChange={(e) => handleCredentialsUpdate('roll', e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white pr-7"
                    />
                    {rollNumber && (
                      <button
                        onClick={() => copyToClipboard(rollNumber, 'roll')}
                        className="absolute right-2 text-slate-400 hover:text-purple-600 p-0.5 cursor-pointer"
                        title="Copy Roll Number"
                      >
                        {copiedKey === 'roll' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Exam Date */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Exam Date
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => handleCredentialsUpdate('examDate', e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

        </section>

        {/* TWO-COLUMN LAYOUT (LEFT CONTENT + RIGHT SIDEBAR DOCK) */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] w-full">

          {/* LEFT MAIN CONTENT COLUMN */}
          <div className="space-y-4 sm:space-y-6 w-full min-w-0">

            {/* QUICK ACCESS NAVIGATION BAR (RESULTNOTIFY PILL NAV WITH HORIZONTAL SCROLL) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-2 sm:p-2.5 rounded-2xl shadow-sm overflow-x-auto no-scrollbar flex items-center gap-2 sticky top-16 sm:top-20 z-30 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 whitespace-nowrap scroll-smooth touch-pan-x w-full">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider px-2 sm:px-3 py-1 shrink-0 flex items-center gap-1">
                <Compass className="h-3.5 w-3.5 text-blue-500" /> Quick Access:
              </span>

              <button
                onClick={() => scrollToSection('sec-overview')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-medium tracking-wide transition shrink-0 cursor-pointer ${
                  activeSection === 'overview'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Overview
              </button>

              <button
                onClick={() => scrollToSection('sec-links')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-medium tracking-wide transition shrink-0 cursor-pointer ${
                  activeSection === 'links'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Important Links ({parsedLinks.length})
              </button>

              <button
                onClick={() => scrollToSection('sec-full-content')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-medium tracking-wide transition shrink-0 cursor-pointer ${
                  activeSection === 'full-content'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Complete Breakdown
              </button>
            </div>

            {/* 1. OVERVIEW & QUICK METRICS CARD */}
            <div id="sec-overview" className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-sm space-y-3.5 sm:space-y-5 overflow-hidden w-full">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4 gap-2 flex-wrap sm:flex-nowrap min-w-0">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">
                    <Building2 className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate">Recruitment Overview</h2>
                    <p className="text-[9.5px] sm:text-[11px] text-slate-400 font-medium truncate">Key summary metrics at a glance</p>
                  </div>
                </div>

                <span className="text-[8.5px] sm:text-[10px] bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300 font-bold px-2 sm:px-3 py-1 rounded-full uppercase border border-green-200 dark:border-green-800 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="h-3 w-3" /> Official Verified
                </span>
              </div>

              {/* 4 Metrics Cards Grid with 3D Hover */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
                <div className="bg-slate-50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 space-y-0.5 min-w-0 flex flex-col justify-center transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md shadow-2xs cursor-default">
                  <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Notice Category</span>
                  <p className="text-[10.5px] sm:text-xs font-semibold text-slate-800 dark:text-slate-100 uppercase truncate">{notice.category?.replace('_', ' ')}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 space-y-0.5 min-w-0 flex flex-col justify-center transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md shadow-2xs cursor-default">
                  <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Publish Date</span>
                  <p className="text-[10.5px] sm:text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{notice.date}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700 space-y-0.5 min-w-0 flex flex-col justify-center transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md shadow-2xs cursor-default">
                  <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Application Deadline</span>
                  <p className="text-[10.5px] sm:text-xs font-semibold text-rose-600 dark:text-rose-400 truncate">{notice.lastDate || 'See Notification'}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 space-y-0.5 min-w-0 flex flex-col justify-center transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md shadow-2xs cursor-default">
                  <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Portal Status</span>
                  <p className="text-[10.5px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate">Active Window</p>
                </div>
              </div>
            </div>

            {/* 2. PARSED SOME USEFUL IMPORTANT LINKS CARD (ROJGARRESULT LIST FORMAT) */}
            <div id="sec-links" className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 shadow-sm space-y-4 sm:space-y-5 overflow-hidden w-full">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4 gap-2 flex-wrap sm:flex-nowrap min-w-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">
                    <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xs sm:text-base font-bold tracking-wide text-slate-900 dark:text-white uppercase truncate">Some Useful Important Links</h2>
                    <p className="text-[9.5px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">Direct portal links arranged in official sequence</p>
                  </div>
                </div>
                <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[9px] sm:text-[10px] font-bold px-2.5 sm:px-3 py-1 rounded-full uppercase border border-blue-200 dark:border-blue-800 hidden sm:inline-block shrink-0">
                  {parsedLinks.length > 0 ? `${parsedLinks.length} Direct Links` : 'Official Links'}
                </span>
              </div>

              {/* Vertical Stack List Format with 3D Hover */}
              {parsedLinks.length > 0 ? (
                <div className="flex flex-col gap-3 sm:gap-3.5 w-full p-1.5 -m-1.5">
                  {parsedLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group bg-slate-50 dark:bg-slate-955 hover:bg-white dark:hover:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 transform-gpu hover:-translate-y-1.5 hover:scale-[1.012] hover:shadow-[0_12px_24px_-6px_rgba(59,130,246,0.16),0_4px_12px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_12px_24px_-6px_rgba(59,130,246,0.3),0_0_16px_rgba(59,130,246,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs active:translate-y-0 active:scale-[0.99] cursor-pointer w-full min-w-0 relative z-0 hover:z-10"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition shrink-0 ${
                          link.iconType === 'apply' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white' :
                          link.iconType === 'download' ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 group-hover:bg-blue-600 group-hover:text-white' :
                          link.iconType === 'official' ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white' :
                          link.iconType === 'video' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 group-hover:bg-rose-600 group-hover:text-white' :
                          link.iconType === 'channel' ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 group-hover:bg-teal-600 group-hover:text-white' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-blue-600 group-hover:text-white'
                        }`}>
                          {link.iconType === 'apply' && <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />}
                          {link.iconType === 'download' && <Download className="h-4 w-4 sm:h-5 sm:w-5" />}
                          {link.iconType === 'official' && <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />}
                          {link.iconType === 'video' && <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />}
                          {link.iconType === 'channel' && <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />}
                          {link.iconType === 'general' && <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug break-words">
                            {link.label}
                          </h4>
                          <p className="text-[9px] sm:text-[10.5px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider mt-0.5 truncate">
                            {link.iconType === 'apply' ? 'Click to open application portal' :
                             link.iconType === 'download' ? 'Direct PDF document link' :
                             link.iconType === 'official' ? 'Official organization portal' :
                             link.iconType === 'video' ? 'Watch video tutorial' :
                             link.iconType === 'channel' ? 'Join updates group' :
                             'Click to open link'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end shrink-0">
                        <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-medium tracking-wide transition flex items-center gap-1.5 shadow-xs ${
                          link.iconType === 'apply' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' :
                          link.iconType === 'download' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20' :
                          link.iconType === 'official' ? 'bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white' :
                          link.iconType === 'video' ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20' :
                          link.iconType === 'channel' ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20' :
                          'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}>
                          {link.iconType === 'apply' ? 'Click Here' :
                           link.iconType === 'download' ? 'Download' :
                           link.iconType === 'official' ? 'Visit Site' :
                           link.iconType === 'video' ? 'Watch Video' :
                           link.iconType === 'channel' ? 'Join Channel' :
                           'Click Here'}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
                  {notice.url && (
                    <a
                      href={notice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md cursor-pointer w-full"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="p-2.5 sm:p-3 rounded-xl bg-white/20 text-white shrink-0">
                          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-black leading-snug">Apply Online / Official Portal</h4>
                          <p className="text-[9px] sm:text-[10.5px] text-blue-100 font-bold uppercase tracking-wider block mt-0.5">Click to Open Portal</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end shrink-0">
                        <span className="bg-white text-blue-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-medium tracking-wide uppercase shrink-0 flex items-center gap-1.5 shadow-xs">
                          Apply Now <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </a>
                  )}

                  {notice.rawUrl && (
                    <a
                      href={notice.rawUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer w-full"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0">
                          <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug">Official Notification Source & Circular</h4>
                          <p className="text-[9px] sm:text-[10.5px] text-slate-400 font-medium tracking-wide uppercase block mt-0.5">View Source Circular PDF</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end shrink-0">
                        <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-medium tracking-wide uppercase shrink-0 flex items-center gap-1.5">
                          View <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* 3. COMPLETE RECRUITMENT DETAILS (BODY HTML RENDER) */}
            <div id="sec-full-content" className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 w-full">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">Complete Recruitment Breakdown</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Important dates, application fee, age limit, vacancies & eligibility details</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold px-3 py-1 rounded-full uppercase">
                  Official Details
                </span>
              </div>

              {sanitizedContent ? (
                <div
                  className="notice-custom-body"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
              ) : (
                <div className="py-16 text-center space-y-4">
                  <AlertCircle className="h-10 w-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Full recruitment breakdown is being updated. Click below to open official portal directly.
                  </p>
                  {notice.url && (
                    <a
                      href={notice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl text-xs tracking-wide shadow-lg shadow-blue-600/25"
                    >
                      Open Official Link <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDEBAR DOCK (RESULTNOTIFY SIDEBAR STYLE - HIDDEN ON MOBILE VIEW ONLY) */}
          <aside className="space-y-6 hidden md:block">

            {/* STICKY QUICK ACTION CARD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5 sticky top-24">
              
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Quick Actions</h3>
              </div>

              <div className="space-y-3">
                {notice.url && (
                  <a
                    href={notice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-xs tracking-wide py-3.5 px-4 rounded-2xl shadow-lg shadow-blue-600/25 transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-600/35 flex items-center justify-center gap-2 active:translate-y-0 active:scale-98 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" /> Apply / Download Now <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
              </div>

              {/* APPLICATION CHECKLIST */}
              <div className="bg-slate-50 dark:bg-slate-955 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4 text-blue-500" /> Candidate Checklist:
                </span>
                
                <ul className="text-xs space-y-2 font-bold text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Check eligibility criteria before applying</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Verify age limit as on cut-off date</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Keep scanned photo & signature ready</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Submit form before deadline: <strong>{notice.lastDate || 'As per notice'}</strong></span>
                  </li>
                </ul>
              </div>

              {/* SHARE NOTICE CARD */}
              <div className="pt-2">
                <button
                  onClick={handleShare}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs tracking-wide py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
                  <span>{copied ? 'Link Copied to Clipboard!' : 'Share Announcement Link'}</span>
                </button>
              </div>

            </div>

            {/* SAVE & TRACK SECTION (RESULTNOTIFY SIDEBAR FEATURE) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              
              {/* Toast Feedback */}
              {saveToast && (
                <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold p-3 rounded-2xl animate-in fade-in flex items-center justify-between shadow-xs">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    {saveToast}
                  </span>
                  <Link href="/profile" className="text-[10px] underline font-black uppercase">
                    View Profile
                  </Link>
                </div>
              )}

              {/* Card Header */}
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                  <BookmarkCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Save & Track</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Track your application progress</p>
                </div>
              </div>

              {/* Actions List with 3D Hover */}
              <div className="space-y-2.5">
                
                {/* 1. Bookmark / Save Job Toggle */}
                <button
                  onClick={handleToggleSave}
                  className={`w-full py-3 px-4 rounded-2xl border text-xs font-medium tracking-wide flex items-center justify-between transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-[1.015] hover:shadow-md cursor-pointer active:translate-y-0 active:scale-98 ${
                    isTrackedSaved
                      ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-2xs'
                      : 'bg-slate-50 hover:bg-white dark:bg-slate-955 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bookmark className={`h-4 w-4 ${isTrackedSaved ? 'fill-blue-600 text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                    <span>{isTrackedSaved ? 'Job Saved to Profile' : 'Save Job'}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* 2. Mark as Applied Toggle */}
                <button
                  onClick={handleToggleApplied}
                  className={`w-full py-3 px-4 rounded-2xl border text-xs font-medium tracking-wide flex items-center justify-between transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-[1.015] hover:shadow-md cursor-pointer active:translate-y-0 active:scale-98 ${
                    isTrackedApplied
                      ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                      : 'bg-slate-50 hover:bg-white dark:bg-slate-955 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className={`h-4 w-4 ${isTrackedApplied ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    <span>{isTrackedApplied ? 'Marked as Applied ✓' : 'Mark as Applied'}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* Expandable Application Details when Marked as Applied */}
                {isTrackedApplied && (
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px] font-medium tracking-wide text-emerald-800 dark:text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Applied Date: {appliedDate || new Date().toISOString().split('T')[0]}
                      </span>
                      <span className="bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase">Active</span>
                    </div>
                    
                    <div>
                      <label className="block text-[9.5px] font-medium tracking-wide text-emerald-800 dark:text-emerald-400 uppercase mb-1">
                        Registration / Roll No. (Optional)
                      </label>
                      <input
                        type="text"
                        value={applicationNo}
                        onChange={(e) => handleCredentialsUpdate('appNo', e.target.value)}
                        placeholder="e.g. REG-2026-88492"
                        className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400 font-medium tracking-wide"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Track Updates & Reminders Button */}
                <button
                  onClick={() => {
                    setSaveToast('Reminders synced to your profile!');
                    setTimeout(() => setSaveToast(null), 3000);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-50 hover:bg-white dark:bg-slate-955 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium tracking-wide flex items-center justify-between transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-[1.015] hover:shadow-md cursor-pointer active:translate-y-0 active:scale-98"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="h-4 w-4 text-slate-400" />
                    <span>Track Updates & Reminders</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* 4. View My Saved & Applied Jobs Button */}
                <Link
                  href="/profile"
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-medium tracking-wide flex items-center justify-between transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-600/30 cursor-pointer active:translate-y-0 active:scale-98 shadow-md shadow-blue-600/20"
                >
                  <div className="flex items-center gap-2.5">
                    <BookmarkCheck className="h-4 w-4 text-yellow-300" />
                    <span>View My Saved & Applied Jobs</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Helper Footer Banner */}
              {!currentUser ? (
                <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 font-semibold space-y-2.5">
                  <p className="leading-snug">
                    Please log in to mark jobs as applied, save notifications, and track your application deadlines in your profile.
                  </p>
                  <Link
                    href="/auth"
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-blue-600/20 active:scale-98"
                  >
                    <User className="h-4 w-4" />
                    <span>Log In to Save & Track</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 font-semibold space-y-2">
                  <p className="leading-snug">
                    Saved & applied jobs are automatically synced and tracked in your Profile for future reference.
                  </p>
                  <Link href="/profile" className="inline-flex items-center gap-1.5 font-extrabold text-amber-900 dark:text-amber-200 hover:underline">
                    View My Saved & Applied Jobs <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}

            </div>

          </aside>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-8 px-4 text-center text-xs text-slate-500 font-bold transition-colors duration-200 mt-16">
        <p>© 2026 MockTest Hub. All rights reserved.</p>
      </footer>
    </div>
  );
}
