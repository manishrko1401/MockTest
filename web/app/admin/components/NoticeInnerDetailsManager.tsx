"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileEdit, Search, Sparkles, Eye, Code, Save, RefreshCw, Trash2, 
  ExternalLink, CheckCircle2, AlertCircle, Layers, Calendar, 
  ArrowUpRight, Copy, Check, Filter, Plus, ShieldCheck, Trophy, Bell, FileText, X,
  ChevronDown, ChevronUp, ArrowDown
} from 'lucide-react';
import { uploadNoticeHtmlToTigris, fetchNoticeHtmlFromTigris } from '../../lib/tigrisNoticeStorage';

interface NoticeItem {
  id: string;
  title: string;
  titleHi?: string;
  category: 'notice' | 'result' | 'admit_card' | 'answer_key' | 'announcement' | 'testimonial' | string;
  type: string;
  date: string;
  publishDate?: string;
  lastDate?: string;
  url?: string;
  rawUrl?: string;
  imageUrl?: string;
  contentHtml?: string;
}

interface NoticeInnerDetailsManagerProps {
  noticesList: NoticeItem[];
  onRefreshNotices?: () => void;
  showToast: (msg: string) => void;
}

export default function NoticeInnerDetailsManager({ 
  noticesList, 
  onRefreshNotices,
  showToast 
}: NoticeInnerDetailsManagerProps) {
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Editor States
  const [editorHtml, setEditorHtml] = useState<string>('');
  const [editorTitle, setEditorTitle] = useState<string>('');
  const [editorTitleHi, setEditorTitleHi] = useState<string>('');
  const [editorCategory, setEditorCategory] = useState<string>('notice');
  const [editorType, setEditorType] = useState<string>('JOB');
  const [editorDate, setEditorDate] = useState<string>('');
  const [editorLastDate, setEditorLastDate] = useState<string>('');
  const [editorUrl, setEditorUrl] = useState<string>('');

  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editorMode, setEditorMode] = useState<'split' | 'code' | 'preview'>('split');
  
  // Search & Replace inside Editor
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [showFindReplace, setShowFindReplace] = useState<boolean>(false);

  const editorSectionRef = useRef<HTMLDivElement>(null);

  // Filtered notices
  const filteredNotices = useMemo(() => {
    return noticesList.filter(n => {
      const matchCat = selectedCategory === 'all' || n.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        n.title.toLowerCase().includes(q) || 
        n.id.toLowerCase().includes(q) || 
        n.type.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [noticesList, selectedCategory, searchQuery]);

  // Load notice content when selected
  const handleSelectNotice = async (notice: NoticeItem) => {
    setSelectedNoticeId(notice.id);
    setEditorTitle(notice.title);
    setEditorTitleHi(notice.titleHi || '');
    setEditorCategory(notice.category);
    setEditorType(notice.type);
    setEditorDate(notice.date || '');
    setEditorLastDate(notice.lastDate || '');
    setEditorUrl(notice.url || '');
    setIsLoadingContent(true);
    setEditorHtml('');

    // Smooth scroll down to editor
    setTimeout(() => {
      editorSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-single-notice-content', data: { id: notice.id } })
      });
      const data = await res.json();
      if (data.success && data.notice) {
        setEditorHtml(data.notice.contentHtml || '');
        if (data.notice.url) setEditorUrl(data.notice.url);
        if (data.notice.lastDate) setEditorLastDate(data.notice.lastDate);
      } else {
        setEditorHtml(notice.contentHtml || '');
      }
    } catch (err: any) {
      console.error("Failed to load notice content:", err);
      setEditorHtml(notice.contentHtml || '');
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Quick Action: Clean & Strip Short Description / Short Details
  const handleStripShortDesc = () => {
    if (!editorHtml) return;
    let clean = editorHtml;
    clean = clean.replace(/<li[^>]*>(?:(?!<\/li>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/li>)[\s\S])*?<\/li>/gi, '');
    clean = clean.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,400}?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/p>)[\s\S]){1,400}?<\/p>/gi, '');
    clean = clean.replace(/<h[2-4][^>]*>(?:(?!<\/h[2-4]>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/h[2-4]>)[\s\S])*?<\/h[2-4]>/gi, '');
    clean = clean.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
    clean = clean.replace(/(?:<b>|<strong>)?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)\s*:?\s*(?:<\/b>|<\/strong>)?(?:[^<\n\r]{0,250})/gi, '');
    clean = clean.replace(/<p>\s*(?:&nbsp;|\s*)*<\/p>/gi, '');
    setEditorHtml(clean.trim());
    showToast('Short Description & Details sections removed!');
  };

  // Quick Action: Strip Video / Promo Rows
  const handleStripPromoRows = () => {
    if (!editorHtml) return;
    let clean = editorHtml;
    clean = clean.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Watch\s*Video|Hindi\s*Video|Short\s*Notification\s*\(?[\w\s]*Video|Join\s*Free\s*Information|Information\s*Channel|Official\s*Whatsapp|Official\s*Telegram)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
    setEditorHtml(clean.trim());
    showToast('Promo & video rows stripped!');
  };

  // Quick Action: Insert Responsive Vacancy Table Template
  const handleInsertTableTemplate = () => {
    const template = `
<div class="notice-table-wrapper overflow-x-auto max-w-full my-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
  <table class="w-full text-left">
    <thead>
      <tr class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
        <th class="p-3 border">Post Name</th>
        <th class="p-3 border">Total Vacancy</th>
        <th class="p-3 border">Eligibility Criteria</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="p-3 border font-bold">Post Designation</td>
        <td class="p-3 border font-extrabold text-blue-600">Total Posts</td>
        <td class="p-3 border">Bachelor's Degree in relevant discipline from a recognized University.</td>
      </tr>
    </tbody>
  </table>
</div>
`.trim();
    setEditorHtml(prev => prev ? `${prev}\n\n${template}` : template);
    showToast('Table template appended!');
  };

  // Search & Replace inside Editor
  const handlePerformReplaceAll = () => {
    if (!findText) return;
    const parts = editorHtml.split(findText);
    const newContent = parts.join(replaceText);
    setEditorHtml(newContent);
    showToast(`Replaced all occurrences of "${findText}"`);
  };

  // Save changes to Tigris Object Storage + Database
  const handleSaveNoticeContent = async () => {
    if (!selectedNoticeId) return;
    setIsSaving(true);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit-notice',
          data: {
            id: selectedNoticeId,
            title: editorTitle,
            titleHi: editorTitleHi || null,
            category: editorCategory,
            type: editorType,
            date: editorDate,
            lastDate: editorLastDate || null,
            url: editorUrl || null,
            contentHtml: editorHtml
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('✅ Notice inner details updated & synced to Tigris Object Storage!');
        if (onRefreshNotices) onRefreshNotices();
      } else {
        showToast(`❌ Error saving notice: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`❌ Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans animate-in fade-in duration-200">
      
      {/* ======================================================== */}
      {/* 1. TOP BANNER & STATS */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-500/30 text-blue-200 text-[10px] font-extrabold uppercase tracking-wider border border-blue-400/30">
                Full Control Suite
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/30 text-emerald-200 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-400/30">
                Tigris Cloud Powered (0 Egress)
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2.5">
              <Layers className="h-6 w-6 text-blue-400" /> Notification Inner Details & Breakdown Editor
            </h2>
            <p className="text-xs text-blue-200/80 font-medium max-w-2xl mt-1">
              Select any notification from the directory on top to view and edit its complete recruitment breakdown below.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-black">
              {noticesList.length} Total Notifications
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TOP SECTION: NOTIFICATION EXPLORER DIRECTORY */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        
        {/* Controls: Search + Categories */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Notification Directory
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click any row below to load its inner details into the editor
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notification title or ID..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All' },
                { id: 'notice', label: 'Jobs' },
                { id: 'result', label: 'Results' },
                { id: 'admit_card', label: 'Admit Cards' },
                { id: 'answer_key', label: 'Answer Keys' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* High-Density Notification Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl max-h-[360px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800/90 backdrop-blur-md z-10">
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Status / ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Heading Title</th>
                <th className="py-3 px-4">Publish Date</th>
                <th className="py-3 px-4">Last Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotices.length > 0 ? (
                filteredNotices.map((notice) => {
                  const isSelected = selectedNoticeId === notice.id;
                  return (
                    <tr
                      key={notice.id}
                      onClick={() => handleSelectNotice(notice)}
                      className={`border-b border-slate-100 dark:border-slate-800/60 transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 dark:bg-blue-950/50 font-bold text-blue-900 dark:text-blue-200'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isSelected ? 'bg-blue-600 animate-pulse' : 'bg-emerald-500'}`} />
                          <span className="font-semibold text-slate-600 dark:text-slate-400">{notice.id}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                          notice.category === 'result' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800' :
                          notice.category === 'admit_card' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' :
                          notice.category === 'answer_key' ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800' :
                          'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                        }`}>
                          {notice.type || notice.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold max-w-md truncate">
                        {notice.title}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        {notice.date}
                      </td>
                      <td className="py-2.5 px-4 text-red-600 dark:text-red-400 font-bold text-[11px]">
                        {notice.lastDate || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectNotice(notice);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer inline-flex items-center gap-1 ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                        >
                          <FileEdit className="h-3 w-3" />
                          {isSelected ? 'Editing' : 'Edit'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-semibold">
                    No notifications match the search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. BOTTOM SECTION: FULL INTERACTIVE EDITING SUITE */}
      {/* ======================================================== */}
      <div ref={editorSectionRef} className="space-y-4">
        {selectedNoticeId ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-[10px] font-mono font-bold">
                    ID: {selectedNoticeId}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    tigris://notices/html/{selectedNoticeId}.html
                  </span>
                </div>
                <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white mt-1">
                  {editorTitle}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Editor View Modes */}
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setEditorMode('split')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      editorMode === 'split' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Split View
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('code')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      editorMode === 'code' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('preview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      editorMode === 'preview' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Live Preview
                  </button>
                </div>

                {/* Save & Publish */}
                <button
                  type="button"
                  onClick={handleSaveNoticeContent}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{isSaving ? 'Saving to Tigris...' : 'Save & Publish'}</span>
                </button>
              </div>
            </div>

            {/* Notice Metadata Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Heading Title</label>
                <input
                  type="text"
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Category</label>
                <select
                  value={editorCategory}
                  onChange={(e) => setEditorCategory(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="notice">Latest Jobs (Notice)</option>
                  <option value="result">Results & Merits</option>
                  <option value="admit_card">Admit Cards</option>
                  <option value="answer_key">Answer Keys</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Application Last Date</label>
                <input
                  type="text"
                  value={editorLastDate}
                  onChange={(e) => setEditorLastDate(e.target.value)}
                  placeholder="e.g. 25/08/2026"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Direct Portal URL</label>
                <input
                  type="text"
                  value={editorUrl}
                  onChange={(e) => setEditorUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Quick Actions & Search Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase mr-1">Quick Tools:</span>
                <button
                  type="button"
                  onClick={handleStripShortDesc}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  🧹 Strip Short Description
                </button>
                <button
                  type="button"
                  onClick={handleStripPromoRows}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  ✂️ Strip Promo Rows
                </button>
                <button
                  type="button"
                  onClick={handleInsertTableTemplate}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  ➕ Insert Vacancy Table
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowFindReplace(!showFindReplace)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-extrabold transition cursor-pointer"
              >
                🔍 Find & Replace
              </button>
            </div>

            {/* Find & Replace Bar */}
            {showFindReplace && (
              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 p-3 rounded-2xl flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  placeholder="Find text or tag..."
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replace with..."
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handlePerformReplaceAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg text-xs transition cursor-pointer shrink-0"
                >
                  Replace All
                </button>
              </div>
            )}

            {/* Core Editor & Preview Area */}
            {isLoadingContent ? (
              <div className="py-32 text-center space-y-3">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">Fetching inner details from Tigris Object Storage...</p>
              </div>
            ) : (
              <div className={`grid gap-5 ${editorMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                
                {/* Code / Text Editor Window */}
                {(editorMode === 'split' || editorMode === 'code') && (
                  <div className="space-y-2 flex flex-col">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                      <span className="flex items-center gap-1.5"><Code className="h-3.5 w-3.5" /> HTML Breakdown Source</span>
                      <span>{editorHtml.length} characters</span>
                    </div>
                    <textarea
                      value={editorHtml}
                      onChange={(e) => setEditorHtml(e.target.value)}
                      placeholder="Paste or write notice breakdown HTML here..."
                      rows={22}
                      className="w-full bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-2xl border border-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed resize-y no-scrollbar shadow-inner"
                    />
                  </div>
                )}

                {/* Live Rendered Preview Window */}
                {(editorMode === 'split' || editorMode === 'preview') && (
                  <div className="space-y-2 flex flex-col">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                      <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-blue-500" /> Live Client Preview</span>
                      <span className="text-emerald-500 font-extrabold">Matches Live App & Web</span>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-h-[520px] overflow-y-auto no-scrollbar space-y-4 shadow-inner">
                      {editorHtml ? (
                        <div 
                          className="notice-custom-body text-xs text-slate-800 dark:text-slate-200"
                          dangerouslySetInnerHTML={{ __html: editorHtml }}
                        />
                      ) : (
                        <div className="py-24 text-center text-slate-400 text-xs font-semibold">
                          Empty inner content. Start typing in the HTML editor above to preview.
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center shadow-xs space-y-4">
            <div className="h-16 w-16 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto border border-blue-200 dark:border-blue-800">
              <FileEdit className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Select a Notification from the Directory Above</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 font-medium">
                Click any notification row in the directory table on top to load, inspect, rewrite, clean, or format its recruitment breakdown details right here.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
