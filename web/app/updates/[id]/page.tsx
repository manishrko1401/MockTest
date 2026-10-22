"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
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
import { SiteHeader, SiteFooter, SectionCard, Field, StatusBadge, btnPrimary, btnSecondary, linkCls, pageBg, container } from '../../components/SiteUI';
import { NoticeDetailTour } from '../../components/NoticesTour';

import { processQuestionHtml } from '../../lib/mathUtils';
import { sanitizeDomHtml } from '../../lib/domSanitize';

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

    // 1. REJECT INSTRUCTIONAL PARAGRAPH BLOCKS (LONG HOW-TO INSTRUCTION PARAGRAPHS)
    if (
      cleanLabel.length > 160 ||
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
        const isGenericAnchor = /^(?:click\s*here|link|download|open|server\s*[-–—]?[i|1|2|3|4]*|watch\s*video)$/i.test(anchorText);

        if (firstColText && !isGenericAnchor && anchorText && firstColText.toLowerCase() !== anchorText.toLowerCase()) {
          label = `${firstColText} (${anchorText})`;
        } else if (firstColText) {
          label = firstColText;
        } else {
          label = anchorText || 'Click Here';
        }

        if (/notification|pdf|advt|circular|advertisement/i.test(label) || /notification|pdf/i.test(url)) {
          if (!/official notification/i.test(label) && label.length < 50) {
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

  // 3. Sort links in exact RojgarResult standard priority order (Apply Online -> Notification PDF -> Syllabus -> Channels -> Official Website)
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

  // 6. KEEP video, PDF, and community channel links inside the table!
  // Only remove purely empty promotion rows with no anchor link
  clean = clean.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Join\s*Free\s*Information)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, (m) => {
    if (/<a\s+[^>]*href=/i.test(m)) return m;
    return '';
  });

  // 6b. REMOVE BRANDING TEXT, STANDALONE URLS & UNWANTED "www..com" / ".Com" / "Rojgar Result" ROWS (preserving rows with actionable links)
  clean = clean.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:www\s*\.\s*\.\s*com|\.Com|rojgarresult\.com|Rojgar\s*Result®?)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, (match) => {
    if (/<a\s+[^>]*href=["'](?!https?:\/\/(?:www\.)?rojgarresult\.com\/?(?:$|[?#]))[^"']+["']/i.test(match)) {
      return match;
    }
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

  // last step: nothing active survives the reshaping above
  return sanitizeDomHtml(clean.trim());
}

