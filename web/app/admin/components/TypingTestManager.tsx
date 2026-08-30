"use client";

import React, { useState, useEffect } from 'react';
import {
  Keyboard,
  Plus,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  Clock,
  Zap,
  Award,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Save,
  X,
  ExternalLink,
  Languages,
  ShieldAlert,
  BarChart2,
  FolderPlus,
  Play,
  RotateCcw,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import {
  TypingCategory,
  TypingPassage,
  TypingTest,
  TypingAttempt,
  isSscExam
} from '../../lib/typingTypes';

interface TypingTestManagerProps {
  showToast: (msg: string) => void;
}

export function TypingTestManager({ showToast }: TypingTestManagerProps) {
  const [subTab, setSubTab] = useState<'tests' | 'categories' | 'passages' | 'attempts'>('tests');
  const [loading, setLoading] = useState(false);

  // Data states
  const [categories, setCategories] = useState<TypingCategory[]>([]);
  const [passages, setPassages] = useState<TypingPassage[]>([]);
  const [tests, setTests] = useState<TypingTest[]>([]);
  const [attempts, setAttempts] = useState<TypingAttempt[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Test Modal State
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<TypingTest | null>(null);
  const [testForm, setTestForm] = useState({
    title: '',
    titleHi: '',
    categoryId: '',
    passageId: '',
    passageText: '',
    demoPassageText: '',
    demoDurationMinutes: 1,
    breakDurationMinutes: 1,
    mainDurationMinutes: 10,
    qualifyingWpm: 35,
    maxErrorPercentage: 5.0,
    backspaceRule: 'ALLOWED' as 'ALLOWED' | 'RESTRICTED' | 'DISABLED',
    enableBackspace: true,
    allowRetype: false,
    highlightAllowed: false,
    language: 'en' as 'en' | 'hi',
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    instructions: ''
  });

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TypingCategory | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    nameHi: '',
    description: '',
    icon: 'Keyboard',
    logoUrl: '',
    orderIndex: 1,
    isActive: true
  });

  // Passage Modal State
  const [showPassageModal, setShowPassageModal] = useState(false);
  const [editingPassage, setEditingPassage] = useState<TypingPassage | null>(null);
  const [passageForm, setPassageForm] = useState({
    title: '',
    titleHi: '',
    text: '',
    categoryId: '',
    language: 'en' as 'en' | 'hi',
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    tags: ''
  });

  // Admin headers helper
  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-key': 'super_secret_admin_key_2026'
  };

  // Fetch all data
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [testsRes, catsRes, passagesRes, attemptsRes] = await Promise.all([
        fetch('/api/db', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ action: 'get-typing-tests' })
        }),
        fetch('/api/db', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ action: 'get-typing-categories' })
        }),
        fetch('/api/db', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ action: 'get-typing-passages' })
        }),
        fetch('/api/db', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ action: 'get-user-typing-attempts' })
        })
      ]);

      const catsData = await catsRes.json();
      if (catsData.success && Array.isArray(catsData.categories)) {
        setCategories(catsData.categories);
      }

      const testsData = await testsRes.json();
      if (testsData.success) {
        setTests(testsData.tests || []);
        if (!catsData.success && Array.isArray(testsData.categories)) {
          setCategories(testsData.categories);
        }
      }

      const passagesData = await passagesRes.json();
      if (passagesData.success) {
        setPassages(passagesData.passages || []);
      }

      const attemptsData = await attemptsRes.json();
      if (attemptsData.success) {
        setAttempts(attemptsData.attempts || []);
      }
    } catch (err: any) {
      console.error('Error loading typing data:', err);
      showToast('Error loading typing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // ----------------------------------------------------
  // TEST ACTIONS
  // ----------------------------------------------------
  const handleOpenCreateTest = () => {
    setEditingTest(null);
    setTestForm({
      title: '',
      titleHi: '',
      categoryId: categories[0]?.id || '',
      passageId: passages[0]?.id || '',
      passageText: passages[0]?.text || '',
      demoPassageText: 'This is a demo typing test passage to check your keyboard responsiveness and warm up your fingers before starting the main exam.',
      demoDurationMinutes: 1,
      breakDurationMinutes: 1,
      mainDurationMinutes: 10,
      qualifyingWpm: 35,
      maxErrorPercentage: 5.0,
      backspaceRule: 'ALLOWED',
      enableBackspace: true,
      allowRetype: false,
      highlightAllowed: false,
      language: 'en',
      difficulty: 'Medium',
      instructions: 'Standard typing exam simulation. Complete Demo, Break, and Main test.'
    });
    setShowTestModal(true);
  };

  const handleOpenEditTest = (test: TypingTest) => {
    setEditingTest(test);
    setTestForm({
      title: test.title,
      titleHi: test.titleHi || '',
      categoryId: test.categoryId || (categories[0]?.id || ''),
      passageId: test.passageId || '',
      passageText: test.passageText || '',
      demoPassageText: test.demoPassageText || '',
      demoDurationMinutes: test.demoDurationMinutes || 1,
      breakDurationMinutes: test.breakDurationMinutes || 1,
      mainDurationMinutes: test.mainDurationMinutes || 10,
      qualifyingWpm: test.qualifyingWpm || 35,
      maxErrorPercentage: test.maxErrorPercentage !== undefined ? test.maxErrorPercentage : 5.0,
      backspaceRule: test.backspaceRule || 'ALLOWED',
      enableBackspace: test.enableBackspace !== undefined ? test.enableBackspace : (test.backspaceRule !== 'DISABLED'),
      allowRetype: test.allowRetype !== undefined ? test.allowRetype : false,
      highlightAllowed: test.highlightAllowed !== undefined ? test.highlightAllowed : false,
      language: test.language || 'en',
      difficulty: test.difficulty || 'Medium',
      instructions: test.instructions || ''
    });
    setShowTestModal(true);
  };

  const handleSaveTest = async () => {
    if (!testForm.title.trim()) {
      showToast('Please enter a test title');
      return;
    }
    if (!testForm.categoryId) {
      showToast('Please select an exam category');
      return;
    }
    if (!testForm.passageText.trim()) {
      showToast('Please enter or select main passage text');
      return;
    }
    try {
      setLoading(true);
      const payload: any = {
        ...testForm,
        title: testForm.title.trim(),
        id: editingTest ? editingTest.id : undefined
      };
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ action: editingTest ? 'edit-typing-test' : 'create-typing-test', data: payload })
      });
      const data = await res.json();
      if (data.success && data.test) {
        showToast(editingTest ? 'Typing test updated successfully!' : 'Typing test created successfully!');
        setShowTestModal(false);
        loadAllData();
      } else {
        showToast(data.error || 'Failed to save typing test');
      }
    } catch (e: any) {
      showToast(e.message || 'Server error saving typing test');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this typing test?')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ action: 'delete-typing-test', data: { id } })
      });
      const data = await res.json();
      if (data.success && data.deleted) {
        showToast('Typing test deleted successfully');
        loadAllData();
      } else {
        showToast(data.error || 'Failed to delete typing test');
      }
    } catch (e: any) {
      showToast(e.message || 'Error deleting typing test');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // CATEGORY ACTIONS
  // ----------------------------------------------------
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      nameHi: '',
      description: '',
      icon: 'Keyboard',
      logoUrl: '',
      orderIndex: categories.length + 1,
      isActive: true
    });
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: TypingCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      nameHi: cat.nameHi || '',
      description: cat.description || '',
      icon: cat.icon || 'Keyboard',
      logoUrl: cat.logoUrl || '',
      orderIndex: cat.orderIndex !== undefined ? cat.orderIndex : 1,
      isActive: cat.isActive !== undefined ? cat.isActive : true
    });
    setShowCategoryModal(true);
  };

  const handleUploadCategoryLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.url) {
        setCategoryForm(prev => ({ ...prev, logoUrl: data.url }));
        showToast('Logo uploaded successfully!');
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setCategoryForm(prev => ({ ...prev, logoUrl: reader.result as string }));
          showToast('Image loaded locally!');
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = () => {
        setCategoryForm(prev => ({ ...prev, logoUrl: reader.result as string }));
        showToast('Image loaded locally!');
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      showToast('Category name is required');
      return;
    }
    try {
      setLoading(true);
      const payload: any = {
        ...categoryForm,
        name: categoryForm.name.trim(),
        id: editingCategory ? editingCategory.id : undefined
      };
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ action: editingCategory ? 'edit-typing-category' : 'create-typing-category', data: payload })
      });
      const data = await res.json();
      if (data.success && data.category) {
        showToast(editingCategory ? 'Exam category updated successfully!' : 'Exam category created successfully!');
        setShowCategoryModal(false);
        loadAllData();
      } else {
        showToast(data.error || 'Failed to save exam category');
      }
    } catch (e: any) {
      showToast(e.message || 'Error saving category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? All tests linked to this category will also be deleted.')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ action: 'delete-typing-category', data: { id } })
      });
      const data = await res.json();
      if (data.success && data.deleted) {
        showToast('Category deleted successfully');
        loadAllData();
      } else {
        showToast(data.error || 'Failed to delete category');
      }
    } catch (e: any) {
      showToast(e.message || 'Error deleting category');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // PASSAGE ACTIONS
  // ----------------------------------------------------
  const handleOpenCreatePassage = () => {
    setEditingPassage(null);
    setPassageForm({
      title: '',
      titleHi: '',
      text: '',
      categoryId: categories[0]?.id || '',
      language: 'en',
      difficulty: 'Medium',
      tags: 'SSC CGL, DEST'
    });
    setShowPassageModal(true);
  };

  const handleOpenEditPassage = (p: TypingPassage) => {
    setEditingPassage(p);
    setPassageForm({
      title: p.title,
      titleHi: p.titleHi || '',
      text: p.text,
      categoryId: p.categoryId || '',
      language: p.language,
      difficulty: p.difficulty,
      tags: p.tags ? p.tags.join(', ') : ''
    });
    setShowPassageModal(true);
  };

  const handleSavePassage = async () => {
    if (!passageForm.title.trim() || !passageForm.text.trim()) {
      showToast('Title and passage text are required');
      return;
    }
    try {
      setLoading(true);
      const payload: any = {
        ...passageForm,
        tags: passageForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        id: editingPassage ? editingPassage.id : undefined
      };
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ action: editingPassage ? 'edit-typing-passage' : 'create-typing-passage', data: payload })
      });
      const data = await res.json();
      if (data.success && data.passage) {
        showToast(editingPassage ? 'Passage updated!' : 'Passage saved to bank!');
        setShowPassageModal(false);
        loadAllData();
      } else {
        showToast(data.error || 'Failed to save passage');
      }
    } catch (e: any) {
      showToast(e.message || 'Error saving passage');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePassage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this passage?')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ action: 'delete-typing-passage', data: { id } })
      });
      const data = await res.json();
      if (data.success && data.deleted) {
        showToast('Passage deleted');
        loadAllData();
      } else {
        showToast(data.error || 'Failed to delete passage');
      }
    } catch (e: any) {
      showToast(e.message || 'Error deleting passage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <Keyboard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Typing Exams & Simulator Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage exam categories, 3-phase typing tests (Demo, Break, Main durations), and passage bank.
            </p>
          </div>
        </div>

        {/* Refresh & Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <a
            href="/typing-test"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 text-blue-500" />
            Live Portal
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setSubTab('tests')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition ${
            subTab === 'tests'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          Typing Tests ({tests.length})
        </button>

        <button
          onClick={() => setSubTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition ${
            subTab === 'categories'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          Exam Categories ({categories.length})
        </button>

        <button
          onClick={() => setSubTab('passages')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition ${
            subTab === 'passages'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Passages Bank ({passages.length})
        </button>

        <button
          onClick={() => setSubTab('attempts')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition ${
            subTab === 'attempts'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Student Attempts ({attempts.length})
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. TYPING TESTS TAB */}
      {/* ---------------------------------------------------- */}
      {subTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search typing tests..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleOpenCreateTest}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New Typing Test
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests
              .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(test => {
                const cat = categories.find(c => c.id === test.categoryId);
                return (
                  <div
                    key={test.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold">
                          {cat?.name || 'General'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {test.language.toUpperCase()}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                            {test.difficulty}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                        {test.title}
                      </h4>

                      {/* 3-Phase durations */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-slate-400">Demo:</span>{' '}
                          <strong>{test.demoDurationMinutes}m</strong>
                        </div>
                        <div>
                          <span className="text-amber-500">Break:</span>{' '}
                          <strong>{test.breakDurationMinutes}m</strong>
                        </div>
                        <div>
                          <span className="text-blue-500">Main:</span>{' '}
                          <strong>{test.mainDurationMinutes}m</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Target: <strong>{test.qualifyingWpm} WPM</strong></span>
                        <span>Max Error: <strong>{test.maxErrorPercentage}%</strong></span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          test.enableBackspace !== false && test.backspaceRule !== 'DISABLED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                            : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900'
                        }`}>
                          {test.enableBackspace !== false && test.backspaceRule !== 'DISABLED'
                            ? '✓ Backspace Allowed'
                            : '✕ Backspace Disabled'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          test.allowRetype
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {test.allowRetype ? '✓ Retype Allowed' : '✕ Retype Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <a
                        href={`/typing-test/${test.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-blue-500" />
                        Test Terminal
                      </a>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditTest(test)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit Test"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTest(test.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                          title="Delete Test"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. CATEGORIES TAB */}
      {/* ---------------------------------------------------- */}
      {subTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Exam Categories
            </h3>
            <button
              onClick={handleOpenCreateCategory}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Exam Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  {cat.logoUrl ? (
                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1 shadow-xs shrink-0">
                      <img src={cat.logoUrl} alt={cat.name} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 shrink-0">
                      <Keyboard className="w-5 h-5" />
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{cat.name}</h4>
                  {cat.nameHi && <p className="text-xs text-slate-400">{cat.nameHi}</p>}
                </div>
                {cat.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {cat.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. PASSAGES BANK TAB */}
      {/* ---------------------------------------------------- */}
      {subTab === 'passages' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search passage bank..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleOpenCreatePassage}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Upload / Add Passage
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {passages
              .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.text.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(p => (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        {p.wordCount} words • {p.charCount} chars
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                        {p.difficulty}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 font-mono leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                      {p.text}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap gap-1">
                      {p.tags?.map((t, idx) => (
                        <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditPassage(p)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit Passage"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePassage(p.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                        title="Delete Passage"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. STUDENT ATTEMPTS TAB */}
      {/* ---------------------------------------------------- */}
      {subTab === 'attempts' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-3">Candidate</th>
                  <th className="py-3 px-3">Exam Test</th>
                  <th className="py-3 px-3">Net WPM</th>
                  <th className="py-3 px-3">Gross WPM</th>
                  <th className="py-3 px-3">Accuracy</th>
                  <th className="py-3 px-3">Mistakes</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {attempts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No candidate typing test attempts recorded yet.
                    </td>
                  </tr>
                ) : (
                  attempts.map(att => (
                    <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {att.userName || 'Student'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {att.testTitle}
                      </td>
                      <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400">
                        {isSscExam(att.testTitle) ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold" title="SSC Result is evaluated on Error %">
                            {att.errorPercentage}% <span className="text-[10px] text-slate-400 font-normal">Err</span>
                          </span>
                        ) : (
                          `${att.netWpm} WPM`
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {att.grossWpm} WPM
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                        {att.accuracyPercentage}%
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {att.totalMistakes} ({att.errorPercentage}%)
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          att.isQualified
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400'
                        }`}>
                          {att.isQualified ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(att.completedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: CREATE / EDIT TYPING TEST */}
      {/* ---------------------------------------------------- */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingTest ? 'Edit Typing Test' : 'Create New Typing Test'}
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Test Title (English) *
                </label>
                <input
                  type="text"
                  value={testForm.title}
                  onChange={e => setTestForm({ ...testForm, title: e.target.value })}
                  placeholder="e.g. SSC CGL Tier-2 DEST Mock Test 01"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category *
                </label>
                <select
                  value={testForm.categoryId}
                  onChange={e => setTestForm({ ...testForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">-- Select Exam Category --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Link from Passage Bank
                </label>
                <select
                  value={testForm.passageId}
                  onChange={e => {
                    const sel = passages.find(p => p.id === e.target.value);
                    setTestForm({
                      ...testForm,
                      passageId: e.target.value,
                      passageText: sel ? sel.text : testForm.passageText
                    });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">-- Custom Passage Text Below --</option>
                  {passages.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.wordCount} words)</option>
                  ))}
                </select>
              </div>

              {/* 3 DURATIONS */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Demo Test Duration (Minutes) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={testForm.demoDurationMinutes}
                  onChange={e => setTestForm({ ...testForm, demoDurationMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Break Duration (Minutes) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={testForm.breakDurationMinutes}
                  onChange={e => setTestForm({ ...testForm, breakDurationMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Main Exam Duration (Minutes) *
                </label>
                <input
                  type="number"
                  step="1"
                  value={testForm.mainDurationMinutes}
                  onChange={e => setTestForm({ ...testForm, mainDurationMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Qualifying Speed (WPM Cutoff) *
                </label>
                <input
                  type="number"
                  value={testForm.qualifyingWpm}
                  onChange={e => setTestForm({ ...testForm, qualifyingWpm: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Max Error % Allowed *
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={testForm.maxErrorPercentage}
                  onChange={e => setTestForm({ ...testForm, maxErrorPercentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Language & Difficulty
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={testForm.language}
                    onChange={e => setTestForm({ ...testForm, language: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi (हिंदी)</option>
                  </select>
                  <select
                    value={testForm.difficulty}
                    onChange={e => setTestForm({ ...testForm, difficulty: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* BACKSPACE CONTROL TOGGLE */}
              <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer" htmlFor="backspace-toggle">
                      <Keyboard className="w-4 h-4 text-blue-500" />
                      Enable Backspace & Delete Key
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      When enabled, users can use Backspace and Delete to correct errors. When disabled, Backspace and Delete keys are disabled in the typing terminal.
                    </p>
                  </div>
                  <input
                    id="backspace-toggle"
                    type="checkbox"
                    checked={testForm.enableBackspace}
                    onChange={e => setTestForm({ ...testForm, enableBackspace: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              {/* PARAGRAPH RETYPE TOGGLE */}
              <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer" htmlFor="retype-toggle">
                      <RotateCcw className="w-4 h-4 text-blue-500" />
                      Enable Retype Paragraph (Repeat Passage After Finishing)
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      When enabled, users who complete typing the paragraph before time expires can retype the passage again from the beginning. All retyped words and keystrokes will be counted towards Gross and Net Speed evaluation.
                    </p>
                  </div>
                  <input
                    id="retype-toggle"
                    type="checkbox"
                    checked={testForm.allowRetype}
                    onChange={e => setTestForm({ ...testForm, allowRetype: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Demo Passage Text (Warm-up)
                </label>
                <textarea
                  rows={2}
                  value={testForm.demoPassageText}
                  onChange={e => setTestForm({ ...testForm, demoPassageText: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Main Exam Passage Text *
                </label>
                <textarea
                  rows={5}
                  value={testForm.passageText}
                  onChange={e => setTestForm({ ...testForm, passageText: e.target.value })}
                  placeholder="Paste main typing test passage here..."
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTest}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow"
              >
                {editingTest ? 'Save Changes' : 'Create Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: CREATE / EDIT CATEGORY */}
      {/* ---------------------------------------------------- */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category Name (EN) *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. SSC CGL (Tier-2 DEST)"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category Name (Hindi)</label>
                <input
                  type="text"
                  value={categoryForm.nameHi}
                  onChange={e => setCategoryForm({ ...categoryForm, nameHi: e.target.value })}
                  placeholder="e.g. एसएससी सीजीएल (टियर-2 डेस्ट)"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Exam Category Logo</span>
                  {categoryForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, logoUrl: '' })}
                      className="text-[10px] text-red-500 hover:underline font-bold"
                    >
                      Remove Logo
                    </button>
                  )}
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {categoryForm.logoUrl ? (
                      <img
                        src={categoryForm.logoUrl}
                        alt="Category Logo Preview"
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Keyboard className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={categoryForm.logoUrl}
                      onChange={e => setCategoryForm({ ...categoryForm, logoUrl: e.target.value })}
                      placeholder="Paste image URL (https://...) or upload below"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    <div className="flex items-center gap-2">
                      <label
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1.5 transition"
                      >
                        <Upload className="w-3 h-3" />
                        <span>{isUploadingLogo ? 'Uploading...' : 'Upload Image File'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingLogo}
                          onChange={handleUploadCategoryLogo}
                        />
                      </label>
                      <span className="text-[10px] text-slate-400">PNG, SVG, JPG or WebP</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Brief description of this exam typing criteria..."
                  className="w-full mt-1 p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: CREATE / EDIT PASSAGE */}
      {/* ---------------------------------------------------- */}
      {showPassageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingPassage ? 'Edit Passage' : 'Upload / Add Passage to Bank'}
              </h3>
              <button
                onClick={() => setShowPassageModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Passage Title *</label>
                <input
                  type="text"
                  value={passageForm.title}
                  onChange={e => setPassageForm({ ...passageForm, title: e.target.value })}
                  placeholder="e.g. Digital Governance & Economic Reforms 2026"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Language</label>
                  <select
                    value={passageForm.language}
                    onChange={e => setPassageForm({ ...passageForm, language: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi (हिंदी)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Difficulty</label>
                  <select
                    value={passageForm.difficulty}
                    onChange={e => setPassageForm({ ...passageForm, difficulty: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Passage Text *</label>
                  <span className="text-[11px] text-slate-400">
                    {passageForm.text.trim() ? passageForm.text.trim().split(/\s+/).length : 0} words • {passageForm.text.length} chars
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={passageForm.text}
                  onChange={e => setPassageForm({ ...passageForm, text: e.target.value })}
                  placeholder="Paste or type passage content..."
                  className="w-full mt-1 p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={passageForm.tags}
                  onChange={e => setPassageForm({ ...passageForm, tags: e.target.value })}
                  placeholder="Editorial, SSC CGL, History, Science"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowPassageModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePassage}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow"
              >
                Save Passage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
