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
  X,
  Layers,
  HelpCircle,
  Clock,
  Coins
} from 'lucide-react';

interface AppPracticeSeriesManagerProps {
  examCatalog: any[];
  showToast: (msg: string) => void;
  onRefreshCatalog?: () => void;
}

export const AppPracticeSeriesManager: React.FC<AppPracticeSeriesManagerProps> = ({
  examCatalog,
  showToast,
  onRefreshCatalog
}) => {
  // Mode selection: 5 tabs
  const [managerTab, setManagerTab] = useState<'create_cat' | 'create_sub' | 'create_section' | 'create_test' | 'importer'>('create_cat');

  // Input Method for Questions Importer: JSON vs Interactive Form
  const [importerMode, setImporterMode] = useState<'json' | 's3_url' | 'form'>('json');

  // Selected Category, SubCategory, Section, Test for navigation across tabs
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [selectedSecId, setSelectedSecId] = useState<string>('');
  const [selectedTestId, setSelectedTestId] = useState<string>('');

  // Category Creation Form state
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');
  const [creatingCat, setCreatingCat] = useState<boolean>(false);

  // Category Edit / Delete state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState<string>('');
  const [editCatDesc, setEditCatDesc] = useState<string>('');

  // Sub Category (Exam) Creation / Edit state
  const [newSubName, setNewSubName] = useState<string>('');
  const [creatingSub, setCreatingSub] = useState<boolean>(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState<string>('');

  // Section (TestSeries) Creation / Edit state
  const [newSecName, setNewSecName] = useState<string>('');
  const [creatingSec, setCreatingSec] = useState<boolean>(false);
  const [editingSecId, setEditingSecId] = useState<string | null>(null);
  const [editSecName, setEditSecName] = useState<string>('');

  // Test Creation Form state
  const [newTestTitle, setNewTestTitle] = useState<string>('');
  const [newTestDuration, setNewTestDuration] = useState<number>(20);
  const [newTestQsCount, setNewTestQsCount] = useState<number>(25);
  const [newTestMaxMarks, setNewTestMaxMarks] = useState<number>(50);
  const [newTestRequiredTier, setNewTestRequiredTier] = useState<string>('None');
  const [newTestPositiveMarks, setNewTestPositiveMarks] = useState<number>(2);
  const [newTestNegativeMarks, setNewTestNegativeMarks] = useState<number>(0.5);
  const [creatingTest, setCreatingTest] = useState<boolean>(false);

  // Test Editing state
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editTestTitle, setEditTestTitle] = useState<string>('');
  const [editTestPositiveMarks, setEditTestPositiveMarks] = useState<number>(2);
  const [editTestNegativeMarks, setEditTestNegativeMarks] = useState<number>(0.5);

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

  // Filter ONLY Practice Series Categories from examCatalog
  const initialPracticeCategories = examCatalog.filter(c =>
    (c as any).isPracticeSeries ||
    c.id.includes('_practice') ||
    c.name.toLowerCase().includes('practice')
  );

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
    initialPracticeCategories.forEach(addCat);
    return Array.from(map.values());
  })();

  const [practiceCatalog, setPracticeCatalog] = useState<any[]>(derivedCatalog);

  // Re-sync whenever examCatalog updates
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
    setPracticeCatalog(Array.from(map.values()));
  }, [examCatalog]);

  // Derived objects based on selections
  const activeCategoryObj = practiceCatalog.find(c => c.id === selectedCatId) || practiceCatalog[0];
  const activeSubCategories = activeCategoryObj?.subCategories || [];
  const activeSubObj = activeSubCategories.find((s: any) => s.id === selectedSubId) || activeSubCategories[0];
  const activeSections = activeSubObj?.subSubCategories || [];
  const activeSecObj = activeSections.find((sec: any) => sec.id === selectedSecId) || activeSections[0];
  const activeTests = activeSecObj?.tests || activeSubObj?.tests || [];
  const activeTestObj = activeTests.find((t: any) => t.id === selectedTestId) || activeTests[0];

  // ---------------------------------------------------------------------------
  // CATEGORY CRUD
  // ---------------------------------------------------------------------------
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showToast("App Practice Category Name is required!");
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

      showToast(`App Practice Category "${newCatName}" created successfully!`);
      setNewCatName('');
      setNewCatDesc('');
      if (onRefreshCatalog) onRefreshCatalog();
    } catch (err: any) {
      showToast(`Error creating practice category: ${err.message}`);
    } finally {
      setCreatingCat(false);
    }
  };

  const handleSaveEditCategory = async (catId: string) => {
    if (!editCatName.trim()) {
      showToast("App Practice Category Name cannot be empty!");
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

    showToast(`App Practice Category updated successfully!`);
    setEditingCatId(null);
    if (onRefreshCatalog) onRefreshCatalog();
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!window.confirm(`Are you sure you want to delete the practice category "${catName}"? This action cannot be undone.`)) {
      return;
    }

    if (selectedCatId === catId) setSelectedCatId('');

    const deletedIds = getDeletedCategoryIds();
    if (!deletedIds.includes(catId)) {
      deletedIds.push(catId);
      saveDeletedCategoryIds(deletedIds);
    }

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

    try {
      localStorage.removeItem(`mth_practice_questions_${catId}`);
      localStorage.removeItem(`mth_practice_options_${catId}`);
    } catch (e) {}

    showToast(`App Practice Category "${catName}" deleted successfully!`);
    if (onRefreshCatalog) onRefreshCatalog();
  };

  // ---------------------------------------------------------------------------
  // SUB CATEGORY (EXAM) CRUD
  // ---------------------------------------------------------------------------
  const handleCreateSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId) {
      showToast("Please select a parent App Practice Category first!");
      return;
    }
    if (!newSubName.trim()) {
      showToast("Sub Category Name is required!");
      return;
    }

    setCreatingSub(true);
    try {
      const generatedId = `${selectedCatId}_exam_${newSubName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-subcategory',
          id: generatedId,
          categoryId: selectedCatId,
          name: newSubName
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Sub Category "${newSubName}" created successfully!`);
        setNewSubName('');
        if (onRefreshCatalog) onRefreshCatalog();
      } else {
        showToast(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setCreatingSub(false);
    }
  };

  const handleSaveEditSubCategory = async (subId: string) => {
    if (!editSubName.trim()) {
      showToast("Sub Category Name cannot be empty!");
      return;
    }
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit-subcategory',
          subCategoryId: subId,
          name: editSubName
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Sub Category updated successfully!");
        setEditingSubId(null);
        if (onRefreshCatalog) onRefreshCatalog();
      } else {
        showToast(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDeleteSubCategory = async (subId: string, subName: string) => {
    if (!window.confirm(`Delete Sub Category "${subName}"? All tests within it will be removed.`)) return;
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-subcategory',
          subCategoryId: subId
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Sub Category "${subName}" deleted.`);
        if (onRefreshCatalog) onRefreshCatalog();
      } else {
        showToast(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // ---------------------------------------------------------------------------
  // SECTION (TEST SERIES) CRUD
  // ---------------------------------------------------------------------------
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId) {
      showToast("Please select a parent Sub Category first!");
      return;
    }
    if (!newSecName.trim()) {
      showToast("Section Name is required!");
      return;
    }

    setCreatingSec(true);
    try {
      const generatedId = `${selectedSubId}_sec_${newSecName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-subsubcategory',
          id: generatedId,
          subCategoryId: selectedSubId,
          name: newSecName
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Section "${newSecName}" created successfully!`);
        setNewSecName('');
        if (onRefreshCatalog) onRefreshCatalog();
      } else {
        showToast(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setCreatingSec(false);
    }
  };

  const handleSaveEditSection = async (secId: string) => {
    if (!editSecName.trim()) {
      showToast("Section Name cannot be empty!");
      return;
    }
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit-subsubcategory',
          subSubCategoryId: secId,
          name: editSecName
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Section updated successfully!");
        setEditingSecId(null);
        if (onRefreshCatalog) onRefreshCatalog();
      } else {
        showToast(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDeleteSection = async (secId: string, secName: string) => {
    if (!window.confirm(`Delete Section "${secName}"?`)) return;
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-subsubcategory',
          subSubCategoryId: secId
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Section "${secName}" deleted.`);
        if (onRefreshCatalog) onRefreshCatalog();
      } else {
        showToast(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // ---------------------------------------------------------------------------
  // PRACTICE TEST CRUD
  // ---------------------------------------------------------------------------
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const catId = selectedCatId || (activeCategoryObj?.id || '');
    const subId = selectedSubId || (activeSubObj?.id || '');
    const secId = selectedSecId || (activeSecObj?.id || '');

    if (!catId || !subId || !secId) {
      showToast("Please select Category, Sub Category, and Section first!");
      return;
    }
    if (!newTestTitle.trim()) {
      showToast("Practice Test Title is required!");
      return;
    }

    setCreatingTest(true);
    try {
      const generatedId = `${secId}_test_${Date.now().toString(36)}`;
      const newTest = {
        id: generatedId,
        title: newTestTitle.trim(),
        durationMinutes: Number(newTestDuration) || 20,
        questionsCount: Number(newTestQsCount) || 25,
        maxMarks: Number(newTestMaxMarks) || 50,
        requiredTierName: newTestRequiredTier,
        positiveMarks: Number(newTestPositiveMarks) || 2,
        negativeMarks: Number(newTestNegativeMarks) || 0.5,
      };

      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-mocktest',
          categoryId: catId,
          subCategoryId: subId,
          subSubCategoryId: secId,
          mockTest: newTest,
          data: {
            categoryId: catId,
            subCategoryId: subId,
            subSubCategoryId: secId,
            mockTest: newTest
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Practice Test "${newTestTitle}" created successfully!`);
        setNewTestTitle('');
        if (onRefreshCatalog) onRefreshCatalog();
      } else {
        showToast(`Failed to create test: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error creating practice test: ${err.message}`);
    } finally {
      setCreatingTest(false);
    }
  };

  const handleSaveEditTest = async (testId: string) => {
    if (!editTestTitle.trim()) {
      showToast("Test Title cannot be empty!");
      return;
    }
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit-mocktest-title',
          testId,
          title: editTestTitle.trim(),
          positiveMarks: editTestPositiveMarks,
          negativeMarks: editTestNegativeMarks,
          data: {
            testId,
            title: editTestTitle.trim(),
            positiveMarks: editTestPositiveMarks,
            negativeMarks: editTestNegativeMarks
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Practice Test updated successfully!");
        setEditingTestId(null);
        if (onRefreshCatalog) onRefreshCatalog();
      } else {
        showToast(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDeleteTest = async (catId: string, subId: string, testId: string, testTitle: string) => {
    if (!window.confirm(`Delete Practice Test "${testTitle}"?`)) return;
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-mocktest',
          categoryId: catId,
          subCategoryId: subId,
          testId,
          data: { categoryId: catId, subCategoryId: subId, testId }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Practice Test "${testTitle}" deleted.`);
        if (onRefreshCatalog) onRefreshCatalog();
      } else {
        showToast(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // ---------------------------------------------------------------------------
  // QUESTION VERIFICATION & IMPORTER
  // ---------------------------------------------------------------------------
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
    showToast(`Added Question #${parsedQuestions.length + 1} to Practice list!`);

    setFormTextEn('');
    setFormTextHi('');
    setOpt1En(''); setOpt1Hi('');
    setOpt2En(''); setOpt2Hi('');
    setOpt3En(''); setOpt3Hi('');
    setOpt4En(''); setOpt4Hi('');
    setFormExplanationEn('');
    setFormExplanationHi('');
  };

  const handleIngestQuestions = async () => {
    const targetCatId = selectedCatId || activeCategoryObj?.id || '';
    const targetTestId = selectedTestId || `${targetCatId}_default`;

    if (!targetCatId) {
      showToast("Please select a target Practice Category first!");
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
            categoryId: targetCatId,
            testId: targetTestId,
            questions: parsedQuestions
          },
          categoryId: targetCatId,
          testId: targetTestId,
          questions: parsedQuestions
        })
      });

      const data = await res.json();
      if (data.success) {
        try {
          localStorage.removeItem(`mth_practice_questions_${targetCatId}`);
          window.dispatchEvent(new Event('practice_questions_updated'));
        } catch (e) {}

        showToast(`Successfully uploaded ${parsedQuestions.length} questions to database for test "${targetTestId}"!`);
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
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30">
            <Zap className="h-3 w-3 text-amber-400 fill-amber-400" />
            App Practice Series Portal
          </span>
          <h2 className="text-xl font-black text-white tracking-tight">
            App Practice Series Manager
          </h2>
          <p className="text-xs text-blue-100 font-medium max-w-xl">
            Dedicated portal for App Practice Categories, Sub Categories (Exams), Sections (Test Series), Practice Tests & Question Importer.
          </p>
        </div>

        {/* 5-Tab Navigation Bar */}
        <div className="flex flex-wrap bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/20 shrink-0 gap-1">
          <button
            onClick={() => setManagerTab('create_cat')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              managerTab === 'create_cat' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <FolderPlus className="h-4 w-4" />
            <span>Categories</span>
          </button>
          <button
            onClick={() => setManagerTab('create_sub')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              managerTab === 'create_sub' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Sub Categories</span>
          </button>
          <button
            onClick={() => setManagerTab('create_section')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              managerTab === 'create_section' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Sections</span>
          </button>
          <button
            onClick={() => setManagerTab('create_test')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              managerTab === 'create_test' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Practice Tests</span>
          </button>
          <button
            onClick={() => setManagerTab('importer')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              managerTab === 'importer' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Question Importer</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PRACTICE CATEGORIES */}
      {managerTab === 'create_cat' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-blue-600" />
              Manage App Practice Categories
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Create, edit, or delete top-level Practice Categories (flagged with isPracticeSeries)
            </p>
          </div>

          <form onSubmit={handleCreateCategory} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Active / Passive Voice Practice"
                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description / Subtitle
              </label>
              <input
                type="text"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="e.g. High-yield topic-wise drills & practice sets"
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

          {/* List of Existing Practice Categories */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Existing Practice Categories ({practiceCatalog.length})
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {practiceCatalog.map((cat) => {
                const isEditing = editingCatId === cat.id;

                return (
                  <div key={cat.id} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 shadow-xs">
                    {isEditing ? (
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
                            onClick={() => setEditingCatId(null)}
                            className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-600 shrink-0" />
                            <span>{cat.name}</span>
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            {cat.description || 'Topic-wise practice category'}
                          </p>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block pt-1">
                            Sub Categories: {cat.subCategories?.length || 0}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 border-t border-slate-200/80 dark:border-slate-800/80 pt-3">
                          <button
                            onClick={() => {
                              setEditingCatId(cat.id);
                              setEditCatName(cat.name);
                              setEditCatDesc(cat.description || '');
                            }}
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

      {/* TAB 2: SUB CATEGORIES (EXAMS) */}
      {managerTab === 'create_sub' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              Manage Practice Sub Categories (Exams)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Create sub categories (exams) under any Practice Category
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Parent Practice Category *
              </label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">— Select Practice Category —</option>
                {practiceCatalog.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <form onSubmit={handleCreateSubCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Sub Category (Exam) Name *
                </label>
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="e.g. Active / Passive Voice Practice Exam"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={creatingSub || !selectedCatId}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{creatingSub ? 'Creating...' : 'Create Sub Category'}</span>
              </button>
            </form>
          </div>

          {/* Table of Sub Categories */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Sub Categories in "{activeCategoryObj?.name || 'Selected Category'}" ({activeSubCategories.length})
            </h4>

            <div className="space-y-2">
              {activeSubCategories.map((sub: any) => {
                const isEditing = editingSubId === sub.id;
                return (
                  <div key={sub.id} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editSubName}
                          onChange={(e) => setEditSubName(e.target.value)}
                          className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold flex-1"
                        />
                        <button
                          onClick={() => handleSaveEditSubCategory(sub.id)}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingSubId(null)}
                          className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{sub.name}</span>
                          <span className="text-[10px] text-slate-500 block">Sections: {sub.subSubCategories?.length || 0}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingSubId(sub.id);
                              setEditSubName(sub.name);
                            }}
                            className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSubCategory(sub.id, sub.name)}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Delete
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

      {/* TAB 3: SECTIONS (TEST SERIES) */}
      {managerTab === 'create_section' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Manage Practice Sections (Test Series)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Create practice sections under a Sub Category (Exam)
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Practice Category *
                </label>
                <select
                  value={selectedCatId}
                  onChange={(e) => {
                    setSelectedCatId(e.target.value);
                    setSelectedSubId('');
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">— Select Category —</option>
                  {practiceCatalog.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sub Category (Exam) *
                </label>
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">— Select Sub Category —</option>
                  {activeSubCategories.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <form onSubmit={handleCreateSection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Section Name *
                </label>
                <input
                  type="text"
                  value={newSecName}
                  onChange={(e) => setNewSecName(e.target.value)}
                  placeholder="e.g. Active / Passive Voice Practice Series"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={creatingSec || !selectedSubId}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{creatingSec ? 'Creating...' : 'Create Practice Section'}</span>
              </button>
            </form>
          </div>

          {/* Table of Sections */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Sections in "{activeSubObj?.name || 'Selected Sub Category'}" ({activeSections.length})
            </h4>

            <div className="space-y-2">
              {activeSections.map((sec: any) => {
                const isEditing = editingSecId === sec.id;
                return (
                  <div key={sec.id} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editSecName}
                          onChange={(e) => setEditSecName(e.target.value)}
                          className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold flex-1"
                        />
                        <button
                          onClick={() => handleSaveEditSection(sec.id)}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingSecId(null)}
                          className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{sec.name || sec.title}</span>
                          <span className="text-[10px] text-slate-500 block">Tests: {sec.tests?.length || 0}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingSecId(sec.id);
                              setEditSecName(sec.name || sec.title);
                            }}
                            className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSection(sec.id, sec.name || sec.title)}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Delete
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

      {/* TAB 4: PRACTICE TESTS MANAGEMENT */}
      {managerTab === 'create_test' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-blue-600" />
              Manage Practice Tests
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Create practice tests under a Section and configure test parameters (title, 25-question limits, duration, marks)
            </p>
          </div>

          <div className="space-y-4 max-w-2xl">
            {/* 3-Tier Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">1. Category</label>
                <select
                  value={selectedCatId}
                  onChange={(e) => {
                    setSelectedCatId(e.target.value);
                    setSelectedSubId('');
                    setSelectedSecId('');
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <option value="">— Select Category —</option>
                  {practiceCatalog.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">2. Sub Category</label>
                <select
                  value={selectedSubId}
                  onChange={(e) => {
                    setSelectedSubId(e.target.value);
                    setSelectedSecId('');
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <option value="">— Select Sub Category —</option>
                  {activeSubCategories.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">3. Section</label>
                <select
                  value={selectedSecId}
                  onChange={(e) => setSelectedSecId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <option value="">— Select Section —</option>
                  {activeSections.map((sec: any) => (
                    <option key={sec.id} value={sec.id}>{sec.name || sec.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Create Test Form */}
            <form onSubmit={handleCreateTest} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Practice Test Title *
                </label>
                <input
                  type="text"
                  value={newTestTitle}
                  onChange={(e) => setNewTestTitle(e.target.value)}
                  placeholder="e.g. Practice Questions Set 1 (Active / Passive Voice)"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Questions Count</label>
                  <input
                    type="number"
                    value={newTestQsCount}
                    onChange={(e) => setNewTestQsCount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={newTestDuration}
                    onChange={(e) => setNewTestDuration(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={newTestMaxMarks}
                    onChange={(e) => setNewTestMaxMarks(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Required Pass</label>
                  <select
                    value={newTestRequiredTier}
                    onChange={(e) => setNewTestRequiredTier(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <option value="None">Free (None)</option>
                    <option value="Testbook Pass">Pass</option>
                    <option value="Testbook Pass Pro">Pass Pro</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingTest}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{creatingTest ? 'Creating...' : 'Create Practice Test'}</span>
              </button>
            </form>
          </div>

          {/* Table of Practice Tests */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Tests in Selected Section ({activeTests.length})
            </h4>

            <div className="space-y-3">
              {activeTests.map((test: any) => {
                const isEditing = editingTestId === test.id;
                return (
                  <div key={test.id} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {isEditing ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 w-full">
                        <input
                          type="text"
                          value={editTestTitle}
                          onChange={(e) => setEditTestTitle(e.target.value)}
                          className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold flex-1 w-full"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveEditTest(test.id)}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingTestId(null)}
                            className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block">{test.title}</span>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-semibold">
                            <span>{test.questionsCount || 25} Qs</span>
                            <span>•</span>
                            <span>{test.durationMinutes || 20} Mins</span>
                            <span>•</span>
                            <span>{test.maxMarks || 50} Marks</span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400">+{test.positiveMarks ?? 2} / -{test.negativeMarks ?? 0.5}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedTestId(test.id);
                              setManagerTab('importer');
                              showToast(`Selected "${test.title}" for Question Importer.`);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Database className="h-3.5 w-3.5" /> Import Questions
                          </button>
                          <button
                            onClick={() => {
                              setEditingTestId(test.id);
                              setEditTestTitle(test.title);
                              setEditTestPositiveMarks(test.positiveMarks ?? 2);
                              setEditTestNegativeMarks(test.negativeMarks ?? 0.5);
                            }}
                            className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTest(selectedCatId || activeCategoryObj?.id || '', selectedSubId || activeSubObj?.id || '', test.id, test.title)}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Delete
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

      {/* TAB 5: QUESTION IMPORTER & LIVE PREVIEWER */}
      {managerTab === 'importer' && (
        <div className="space-y-6">
          {/* STEP 1: Select Target Test / Category */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="h-6 w-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">1</span>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Select Target Practice Test / Category
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Target Category *
                </label>
                <select
                  value={selectedCatId}
                  onChange={(e) => {
                    setSelectedCatId(e.target.value);
                    setSelectedSubId('');
                    setSelectedSecId('');
                    setSelectedTestId('');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">— Select Target Practice Category —</option>
                  {practiceCatalog.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Target Specific Practice Test (Optional)
                </label>
                <select
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Default Test (`{selectedCatId || 'category'}_default`)</option>
                  {activeTests.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* STEP 2: Input Method (JSON vs Interactive Form) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">2</span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Choose Question Input Method
                </h3>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setImporterMode('json')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    importerMode === 'json' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Paste JSON Array</span>
                </button>
                <button
                  onClick={() => setImporterMode('form')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    importerMode === 'form' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Add Question Form</span>
                </button>
              </div>
            </div>

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

                {jsonError && (
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    <span>{jsonError}</span>
                  </div>
                )}

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

            {importerMode === 'form' && (
              <form onSubmit={handleAddFormQuestion} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Option 1 (English) *</label>
                    <input
                      type="text"
                      value={opt1En}
                      onChange={(e) => setOpt1En(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">विकल्प 1 (Hindi)</label>
                    <input
                      type="text"
                      value={opt1Hi}
                      onChange={(e) => setOpt1Hi(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Option 2 (English) *</label>
                    <input
                      type="text"
                      value={opt2En}
                      onChange={(e) => setOpt2En(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">विकल्प 2 (Hindi)</label>
                    <input
                      type="text"
                      value={opt2Hi}
                      onChange={(e) => setOpt2Hi(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Option 3 (English) *</label>
                    <input
                      type="text"
                      value={opt3En}
                      onChange={(e) => setOpt3En(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">विकल्प 3 (Hindi)</label>
                    <input
                      type="text"
                      value={opt3Hi}
                      onChange={(e) => setOpt3Hi(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Option 4 (English) *</label>
                    <input
                      type="text"
                      value={opt4En}
                      onChange={(e) => setOpt4En(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">विकल्प 4 (Hindi)</label>
                    <input
                      type="text"
                      value={opt4Hi}
                      onChange={(e) => setOpt4Hi(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Correct Option *
                  </label>
                  <select
                    value={formCorrectIndex}
                    onChange={(e) => setFormCorrectIndex(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <option value={0}>Option 1 (A)</option>
                    <option value={1}>Option 2 (B)</option>
                    <option value={2}>Option 3 (C)</option>
                    <option value={3}>Option 4 (D)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Explanation (English)
                    </label>
                    <textarea
                      value={formExplanationEn}
                      onChange={(e) => setFormExplanationEn(e.target.value)}
                      placeholder="Detailed explanation..."
                      rows={2}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      व्याख्या (Hindi)
                    </label>
                    <textarea
                      value={formExplanationHi}
                      onChange={(e) => setFormExplanationHi(e.target.value)}
                      placeholder="विस्तृत व्याख्या..."
                      rows={2}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Add Question to List</span>
                </button>
              </form>
            )}
          </div>

          {/* STEP 3: Live Questions Previewer & Upload */}
          {parsedQuestions.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">3</span>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Verified Live Questions Preview ({parsedQuestions.length} Questions)
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setPreviewLanguage('en')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        previewLanguage === 'en' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setPreviewLanguage('hi')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        previewLanguage === 'hi' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      हिंदी
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={previewIndex === 0}
                      onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-extrabold px-2">
                      {previewIndex + 1} / {parsedQuestions.length}
                    </span>
                    <button
                      disabled={previewIndex === parsedQuestions.length - 1}
                      onClick={() => setPreviewIndex(prev => Math.min(parsedQuestions.length - 1, prev + 1))}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {activePreviewQuestion && (
                <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed">
                    Q{previewIndex + 1}. {previewLanguage === 'hi' ? activePreviewQuestion.questionText.hi : activePreviewQuestion.questionText.en}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activePreviewQuestion.options.map((opt: any, idx: number) => {
                      const isCorrect = idx === activePreviewQuestion.correctOption;
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                            isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>{String.fromCharCode(65 + idx)}. {previewLanguage === 'hi' ? opt.hi : opt.en}</span>
                          {isCorrect && <Check className="h-4 w-4 text-emerald-600" />}
                        </div>
                      );
                    })}
                  </div>

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

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  Target Category / Test: <strong className="text-blue-600 dark:text-blue-400">{selectedTestId || `${selectedCatId || activeCategoryObj?.id || 'default'}_default`}</strong>
                </span>

                <button
                  onClick={handleIngestQuestions}
                  disabled={ingesting || (!selectedCatId && !activeCategoryObj?.id)}
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
    </div>
  );
};
