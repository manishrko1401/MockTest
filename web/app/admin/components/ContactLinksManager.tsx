"use client";

import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Check, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Sparkles,
  Link2,
  Globe,
  Mail,
  Send,
  HelpCircle
} from 'lucide-react';

export interface ContactLinkItem {
  id: string;
  name: string;
  badgeText: string;
  badgeBg: string;
  badgeTextColor: string;
  iconType: string;
  handle: string;
  url: string;
  descriptionEn: string;
  descriptionHi: string;
  category: string;
  orderIndex: number;
  isEnabled: boolean;
}

interface ContactLinksManagerProps {
  showToast: (msg: string) => void;
}

export function ContactLinksManager({ showToast }: ContactLinksManagerProps) {
  const [links, setLinks] = useState<ContactLinkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New channel modal/form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newBadgeText, setNewBadgeText] = useState('');
  const [newBadgeBg, setNewBadgeBg] = useState('bg-blue-600');
  const [newHandle, setNewHandle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDescEn, setNewDescEn] = useState('');
  const [newDescHi, setNewDescHi] = useState('');
  const [newCategory, setNewCategory] = useState('social');

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contact-links');
      const data = await res.json();
      if (data.success && Array.isArray(data.links)) {
        setLinks(data.links);
      } else {
        showToast('Failed to load contact links.');
      }
    } catch (e: any) {
      console.error('Error fetching contact links:', e);
      showToast('Error connecting to contact links API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleToggleEnabled = (id: string) => {
    setLinks(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isEnabled: !item.isEnabled };
      }
      return item;
    }));
  };

  const handleUpdateField = (id: string, field: keyof ContactLinkItem, val: any) => {
    setLinks(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    const newArr = [...links];
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;

    // Update orderIndex
    const reordered = newArr.map((item, idx) => ({ ...item, orderIndex: idx }));
    setLinks(reordered);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/contact-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-all',
          links: links
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('All contact & social links saved successfully!');
      } else {
        showToast(data.error || 'Failed to save contact links.');
      }
    } catch (e: any) {
      showToast('Error saving contact links: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Are you sure you want to reset all contact links to default MockTest Hub official URLs?')) return;

    setSaving(true);
    try {
      const res = await fetch('/api/contact-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.links)) {
        setLinks(data.links);
        showToast('Contact links reset to defaults successfully.');
      } else {
        showToast(data.error || 'Failed to reset.');
      }
    } catch (e: any) {
      showToast('Error resetting: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to remove the channel "${id}"?`)) return;

    try {
      const res = await fetch(`/api/contact-links?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setLinks(prev => prev.filter(item => item.id !== id));
        showToast(`Channel "${id}" deleted.`);
      } else {
        showToast(data.error || 'Failed to delete channel.');
      }
    } catch (e: any) {
      showToast('Error deleting channel: ' + e.message);
    }
  };

  const handleCreateNewChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newName.trim() || !newUrl.trim()) {
      showToast('Channel ID, Name, and Target URL are required.');
      return;
    }

    const cleanId = newId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (links.some(l => l.id === cleanId)) {
      showToast(`Channel ID "${cleanId}" already exists.`);
      return;
    }

    const newChannel: ContactLinkItem = {
      id: cleanId,
      name: newName.trim(),
      badgeText: newBadgeText.trim() || cleanId.slice(0, 2).toUpperCase(),
      badgeBg: newBadgeBg.trim() || 'bg-blue-600',
      badgeTextColor: 'text-white',
      iconType: 'link',
      handle: newHandle.trim() || newName.trim(),
      url: newUrl.trim(),
      descriptionEn: newDescEn.trim() || `${newName} official channel`,
      descriptionHi: newDescHi.trim() || `${newName} आधिकारिक चैनल`,
      category: newCategory,
      orderIndex: links.length,
      isEnabled: true
    };

    setLinks(prev => [...prev, newChannel]);
    setIsAddModalOpen(false);
    showToast(`Added channel "${newName}". Click "Save Changes" to publish.`);

    // Reset form
    setNewId('');
    setNewName('');
    setNewBadgeText('');
    setNewBadgeBg('bg-blue-600');
    setNewHandle('');
    setNewUrl('');
    setNewDescEn('');
    setNewDescHi('');
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Manage Contact & Social Links
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize official handles, URLs, descriptions & visibility on the public Contact Us page
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleResetDefaults}
            disabled={saving}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 cursor-pointer disabled:opacity-50"
            title="Reset to default handles"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-blue-600 dark:text-blue-400 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Channel</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {/* QUICK PREVIEW BANNER */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 dark:text-slate-300">
          <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Live Pill Preview (as shown to candidates on Contact Us page):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {links.filter(l => l.isEnabled).slice(0, 5).map(l => (
            <div
              key={l.id}
              className="inline-flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-1 pr-3 py-1 rounded-full text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs"
            >
              <div className={`w-6 h-6 rounded-full ${l.badgeBg || 'bg-blue-600'} text-white flex items-center justify-center font-black text-[10px] shrink-0`}>
                {l.badgeText || l.id.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-[11px]">{l.name}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </div>
          ))}
          {links.filter(l => l.isEnabled).length > 5 && (
            <span className="text-xs font-bold text-slate-400 self-center">
              +{links.filter(l => l.isEnabled).length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* CHANNELS LIST */}
      <div className="space-y-4">
        {links.map((channel, index) => {
          const isFirst = index === 0;
          const isLast = index === links.length - 1;

          return (
            <div
              key={channel.id}
              className={`bg-white dark:bg-slate-950 border rounded-2xl p-5 shadow-xs transition-all duration-200 ${
                channel.isEnabled 
                  ? 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800' 
                  : 'border-dashed border-slate-300 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-900">
                
                {/* Left: Badge, Name, Handle & Live Pill */}
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl ${channel.badgeBg || 'bg-blue-600'} text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs`}>
                    {channel.badgeText || channel.id.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                        {channel.name}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold">
                        ID: {channel.id}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        channel.isEnabled 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800'
                      }`}>
                        {channel.isEnabled ? 'Enabled' : 'Hidden'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-md font-medium">
                      {channel.handle || channel.url}
                    </p>
                  </div>
                </div>

                {/* Right: Actions (Reorder, Toggle, Test Link, Delete) */}
                <div className="flex items-center gap-2 self-end lg:self-center">
                  
                  {/* Reorder Buttons */}
                  <button
                    onClick={() => handleMove(index, 'up')}
                    disabled={isFirst}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-600 dark:text-slate-400 disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMove(index, 'down')}
                    disabled={isLast}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-600 dark:text-slate-400 disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Enable / Disable Toggle */}
                  <button
                    onClick={() => handleToggleEnabled(channel.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      channel.isEnabled
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {channel.isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{channel.isEnabled ? 'Active' : 'Disabled'}</span>
                  </button>

                  {/* Test Link */}
                  <a
                    href={channel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                    title="Open Link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* Delete (if custom) */}
                  {!['email', 'telegram', 'youtube', 'instagram', 'x', 'reddit', 'whatsapp', 'linkedin'].includes(channel.id) && (
                    <button
                      onClick={() => handleDelete(channel.id)}
                      className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition cursor-pointer"
                      title="Delete Channel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                
                {/* Field 1: Display Name */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={channel.name}
                    onChange={(e) => handleUpdateField(channel.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Field 2: Handle / Username Text */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Handle / Username
                  </label>
                  <input
                    type="text"
                    value={channel.handle}
                    onChange={(e) => handleUpdateField(channel.id, 'handle', e.target.value)}
                    placeholder="e.g. @MockTestHubOfficial"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Field 3: Target URL / Mailto */}
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Target URL / Mailto Link
                  </label>
                  <input
                    type="text"
                    value={channel.url}
                    onChange={(e) => handleUpdateField(channel.id, 'url', e.target.value)}
                    placeholder="https://... or mailto:..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Field 4: Badge Text (Acronym / Letters) */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Badge Text (Circle Logo)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={channel.badgeText}
                    onChange={(e) => handleUpdateField(channel.id, 'badgeText', e.target.value)}
                    placeholder="e.g. TG, YT, IG"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black uppercase text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Field 5: English Description */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    English Description
                  </label>
                  <input
                    type="text"
                    value={channel.descriptionEn || ''}
                    onChange={(e) => handleUpdateField(channel.id, 'descriptionEn', e.target.value)}
                    placeholder="e.g. Official Telegram for exam notes"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Field 6: Hindi Description */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Hindi Description
                  </label>
                  <input
                    type="text"
                    value={channel.descriptionHi || ''}
                    onChange={(e) => handleUpdateField(channel.id, 'descriptionHi', e.target.value)}
                    placeholder="e.g. परीक्षा नोट्स के लिए आधिकारिक टेलीग्राम"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* ADD NEW CHANNEL MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Plus className="w-5 h-5" />
                <h3 className="font-extrabold text-base">Add New Social / Contact Channel</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-white hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewChannel} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Channel ID (Unique, e.g. discord)
                  </label>
                  <input
                    type="text"
                    required
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="e.g. discord"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Discord Server"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Target URL
                </label>
                <input
                  type="text"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://discord.gg/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Badge Text (Circle Logo)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newBadgeText}
                    onChange={(e) => setNewBadgeText(e.target.value)}
                    placeholder="e.g. DC"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black uppercase text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Handle / Subtitle
                  </label>
                  <input
                    type="text"
                    value={newHandle}
                    onChange={(e) => setNewHandle(e.target.value)}
                    placeholder="e.g. MockTest Discord"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  English Description
                </label>
                <input
                  type="text"
                  value={newDescEn}
                  onChange={(e) => setNewDescEn(e.target.value)}
                  placeholder="Join our candidate discussion server"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Hindi Description
                </label>
                <input
                  type="text"
                  value={newDescHi}
                  onChange={(e) => setNewDescHi(e.target.value)}
                  placeholder="उम्मीदवार चर्चा समूह में शामिल हों"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-900">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md cursor-pointer"
                >
                  Add Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
