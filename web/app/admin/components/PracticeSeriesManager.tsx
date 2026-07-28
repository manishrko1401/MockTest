"use client";

import React, { useState, useEffect } from 'react';
import {
  Zap,
  FolderPlus,
  PlusCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
  Search,
  Globe,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  BookOpen,
  Target,
  Sparkles,
  Database,
  Save,
  X
} from 'lucide-react';

interface PracticeSeriesManagerProps {
  examCatalog: any[];
  showToast: (msg: string) => void;
  onRefreshCatalog?: () => void;
}

export const PracticeSeriesManager: React.FC<PracticeSeriesManagerProps> = ({
  examCatalog,
  showToast,
  onRefreshCatalog
}) => {
  // Mode selection: Importer vs Manage Categories
  const [managerTab, setManagerTab] = useState<'importer' | 'create_cat'>('importer');

  // Input Method for Questions Importer: JSON vs Interactive Form
  const [importerMode, setImporterMode] = useState<'json' | 'form'>('json');

  // Selected Target Practice Domain Category
  const [selectedCatId, setSelectedCatId] = useState<string>('');

  // Category Creation Form state
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');
  const [creatingCat, setCreatingCat] = useState<boolean>(false);

  // Category Edit / Delete state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState<string>('');
  const [editCatDesc, setEditCatDesc] = useState<string>('');

  // JSON Input & Verification state
  const [jsonInput, setJsonInput] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);

  // Previewer state
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [previewLanguage, setPreviewLanguage] = useState<'en' | 'hi'>('en');

  // Interactive Form Question state
  const [formTextEn, setFormTextEn] = useState<string>('');
  const [formTextHi, setFormTextHi] = useState<string>('');
  const [opt1En, setOpt1En] = useState<string>('');
  const [opt1Hi, setOpt1Hi] = useState<string>('');
  const [opt2En, setOpt2En] = useState<string>('');
  const [opt2Hi, setOpt2Hi] = useState<string>('');
  const [opt3En, setOpt3En] = useState<string>('');
  const [opt3Hi, setOpt3Hi] = useState<string>('');
  const [opt4En, setOpt4En] = useState<string>('');
  const [opt4Hi, setOpt4Hi] = useState<string>('');
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);
  const [formExplanationEn, setFormExplanationEn] = useState<string>('');
  const [formExplanationHi, setFormExplanationHi] = useState<string>('');

  // Ingestion status
  const [ingesting, setIngesting] = useState<boolean>(false);

  // Initial practice series catalog
  const initialPracticeCategories = examCatalog.filter(c =>
    (c as any).isPracticeSeries ||
    c.id.includes('practice') ||
    c.name.toLowerCase().includes('practice') ||
    c.name.toLowerCase().includes('sectional')
  );

  const fallbackDefaults = [
    {
      id: 'railways_practice_domain',
      name: 'Railways Practice Series',
      isPracticeSeries: true,
      description: 'RRB NTPC, Group D General Science & Math Practice',
      subCategories: []
    },
    {
      id: 'banking_practice_domain',
      name: 'Banking Practice Series',
      isPracticeSeries: true,
      description: 'SBI PO, Clerk Puzzles & DI Practice Sets',
      subCategories: []
    },
    {
      id: 'state_practice_domain',
      name: 'State Exams Practice Series',
      isPracticeSeries: true,
      description: 'BSSC, UPPSC State Special GK & Aptitude Practice',
      subCategories: []
    },
    {
      id: 'teaching_practice_domain',
      name: 'Teaching Practice Series',
      isPracticeSeries: true,
      description: 'CTET, State TET Child Development & Pedagogy Practice',
      subCategories: []
    }
  ];

  // -------------------------------------------------------------------------
  // Derive practice catalog from DB-backed examCatalog (same as test series).
  // This means the catalog is always the same for ALL users on ALL devices.
  // localStorage is no longer the source of truth for categories.
  // -------------------------------------------------------------------------
  const getDeletedCategoryIds = (): string[] => {
    try {
      const saved = localStorage.getItem('mth_deleted_practice_categories');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  };

  const saveDeletedCategoryIds = (ids: string[]) => {
    try {
      localStorage.setItem('mth_deleted_practice_categories', JSON.stringify(ids));
    } catch (e) {}
  };

  // Build catalog from examCatalog (DB), exactly like the test series page does.
  const deletedIds = getDeletedCategoryIds();
  const derivedCatalog = (() => {
    const map = new Map<string, any>();
    const seenNames = new Set<string>();
    const addCat = (c: any) => {
      if (!c || deletedIds.includes(c.id)) return;
      const key = (c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenNames.has(key)) return;
      seenNames.add(key);
      map.set(c.id, c);
    };
    // DB categories first (visible to ALL users)
    initialPracticeCategories.forEach(addCat);
    // Built-in defaults as fallback
    fallbackDefaults.forEach(addCat);
    return Array.from(map.values());
  })();

  const [practiceCatalog, setPracticeCatalog] = useState<any[]>(derivedCatalog);

  // Re-sync whenever examCatalog updates (e.g. after refreshCatalog() returns)
  useEffect(() => {
    const ids = getDeletedCategoryIds();
    const map = new Map<string, any>();
    const seenNames = new Set<string>();
    const addCat = (c: any) => {
      if (!c || ids.includes(c.id)) return;
      const key = (c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenNames.has(key)) return;
      seenNames.add(key);
      map.set(c.id, c);
    };
    initialPracticeCategories.forEach(addCat);
    fallbackDefaults.forEach(addCat);
    setPracticeCatalog(Array.from(map.values()));
  }, [examCatalog]);

  // Active Category Object
  const activeCategoryObj = practiceCatalog.find(c => c.id === selectedCatId);

  // Handle Creating New Practice Domain Category — save to DB first (like test series)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showToast("Practice Category Name is required!");
      return;
    }

    setCreatingCat(true);
    try {
      const generatedId = newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_practice';

      const newCategory = {
        id: generatedId,
        name: newCatName,
        description: newCatDesc || 'Topic-wise & Sectional Practice Series',
        isPracticeSeries: true,
        subCategories: []
      };

      // Save to DB first — this is the single source of truth (same as test series)
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-category',
          category: newCategory,
          data: newCategory
        })
      });
      const resData = await res.json();
      if (!resData.success) {
        showToast(`Failed to create category: ${resData.error || 'Unknown error'}`);
        return;
      }

      showToast(`Practice Category "${newCatName}" created successfully!`);
      setNewCatName('');
      setNewCatDesc('');

      // Refresh catalog from DB so the new category appears for ALL users
      if (onRefreshCatalog) onRefreshCatalog();
    } catch (err: any) {
      showToast(`Error creating practice category: ${err.message}`);
    } finally {
      setCreatingCat(false);
    }
  };

  // Start Editing Practice Domain Category
  const handleStartEdit = (cat: any) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatDesc(cat.description || '');
  };

  // Cancel Editing
  const handleCancelEdit = () => {
    setEditingCatId(null);
    setEditCatName('');
    setEditCatDesc('');
  };

  // Save Category Edits — DB first (like test series)
  const handleSaveEditCategory = async (catId: string) => {
    if (!editCatName.trim()) {
      showToast("Practice Category Name cannot be empty!");
      return;
    }

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit-category',
          categoryId: catId,
          updates: { name: editCatName, description: editCatDesc }
        })
      });
      const resData = await res.json();
      if (!resData.success) {
        showToast(`Failed to update category: ${resData.error || 'Unknown error'}`);
        return;
      }
    } catch (err: any) {
      showToast(`Error updating category: ${err.message}`);
      return;
    }

    showToast(`Practice Category updated successfully!`);
    setEditingCatId(null);
    // Refresh catalog from DB so updated name is visible to ALL users
    if (onRefreshCatalog) onRefreshCatalog();
  };

  // Delete Category — DB first (like test series)
  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!window.confirm(`Are you sure you want to delete the category "${catName}"? This action cannot be undone.`)) {
      return;
    }

    if (selectedCatId === catId) setSelectedCatId('');

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-category',
          categoryId: catId,
          data: { categoryId: catId }
        })
      });
      const resData = await res.json();
      if (!resData.success) {
        showToast(`Failed to delete category: ${resData.error || 'Unknown error'}`);
        return;
      }
    } catch (err: any) {
      showToast(`Error deleting category: ${err.message}`);
      return;
    }

    // Clear local caches for this category
    try {
      localStorage.removeItem(`mth_practice_questions_${catId}`);
      localStorage.removeItem(`mth_practice_options_${catId}`);
    } catch (e) {}

    showToast(`Practice Category "${catName}" deleted successfully!`);
    // Refresh catalog from DB so deletion is visible to ALL users
    if (onRefreshCatalog) onRefreshCatalog();
  };

  // Handle Verify & Parse JSON Questions Array
  const handleVerifyJson = () => {
    setJsonError(null);
    if (!jsonInput.trim()) {
      setJsonError("Please paste a JSON array of practice questions before verifying.");
      setParsedQuestions([]);
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        setJsonError("Root JSON structure must be an Array `[...]` of question objects.");
        setParsedQuestions([]);
        return;
      }

      if (parsed.length === 0) {
        setJsonError("JSON array is empty. Please provide at least 1 question object.");
        setParsedQuestions([]);
        return;
      }

      // Normalise and validate question objects
      const validated = parsed.map((item, idx) => {
        const qTextEn = item.questionText?.en || item.textEn || item.question || item.title || `Question #${idx + 1}`;
        const qTextHi = item.questionText?.hi || item.textHi || qTextEn;

        const rawOpts = item.options || [];
        const optionsList = rawOpts.map((opt: any) => {
          if (typeof opt === 'string') {
            return { en: opt, hi: opt };
          }
          return {
            en: opt.en || opt.textEn || opt.text || String(opt),
            hi: opt.hi || opt.textHi || opt.en || opt.text || String(opt)
          };
        });

        // Ensure 4 options
        while (optionsList.length < 4) {
          optionsList.push({ en: `Option ${optionsList.length + 1}`, hi: `Option ${optionsList.length + 1}` });
        }

        const correctIdx = typeof item.correctOption === 'number'
          ? item.correctOption
          : typeof item.correctIndex === 'number'
          ? item.correctIndex
          : 0;

        const expEn = item.explanation?.en || item.explanationEn || item.solution || '';
        const expHi = item.explanation?.hi || item.explanationHi || expEn;

        return {
          id: item.id || `q_${idx + 1}`,
          questionText: { en: qTextEn, hi: qTextHi },
          options: optionsList.slice(0, 4),
          correctOption: Math.min(Math.max(0, correctIdx), 3),
          explanation: { en: expEn, hi: expHi }
        };
      });

      setParsedQuestions(validated);
      setPreviewIndex(0);
      showToast(`Successfully verified ${validated.length} practice questions! Loaded into live preview.`);
    } catch (e: any) {
      setJsonError(`JSON Syntax Error: ${e.message}`);
      setParsedQuestions([]);
    }
  };

  // Add Question from Interactive Form to Parsed List
  const handleAddFormQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTextEn.trim()) {
      showToast("Question text in English is required!");
      return;
    }
    if (!opt1En.trim() || !opt2En.trim() || !opt3En.trim() || !opt4En.trim()) {
      showToast("All 4 option choices in English are required!");
      return;
    }

    const newQ = {
      id: `form_q_${parsedQuestions.length + 1}`,
      questionText: {
        en: formTextEn,
        hi: formTextHi || formTextEn
      },
      options: [
        { en: opt1En, hi: opt1Hi || opt1En },
        { en: opt2En, hi: opt2Hi || opt2En },
        { en: opt3En, hi: opt3Hi || opt3En },
        { en: opt4En, hi: opt4Hi || opt4En }
      ],
      correctOption: formCorrectIndex,
      explanation: {
        en: formExplanationEn,
        hi: formExplanationHi || formExplanationEn
      }
    };

    setParsedQuestions(prev => [...prev, newQ]);
    showToast(`Added Question #${parsedQuestions.length + 1} to Practice Series list!`);

    // Reset Form
    setFormTextEn('');
    setFormTextHi('');
    setOpt1En(''); setOpt1Hi('');
    setOpt2En(''); setOpt2Hi('');
    setOpt3En(''); setOpt3Hi('');
    setOpt4En(''); setOpt4Hi('');
    setFormExplanationEn('');
    setFormExplanationHi('');
  };

  // Ingest & Save Parsed Questions — saves to DB/S3 (same as test series bulk importer)
  const handleIngestQuestions = async () => {
    if (!selectedCatId) {
      showToast("Please select a target Practice Domain Category first!");
      return;
    }

    if (parsedQuestions.length === 0) {
      showToast("No parsed questions available. Please verify JSON or add questions first!");
      return;
    }

    setIngesting(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk-import-questions',
          data: {
            categoryId: selectedCatId,
            testId: `${selectedCatId}_default`,
            questions: parsedQuestions
          },
          categoryId: selectedCatId,
          testId: `${selectedCatId}_default`,
          questions: parsedQuestions
        })
      });

      const data = await res.json();
      if (data.success) {
        // Invalidate the local question cache so the practice page always
        // re-fetches fresh questions from DB/S3 on the next category select.
        try {
          localStorage.removeItem(`mth_practice_questions_${selectedCatId}`);
          window.dispatchEvent(new Event('practice_questions_updated'));
        } catch (e) {}

        showToast(`Successfully uploaded ${parsedQuestions.length} questions to database for "${activeCategoryObj?.name || selectedCatId}" — visible to ALL users now!`);
        setParsedQuestions([]);
        setJsonInput('');
        if (onRefreshCatalog) onRefreshCatalog();
      } else {
        showToast(`Failed to upload questions: ${data.error || data.message || 'Unknown error'}`);
      }
    } catch (e: any) {
      showToast(`Upload Error: ${e.message}`);
    } finally {
      setIngesting(false);
    }
  };

  // Sample JSON Template Generator
  const handleLoadSampleJson = () => {
    const sample = [
      {
        "id": 1,
        "questionText": {
          "en": "If a car travels 240 km in 4 hours, what is its average speed in m/s?",
          "hi": "यदि एक कार 4 घंटे में 240 किमी की दूरी तय करती है, तो उसकी औसत गति m/s में क्या है?"
        },
        "options": [
          { "en": "15 m/s", "hi": "15 m/s" },
          { "en": "16.67 m/s", "hi": "16.67 m/s" },
          { "en": "20 m/s", "hi": "20 m/s" },
          { "en": "25 m/s", "hi": "25 m/s" }
        ],
        "correctOption": 1,
        "explanation": {
          "en": "Speed in km/h = 240 / 4 = 60 km/h.\nConversion to m/s = 60 * (5/18) = 16.67 m/s.",
          "hi": "गति km/h में = 240 / 4 = 60 km/h।\nm/s में रूपांतरण = 60 * (5/18) = 16.67 m/s।"
        }
      },
      {
        "id": 2,
        "questionText": {
          "en": "Select the ANTONYM of the word: INVINCIBLE",
          "hi": "शब्द का विलोम शब्द (ANTONYM) चुनें: INVINCIBLE"
        },
        "options": [
          { "en": "small", "hi": "small" },
          { "en": "invisible", "hi": "invisible" },
          { "en": "vulnerable", "hi": "vulnerable" },
          { "en": "reachable", "hi": "reachable" }
        ],
        "correctOption": 2,
        "explanation": {
          "en": "vulnerable (Adjective): weak and easily hurt physically or emotionally.\ninvincible (Adjective): too strong to be defeated.",
          "hi": "vulnerable (Adjective): शारीरिक या भावनात्मक रूप से कमजोर।"
        }
      }
    ];

    setJsonInput(JSON.stringify(sample, null, 2));
    showToast("Loaded sample JSON question array into editor!");
  };

  const activePreviewQuestion = parsedQuestions[previewIndex];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30">
            <Zap className="h-3 w-3 text-amber-400 fill-amber-400" />
            Practice Series Management Portal
          </span>
          <h2 className="text-xl font-black text-white tracking-tight">
            Practice Domain Category Manager
          </h2>
          <p className="text-xs text-blue-100 font-medium max-w-xl">
            Create, edit, and delete Practice Domain Categories, paste JSON question arrays, verify syntax, and preview practice questions.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/20 shrink-0">
          <button
            onClick={() => setManagerTab('importer')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              managerTab === 'importer'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Question Importer</span>
          </button>
          <button
            onClick={() => setManagerTab('create_cat')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              managerTab === 'create_cat'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <FolderPlus className="h-4 w-4" />
            <span>Manage Domain Categories</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BULK QUESTION IMPORTER & PREVIEWER FOR PRACTICE SERIES */}
      {managerTab === 'importer' && (
        <div className="space-y-6">
          {/* STEP 1: Select Target Practice Domain Category */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="h-6 w-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">1</span>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Select Practice Domain Category
              </h3>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Target Practice Domain Category *
              </label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">— Select Target Practice Domain Category —</option>
                {practiceCatalog.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* STEP 2: Choose Input Method (JSON Paste vs Interactive Form) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">2</span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Choose Question Input Method
                </h3>
              </div>

              {/* Input Method Toggle Pill */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setImporterMode('json')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    importerMode === 'json'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Paste JSON Questions Array</span>
                </button>
                <button
                  onClick={() => setImporterMode('form')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    importerMode === 'form'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Add a New Question (Form)</span>
                </button>
              </div>
            </div>

            {/* INPUT METHOD A: PASTE JSON QUESTIONS ARRAY */}
            {importerMode === 'json' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Paste JSON Questions Array `[...]`
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSampleJson}
                    className="text-xs text-blue-600 dark:text-blue-400 font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Load Sample JSON Template
                  </button>
                </div>

                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`[
  {
    "id": 1,
    "questionText": { "en": "Question text in English", "hi": "प्रश्न हिंदी में" },
    "options": [
      { "en": "Option 1", "hi": "विकल्प 1" },
      { "en": "Option 2", "hi": "विकल्प 2" },
      { "en": "Option 3", "hi": "विकल्प 3" },
      { "en": "Option 4", "hi": "विकल्प 4" }
    ],
    "correctOption": 0,
    "explanation": { "en": "Detailed explanation", "hi": "व्याख्या" }
  }
]`}
                  rows={10}
                  className="w-full p-4 bg-slate-950 text-emerald-400 font-mono text-xs border border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500 shadow-inner resize-y"
                />

                {/* Error Banner */}
                {jsonError && (
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    <span>{jsonError}</span>
                  </div>
                )}

                {/* Action Row */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleVerifyJson}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-sm active:scale-95 transition cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verify JSON & Load Preview</span>
                  </button>
                </div>
              </div>
            )}

            {/* INPUT METHOD B: INTERACTIVE FORM BUILDER */}
            {importerMode === 'form' && (
              <form onSubmit={handleAddFormQuestion} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Question English */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Question Text (English) *
                    </label>
                    <textarea
                      value={formTextEn}
                      onChange={(e) => setFormTextEn(e.target.value)}
                      placeholder="Type question in English..."
                      rows={3}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  {/* Question Hindi */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      प्रश्न (Hindi)
                    </label>
                    <textarea
                      value={formTextHi}
                      onChange={(e) => setFormTextHi(e.target.value)}
                      placeholder="हिंदी में प्रश्न दर्ज करें..."
                      rows={3}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* Options Input Matrix */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Options Choices (4 Options Required)
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Option 1 (English / Hindi)</span>
                      <input
                        type="text"
                        value={opt1En}
                        onChange={(e) => setOpt1En(e.target.value)}
                        placeholder="Option 1 English..."
                        className="w-full mb-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium"
                      />
                      <input
                        type="text"
                        value={opt1Hi}
                        onChange={(e) => setOpt1Hi(e.target.value)}
                        placeholder="विकल्प 1 हिंदी..."
                        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Option 2 (English / Hindi)</span>
                      <input
                        type="text"
                        value={opt2En}
                        onChange={(e) => setOpt2En(e.target.value)}
                        placeholder="Option 2 English..."
                        className="w-full mb-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium"
                      />
                      <input
                        type="text"
                        value={opt2Hi}
                        onChange={(e) => setOpt2Hi(e.target.value)}
                        placeholder="विकल्प 2 हिंदी..."
                        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Option 3 (English / Hindi)</span>
                      <input
                        type="text"
                        value={opt3En}
                        onChange={(e) => setOpt3En(e.target.value)}
                        placeholder="Option 3 English..."
                        className="w-full mb-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium"
                      />
                      <input
                        type="text"
                        value={opt3Hi}
                        onChange={(e) => setOpt3Hi(e.target.value)}
                        placeholder="विकल्प 3 हिंदी..."
                        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Option 4 (English / Hindi)</span>
                      <input
                        type="text"
                        value={opt4En}
                        onChange={(e) => setOpt4En(e.target.value)}
                        placeholder="Option 4 English..."
                        className="w-full mb-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium"
                      />
                      <input
                        type="text"
                        value={opt4Hi}
                        onChange={(e) => setOpt4Hi(e.target.value)}
                        placeholder="विकल्प 4 हिंदी..."
                        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Correct Option Selector */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Correct Option Index *
                  </label>
                  <div className="flex items-center gap-3">
                    {[0, 1, 2, 3].map((idx) => (
                      <label key={idx} className="flex items-center gap-1.5 text-xs font-extrabold cursor-pointer">
                        <input
                          type="radio"
                          name="correctOptionIdx"
                          checked={formCorrectIndex === idx}
                          onChange={() => setFormCorrectIndex(idx)}
                          className="accent-blue-600"
                        />
                        <span>Option {idx + 1}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Action */}
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Add Question to List</span>
                </button>
              </form>
            )}
          </div>

          {/* STEP 3: LIVE VERIFIED QUESTION PREVIEWER & INGESTION */}
          {parsedQuestions.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">3</span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Verified Questions Preview ({parsedQuestions.length} Questions Ready)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Inspect question rendering and option answers before saving into database
                    </p>
                  </div>
                </div>

                {/* Language Switcher for Preview */}
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <select
                    value={previewLanguage}
                    onChange={(e) => setPreviewLanguage(e.target.value as 'en' | 'hi')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="en">English Preview</option>
                    <option value="hi">हिंदी Preview</option>
                  </select>
                </div>
              </div>

              {/* PREVIEW CARD */}
              {activePreviewQuestion && (
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
                  {/* Card Header & Pagination */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Question {previewIndex + 1} of {parsedQuestions.length}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                        disabled={previewIndex === 0}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => setPreviewIndex((prev) => Math.min(parsedQuestions.length - 1, prev + 1))}
                        disabled={previewIndex === parsedQuestions.length - 1}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed">
                      {previewIndex + 1}. {previewLanguage === 'hi' ? activePreviewQuestion.questionText.hi : activePreviewQuestion.questionText.en}
                    </h4>
                  </div>

                  {/* Options Matrix */}
                  <div className="space-y-2">
                    {activePreviewQuestion.options.map((opt: any, oIdx: number) => {
                      const isCorrect = oIdx === activePreviewQuestion.correctOption;
                      const optText = previewLanguage === 'hi' ? opt.hi : opt.en;
                      return (
                        <div
                          key={oIdx}
                          className={`p-3 rounded-xl text-xs font-extrabold flex items-center justify-between border ${
                            isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>({oIdx + 1}) {optText}</span>
                          {isCorrect && (
                            <span className="flex items-center gap-1 text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase">
                              <Check className="h-3 w-3" /> Correct Answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Solution Explanation */}
                  {(activePreviewQuestion.explanation.en || activePreviewQuestion.explanation.hi) && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3.5 rounded-xl text-xs space-y-1">
                      <span className="font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider text-[10px] block">
                        Detailed Solution & Explanation:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                        {previewLanguage === 'hi' ? activePreviewQuestion.explanation.hi : activePreviewQuestion.explanation.en}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Ingest & Upload Action Bar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  Target Practice Category: <strong className="text-blue-600 dark:text-blue-400">{activeCategoryObj?.name || selectedCatId || 'None Selected'}</strong>
                </span>

                <button
                  onClick={handleIngestQuestions}
                  disabled={ingesting || !selectedCatId}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  <span>{ingesting ? 'Uploading Questions...' : `Confirm & Save ${parsedQuestions.length} Questions`}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE & MANAGE PRACTICE DOMAIN CATEGORIES (EDIT / DELETE OPTIONS ADDED) */}
      {managerTab === 'create_cat' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-blue-600" />
              Manage Practice Domain Categories
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Create new categories or edit/delete existing Practice Domain Categories
            </p>
          </div>

          {/* Create Category Form */}
          <form onSubmit={handleCreateCategory} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                New Practice Domain Category Name *
              </label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. UPSC & Defence Practice Series"
                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description / Details
              </label>
              <input
                type="text"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="e.g. High-yield topic-wise drills for UPSC & Defence exams"
                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={creatingCat}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{creatingCat ? 'Creating...' : 'Create Practice Category'}</span>
            </button>
          </form>

          {/* List of Existing Practice Categories with Edit & Delete Options */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Existing Practice Domain Categories ({practiceCatalog.length})
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {practiceCatalog.map((cat) => {
                const isEditing = editingCatId === cat.id;

                return (
                  <div key={cat.id} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 shadow-xs">
                    {isEditing ? (
                      /* EDIT MODE FORM */
                      <div className="space-y-3">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Editing Category</span>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Category Name</label>
                          <input
                            type="text"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Description</label>
                          <input
                            type="text"
                            value={editCatDesc}
                            onChange={(e) => setEditCatDesc(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleSaveEditCategory(cat.id)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Save className="h-3.5 w-3.5" /> Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* DISPLAY MODE CARD */
                      <>
                        <div className="space-y-1">
                          <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-600 shrink-0" />
                            <span>{cat.name}</span>
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            {cat.description || 'Topic-wise practice category'}
                          </p>
                        </div>

                        {/* EDIT & DELETE ACTION BUTTONS */}
                        <div className="flex items-center gap-2 border-t border-slate-200/80 dark:border-slate-800/80 pt-3">
                          <button
                            onClick={() => handleStartEdit(cat)}
                            className="flex-1 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 font-bold py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
