"use client";

import React, { useState, useEffect } from 'react';
import { Upload, PlusCircle, Trash2, Edit3, Check, RefreshCw, FileCode, Download, Search, BookOpen, AlertCircle, Sparkles, Layers, Eye, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';

export interface VocabItem {
  id?: number;
  word: string;
  pos: string;
  hindiMeaning: string;
  meaning: string;
  synonyms: string[];
  antonyms: string[];
  usage: string;
}

const SAMPLE_JSON = [
  {
    "word": "EXCORIATE",
    "pos": "(verb)",
    "hindiMeaning": "आलोचना करना",
    "meaning": "to criticize harshly and usually publicly.",
    "synonyms": ["assail", "castigate", "lambaste", "vituperate", "imprecate"],
    "antonyms": ["acclaim", "laud", "praise", "glorify", "admire", "exalt"],
    "usage": "The stern judge will excoriate the behavior of the repeat offender by sentencing him to thirty years in prison."
  },
  {
    "word": "PROBITY",
    "pos": "(noun)",
    "hindiMeaning": "ईमानदारी / सत्यनिष्ठा",
    "meaning": "the quality of having strong moral principles; honesty and decency.",
    "synonyms": ["integrity", "uprightness", "honesty", "rectitude"],
    "antonyms": ["dishonesty", "deceit", "corruption"],
    "usage": "Financial probity is expected of anyone in a position of public trust."
  }
];

export function VocabManager() {
  const [items, setItems] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'json' | 'manual'>('json');

  // JSON Import States
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Manual Form States
  const [manualWord, setManualWord] = useState('');
  const [manualPos, setManualPos] = useState('(verb)');
  const [manualHindi, setManualHindi] = useState('');
  const [manualMeaning, setManualMeaning] = useState('');
  const [manualSynonyms, setManualSynonyms] = useState('');
  const [manualAntonyms, setManualAntonyms] = useState('');
  const [manualUsage, setManualUsage] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<number | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchVocab = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vocab');
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch (e) {
      console.error('Failed to fetch vocab:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVocab();
  }, []);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Safely parse JSON text for live preview
  const getParsedPreviewItems = (): VocabItem[] => {
    if (!jsonText.trim()) return [];
    try {
      const parsed = JSON.parse(jsonText);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return list.map((item, idx) => ({
        id: item.id || idx + 1,
        word: String(item.word || '').toUpperCase().trim(),
        pos: String(item.pos || '(verb)').trim(),
        hindiMeaning: String(item.hindiMeaning || item.hindi || '').trim(),
        meaning: String(item.meaning || '').trim(),
        synonyms: Array.isArray(item.synonyms)
          ? item.synonyms.map((s: any) => String(s).trim())
          : String(item.synonyms || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        antonyms: Array.isArray(item.antonyms)
          ? item.antonyms.map((a: any) => String(a).trim())
          : String(item.antonyms || '').split(',').map((a: string) => a.trim()).filter(Boolean),
        usage: String(item.usage || item.example || '').trim()
      })).filter(i => i.word.length > 0);
    } catch (e) {
      return [];
    }
  };

  const previewItems = getParsedPreviewItems();
  const currentPreviewWord = previewItems[previewIndex] || previewItems[0];

  // Handle JSON File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        JSON.parse(text); // validate
        setJsonText(text);
        setJsonError(null);
        setPreviewIndex(0);
        showStatus('success', `File "${file.name}" loaded successfully!`);
      } catch (err: any) {
        setJsonError('Invalid JSON format in file: ' + err.message);
        showStatus('error', 'Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Handle Batch JSON Submission
  const handleBatchJsonSubmit = async () => {
    if (!jsonText.trim()) {
      setJsonError('Please paste or upload JSON data first.');
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);
      const arrayToSubmit = Array.isArray(parsed) ? parsed : [parsed];

      setSubmitting(true);
      const res = await fetch('/api/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_upload', items: arrayToSubmit })
      });
      const data = await res.json();

      if (data.success) {
        setItems(data.items || []);
        setJsonText('');
        setJsonError(null);
        setPreviewIndex(0);
        showStatus('success', data.message || 'JSON Vocabulary imported successfully!');
      } else {
        setJsonError(data.error || 'Failed to import JSON data.');
      }
    } catch (err: any) {
      setJsonError('JSON Syntax Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Manual Form Submit (Add or Edit)
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualWord.trim() || !manualHindi.trim() || !manualMeaning.trim()) {
      showStatus('error', 'Please fill in required fields (Word, Hindi Meaning, Definition).');
      return;
    }

    const payload = {
      word: manualWord,
      pos: manualPos,
      hindiMeaning: manualHindi,
      meaning: manualMeaning,
      synonyms: manualSynonyms.split(',').map(s => s.trim()).filter(Boolean),
      antonyms: manualAntonyms.split(',').map(a => a.trim()).filter(Boolean),
      usage: manualUsage
    };

    setSubmitting(true);
    try {
      const res = await fetch('/api/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingId ? 'edit' : 'add',
          data: editingId ? { id: editingId, ...payload } : payload
        })
      });
      const data = await res.json();

      if (data.success) {
        setItems(data.items || []);
        resetManualForm();
        showStatus('success', editingId ? 'Word updated successfully!' : 'New word added successfully!');
      } else {
        showStatus('error', data.error || 'Operation failed.');
      }
    } catch (e: any) {
      showStatus('error', e.message || 'Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetManualForm = () => {
    setManualWord('');
    setManualPos('(verb)');
    setManualHindi('');
    setManualMeaning('');
    setManualSynonyms('');
    setManualAntonyms('');
    setManualUsage('');
    setEditingId(null);
  };

  const handleEditClick = (item: VocabItem) => {
    setEditingId(item.id || null);
    setManualWord(item.word);
    setManualPos(item.pos);
    setManualHindi(item.hindiMeaning);
    setManualMeaning(item.meaning);
    setManualSynonyms(item.synonyms.join(', '));
    setManualAntonyms(item.antonyms.join(', '));
    setManualUsage(item.usage);
    setActiveTab('manual');
  };

  const handleDeleteClick = async (id: number, wordName: string) => {
    if (!confirm(`Are you sure you want to delete "${wordName}"?`)) return;

    try {
      const res = await fetch('/api/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', data: { id } })
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        showStatus('success', `Deleted "${wordName}".`);
      }
    } catch (e: any) {
      showStatus('error', e.message || 'Delete failed.');
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm('Load default SSC CGL 10 Vocabulary Words into database?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_defaults' })
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        showStatus('success', 'Default SSC CGL Vocabulary dataset loaded!');
      }
    } catch (e: any) {
      showStatus('error', e.message || 'Failed to seed');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = () => {
    const jsonString = JSON.stringify(items, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'vocabulary_catalog.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredItems = items.filter(item =>
    item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.hindiMeaning.includes(searchQuery) ||
    item.meaning.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
              Admin Portal
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Vocabulary Upload & Catalog Manager
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Upload vocabulary datasets via JSON files or import words manually to display on the homepage Daily Vocab Booster.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSeedDefaults}
            className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100 transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            Load 10 Defaults
          </button>

          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export JSON ({items.length})
          </button>
        </div>
      </div>

      {/* Notification Toast Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Import Section: JSON vs Manual Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('json')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileCode className="h-4 w-4" />
              JSON File & Batch Import
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              {editingId ? 'Edit Word Entry' : 'Manual Word Entry'}
            </button>
          </div>

          <span className="text-xs font-bold text-slate-400">
            Total Catalog: {items.length} Words
          </span>
        </div>

        {/* TAB 1: JSON FILE & RAW JSON IMPORT */}
        {activeTab === 'json' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Upload Drag-and-drop Zone */}
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition bg-slate-50/50 dark:bg-slate-950/40 flex flex-col items-center justify-center space-y-2">
                <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  Upload Vocabulary JSON File
                </h4>
                <p className="text-[11px] text-slate-500 font-medium max-w-xs">
                  Select a valid `.json` file from your device containing an array of vocabulary objects.
                </p>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="json-file-input"
                />
                <label
                  htmlFor="json-file-input"
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl cursor-pointer transition shadow-xs inline-block"
                >
                  Choose JSON File
                </label>
              </div>

              {/* Template Helper */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-amber-500" />
                    Required JSON Object Format
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Each JSON element must specify: <code className="text-blue-600 font-bold">word</code>, <code className="text-blue-600 font-bold">pos</code>, <code className="text-blue-600 font-bold">hindiMeaning</code>, <code className="text-blue-600 font-bold">meaning</code>, <code className="text-blue-600 font-bold">synonyms</code>, <code className="text-blue-600 font-bold">antonyms</code>, and <code className="text-blue-600 font-bold">usage</code>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setJsonText(JSON.stringify(SAMPLE_JSON, null, 2));
                    setJsonError(null);
                    setPreviewIndex(0);
                  }}
                  className="mt-3 px-3 py-1.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold hover:bg-amber-500/20 transition self-start cursor-pointer"
                >
                  Insert Sample JSON Template
                </button>
              </div>
            </div>

            {/* JSON Code Input Area */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Raw JSON Array Input</span>
                {jsonError && <span className="text-rose-500 font-bold text-[11px]">{jsonError}</span>}
              </label>
              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setJsonError(null);
                  setPreviewIndex(0);
                }}
                rows={6}
                placeholder="[\n  {\n    'word': 'EXCORIATE',\n    'pos': '(verb)',\n    'hindiMeaning': 'आलोचना करना',\n    'meaning': 'to criticize harshly...'\n  }\n]"
                className="w-full bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-2xl border border-slate-800 focus:outline-none focus:border-blue-500 shadow-inner"
              />
            </div>

            {/* LIVE WEBSITE VIEW PREVIEW BEFORE IMPORT */}
            {previewItems.length > 0 && currentPreviewWord && (
              <div className="bg-slate-50 dark:bg-slate-950/80 border-2 border-blue-500/30 dark:border-blue-500/40 rounded-2xl p-5 space-y-4 relative overflow-hidden">
                {/* Header ribbon */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      Live Website Card Preview
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      (Found <strong>{previewItems.length}</strong> valid words in JSON)
                    </span>
                  </div>

                  {/* Word Quick Pills Selector */}
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-md pb-1 scrollbar-none">
                    {previewItems.slice(0, 8).map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewIndex(idx)}
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold shrink-0 cursor-pointer border ${
                          previewIndex === idx
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {item.word}
                      </button>
                    ))}
                    {previewItems.length > 8 && (
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        +{previewItems.length - 8} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actual Website Card Component Rendering */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-left">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                          {currentPreviewWord.id}. {currentPreviewWord.word}{' '}
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {currentPreviewWord.pos}
                          </span>
                        </h3>
                      </div>
                      <div className="inline-block bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 px-3 py-0.5 rounded-lg">
                        <p className="text-xs font-extrabold text-amber-800 dark:text-amber-300">
                          {currentPreviewWord.hindiMeaning}
                        </p>
                      </div>
                    </div>

                    <span className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold px-2 py-1 rounded-lg">
                      Exact Homepage Layout
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="space-y-2.5 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px] block mb-0.5">
                        Meaning:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        {currentPreviewWord.meaning}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                        <span className="font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider text-[10px] block mb-1">
                          Synonyms:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {currentPreviewWord.synonyms.map((syn, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300 font-bold text-[10px]">
                              {syn}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-rose-50/70 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40">
                        <span className="font-black text-rose-800 dark:text-rose-400 uppercase tracking-wider text-[10px] block mb-1">
                          Antonyms:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {currentPreviewWord.antonyms.map((ant, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-rose-100/80 dark:bg-rose-900/40 text-rose-900 dark:text-rose-300 font-bold text-[10px]">
                              {ant}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {currentPreviewWord.usage && (
                      <div className="bg-blue-50/70 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40">
                        <span className="font-black text-blue-800 dark:text-blue-400 uppercase tracking-wider text-[10px] block mb-0.5">
                          Usage / Example:
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 font-semibold italic">
                          "{currentPreviewWord.usage}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Preview Pagination Controls */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(prev => (prev - 1 + previewItems.length) % previewItems.length)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1 hover:bg-slate-200 transition cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev Word
                    </button>

                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Previewing Word {previewIndex + 1} of {previewItems.length}
                    </span>

                    <button
                      type="button"
                      onClick={() => setPreviewIndex(prev => (prev + 1) % previewItems.length)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-blue-700 transition cursor-pointer"
                    >
                      Next Word <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleBatchJsonSubmit}
                disabled={submitting || !jsonText.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
              >
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import JSON Vocabulary Batch ({previewItems.length} Words)
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL ENTRY FORM */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Word */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                  Word (English) *
                </label>
                <input
                  type="text"
                  required
                  value={manualWord}
                  onChange={(e) => setManualWord(e.target.value)}
                  placeholder="e.g. EXCORIATE"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Part of Speech */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                  Part of Speech
                </label>
                <select
                  value={manualPos}
                  onChange={(e) => setManualPos(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="(verb)">(verb)</option>
                  <option value="(noun)">(noun)</option>
                  <option value="(adj)">(adj)</option>
                  <option value="(adv)">(adv)</option>
                  <option value="(phrase)">(phrase)</option>
                </select>
              </div>

              {/* Hindi Meaning */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                  Hindi Meaning *
                </label>
                <input
                  type="text"
                  required
                  value={manualHindi}
                  onChange={(e) => setManualHindi(e.target.value)}
                  placeholder="e.g. आलोचना करना"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Meaning Definition */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                English Meaning / Definition *
              </label>
              <textarea
                required
                rows={2}
                value={manualMeaning}
                onChange={(e) => setManualMeaning(e.target.value)}
                placeholder="e.g. to criticize harshly and usually publicly."
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Synonyms */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                  Synonyms (Comma separated)
                </label>
                <input
                  type="text"
                  value={manualSynonyms}
                  onChange={(e) => setManualSynonyms(e.target.value)}
                  placeholder="assail, castigate, lambaste"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Antonyms */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                  Antonyms (Comma separated)
                </label>
                <input
                  type="text"
                  value={manualAntonyms}
                  onChange={(e) => setManualAntonyms(e.target.value)}
                  placeholder="acclaim, laud, praise, glorify"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Usage */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                Usage / Example Sentence
              </label>
              <input
                type="text"
                value={manualUsage}
                onChange={(e) => setManualUsage(e.target.value)}
                placeholder="e.g. The stern judge will excoriate the behavior of the repeat offender..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs italic text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetManualForm}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition active:scale-95 cursor-pointer"
              >
                {submitting ? 'Saving...' : editingId ? 'Update Word Entry' : 'Add Word to Catalog'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* CATALOG TABLE SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Current Vocabulary Catalog ({filteredItems.length})
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Word & POS</th>
                <th className="py-3 px-4">Hindi Meaning</th>
                <th className="py-3 px-4">Definition</th>
                <th className="py-3 px-4">Synonyms / Antonyms</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    Loading catalog items...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    No vocabulary words found. Click "Load 10 Defaults" or upload a JSON file.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-400">{item.id || idx + 1}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white whitespace-nowrap">
                      {item.word}{' '}
                      <span className="text-[10px] text-blue-600 font-semibold">{item.pos}</span>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      {item.hindiMeaning}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs font-medium">
                      {item.meaning}
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      {item.synonyms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[9px] font-extrabold text-emerald-600 uppercase">Syn:</span>
                          {item.synonyms.slice(0, 3).map((s, i) => (
                            <span key={i} className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] rounded font-semibold">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.antonyms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[9px] font-extrabold text-rose-600 uppercase">Ant:</span>
                          {item.antonyms.slice(0, 3).map((a, i) => (
                            <span key={i} className="px-1.5 py-0.2 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-[10px] rounded font-semibold">
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition active:scale-95 cursor-pointer"
                        title="Edit word"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      {item.id && (
                        <button
                          onClick={() => handleDeleteClick(item.id!, item.word)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition active:scale-95 cursor-pointer"
                          title="Delete word"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
