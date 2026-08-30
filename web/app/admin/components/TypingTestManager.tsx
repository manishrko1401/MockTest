"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Keyboard,
  Plus,
  PlusCircle,
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
  BarChart2,
  FolderPlus,
  Play,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  ArrowDown,
  Sparkles,
  Lock,
  Layers,
  Check
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

const DEFAULT_DEMO_TEXT = 'This is a demo typing test passage to check your keyboard responsiveness and warm up your fingers before starting the main exam.';

const SAMPLE_PASSAGES = [
  {
    title: 'Digital Governance and Public Service Delivery',
    text: 'Digital technology has revolutionized public service delivery across India over the past decade. Through unified portals and mobile applications, citizens can now access essential government documents, certificates, and welfare schemes without waiting in long queues. The integration of direct benefit transfers with bank accounts has minimized leakages, ensuring that financial assistance reaches intended beneficiaries swiftly and securely. Moreover, automated systems reduce bureaucratic delays and promote transparency in public administration. As broadband connectivity expands to remote rural communities, digital literacy becomes a cornerstone for inclusive socio-economic progress and nationwide empowerment.'
  },
  {
    title: 'Renewable Energy Transition and Sustainable Development',
    text: 'The transition toward sustainable energy sources represents one of the most critical endeavors of the twenty-first century. Solar and wind power installations have grown exponentially, providing affordable and clean electricity to millions of households and industrial units. By reducing dependency on imported fossil fuels, nations can enhance energy security while simultaneously curbing greenhouse gas emissions. Research in battery storage and smart grid infrastructure further stabilizes energy distribution during peak consumption hours. Continued collaboration between public policymakers, engineering innovators, and private investors will accelerate the adoption of environmentally conscious technologies worldwide.'
  },
  {
    title: 'Indian Railways Infrastructure and Modernization Programs',
    text: 'Indian Railways constitutes the lifeline of the country transport network, facilitating the daily transit of millions of passengers and crucial freight cargo. Recent modernization initiatives focus on high-speed train sets, automated signaling networks, track electrification, and redevelopment of major railway stations with world-class passenger amenities. Dedicated freight corridors have substantially reduced transportation turnaround times for essential commodities, bolstering manufacturing competitiveness. Technological upgrades such as automatic train protection systems demonstrate a sustained commitment to passenger safety, operational efficiency, and sustainable economic growth.'
  },
  {
    title: 'Constitutional Principles and the Rule of Law',
    text: 'The Constitution of India establishes a democratic republic grounded in the fundamental tenets of justice, liberty, equality, and fraternity. The independent judiciary functions as the custodian of the Constitution, ensuring that executive actions and legislative enactments remain consistent with constitutional mandates. Through judicial review and writ jurisdiction, superior courts protect the fundamental rights of citizens against arbitrary state action. A robust and accessible legal system is indispensable for upholding public confidence and guaranteeing equal protection of the laws to all individuals regardless of their social or economic background.'
  }
];

