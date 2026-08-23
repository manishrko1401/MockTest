"use client";

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Search, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Send, 
  Copy, 
  Check, 
  Inbox, 
  Filter, 
  MessageSquare, 
  ShieldCheck, 
  Edit3, 
  Save, 
  X,
  Smartphone,
  Globe
} from 'lucide-react';

interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: 'PENDING' | 'REPLIED' | 'RESOLVED' | 'ARCHIVED';
  adminNotes?: string | null;
  ipAddress?: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

interface InquiryManagerProps {
  showToast: (msg: string) => void;
}

export function InquiryManager({ showToast }: InquiryManagerProps) {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'REPLIED' | 'RESOLVED' | 'ARCHIVED'>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  
  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Copied email state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inquiries');
      const data = await res.json();
      if (data.success && Array.isArray(data.inquiries)) {
        setInquiries(data.inquiries);
      } else {
        showToast(data.error || 'Failed to load inquiries.');
      }
    } catch (e: any) {
      console.error('Failed to fetch inquiries:', e);
      showToast('Connection error while fetching inquiries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'PENDING' | 'REPLIED' | 'RESOLVED' | 'ARCHIVED') => {
    try {
      const res = await fetch('/api/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setInquiries(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
        showToast(`Inquiry marked as ${newStatus}`);
      } else {
        showToast(data.error || 'Failed to update status.');
      }
    } catch (e: any) {
      showToast('Error updating status: ' + e.message);
    }
  };

  const handleSaveAdminNote = async (id: string) => {
    setSavingNote(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, adminNotes: noteText })
      });
      const data = await res.json();
      if (data.success) {
        setInquiries(prev => prev.map(item => item.id === id ? { ...item, adminNotes: noteText } : item));
        showToast('Admin note saved successfully.');
        setEditingNoteId(null);
      } else {
        showToast(data.error || 'Failed to save admin note.');
      }
    } catch (e: any) {
      showToast('Error saving note: ' + e.message);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this inquiry record?')) return;

    try {
      const res = await fetch(`/api/inquiries?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setInquiries(prev => prev.filter(item => item.id !== id));
        showToast('Inquiry deleted successfully.');
      } else {
        showToast(data.error || 'Failed to delete inquiry.');
      }
    } catch (e: any) {
      showToast('Error deleting inquiry: ' + e.message);
    }
  };

  const handleCopyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    showToast(`Copied ${email} to clipboard!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filter inquiries
  const filteredInquiries = inquiries.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.adminNotes && item.adminNotes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesSubject = subjectFilter === 'ALL' || item.subject === subjectFilter;

    return matchesSearch && matchesStatus && matchesSubject;
  });

  // Calculate statistics
  const totalCount = inquiries.length;
  const pendingCount = inquiries.filter(i => i.status === 'PENDING').length;
  const repliedCount = inquiries.filter(i => i.status === 'REPLIED').length;
  const resolvedCount = inquiries.filter(i => i.status === 'RESOLVED').length;

  const getSubjectBadge = (subj: string) => {
    switch (subj) {
      case 'locker':
        return <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold border border-purple-200 dark:border-purple-800">Drive Locker</span>;
      case 'tests':
        return <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold border border-blue-200 dark:border-blue-800">Mock Tests</span>;
      case 'pass':
        return <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold border border-amber-200 dark:border-amber-800">Pass / Coins</span>;
      case 'feedback':
        return <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold border border-emerald-200 dark:border-emerald-800">Feedback</span>;
      default:
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold border border-slate-200 dark:border-slate-700">General</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">
            <Clock className="w-3 h-3" />
            PENDING
          </span>
        );
      case 'REPLIED':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">
            <Send className="w-3 h-3" />
            REPLIED
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">
            <CheckCircle2 className="w-3 h-3" />
            RESOLVED
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">
            ARCHIVED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER & REFRESH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Candidate Contact Inquiries
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct messages submitted by aspirants through the Contact Us page & support desk
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchInquiries}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Inquiries'}</span>
        </button>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Inquiries</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</p>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Action</span>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{pendingCount}</p>
        </div>

        <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-800/40 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Replied / Processing</span>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">{repliedCount}</p>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Resolved / Closed</span>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{resolvedCount}</p>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, email, or message..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition cursor-pointer"
          >
            <option value="ALL">All Statuses ({totalCount})</option>
            <option value="PENDING">Pending ({pendingCount})</option>
            <option value="REPLIED">Replied ({repliedCount})</option>
            <option value="RESOLVED">Resolved ({resolvedCount})</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {/* Subject filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition cursor-pointer"
          >
            <option value="ALL">All Topics</option>
            <option value="general">General</option>
            <option value="locker">Google Drive Locker</option>
            <option value="tests">Mock Tests</option>
            <option value="pass">Pass / Coins</option>
            <option value="feedback">Feedback</option>
          </select>
        </div>
      </div>

      {/* INQUIRIES LIST / CARDS */}
      {filteredInquiries.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
            No inquiries match your filter
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When candidates submit messages via the Contact Us form, they will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((inquiry) => {
            const isEditingNote = editingNoteId === inquiry.id;
            const formattedDate = new Date(inquiry.createdAt).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short'
            });

            return (
              <div
                key={inquiry.id}
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                {/* TOP ROW: Candidate info, date, source & status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {inquiry.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">
                          {inquiry.name}
                        </h4>
                        {getSubjectBadge(inquiry.subject)}
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full">
                          {inquiry.source === 'mobile_web' || inquiry.source === 'mobile' ? (
                            <><Smartphone className="w-3 h-3 text-purple-500" /> Mobile</>
                          ) : (
                            <><Globe className="w-3 h-3 text-blue-500" /> Web</>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-semibold">{inquiry.email}</span>
                        <button
                          onClick={() => handleCopyEmail(inquiry.email, inquiry.id)}
                          className="text-slate-400 hover:text-blue-500 transition cursor-pointer p-0.5"
                          title="Copy Email"
                        >
                          {copiedId === inquiry.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                        {inquiry.phone && <span>• {inquiry.phone}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-start sm:self-center">
                    <span className="text-[11px] text-slate-400 font-semibold">{formattedDate}</span>
                    {getStatusBadge(inquiry.status)}
                  </div>
                </div>

                {/* MESSAGE BODY */}
                <div className="bg-slate-50 dark:bg-slate-900/70 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                    {inquiry.message}
                  </p>
                </div>

                {/* ADMIN NOTES SECTION */}
                {inquiry.adminNotes && !isEditingNote && (
                  <div className="mb-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 flex items-start justify-between gap-2">
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-extrabold text-blue-700 dark:text-blue-400 block mb-0.5 text-[11px]">
                        Admin Internal Note:
                      </span>
                      {inquiry.adminNotes}
                    </div>
                    <button
                      onClick={() => {
                        setEditingNoteId(inquiry.id);
                        setNoteText(inquiry.adminNotes || '');
                      }}
                      className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
                      title="Edit note"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {isEditingNote && (
                  <div className="mb-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Internal Admin Note / Resolution Steps
                    </label>
                    <textarea
                      rows={2}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="e.g. Replied via email and manually verified mock test pass..."
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition resize-none"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveAdminNote(inquiry.id)}
                        disabled={savingNote}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingNote ? 'Saving...' : 'Save Note'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* BOTTOM ACTION BUTTONS */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  
                  {/* Status Switcher Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">Set Status:</span>
                    <select
                      value={inquiry.status}
                      onChange={(e) => handleUpdateStatus(inquiry.id, e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="PENDING">Pending Action</option>
                      <option value="REPLIED">Replied</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>

                    {!inquiry.adminNotes && !isEditingNote && (
                      <button
                        onClick={() => {
                          setEditingNoteId(inquiry.id);
                          setNoteText('');
                        }}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer ml-2"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Add Note</span>
                      </button>
                    )}
                  </div>

                  {/* Reply via Email & Delete */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${inquiry.email}?subject=Re:%20[MockTest%20Hub]%20Inquiry%20regarding%20${encodeURIComponent(inquiry.subject)}&body=Dear%20${encodeURIComponent(inquiry.name)},%0D%0A%0D%0AThank%20you%20for%20reaching%20out%20to%20MockTest%20Hub.%0D%0A%0D%0ARegarding%20your%20inquiry:%0D%0A"${encodeURIComponent(inquiry.message)}"%0D%0A%0D%0A[Your%20Reply%20Here]%0D%0A%0D%0ABest%20regards,%0D%0AMockTest%20Hub%20Support%20Team%0D%0Amocktesthubsupport@gmail.com`}
                      onClick={() => {
                        if (inquiry.status === 'PENDING') {
                          handleUpdateStatus(inquiry.id, 'REPLIED');
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reply via Email</span>
                    </a>

                    <button
                      onClick={() => handleDeleteInquiry(inquiry.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition cursor-pointer"
                      title="Delete Inquiry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