export default function NoticeDetailPage({ params }: NoticeDetailPageProps) {
  const { currentUser, updateTrackedJobs, noticesList, theme, toggleTheme, language, setLanguage } = useAuth();
  const router = useRouter();
  const { isMobile, isMounted } = useIsMobile();
  const routeParams = useParams();
  const routeId = typeof routeParams?.id === 'string' ? routeParams.id : (Array.isArray(routeParams?.id) ? routeParams.id[0] : null);
  const [noticeId, setNoticeId] = React.useState<string | null>(routeId);
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
    if (routeId) {
      setNoticeId(routeId);
    } else if (params) {
      Promise.resolve(params).then(p => {
        if (p?.id) setNoticeId(p.id);
      }).catch(() => {});
    }
  }, [routeId, params]);

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
      const list = currentUser.trackedJobs || [];
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

  const isHindi = language === 'hi';
  const categoryLabel: Record<string, string> = {
    notice: isHindi ? 'भर्ती सूचना' : 'Recruitment Notice',
    result: isHindi ? 'परिणाम' : 'Result',
    admit_card: isHindi ? 'प्रवेश पत्र' : 'Admit Card',
    answer_key: isHindi ? 'उत्तर कुंजी' : 'Answer Key',
  };

  if (!noticeId || (!notice && (noticeLoading || noticesList.length === 0))) {
    return (
      <div className={`min-h-screen flex flex-col ${pageBg}`}>
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#1e4e79] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500">{isHindi ? 'विवरण लोड हो रहा है…' : 'Loading notice details…'}</p>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!notice) {
    return (
      <div className={`min-h-screen flex flex-col ${pageBg}`}>
        <SiteHeader />
        <div className={`${container} w-full flex-1 py-16`}>
          <SectionCard className="max-w-lg mx-auto">
            <div className="text-center py-6 space-y-3">
              <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{isHindi ? 'सूचना नहीं मिली' : 'Notice not found'}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{isHindi ? 'यह सूचना हटाई या स्थानांतरित की जा सकती है।' : 'The requested notice may have been updated or moved.'}</p>
              <Link href="/updates" className={btnPrimary}>
                <ArrowLeft className="h-4 w-4" /> {isHindi ? 'सभी सूचनाएं' : 'Back to notices'}
              </Link>
            </div>
          </SectionCard>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const linkMeta = (type: ParsedActionLink['iconType']) => {
    switch (type) {
      case 'apply': return { icon: ExternalLink, hint: 'Application portal', cta: 'Apply' };
      case 'download': return { icon: Download, hint: 'PDF document', cta: 'Download' };
      case 'official': return { icon: Building2, hint: 'Official website', cta: 'Visit site' };
      case 'video': return { icon: BookOpen, hint: 'Video guide', cta: 'Watch' };
      case 'channel': return { icon: Share2, hint: 'Updates channel', cta: 'Join' };
      default: return { icon: ExternalLink, hint: 'External link', cta: 'Open' };
    }
  };

  const sectionTabs = [
    { id: 'sec-overview', label: isHindi ? 'अवलोकन' : 'Overview' },
    { id: 'sec-links', label: `${isHindi ? 'महत्वपूर्ण लिंक' : 'Important links'} (${parsedLinks.length})` },
    { id: 'sec-full-content', label: isHindi ? 'पूर्ण विवरण' : 'Full details' },
  ];
  const isActiveTab = (id: string) => activeSection === id || `sec-${activeSection}` === id;

  const credInput = 'w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:border-[#1e4e79] focus:ring-2 focus:ring-[#1e4e79]/15';
  const iconBtn = 'p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer';

  return (
    <div className={`min-h-screen flex flex-col ${pageBg} font-sans`}>
      <SiteHeader />

      {/* Title band */}
      <div className="bg-transparent">
        <div className={`${container} pt-6 pb-5`}>
          <nav className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-800 dark:hover:text-slate-200">{isHindi ? 'होम' : 'Home'}</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/updates" className="hover:text-slate-800 dark:hover:text-slate-200">{isHindi ? 'सूचनाएं' : 'Notices'}</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/updates?category=${notice.category || 'notice'}`} className="hover:text-slate-800 dark:hover:text-slate-200">{categoryLabel[notice.category || 'notice'] || config.label}</Link>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <StatusBadge tone="blue">{categoryLabel[notice.category || 'notice'] || config.label}</StatusBadge>
                {notice.type && <StatusBadge tone="slate">{notice.type}</StatusBadge>}
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white leading-snug break-words">{notice.title}</h1>
              <div className="mt-2 flex items-center gap-x-4 gap-y-1 flex-wrap text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{isHindi ? 'प्रकाशित' : 'Published'}: {notice.date}</span>
                {notice.category === 'notice' && notice.lastDate && (
                  <span className="inline-flex items-center gap-1.5 text-[#b02a37] dark:text-red-400 font-medium"><Clock className="h-4 w-4" />{isHindi ? 'अंतिम तिथि' : 'Last date'}: {notice.lastDate}</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {notice.url && (
                <a href={notice.url} target="_blank" rel="noopener noreferrer" className={btnPrimary} data-tour="notice-apply">
                  {isHindi ? 'आवेदन / डाउनलोड' : 'Apply / Download'} <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
              <button type="button" onClick={handleToggleSave} data-tour="notice-save" className={`${btnSecondary} ${isTrackedSaved ? '!border-[#1e4e79] !text-[#1e4e79] dark:!text-blue-300 dark:!border-blue-400' : ''}`}>
                {isTrackedSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {isTrackedSaved ? (isHindi ? 'सहेजा गया' : 'Saved') : (isHindi ? 'सहेजें' : 'Save')}
              </button>
              <button type="button" onClick={handleToggleApplied} data-tour="notice-applied" className={`${btnSecondary} ${isTrackedApplied ? '!border-[#1e7e34] !text-[#1e7e34] dark:!text-green-400 dark:!border-green-500' : ''}`}>
                <CheckCircle2 className="h-4 w-4" />
                {isTrackedApplied ? (isHindi ? 'आवेदन किया' : 'Applied') : (isHindi ? 'आवेदन किया चिह्नित करें' : 'Mark as applied')}
              </button>
              <button type="button" onClick={handleShare} className={btnSecondary} title="Share" data-tour="notice-share">
                {copied ? <Check className="h-4 w-4 text-[#1e7e34]" /> : <Share2 className="h-4 w-4" />}
                <span className="hidden sm:inline">{copied ? (isHindi ? 'कॉपी हुआ' : 'Copied') : (isHindi ? 'शेयर' : 'Share')}</span>
              </button>
            </div>
          </div>

          {saveToast && (
            <div className="mt-4 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 border-l-4 border-l-[#1e7e34] rounded-md px-4 py-2.5 text-sm">
              <span className="text-slate-700 dark:text-slate-200">{saveToast}</span>
              <Link href="/profile" className={`${linkCls} text-sm font-medium`}>{isHindi ? 'प्रोफाइल देखें' : 'View in profile'}</Link>
            </div>
          )}
        </div>

        {/* In-page navigation */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <div className={`${container} flex gap-6 overflow-x-auto no-scrollbar`}>
            {sectionTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => scrollToSection(tab.id)}
                className={`py-3 text-sm whitespace-nowrap border-b-2 -mb-px cursor-pointer transition-colors ${
                  isActiveTab(tab.id)
                    ? 'border-[#1e4e79] text-[#1e4e79] dark:border-blue-400 dark:text-blue-300 font-medium'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className={`${container} w-full py-6 pb-12 flex-1`}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6 min-w-0">

            {/* Application credentials (shown once marked applied) */}
            {isTrackedApplied && (
              <SectionCard
                title={<span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#1e4e79] dark:text-blue-400" />{isHindi ? 'आवेदन क्रेडेंशियल्स' : 'Application credentials'}</span>}
                description={isHindi ? 'अपना पंजीकरण नंबर, पासवर्ड और रोल नंबर सुरक्षित रखें।' : 'Keep your registration number, password and roll number for this exam.'}
                action={
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/locker?exam=${encodeURIComponent(notice.title)}`} className={btnSecondary}>
                      <FolderLock className="h-4 w-4" /> {isHindi ? 'लॉकर खोलें' : 'Open locker'}
                    </Link>
                    <Link href={`/locker?exam=${encodeURIComponent(notice.title)}&action=upload`} className={btnSecondary}>
                      <Plus className="h-4 w-4" /> {isHindi ? 'अपलोड' : 'Upload'}
                    </Link>
                  </div>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Field label={isHindi ? 'पंजीकरण / आवेदन संख्या' : 'Registration / App ID'}>
                    <div className="relative">
                      <input type="text" placeholder="e.g. 2501009845" value={applicationNo} onChange={(e) => handleCredentialsUpdate('appNo', e.target.value)} className={`${credInput} pr-8`} />
                      {applicationNo && (
                        <button type="button" onClick={() => copyToClipboard(applicationNo, 'appNo')} className={`${iconBtn} absolute right-1.5 top-1/2 -translate-y-1/2`} title="Copy">
                          {copiedKey === 'appNo' ? <Check className="w-3.5 h-3.5 text-[#1e7e34]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </Field>
                  <Field label={isHindi ? 'पासवर्ड / जन्मतिथि' : 'Password / DOB'}>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} placeholder="e.g. Pass@123" value={password} onChange={(e) => handleCredentialsUpdate('pass', e.target.value)} className={`${credInput} pr-14`} />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className={iconBtn} title={showPassword ? 'Hide' : 'Show'}>
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        {password && (
                          <button type="button" onClick={() => copyToClipboard(password, 'pass')} className={iconBtn} title="Copy">
                            {copiedKey === 'pass' ? <Check className="w-3.5 h-3.5 text-[#1e7e34]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </Field>
                  <Field label={isHindi ? 'रोल नंबर' : 'Roll number'}>
                    <div className="relative">
                      <input type="text" placeholder="e.g. 2201019940" value={rollNumber} onChange={(e) => handleCredentialsUpdate('roll', e.target.value)} className={`${credInput} pr-8`} />
                      {rollNumber && (
                        <button type="button" onClick={() => copyToClipboard(rollNumber, 'roll')} className={`${iconBtn} absolute right-1.5 top-1/2 -translate-y-1/2`} title="Copy">
                          {copiedKey === 'roll' ? <Check className="w-3.5 h-3.5 text-[#1e7e34]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </Field>
                  <Field label={isHindi ? 'परीक्षा तिथि' : 'Exam date'}>
                    <input type="date" value={examDate} onChange={(e) => handleCredentialsUpdate('examDate', e.target.value)} className={`${credInput} font-sans`} />
                  </Field>
                </div>
              </SectionCard>
            )}

            {/* Overview */}
            <div id="sec-overview" className="scroll-mt-20">
              <SectionCard title={isHindi ? 'अवलोकन' : 'Overview'} bodyClass="p-0">
                <dl className={`grid ${notice.category === 'notice' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'} divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800`}>
                  <div className="px-5 py-4">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">{isHindi ? 'श्रेणी' : 'Category'}</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{categoryLabel[notice.category || 'notice'] || config.label}</dd>
                  </div>
                  <div className="px-5 py-4">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">{isHindi ? 'प्रकाशन तिथि' : 'Published on'}</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{notice.date}</dd>
                  </div>
                  {notice.category === 'notice' && (
                    <div className="px-5 py-4">
                      <dt className="text-xs text-slate-500 dark:text-slate-400">{isHindi ? 'आवेदन की अंतिम तिथि' : 'Application deadline'}</dt>
                      <dd className="mt-1 text-sm font-medium text-[#b02a37] dark:text-red-400">{notice.lastDate || (isHindi ? 'सूचना देखें' : 'See notification')}</dd>
                    </div>
                  )}
                  <div className="px-5 py-4">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">{isHindi ? 'स्थिति' : 'Status'}</dt>
                    <dd className="mt-1"><StatusBadge tone="green">{isHindi ? 'सक्रिय' : 'Active'}</StatusBadge></dd>
                  </div>
                </dl>
              </SectionCard>
            </div>

            {/* Important links */}
            <div id="sec-links" className="scroll-mt-20">
              <SectionCard
                title={isHindi ? 'महत्वपूर्ण लिंक' : 'Important links'}
                description={isHindi ? 'आधिकारिक क्रम में सीधे पोर्टल लिंक' : 'Direct links in the official order.'}
                bodyClass="p-0"
              >
                {parsedLinks.length > 0 ? (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedLinks.map((link, i) => {
                      const m = linkMeta(link.iconType);
                      return (
                        <li key={i}>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <m.icon className="h-4 w-4 text-slate-400 group-hover:text-[#1e4e79] dark:group-hover:text-blue-400 shrink-0" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm text-slate-800 dark:text-slate-200 group-hover:text-[#1e4e79] dark:group-hover:text-blue-300 group-hover:underline underline-offset-2 break-words">{link.label}</span>
                              <span className="block text-xs text-slate-500 dark:text-slate-400">{m.hint}</span>
                            </span>
                            <span className={`${linkCls} text-sm font-medium inline-flex items-center gap-1 shrink-0`}>{m.cta}<ArrowUpRight className="h-3.5 w-3.5" /></span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                ) : notice.url ? (
                  <a href={notice.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="flex-1 text-sm text-slate-800 dark:text-slate-200 group-hover:underline">{isHindi ? 'ऑनलाइन आवेदन / आधिकारिक पोर्टल' : 'Apply online / Official portal'}</span>
                    <span className={`${linkCls} text-sm font-medium inline-flex items-center gap-1`}>{isHindi ? 'खोलें' : 'Open'}<ArrowUpRight className="h-3.5 w-3.5" /></span>
                  </a>
                ) : (
                  <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">{isHindi ? 'कोई लिंक उपलब्ध नहीं।' : 'No links available yet.'}</p>
                )}
              </SectionCard>
            </div>

            {/* Full content */}
            <div id="sec-full-content" className="scroll-mt-20">
              <SectionCard
                title={isHindi ? 'पूर्ण विवरण' : 'Full details'}
                description={isHindi ? 'महत्वपूर्ण तिथियां, शुल्क, आयु सीमा, रिक्तियां और पात्रता' : 'Important dates, application fee, age limit, vacancies and eligibility.'}
              >
                {sanitizedContent ? (
                  <div className="notice-custom-body" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
                ) : (
                  <div className="py-10 text-center space-y-3">
                    <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {isHindi ? 'पूर्ण विवरण अपडेट किया जा रहा है। आधिकारिक पोर्टल देखें।' : 'Full details are being updated. Please refer to the official portal.'}
                    </p>
                    {notice.url && (
                      <a href={notice.url} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                        {isHindi ? 'आधिकारिक लिंक खोलें' : 'Open official link'} <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 min-w-0">
            <SectionCard title={isHindi ? 'आवेदक चेकलिस्ट' : 'Candidate checklist'}>
              <ul className="text-sm space-y-2.5 text-slate-600 dark:text-slate-300">
                {[
                  isHindi ? 'आवेदन से पहले पात्रता मानदंड जांचें' : 'Check the eligibility criteria before applying',
                  isHindi ? 'कट-ऑफ तिथि के अनुसार आयु सीमा सत्यापित करें' : 'Verify the age limit as on the cut-off date',
                  isHindi ? 'स्कैन की गई फोटो और हस्ताक्षर तैयार रखें' : 'Keep your scanned photo and signature ready',
                  ...(notice.category === 'notice'
                    ? [`${isHindi ? 'अंतिम तिथि से पहले फॉर्म जमा करें' : 'Submit the form before'}: ${notice.lastDate || (isHindi ? 'सूचना अनुसार' : 'the notified date')}`]
                    : []),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-[#1e7e34] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <div data-tour="notice-track">
            <SectionCard
              title={isHindi ? 'सहेजें और ट्रैक करें' : 'Save & track'}
              description={isHindi ? 'अपने आवेदन की प्रगति ट्रैक करें' : 'Keep track of this application in your profile.'}
              bodyClass="p-0"
              footer={
                <Link href="/profile" className={`${linkCls} text-sm font-medium inline-flex items-center gap-1`}>
                  {isHindi ? 'मेरी सहेजी गई नौकरियां' : 'My saved & applied jobs'} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <button type="button" onClick={handleToggleSave} className="w-full flex items-center justify-between gap-3 px-5 py-3 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                    {isTrackedSaved ? <BookmarkCheck className="h-4 w-4 text-[#1e4e79] dark:text-blue-400" /> : <Bookmark className="h-4 w-4 text-slate-400" />}
                    {isTrackedSaved ? (isHindi ? 'प्रोफाइल में सहेजा गया' : 'Saved to profile') : (isHindi ? 'नौकरी सहेजें' : 'Save this job')}
                  </span>
                  {isTrackedSaved ? <StatusBadge tone="blue">{isHindi ? 'सहेजा' : 'Saved'}</StatusBadge> : <ChevronRight className="h-4 w-4 text-slate-300" />}
                </button>
                <button type="button" onClick={handleToggleApplied} className="w-full flex items-center justify-between gap-3 px-5 py-3 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className={`h-4 w-4 ${isTrackedApplied ? 'text-[#1e7e34]' : 'text-slate-400'}`} />
                    {isTrackedApplied ? (isHindi ? 'आवेदन किया गया' : 'Marked as applied') : (isHindi ? 'आवेदन किया चिह्नित करें' : 'Mark as applied')}
                  </span>
                  {isTrackedApplied ? <StatusBadge tone="green">{appliedDate || new Date().toISOString().split('T')[0]}</StatusBadge> : <ChevronRight className="h-4 w-4 text-slate-300" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaveToast(isHindi ? 'रिमाइंडर आपकी प्रोफाइल में सिंक हो गए।' : 'Reminders synced to your profile.');
                    setTimeout(() => setSaveToast(null), 3000);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                    <Bell className="h-4 w-4 text-slate-400" />
                    {isHindi ? 'अपडेट और रिमाइंडर' : 'Updates & reminders'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
              </div>
              {!currentUser && (
                <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 space-y-3">
                  <p>{isHindi ? 'नौकरियां सहेजने और आवेदन ट्रैक करने के लिए लॉग इन करें।' : 'Log in to save jobs and track your applications.'}</p>
                  <Link href="/auth" className={`${btnPrimary} w-full`}>
                    <User className="h-4 w-4" /> {isHindi ? 'लॉग इन करें' : 'Log in'}
                  </Link>
                </div>
              )}
            </SectionCard>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
      <NoticeDetailTour ready={!!notice} />
    </div>
  );
}