export function TypingTestManager({ showToast }: TypingTestManagerProps) {
  const [subTab, setSubTab] = useState<'tests' | 'categories' | 'attempts'>('tests');
  const [loading, setLoading] = useState(false);

  // Data states
  const [categories, setCategories] = useState<TypingCategory[]>([]);
  const [tests, setTests] = useState<TypingTest[]>([]);
  const [attempts, setAttempts] = useState<TypingAttempt[]>([]);

  // Search & Filters for Tests
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [languageFilter, setLanguageFilter] = useState<'ALL' | 'en' | 'hi'>('ALL');

  // Collapsible Create Test State
  const [isCreateTestOpen, setIsCreateTestOpen] = useState(false);
  const [testCount, setTestCount] = useState<number>(1);

  // Test Form (Used for both Creation & Editing)
  const getEmptyTestForm = (defaultCatId = '') => ({
    title: '',
    titleHi: '',
    categoryId: defaultCatId,
    passageText: SAMPLE_PASSAGES[0].text,
    demoPassageText: DEFAULT_DEMO_TEXT,
    demoDurationMinutes: 1,
    breakDurationMinutes: 1,
    mainDurationMinutes: 10,
    qualifyingWpm: 35,
    maxErrorPercentage: 5.0,
    enableBackspace: true,
    allowRetype: false,
    language: 'en' as 'en' | 'hi',
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    instructions: 'Standard typing exam simulation. Complete Demo, Break, and Main test.'
  });

  const [testForm, setTestForm] = useState(getEmptyTestForm());

  // Edit Test Modal
  const [editingTest, setEditingTest] = useState<TypingTest | null>(null);
  const [showEditTestModal, setShowEditTestModal] = useState(false);

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

  // Admin headers helper
  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-key': 'super_secret_admin_key_2026'
  };

  // Fetch all data
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [testsRes, catsRes, attemptsRes] = await Promise.all([
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
          body: JSON.stringify({ action: 'get-user-typing-attempts' })
        })
      ]);

      const catsData = await catsRes.json();
      if (catsData.success && Array.isArray(catsData.categories)) {
        setCategories(catsData.categories);
        if (!testForm.categoryId && catsData.categories.length > 0) {
          setTestForm(prev => ({ ...prev, categoryId: catsData.categories[0].id }));
        }
      }

      const testsData = await testsRes.json();
      if (testsData.success) {
        setTests(testsData.tests || []);
        if (!catsData.success && Array.isArray(testsData.categories)) {
          setCategories(testsData.categories);
        }
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
  const handleCreateBatchTests = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.title.trim()) {
      showToast('Please enter a test title');
      return;
    }
    if (!testForm.categoryId) {
      showToast('Please select an exam category');
      return;
    }
    if (!testForm.passageText.trim()) {
      showToast('Please enter main exam passage text');
      return;
    }

    try {
      setLoading(true);
      const count = Math.max(1, Number(testCount) || 1);

      for (let i = 1; i <= count; i++) {
        const titleToUse = count === 1 ? testForm.title.trim() : `${testForm.title.trim()} ${i}`;
        const titleHiToUse = testForm.titleHi.trim()
          ? (count === 1 ? testForm.titleHi.trim() : `${testForm.titleHi.trim()} ${i}`)
          : '';

        const payload: any = {
          ...testForm,
          title: titleToUse,
          titleHi: titleHiToUse,
          backspaceRule: testForm.enableBackspace ? 'ALLOWED' : 'DISABLED'
        };

        await fetch('/api/db', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ action: 'create-typing-test', data: payload })
        });
      }

      showToast(count === 1 ? 'Typing test created successfully!' : `Successfully created ${count} typing tests!`);
      setIsCreateTestOpen(false);
      setTestCount(1);
      setTestForm(getEmptyTestForm(categories[0]?.id || ''));
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Error creating test');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditTest = (test: TypingTest) => {
    setEditingTest(test);
    setTestForm({
      title: test.title,
      titleHi: test.titleHi || '',
      categoryId: test.categoryId,
      passageText: test.passageText,
      demoPassageText: test.demoPassageText || DEFAULT_DEMO_TEXT,
      demoDurationMinutes: test.demoDurationMinutes || 1,
      breakDurationMinutes: test.breakDurationMinutes || 1,
      mainDurationMinutes: test.mainDurationMinutes || 10,
      qualifyingWpm: test.qualifyingWpm || 35,
      maxErrorPercentage: test.maxErrorPercentage !== undefined ? test.maxErrorPercentage : 5.0,
      enableBackspace: test.enableBackspace !== undefined ? test.enableBackspace : (test.backspaceRule !== 'DISABLED'),
      allowRetype: test.allowRetype !== undefined ? test.allowRetype : false,
      language: test.language || 'en',
      difficulty: test.difficulty || 'Medium',
      instructions: test.instructions || ''
    });
    setShowEditTestModal(true);
  };

  const handleSaveEditedTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest) return;
    if (!testForm.title.trim()) {
      showToast('Please enter a test title');
      return;
    }
    if (!testForm.categoryId) {
      showToast('Please select an exam category');
      return;
    }
    if (!testForm.passageText.trim()) {
      showToast('Please enter main passage text');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        ...testForm,
        id: editingTest.id,
        title: testForm.title.trim(),
        backspaceRule: testForm.enableBackspace ? 'ALLOWED' : 'DISABLED'
      };

      const res = await fetch('/api/db', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ action: 'edit-typing-test', data: payload })
      });
      const data = await res.json();
      if (data.success && data.test) {
        showToast('Typing test updated successfully!');
        setShowEditTestModal(false);
        setEditingTest(null);
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo file size must be less than 2MB');
      return;
    }

    try {
      setIsUploadingLogo(true);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setCategoryForm(prev => ({ ...prev, logoUrl: base64 }));
        showToast('Logo selected and preview loaded!');
        setIsUploadingLogo(false);
      };
      reader.onerror = () => {
        showToast('Failed to read image file');
        setIsUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast('Error uploading logo: ' + err.message);
      setIsUploadingLogo(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      showToast('Please enter category name');
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

  // Filtered Tests
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      const matchesSearch = !searchQuery.trim() || test.title.toLowerCase().includes(searchQuery.toLowerCase()) || (test.titleHi && test.titleHi.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = categoryFilter === 'ALL' || test.categoryId === categoryFilter;
      const matchesLanguage = languageFilter === 'ALL' || test.language === languageFilter;
      return matchesSearch && matchesCategory && matchesLanguage;
    });
  }, [tests, searchQuery, categoryFilter, languageFilter]);

  // Passage word count calculations
  const mainPassageWords = useMemo(() => {
    return testForm.passageText.trim() ? testForm.passageText.trim().split(/\s+/).length : 0;
  }, [testForm.passageText]);

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans">
      {/* Header & Sub-Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <Keyboard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Typing Exams & Simulator Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create and manage 3-phase typing tests (Demo, Break, Main durations) and exam categories.
            </p>
          </div>
        </div>

        {/* Refresh & Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <a
            href="/typing-test"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-blue-500" />
            Live Portal
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar (Passages Bank Removed) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setSubTab('tests')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
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
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
            subTab === 'categories'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          Exam Categories ({categories.length})
        </button>

        <button
          onClick={() => setSubTab('attempts')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
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
        <div className="space-y-6">

          {/* CREATE NEW TYPING TEST — COLLAPSIBLE CARD (Styled Like MockTestManager) */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setIsCreateTestOpen(!isCreateTestOpen)}
              className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <PlusCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">Create New Typing Test</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Click to expand the typing test creation form</p>
                </div>
              </div>
              <div className={`transition-transform duration-200 ${isCreateTestOpen ? 'rotate-180' : ''}`}>
                <ArrowDown className="h-4 w-4 text-slate-500" />
              </div>
            </button>

            {isCreateTestOpen && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-6">
                <form onSubmit={handleCreateBatchTests} className="space-y-5">
                  {/* Category Selector */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Exam Category *
                    </label>
                    <select
                      required
                      value={testForm.categoryId}
                      onChange={e => setTestForm({ ...testForm, categoryId: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                    >
                      <option value="">-- Select Exam Category --</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} {cat.nameHi ? `(${cat.nameHi})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Test Title & Quantity (Batch Creation matching MockTestManager) */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Test Title (English) * {testCount > 1 && <span className="text-blue-600 dark:text-blue-400 font-normal lowercase">(base title for batch)</span>}
                      </label>
                      <input
                        type="text"
                        required
                        value={testForm.title}
                        onChange={e => setTestForm({ ...testForm, title: e.target.value })}
                        placeholder="e.g. SSC CGL Tier-2 DEST Mock Test"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        No. of Tests to Create
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={50}
                        value={testCount}
                        onChange={e => setTestCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold font-sans"
                      />
                    </div>
                  </div>

                  {/* Hindi Title (Optional) */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Test Title in Hindi (Optional)
                    </label>
                    <input
                      type="text"
                      value={testForm.titleHi}
                      onChange={e => setTestForm({ ...testForm, titleHi: e.target.value })}
                      placeholder="e.g. एसएससी सीजीएल टियर-2 टाइपिंग टेस्ट"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Live Bulk Title Preview Badge */}
                  {testCount > 1 && testForm.title.trim() && (
                    <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
                      <div className="font-extrabold flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                        <span>⚡ Bulk Creation Preview ({testCount} Typing Tests):</span>
                      </div>
                      <p className="text-[11px] text-blue-800 dark:text-blue-300 font-medium">
                        Will create tests with titles suffixing 1 to {testCount}:
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {Array.from({ length: Math.min(testCount, 5) }).map((_, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[10px] font-mono font-semibold rounded-md border border-blue-200 dark:border-blue-700">
                            {testForm.title.trim()} {idx + 1}
                          </span>
                        ))}
                        {testCount > 5 && (
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[10px] font-mono font-semibold rounded-md border border-blue-200 dark:border-blue-800">
                            ... up to "{testForm.title.trim()} {testCount}"
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Durations & Settings Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-2">Demo Time (min)</label>
                      <input
                        type="number"
                        step="0.5"
                        min={0.5}
                        required
                        value={testForm.demoDurationMinutes}
                        onChange={e => setTestForm({ ...testForm, demoDurationMinutes: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-2">Break Time (min)</label>
                      <input
                        type="number"
                        step="0.5"
                        min={0.5}
                        required
                        value={testForm.breakDurationMinutes}
                        onChange={e => setTestForm({ ...testForm, breakDurationMinutes: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-2">Main Exam (min)</label>
                      <input
                        type="number"
                        step="1"
                        min={1}
                        required
                        value={testForm.mainDurationMinutes}
                        onChange={e => setTestForm({ ...testForm, mainDurationMinutes: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Language & Difficulty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-2">Keyboard Language</label>
                      <select
                        value={testForm.language}
                        onChange={e => setTestForm({ ...testForm, language: e.target.value as any })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                      >
                        <option value="en">English (QWERTY)</option>
                        <option value="hi">Hindi (Mangal / Inscript / Remington)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-2">Passage Difficulty</label>
                      <select
                        value={testForm.difficulty}
                        onChange={e => setTestForm({ ...testForm, difficulty: e.target.value as any })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  {/* Rules Panel 1: Backspace Key Control (Matching MockTestManager Feature Panel Style) */}
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={testForm.enableBackspace}
                        onChange={e => setTestForm({ ...testForm, enableBackspace: e.target.checked })}
                        className="w-4 h-4 mt-0.5 accent-blue-600 cursor-pointer rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Keyboard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            Enable Backspace & Delete Keys
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            testForm.enableBackspace
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}>
                            {testForm.enableBackspace ? '✓ Corrections Allowed' : '✕ Strict (No Corrections)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                          When checked, candidates can use Backspace and Delete to edit typed text. When unchecked, both keys are strictly blocked in the exam terminal.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Rules Panel 2: Paragraph Retyping (Matching MockTestManager Feature Panel Style) */}
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={testForm.allowRetype}
                        onChange={e => setTestForm({ ...testForm, allowRetype: e.target.checked })}
                        className="w-4 h-4 mt-0.5 accent-blue-600 cursor-pointer rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            Enable Paragraph Retype (Repeat Passage After Finishing)
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            testForm.allowRetype
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {testForm.allowRetype ? '✓ Speed Counts Retyped Words' : '✕ Single Pass Evaluation'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                          Candidates who finish typing before time expires can retype the passage from the beginning. All retyped words and keystrokes count towards speed.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Passage Text Areas */}
                  <div className="space-y-4 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Passage Texts
                      </h4>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 font-semibold">Quick sample text:</span>
                        {SAMPLE_PASSAGES.map((sample, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => setTestForm({ ...testForm, passageText: sample.text })}
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            Sample {sIdx + 1}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Warm-Up Demo Passage */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                        Demo Passage (Warm-Up Test)
                      </label>
                      <textarea
                        rows={2}
                        value={testForm.demoPassageText}
                        onChange={e => setTestForm({ ...testForm, demoPassageText: e.target.value })}
                        className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono font-medium"
                      />
                    </div>

                    {/* Main Exam Passage */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">
                          Main Exam Passage Text *
                        </label>
                        <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                          {mainPassageWords} words · {testForm.passageText.length} characters
                        </span>
                      </div>
                      <textarea
                        rows={5}
                        required
                        value={testForm.passageText}
                        onChange={e => setTestForm({ ...testForm, passageText: e.target.value })}
                        placeholder="Paste or write the main examination typing passage here..."
                        className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateTestOpen(false);
                        setTestCount(1);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      {testCount > 1 ? `Create ${testCount} Typing Tests` : 'Create Typing Test'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* SEARCH & FILTER BAR */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search typing tests by title..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer focus:outline-none"
              >
                <option value="ALL">All Categories ({tests.length})</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={languageFilter}
                onChange={e => setLanguageFilter(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer focus:outline-none"
              >
                <option value="ALL">All Languages</option>
                <option value="en">English (QWERTY)</option>
                <option value="hi">Hindi</option>
              </select>

              {(searchQuery || categoryFilter !== 'ALL' || languageFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('ALL');
                    setLanguageFilter('ALL');
                  }}
                  className="px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}

              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''} shown
              </span>
            </div>
          </div>

          {/* TYPING TESTS LIST FORMAT (Styled Like MockTestManager Card-Row List) */}
          <div className="space-y-3">
            {filteredTests.length === 0 ? (
              <div className="bg-white dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                <FileText className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="font-bold text-slate-600 dark:text-slate-400">No typing tests found</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Use the search filters above or expand "Create New Typing Test" to add one</p>
              </div>
            ) : (
              filteredTests.map((test, index) => {
                const cat = categories.find(c => c.id === test.categoryId);
                const passageWordCount = test.passageText ? test.passageText.trim().split(/\s+/).length : 0;
                const isBackspaceAllowed = test.enableBackspace !== false && test.backspaceRule !== 'DISABLED';

                return (
                  <div
                    key={test.id}
                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-xs transition hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5">
                      {/* Left: Test Details */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Top Meta Bar */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            {cat?.name || 'General Typing'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                            {test.language === 'hi' ? 'Hindi' : 'English'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                            {test.difficulty}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Title */}
                        <div>
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                            {test.title}
                          </h4>
                          {test.titleHi && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {test.titleHi}
                            </p>
                          )}
                        </div>

                        {/* Durations & Criteria Strip */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {/* 3-Phase durations */}
                          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-500" />
                            Demo: <strong>{test.demoDurationMinutes}m</strong> · Break: <strong className="text-amber-600">{test.breakDurationMinutes}m</strong> · Main: <strong className="text-blue-600">{test.mainDurationMinutes}m</strong>
                          </span>

                          {/* Target criteria */}
                          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                            🎯 Target Speed: <strong>{test.qualifyingWpm} WPM</strong>
                          </span>

                          {/* Backspace rule badge */}
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            isBackspaceAllowed
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                              : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900'
                          }`}>
                            {isBackspaceAllowed ? '✓ Backspace' : '✕ No Backspace'}
                          </span>

                          {/* Retype rule badge */}
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            test.allowRetype
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                          }`}>
                            {test.allowRetype ? '✓ Retype ON' : '✕ Single Pass'}
                          </span>

                          {/* Passage word count */}
                          <span className="text-[11px] text-slate-400">
                            📝 {passageWordCount} words ({test.passageText.length} chars)
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 lg:flex-col lg:items-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                        <a
                          href={`/typing-test/${test.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-blue-500" />
                          Test Terminal
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditTest(test)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                            title="Edit Test Settings"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTest(test.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                            title="Delete Typing Test"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. CATEGORIES TAB (Rendered in Clean List / Table Format) */}
      {/* ---------------------------------------------------- */}
      {subTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Exam Categories List
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organize typing tests under specific government exams, SSC Tiers, or custom drills.
              </p>
            </div>
            <button
              onClick={handleOpenCreateCategory}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Exam Category
            </button>
          </div>

          {/* Clean List / Table View of Categories */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-16 text-center">Logo</th>
                    <th className="py-3.5 px-4">Exam Category Name</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4 text-center">Tests Linked</th>
                    <th className="py-3.5 px-4 text-center">Display Order</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No exam categories found. Click "Add Exam Category" to create one.
                      </td>
                    </tr>
                  ) : (
                    categories.map(cat => {
                      const linkedTestsCount = tests.filter(t => t.categoryId === cat.id).length;

                      return (
                        <tr key={cat.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          {/* Logo Column */}
                          <td className="py-3.5 px-4 text-center">
                            {cat.logoUrl ? (
                              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1 shadow-xs mx-auto">
                                <img src={cat.logoUrl} alt={cat.name} className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 flex items-center justify-center mx-auto">
                                <Keyboard className="w-5 h-5" />
                              </div>
                            )}
                          </td>

                          {/* Category Name */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="text-sm font-extrabold">{cat.name}</div>
                            {cat.nameHi && (
                              <div className="text-xs text-slate-400 font-medium">{cat.nameHi}</div>
                            )}
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-sm">
                            <p className="line-clamp-2 leading-relaxed">
                              {cat.description || <span className="text-slate-400 italic">No description provided</span>}
                            </p>
                          </td>

                          {/* Linked Tests */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold text-[11px] border border-blue-200 dark:border-blue-900">
                              {linkedTestsCount} test{linkedTestsCount !== 1 ? 's' : ''}
                            </span>
                          </td>

                          {/* Order Index */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                            #{cat.orderIndex ?? 1}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              cat.isActive !== false
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                            }`}>
                              {cat.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditCategory(cat)}
                                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                                title="Edit Category"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                                title="Delete Category"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. STUDENT ATTEMPTS TAB */}
      {/* ---------------------------------------------------- */}
      {subTab === 'attempts' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Candidate</th>
                  <th className="py-3 px-3">Exam Test</th>
                  <th className="py-3 px-3">Net Speed</th>
                  <th className="py-3 px-3">Gross Speed</th>
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
                    <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
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
      {/* MODAL: EDIT TYPING TEST */}
      {/* ---------------------------------------------------- */}
      {showEditTestModal && editingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Edit Typing Test
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update test parameters, timings, qualifying criteria, or passage text.
                </p>
              </div>
              <button
                onClick={() => setShowEditTestModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedTest} className="space-y-5">
              {/* Category Selector */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Exam Category *
                </label>
                <select
                  required
                  value={testForm.categoryId}
                  onChange={e => setTestForm({ ...testForm, categoryId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                >
                  <option value="">-- Select Exam Category --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.nameHi ? `(${c.nameHi})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Test Title (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={testForm.title}
                    onChange={e => setTestForm({ ...testForm, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Test Title in Hindi (Optional)
                  </label>
                  <input
                    type="text"
                    value={testForm.titleHi}
                    onChange={e => setTestForm({ ...testForm, titleHi: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              {/* Durations & Criteria Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-2">Demo (min)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0.5}
                    required
                    value={testForm.demoDurationMinutes}
                    onChange={e => setTestForm({ ...testForm, demoDurationMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-2">Break (min)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0.5}
                    required
                    value={testForm.breakDurationMinutes}
                    onChange={e => setTestForm({ ...testForm, breakDurationMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-2">Main Exam (min)</label>
                  <input
                    type="number"
                    step="1"
                    min={1}
                    required
                    value={testForm.mainDurationMinutes}
                    onChange={e => setTestForm({ ...testForm, mainDurationMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              {/* Language & Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-2">Language</label>
                  <select
                    value={testForm.language}
                    onChange={e => setTestForm({ ...testForm, language: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer font-semibold"
                  >
                    <option value="en">English (QWERTY)</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-2">Difficulty</label>
                  <select
                    value={testForm.difficulty}
                    onChange={e => setTestForm({ ...testForm, difficulty: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer font-semibold"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Feature Panels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={testForm.enableBackspace}
                    onChange={e => setTestForm({ ...testForm, enableBackspace: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable Backspace</div>
                    <div className="text-[10px] text-slate-500">Allow candidate to make corrections</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={testForm.allowRetype}
                    onChange={e => setTestForm({ ...testForm, allowRetype: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable Retype Paragraph</div>
                    <div className="text-[10px] text-slate-500">Repeat passage when finished</div>
                  </div>
                </label>
              </div>

              {/* Main Passage Text */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                  Main Exam Passage Text *
                </label>
                <textarea
                  rows={5}
                  required
                  value={testForm.passageText}
                  onChange={e => setTestForm({ ...testForm, passageText: e.target.value })}
                  className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditTestModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer transition active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: CREATE / EDIT CATEGORY */}
      {/* ---------------------------------------------------- */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingCategory ? 'Edit Exam Category' : 'Create Exam Category'}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category Name (English) *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. SSC CGL (Tier-2 DEST)"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category Name (Hindi)</label>
                <input
                  type="text"
                  value={categoryForm.nameHi}
                  onChange={e => setCategoryForm({ ...categoryForm, nameHi: e.target.value })}
                  placeholder="e.g. एसएससी सीजीएल (टियर-2 डेस्ट)"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Exam Category Logo</span>
                  {categoryForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, logoUrl: '' })}
                      className="text-[10px] text-red-500 hover:underline font-bold cursor-pointer"
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
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-bold border border-blue-200 dark:border-blue-800 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {isUploadingLogo ? 'Uploading...' : 'Upload Image Logo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={isUploadingLogo}
                      />
                    </label>
                    <p className="text-[10px] text-slate-400">PNG, JPG, or SVG up to 2MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Official typing speed test for SSC candidates..."
                  className="w-full mt-1 p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Display Order</label>
                  <input
                    type="number"
                    min={1}
                    value={categoryForm.orderIndex}
                    onChange={e => setCategoryForm({ ...categoryForm, orderIndex: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer h-9">
                    <input
                      type="checkbox"
                      checked={categoryForm.isActive}
                      onChange={e => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Active Category</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={loading || isUploadingLogo}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow cursor-pointer transition active:scale-95"
              >
                {editingCategory ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
