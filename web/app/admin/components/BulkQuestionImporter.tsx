import React from 'react';
import { Database, Edit, FileText, CheckCircle2, AlertCircle, PlusCircle, X, Globe, Upload, FolderOpen, Monitor, Smartphone, LayoutGrid, Wifi, Battery, ArrowLeft, Check, Sparkles, BookOpen } from 'lucide-react';
import { processQuestionHtml, decodeHtml as decodeHtmlUtils } from '../../lib/mathUtils';

function decodeHtml(text: string): string {
  if (!text) return "";
  return processQuestionHtml(text);
}

function stripHtmlToPlainText(html: string): string {
  if (!html) return "";
  let text = String(html);
  for (let i = 0; i < 3; i++) {
    const temp = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    if (temp === text) break;
    text = temp;
  }
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

interface BulkQuestionImporterProps {
  examCatalog: any[];
  selectedUploadTestId: string;
  setSelectedUploadTestId: (id: string) => void;
  importerMode: 'json' | 's3_url' | 'form';
  setImporterMode: (mode: 'json' | 's3_url' | 'form') => void;
  loadTemplate: () => void;
  jsonInput: string;
  setJsonInput: (val: string) => void;
  uploadStatus: { type: 'success' | 'error'; message: string } | null;
  handleBulkUploadSubmit: (e: React.FormEvent) => void;
  parsedQuestions: any[];
  formQuestionsList: any[];
  handleClearFormQuestions: () => void;
  editingQuestionIndex: number | null;
  setEditingQuestionIndex: (idx: number | null) => void;
  getAvailableSections: () => string[];
  customSectionName: string;
  setCustomSectionName: (val: string) => void;
  selectedSection: string;
  setSelectedSection: (val: string) => void;
  formPassageEn?: string;
  setFormPassageEn?: (val: string) => void;
  formPassageHi?: string;
  setFormPassageHi?: (val: string) => void;
  formTextEn: string;
  setFormTextEn: (val: string) => void;
  formTextHi: string;
  setFormTextHi: (val: string) => void;
  opt1En: string;
  setOpt1En: (val: string) => void;
  opt1Hi: string;
  setOpt1Hi: (val: string) => void;
  opt2En: string;
  setOpt2En: (val: string) => void;
  opt2Hi: string;
  setOpt2Hi: (val: string) => void;
  opt3En: string;
  setOpt3En: (val: string) => void;
  opt3Hi: string;
  setOpt3Hi: (val: string) => void;
  opt4En: string;
  setOpt4En: (val: string) => void;
  opt4Hi: string;
  setOpt4Hi: (val: string) => void;
  opt5En: string;
  setOpt5En: (val: string) => void;
  opt5Hi: string;
  setOpt5Hi: (val: string) => void;
  formCorrectIndex: number;
  setFormCorrectIndex: (idx: number) => void;
  formExplanationEn: string;
  setFormExplanationEn: (val: string) => void;
  formExplanationHi: string;
  setFormExplanationHi: (val: string) => void;
  formPositiveMarks?: string;
  setFormPositiveMarks?: (val: string) => void;
  formNegativeMarks?: string;
  setFormNegativeMarks?: (val: string) => void;
  handleAddFormQuestion: (e: React.FormEvent) => void;
  previewLanguage: 'en' | 'hi';
  setPreviewLanguage: (lang: 'en' | 'hi') => void;
  previewQuestionIndex: number;
  setPreviewQuestionIndex: (idx: number) => void;
  handleConfirmIngestCustomQuestions: (metaPayload?: any) => void;
  showToast: (msg: string) => void;
  setFormQuestionsList: (val: any[]) => void;
  setParsedQuestions: (val: any[]) => void;
}

export const BulkQuestionImporter: React.FC<BulkQuestionImporterProps> = ({
  examCatalog,
  selectedUploadTestId,
  setSelectedUploadTestId,
  importerMode,
  setImporterMode,
  loadTemplate,
  jsonInput,
  setJsonInput,
  uploadStatus,
  handleBulkUploadSubmit,
  parsedQuestions,
  formQuestionsList,
  handleClearFormQuestions,
  editingQuestionIndex,
  setEditingQuestionIndex,
  getAvailableSections,
  customSectionName,
  setCustomSectionName,
  selectedSection,
  setSelectedSection,
  formPassageEn = '',
  setFormPassageEn = () => {},
  formPassageHi = '',
  setFormPassageHi = () => {},
  formTextEn,
  setFormTextEn,
  formTextHi,
  setFormTextHi,
  opt1En,
  setOpt1En,
  opt1Hi,
  setOpt1Hi,
  opt2En,
  setOpt2En,
  opt2Hi,
  setOpt2Hi,
  opt3En,
  setOpt3En,
  opt3Hi,
  setOpt3Hi,
  opt4En,
  setOpt4En,
  opt4Hi,
  setOpt4Hi,
  opt5En,
  setOpt5En,
  opt5Hi,
  setOpt5Hi,
  formCorrectIndex,
  setFormCorrectIndex,
  formExplanationEn,
  setFormExplanationEn,
  formExplanationHi,
  setFormExplanationHi,
  formPositiveMarks = '',
  setFormPositiveMarks = () => {},
  formNegativeMarks = '',
  setFormNegativeMarks = () => {},
  handleAddFormQuestion,
  previewLanguage,
  setPreviewLanguage,
  previewQuestionIndex,
  setPreviewQuestionIndex,
  handleConfirmIngestCustomQuestions,
  showToast,
  setFormQuestionsList,
  setParsedQuestions,
}) => {
  const [selCatId, setSelCatId] = React.useState<string>('');
  const [selSubId, setSelSubId] = React.useState<string>('');
  const [selSubSubId, setSelSubSubId] = React.useState<string>('');
  const [previewLayoutMode, setPreviewLayoutMode] = React.useState<'both' | 'web' | 'mobile'>('both');

  // Scoring Strategy Selection State (1: Complete Test, 2: Section-Wise, 3: Question-Wise)
  const [scoringStrategyMode, setScoringStrategyMode] = React.useState<'test' | 'section' | 'question'>('test');
  const [testLevelPosMarks, setTestLevelPosMarks] = React.useState<number>(2.0);
  const [testLevelNegMarks, setTestLevelNegMarks] = React.useState<number>(0.5);
  const [sectionLevelMarks, setSectionLevelMarks] = React.useState<Record<string, { positiveMarks: number; negativeMarks: number }>>({});

  const detectedSectionsList = React.useMemo(() => {
    if (!parsedQuestions || parsedQuestions.length === 0) return [];
    const set = new Set<string>();
    parsedQuestions.forEach((q: any) => {
      const secName = (q.section || q.sectionName || q.subject || 'General Studies').trim();
      if (secName) set.add(secName);
    });
    return Array.from(set);
  }, [parsedQuestions]);

  const loadQuestionIntoForm = (index: number) => {
    const q = parsedQuestions[index] || formQuestionsList[index];
    if (!q) return;
    setEditingQuestionIndex(index);
    setFormPassageEn(stripHtmlToPlainText(q.passageEn || q.passage?.en || ''));
    setFormPassageHi(stripHtmlToPlainText(q.passageHi || q.passage?.hi || ''));
    setFormTextEn(stripHtmlToPlainText(q.textEn || q.questionText?.en || ''));
    setFormTextHi(stripHtmlToPlainText(q.textHi || q.questionText?.hi || ''));
    setOpt1En(stripHtmlToPlainText(q.optionsEn?.[0] || q.options?.[0]?.en || q.options?.[0] || ''));
    setOpt1Hi(stripHtmlToPlainText(q.optionsHi?.[0] || q.options?.[0]?.hi || q.options?.[0] || ''));
    setOpt2En(stripHtmlToPlainText(q.optionsEn?.[1] || q.options?.[1]?.en || q.options?.[1] || ''));
    setOpt2Hi(stripHtmlToPlainText(q.optionsHi?.[1] || q.options?.[1]?.hi || q.options?.[1] || ''));
    setOpt3En(stripHtmlToPlainText(q.optionsEn?.[2] || q.options?.[2]?.en || q.options?.[2] || ''));
    setOpt3Hi(stripHtmlToPlainText(q.optionsHi?.[2] || q.options?.[2]?.hi || q.options?.[2] || ''));
    setOpt4En(stripHtmlToPlainText(q.optionsEn?.[3] || q.options?.[3]?.en || q.options?.[3] || ''));
    setOpt4Hi(stripHtmlToPlainText(q.optionsHi?.[3] || q.options?.[3]?.hi || q.options?.[3] || ''));
    setOpt5En(stripHtmlToPlainText(q.optionsEn?.[4] || q.options?.[4]?.en || q.options?.[4] || ''));
    setOpt5Hi(stripHtmlToPlainText(q.optionsHi?.[4] || q.options?.[4]?.hi || q.options?.[4] || ''));
    setFormCorrectIndex(q.correctIndex ?? q.correctOption ?? 0);
    setFormExplanationEn(stripHtmlToPlainText(q.explanationEn || q.explanation?.en || ''));
    setFormExplanationHi(stripHtmlToPlainText(q.explanationHi || q.explanation?.hi || ''));
    setFormPositiveMarks(q.positiveMarks !== undefined && q.positiveMarks !== null ? String(q.positiveMarks) : '');
    setFormNegativeMarks(q.negativeMarks !== undefined && q.negativeMarks !== null ? String(q.negativeMarks) : '');
    setSelectedSection(q.section || 'General Studies');
    setImporterMode('form');
    showToast(`Loaded Question #${index + 1} into Form Builder!`);
  };

  const resetFormForNewQuestion = () => {
    setEditingQuestionIndex(null);
    setFormPassageEn(''); setFormPassageHi('');
    setFormTextEn(''); setFormTextHi('');
    setOpt1En(''); setOpt1Hi(''); setOpt2En(''); setOpt2Hi('');
    setOpt3En(''); setOpt3Hi(''); setOpt4En(''); setOpt4Hi('');
    setOpt5En(''); setOpt5Hi('');
    setFormCorrectIndex(0); setFormExplanationEn(''); setFormExplanationHi('');
    setFormPositiveMarks(''); setFormNegativeMarks('');
    setSelectedSection('General Studies'); setCustomSectionName('');
    showToast("Form cleared for new question.");
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [s3UrlInput, setS3UrlInput] = React.useState('');
  const [s3QuestionsCount, setS3QuestionsCount] = React.useState('');
  const [isSubmittingS3Url, setIsSubmittingS3Url] = React.useState(false);

  const handleDirectS3UrlSave = async () => {
    if (!selectedUploadTestId) {
      showToast('Error: Please select a target mock test first.');
      return;
    }
    if (!s3UrlInput.trim()) {
      showToast('Error: Please enter a valid Tigris S3 JSON URL.');
      return;
    }

    try {
      setIsSubmittingS3Url(true);
      showToast('Linking S3 URL to target mock test...');

      const res = await fetch('/api/db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'super_secret_admin_key_2026'
        },
        body: JSON.stringify({
          action: 'save-custom-questions',
          data: {
            testId: selectedUploadTestId,
            title: selectedUploadTestId,
            questionsUrl: s3UrlInput.trim(),
            questionsCount: s3QuestionsCount.trim() ? Number(s3QuestionsCount.trim()) : undefined
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Successfully linked S3 URL to mock test! (${data.questionsCount || 0} questions)`);
        setS3UrlInput('');
        setS3QuestionsCount('');
      } else {
        showToast('Error: ' + (data.error || 'Failed to link S3 URL to database.'));
      }
    } catch (err: any) {
      showToast('Error saving S3 URL: ' + (err?.message || 'Network error'));
    } finally {
      setIsSubmittingS3Url(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      showToast('Please select a valid .json file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (text) {
          setJsonInput(text);
          setImporterMode('json');
          showToast(`Loaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB) into importer!`);
        }
      } catch (err: any) {
        showToast(`Failed to read file: ${err.message || 'Unknown error'}`);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const testSeriesCatalog = React.useMemo(() => {
    return examCatalog || [];
  }, [examCatalog]);

  React.useEffect(() => {
    if (selectedUploadTestId) {
      for (const cat of testSeriesCatalog) {
        for (const sub of cat.subCategories || []) {
          for (const subsub of sub.subSubCategories || []) {
            if ((subsub.tests || []).some((t: any) => t.id === selectedUploadTestId)) {
              setSelCatId(cat.id);
              setSelSubId(sub.id);
              setSelSubSubId(subsub.id);
              return;
            }
          }
        }
      }
    }
  }, [selectedUploadTestId, testSeriesCatalog]);

  const currentCategory = testSeriesCatalog.find(c => c.id === selCatId);
  const availableSubCategories = currentCategory ? currentCategory.subCategories || [] : [];
  
  const currentSubCategory = availableSubCategories.find((s: any) => s.id === selSubId);
  const availableSubSubCategories = currentSubCategory ? currentSubCategory.subSubCategories || [] : [];

  const currentSubSubCategory = availableSubSubCategories.find((ss: any) => ss.id === selSubSubId);
  const availableTests = currentSubSubCategory ? currentSubSubCategory.tests || [] : [];

  const allTests: any[] = [];
  testSeriesCatalog.forEach(cat => {
    (cat.subCategories || []).forEach((sub: any) => {
      (sub.subSubCategories || []).forEach((subsub: any) => {
        (subsub.tests || []).forEach((t: any) => {
          allTests.push({
            ...t,
            id: t.id,
            title: t.title,
            categoryName: cat.name,
            subCategoryName: `${sub.name} › ${subsub.name}`
          });
        });
      });
    });
  });

  const selectedTest = allTests.find(t => t.id === selectedUploadTestId);

  const testAnalysis = React.useMemo(() => {
    if (!parsedQuestions || parsedQuestions.length === 0) return null;

    let totalQuestions = parsedQuestions.length;
    let totalMaxMarks = 0;
    let passageQuestionsCount = 0;
    let explanationCount = 0;
    let englishCount = 0;
    let hindiCount = 0;
    let optionWarnings = 0;
    let answerKeyWarnings = 0;

    const sectionsMap: { [key: string]: { count: number; posMarks: Set<number>; negMarks: Set<number>; totalMarks: number; passageCount: number } } = {};

    parsedQuestions.forEach((q: any) => {
      const secName = (q.section || q.sectionName || q.subject || 'General Studies').trim();
      if (!sectionsMap[secName]) {
        sectionsMap[secName] = { count: 0, posMarks: new Set(), negMarks: new Set(), totalMarks: 0, passageCount: 0 };
      }
      sectionsMap[secName].count += 1;

      let pMarks = 2.0;
      let nMarks = 0.5;

      if (scoringStrategyMode === 'test') {
        pMarks = Number(testLevelPosMarks) || 2.0;
        nMarks = Number(testLevelNegMarks) || 0.5;
      } else if (scoringStrategyMode === 'section') {
        const secRule = sectionLevelMarks[secName];
        pMarks = secRule?.positiveMarks !== undefined ? Number(secRule.positiveMarks) : 2.0;
        nMarks = secRule?.negativeMarks !== undefined ? Number(secRule.negativeMarks) : 0.5;
      } else {
        // Question-wise
        pMarks = q.positiveMarks !== undefined && q.positiveMarks !== null && q.positiveMarks !== '' ? Number(q.positiveMarks) : (selectedTest?.positiveMarks ?? 2.0);
        nMarks = q.negativeMarks !== undefined && q.negativeMarks !== null && q.negativeMarks !== '' ? Number(q.negativeMarks) : (selectedTest?.negativeMarks ?? 0.5);
      }

      sectionsMap[secName].posMarks.add(pMarks);
      sectionsMap[secName].negMarks.add(nMarks);
      sectionsMap[secName].totalMarks += pMarks;
      totalMaxMarks += pMarks;

      if (q.passageEn || q.passageHi || q.passage?.en || q.passage?.hi) {
        passageQuestionsCount++;
        sectionsMap[secName].passageCount++;
      }
      if (q.explanationEn || q.explanationHi || q.explanation?.en || q.explanation?.hi || q.solutionEn || q.solutionHi) {
        explanationCount++;
      }
      if (q.textEn || q.questionText?.en) englishCount++;
      if (q.textHi || q.questionText?.hi) hindiCount++;

      const optsEn = q.optionsEn || q.options || [];
      const optsHi = q.optionsHi || [];
      if (optsEn.length < 2 && optsHi.length < 2) {
        optionWarnings++;
      }

      const cIdx = q.correctIndex !== undefined ? q.correctIndex : q.correctOption;
      if (cIdx === undefined || cIdx < 0 || cIdx >= Math.max(optsEn.length, optsHi.length, 4)) {
        answerKeyWarnings++;
      }
    });

    const sectionsList = Object.entries(sectionsMap).map(([name, data]) => {
      const posArr = Array.from(data.posMarks);
      const negArr = Array.from(data.negMarks);

      return {
        name,
        count: data.count,
        positiveMarks: posArr.length === 1 ? `+${posArr[0]}` : 'Variable',
        negativeMarks: negArr.length === 1 ? `-${negArr[0]}` : 'Variable',
        totalMarks: data.totalMarks,
        passageCount: data.passageCount,
      };
    });

    let totalTestDurationMinutes = selectedTest?.durationMinutes || 60;
    let hasSectionalTimings = !!selectedTest?.hasSectionalTiming;
    let sectionalTimingsList: number[] = [];

    if (Array.isArray(selectedTest?.sectionalTimings)) {
      sectionalTimingsList = selectedTest.sectionalTimings;
    } else if (typeof selectedTest?.sectionalTimings === 'string' && selectedTest.sectionalTimings.trim()) {
      sectionalTimingsList = selectedTest.sectionalTimings.split(',').map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n) && n > 0);
    }

    if (hasSectionalTimings && sectionalTimingsList.length > 0) {
      totalTestDurationMinutes = sectionalTimingsList.reduce((a, b) => a + b, 0);
    }

    return {
      totalQuestions,
      totalMaxMarks,
      sectionsCount: sectionsList.length,
      sectionsList,
      totalTestDurationMinutes,
      hasSectionalTimings,
      sectionalTimingsList,
      passageQuestionsCount,
      explanationCount,
      englishCount,
      hindiCount,
      optionWarnings,
      answerKeyWarnings,
    };
  }, [parsedQuestions, selectedTest, scoringStrategyMode, testLevelPosMarks, testLevelNegMarks, sectionLevelMarks]);
  const questionCount = formQuestionsList.length;
  const sectionColors: Record<string, string> = {};
  const sectionColorPalette = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
  const handleFinalSaveWithStrategy = async () => {
    if (!parsedQuestions || parsedQuestions.length === 0) return;

    // Resolve positiveMarks & negativeMarks per question based on selected strategy mode
    const resolvedQuestions = parsedQuestions.map((q: any) => {
      const secName = (q.section || q.sectionName || q.subject || 'General Studies').trim();
      let pMarks = 2.0;
      let nMarks = 0.5;

      if (scoringStrategyMode === 'test') {
        pMarks = Number(testLevelPosMarks) || 2.0;
        nMarks = Number(testLevelNegMarks) || 0.5;
      } else if (scoringStrategyMode === 'section') {
        const secRule = sectionLevelMarks[secName];
        pMarks = secRule?.positiveMarks !== undefined ? Number(secRule.positiveMarks) : 2.0;
        nMarks = secRule?.negativeMarks !== undefined ? Number(secRule.negativeMarks) : 0.5;
      } else {
        pMarks = q.positiveMarks !== undefined && q.positiveMarks !== null && q.positiveMarks !== '' ? Number(q.positiveMarks) : (selectedTest?.positiveMarks ?? 2.0);
        nMarks = q.negativeMarks !== undefined && q.negativeMarks !== null && q.negativeMarks !== '' ? Number(q.negativeMarks) : (selectedTest?.negativeMarks ?? 0.5);
      }

      return {
        ...q,
        positiveMarks: pMarks,
        negativeMarks: nMarks,
      };
    });

    setParsedQuestions(resolvedQuestions);

    const sectionsArray = (testAnalysis?.sectionsList || []).map((sec: any, idx: number) => {
      const secRule = sectionLevelMarks[sec.name];
      const p = secRule?.positiveMarks !== undefined ? Number(secRule.positiveMarks) : (scoringStrategyMode === 'test' ? (Number(testLevelPosMarks) || 2.0) : 2.0);
      const n = secRule?.negativeMarks !== undefined ? Number(secRule.negativeMarks) : (scoringStrategyMode === 'test' ? (Number(testLevelNegMarks) || 0.5) : 0.5);
      return {
        name: sec.name,
        orderIndex: idx,
        positiveMarks: p,
        negativeMarks: n,
      };
    });

    const metaPayload = {
      testId: selectedUploadTestId,
      title: selectedTest?.title || selectedUploadTestId,
      questions: resolvedQuestions,
      questionsCount: testAnalysis?.totalQuestions || resolvedQuestions.length,
      maxMarks: testAnalysis?.totalMaxMarks || resolvedQuestions.length * 2,
      durationMinutes: testAnalysis?.totalTestDurationMinutes || 60,
      hasSectionalTiming: testAnalysis?.hasSectionalTimings || false,
      sectionalTimings: testAnalysis?.sectionalTimingsList || [],
      scoringStrategyMode: scoringStrategyMode,
      positiveMarks: testLevelPosMarks,
      negativeMarks: testLevelNegMarks,
      sections: sectionsArray,
    };

    setTimeout(() => {
      handleConfirmIngestCustomQuestions(metaPayload);
    }, 100);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-800 dark:text-slate-100 font-sans">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Bulk Question Importer</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upload questions to any mock test using JSON paste or the interactive form builder</p>
        </div>
        {questionCount > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-2 rounded-xl">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">{questionCount}</div>
            <div>
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400">{questionCount} Question{questionCount !== 1 ? 's' : ''} Ready</p>
              <p className="text-[10px] text-blue-500 dark:text-blue-500">{[...new Set(formQuestionsList.map((q: any) => q.section).filter(Boolean))].length} section{[...new Set(formQuestionsList.map((q: any) => q.section).filter(Boolean))].length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}
      </div>

      {/* STEP 1 — Target Mock Test */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">1</div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Select Target Mock Test</h3>
          {selectedTest && (
            <span className="ml-auto text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Selected
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Exam Category */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              1. Category
            </label>
            <select
              value={selCatId}
              onChange={(e) => {
                const val = e.target.value;
                setSelCatId(val);
                setSelSubId('');
                setSelSubSubId('');
                setSelectedUploadTestId('');
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-bold"
            >
              <option value="">— Select Category —</option>
              {testSeriesCatalog.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Sub Category */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              2. Sub Category
            </label>
            <select
              value={selSubId}
              disabled={!selCatId}
              onChange={(e) => {
                const val = e.target.value;
                setSelSubId(val);
                setSelSubSubId('');
                setSelectedUploadTestId('');
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">— Select Sub Category —</option>
              {availableSubCategories.map((sub: any) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Sub Sub Category */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              3. Sub-Sub Category
            </label>
            <select
              value={selSubSubId}
              disabled={!selSubId}
              onChange={(e) => {
                const val = e.target.value;
                setSelSubSubId(val);
                setSelectedUploadTestId('');
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">— Select Sub-Sub Category —</option>
              {availableSubSubCategories.map((subsub: any) => (
                <option key={subsub.id} value={subsub.id}>{subsub.name}</option>
              ))}
            </select>
          </div>

          {/* 4. Mock Test */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              4. Target Mock Test
            </label>
            <select
              value={selectedUploadTestId}
              disabled={!selSubSubId}
              onChange={(e) => setSelectedUploadTestId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">— Select Mock Test —</option>
              {availableTests.map((t: any) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedTest && (
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 px-2.5 py-1 rounded-lg">{selectedTest.categoryName}</span>
            <span className="text-slate-400 dark:text-slate-600 self-center">›</span>
            <span className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg">{selectedTest.subCategoryName}</span>
            <span className="text-slate-400 dark:text-slate-600 self-center">›</span>
            <span className="bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 px-2.5 py-1 rounded-lg">{selectedTest.title}</span>
          </div>
        )}
      </div>

      {/* STEP 2 — Choose Input Method */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">2</div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Choose Input Method</h3>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setImporterMode('s3_url')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border-2 ${
              importerMode === 's3_url'
                ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/20'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-purple-400 hover:text-purple-600'
            }`}
          >
            <Globe className="h-4 w-4" />
            Direct Tigris S3 URL
          </button>
          <button
            type="button"
            onClick={() => setImporterMode('json')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border-2 ${
              importerMode === 'json'
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            <Database className="h-4 w-4" />
            Paste JSON Array
          </button>
          <button
            type="button"
            onClick={() => setImporterMode('form')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border-2 ${
              importerMode === 'form'
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            <Edit className="h-4 w-4" />
            Form Builder
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold cursor-pointer border-2 border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
          >
            <Upload className="h-4 w-4" />
            Pick JSON File from Computer
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
          />
          {importerMode === 'json' && (
            <button
              type="button"
              onClick={loadTemplate}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all"
            >
              <FileText className="h-4 w-4" />
              Load Template
            </button>
          )}
        </div>
      </div>

      {/* STEP 3 — Add Questions */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">3</div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
            {importerMode === 's3_url' ? 'Submit Direct Tigris S3 JSON File Link' : importerMode === 'json' ? 'Paste or Upload JSON Questions Array' : `${editingQuestionIndex !== null ? `Editing Question #${editingQuestionIndex + 1}` : 'Add a New Question'}`}
          </h3>
          {importerMode === 'form' && formQuestionsList.length > 0 && (
            <button
              type="button"
              onClick={handleClearFormQuestions}
              className="ml-auto text-[11px] text-red-500 hover:text-red-600 font-bold flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" /> Clear All ({formQuestionsList.length})
            </button>
          )}
        </div>

        <div className="p-6">
          {importerMode === 's3_url' ? (
            <div className="space-y-6">
              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-2xl">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-extrabold text-xs">
                  <Globe className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                  <span>Direct Tigris S3 / External S3 JSON Link Importer</span>
                </div>
                <p className="text-[11px] text-purple-600 dark:text-purple-300 mt-1.5 leading-relaxed">
                  Upload your <code>.json</code> question paper directly to your Tigris S3 bucket (or any public S3 bucket), then paste the URL below. This completely bypasses Vercel & Next.js server payload limits for large test files!
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Tigris S3 JSON URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={s3UrlInput}
                  onChange={(e) => setS3UrlInput(e.target.value)}
                  placeholder="https://fly.storage.tigris.dev/mocktest-assets/questions_ctet_paper_2___social_science_full_test_7.json"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-purple-500 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Question Count <span className="text-slate-400 font-normal">(Optional — Auto-detected if empty)</span>
                  </label>
                  <input
                    type="number"
                    value={s3QuestionsCount}
                    onChange={(e) => setS3QuestionsCount(e.target.value)}
                    placeholder="e.g. 270"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={!selectedUploadTestId || !s3UrlInput.trim() || isSubmittingS3Url}
                    onClick={handleDirectS3UrlSave}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-xs py-3 px-6 rounded-xl transition-all shadow-md shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Database className="h-4 w-4" />
                    {isSubmittingS3Url ? 'Linking S3 URL to Test...' : 'Link & Save S3 URL to Test'}
                  </button>
                </div>
              </div>
            </div>
          ) : importerMode === 'json' ? (
            <form onSubmit={handleBulkUploadSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  JSON Code / Questions Array
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 hover:text-white font-bold flex items-center gap-1.5 cursor-pointer px-3.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 transition-all shadow-sm"
                >
                  <FolderOpen className="h-3.5 w-3.5" /> Pick JSON File from Computer
                </button>
              </div>
              <textarea
                rows={14}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={'[\n  {\n    "textEn": "Question in English",\n    "textHi": "प्रश्न हिंदी में",\n    "optionsEn": ["A", "B", "C", "D"],\n    "optionsHi": ["अ", "ब", "स", "द"],\n    "correctIndex": 0,\n    "explanationEn": "Explanation...",\n    "section": "General Studies"\n  }\n]'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-green-400 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
              />
              {uploadStatus && (
                <div className={`p-4 rounded-xl flex items-start gap-3 border text-xs font-medium ${
                  uploadStatus.type === 'success'
                    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                }`}>
                  {uploadStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                  <span className="leading-relaxed">{uploadStatus.message}</span>
                </div>
              )}
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs active:scale-95 transition-all cursor-pointer shadow-md shadow-blue-500/20"
              >
                <Database className="h-4 w-4" />
                Verify JSON & Load Preview
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Question Selection Bar inside Form Builder */}
              <div className="bg-slate-100 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {editingQuestionIndex !== null ? `Editing Question #${editingQuestionIndex + 1}` : 'Form Builder — Add / Edit Question'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {parsedQuestions.length > 0 && (
                      <div className="flex items-center gap-2 flex-1 sm:flex-none">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Select Question:</span>
                        <select
                          value={editingQuestionIndex !== null ? editingQuestionIndex : ''}
                          onChange={(e) => {
                            if (e.target.value === '') {
                              resetFormForNewQuestion();
                            } else {
                              loadQuestionIntoForm(Number(e.target.value));
                            }
                          }}
                          className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer flex-1 sm:flex-none max-w-xs"
                        >
                          <option value="">+ Add New Blank Question</option>
                          {parsedQuestions.map((q: any, idx: number) => (
                            <option key={idx} value={idx}>
                              Q{idx + 1}: {q.section ? `[${q.section}] ` : ''}{(q.textEn || q.textHi || 'Question').substring(0, 40)}...
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {editingQuestionIndex !== null && (
                      <button
                        type="button"
                        onClick={resetFormForNewQuestion}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
                      >
                        + New Question
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Interactive Form */}
              <form onSubmit={handleAddFormQuestion} className="space-y-5 text-xs">
                {/* Section Selector & Per-Question Marks Override */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Section Category</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedSection}
                        onChange={(e) => {
                          setSelectedSection(e.target.value);
                          if (e.target.value !== 'create_new') setCustomSectionName('');
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-bold"
                      >
                        {getAvailableSections().map((sec) => (
                          <option key={sec} value={sec}>{sec}</option>
                        ))}
                        <option value="create_new">+ New Section...</option>
                      </select>
                      {selectedSection === 'create_new' && (
                        <input
                          type="text"
                          required
                          value={customSectionName}
                          onChange={(e) => setCustomSectionName(e.target.value)}
                          placeholder="Section name..."
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-bold"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Question +ve Marks <span className="text-slate-400 font-normal">(Optional — Inherits if empty)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={formPositiveMarks}
                      onChange={(e) => setFormPositiveMarks(e.target.value)}
                      placeholder="Inherit Section/Test (+2.0)"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Question -ve Marks <span className="text-slate-400 font-normal">(Optional — Inherits if empty)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={formNegativeMarks}
                      onChange={(e) => setFormNegativeMarks(e.target.value)}
                      placeholder="Inherit Section/Test (-0.5)"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-red-500 font-bold"
                    />
                  </div>
                </div>

                {/* Passage / Reading Comprehension Text (Bilingual) */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] uppercase tracking-wider">
                    <BookOpen className="h-4 w-4" />
                    <span>Passage / Comprehension Text (Optional for Reading Questions)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Passage Text (English)</label>
                      <textarea
                        value={formPassageEn}
                        onChange={(e) => setFormPassageEn(e.target.value)}
                        placeholder="Enter reading passage in English (if applicable)..."
                        rows={3}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 resize-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">गद्यांश / निर्देश पाठ (Hindi)</label>
                      <textarea
                        value={formPassageHi}
                        onChange={(e) => setFormPassageHi(e.target.value)}
                        placeholder="हिंदी में गद्यांश टाइप करें (यदि लागू हो)..."
                        rows={3}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 resize-none font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Bilingual Question Text */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Question Text (English) *</label>
                    <textarea
                      value={formTextEn}
                      onChange={(e) => setFormTextEn(e.target.value)}
                      placeholder="Type the question in English..."
                      rows={4}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 resize-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">प्रश्न पाठ (Hindi) *</label>
                    <textarea
                      value={formTextHi}
                      onChange={(e) => setFormTextHi(e.target.value)}
                      placeholder="हिंदी में प्रश्न टाइप करें..."
                      rows={4}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 resize-none font-medium"
                    />
                  </div>
                </div>

                {/* Options Grid */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Answer Options & Correct Key</h4>
                    <span className="text-[9px] text-slate-400">(Click option letter A–E to set as Correct Answer)</span>
                  </div>
                  {[
                    { en: opt1En, setEn: setOpt1En, hi: opt1Hi, setHi: setOpt1Hi, idx: 0, label: 'A', req: true },
                    { en: opt2En, setEn: setOpt2En, hi: opt2Hi, setHi: setOpt2Hi, idx: 1, label: 'B', req: true },
                    { en: opt3En, setEn: setOpt3En, hi: opt3Hi, setHi: setOpt3Hi, idx: 2, label: 'C', req: false },
                    { en: opt4En, setEn: setOpt4En, hi: opt4Hi, setHi: setOpt4Hi, idx: 3, label: 'D', req: false },
                    { en: opt5En, setEn: setOpt5En, hi: opt5Hi, setHi: setOpt5Hi, idx: 4, label: 'E', req: false },
                  ].map(({ en, setEn, hi, setHi, idx, label, req }) => (
                    <div key={label} className={`flex items-center gap-3 ${!req ? 'mt-1 pt-1' : ''}`}>
                      <button
                        type="button"
                        onClick={() => setFormCorrectIndex(idx)}
                        title={`Mark Option ${label} as correct answer`}
                        className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 cursor-pointer transition-all ${
                          formCorrectIndex === idx
                            ? 'bg-green-500 border-green-500 text-white shadow-md'
                            : 'border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-green-400'
                        }`}
                      >
                        {label}
                      </button>
                      <input
                        type="text"
                        value={en}
                        onChange={(e) => setEn(e.target.value)}
                        placeholder={`Option ${label} (English)${!req ? ' — optional' : ''}`}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                      />
                      <input
                        type="text"
                        value={hi}
                        onChange={(e) => setHi(e.target.value)}
                        placeholder={`विकल्प ${label} (Hindi)${!req ? ' — वैकल्पिक' : ''}`}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                  ))}
                </div>

                {/* Detailed Solution & Explanation Section */}
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>Detailed Solution & Explanation (Full View)</span>
                    </div>
                    <span className="text-[10px] text-amber-600/90 dark:text-amber-400/80 font-medium">Supports multiple paragraphs, step-by-step formulas & clean line breaks</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Explanation / Solution (English) <span className="text-slate-400 font-normal normal-case">— optional</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">({formExplanationEn.length} chars)</span>
                      </div>
                      <textarea
                        value={formExplanationEn}
                        onChange={(e) => setFormExplanationEn(e.target.value)}
                        placeholder="Type detailed solution in English...\n\nExample:\nStep 1: Calculate total resistance R = R1 + R2 = 10 + 20 = 30 ohms.\nStep 2: Use Ohm's Law V = I * R => I = 120 / 30 = 4 Amperes."
                        rows={8}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-y leading-relaxed font-medium min-h-[160px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          व्याख्या / पूरा हल (Hindi) <span className="text-slate-400 font-normal normal-case">— वैकल्पिक</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">({formExplanationHi.length} अक्षरों)</span>
                      </div>
                      <textarea
                        value={formExplanationHi}
                        onChange={(e) => setFormExplanationHi(e.target.value)}
                        placeholder="हिंदी में विस्तृत व्याख्या और हल टाइप करें...\n\nउदाहरण:\nचरण 1: कुल प्रतिरोध R = 10 + 20 = 30 ओम।\nचरण 2: ओम का नियम V = I * R => I = 120 / 30 = 4 एम्पीयर।"
                        rows={8}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-y leading-relaxed font-medium min-h-[160px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs active:scale-95 transition-all cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    {editingQuestionIndex !== null ? (
                      <><Edit className="h-4 w-4" /> Update Question #{editingQuestionIndex + 1}</>
                    ) : (
                      <><PlusCircle className="h-4 w-4" /> Add Question to List</>
                    )}
                  </button>
                  {editingQuestionIndex !== null && (
                    <button
                      type="button"
                      onClick={resetFormForNewQuestion}
                      className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-2.5 px-5 rounded-xl text-xs active:scale-95 transition-all cursor-pointer animate-fadeIn"
                    >
                      <X className="h-4 w-4" /> Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              {/* Uploaded Questions List Drawer inside Form Builder */}
              {parsedQuestions.length > 0 && (
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Loaded Questions List ({parsedQuestions.length} Questions)
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">Click "Edit in Form" to load any question into Form Builder</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                    {parsedQuestions.map((q: any, idx: number) => {
                      const isSelected = editingQuestionIndex === idx;
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-500/30'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-[11px] text-blue-600 dark:text-blue-400">
                              Q{idx + 1}. <span className="text-slate-500 dark:text-slate-400 font-bold">[{q.section || 'General'}]</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => loadQuestionIntoForm(idx)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700 transition cursor-pointer flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              <span>Edit in Form</span>
                            </button>
                          </div>
                          {(q.passageEn || q.passageHi || q.passage?.en || q.passage?.hi) && (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-2 rounded-lg text-[10px] text-amber-800 dark:text-amber-300 font-medium line-clamp-2">
                              📖 <strong>Passage:</strong> {q.passageEn || q.passageHi || q.passage?.en || q.passage?.hi}
                            </div>
                          )}
                          <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                            {q.textEn || q.textHi || q.questionText?.en || q.questionText?.hi || 'Question'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
                            <span className="text-slate-500 font-bold">{q.optionsEn?.length || q.options?.length || 4} Options</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Correct: Option {String.fromCharCode(65 + (q.correctIndex ?? q.correctOption ?? 0))}</span>
                            <span className="text-slate-400">•</span>
                            <span className={`font-extrabold px-2 py-0.5 rounded ${q.positiveMarks !== undefined || q.negativeMarks !== undefined ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                              🎯 Marks: {q.positiveMarks !== undefined ? `+${q.positiveMarks}` : '+2.0'} / {q.negativeMarks !== undefined ? `-${q.negativeMarks}` : '-0.5'} {q.positiveMarks !== undefined || q.negativeMarks !== undefined ? '(Custom)' : '(Inherited)'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* STEP 4 — Review Questions (Website & Mobile App Previews) */}
      {parsedQuestions.length > 0 && (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden font-sans">
          {/* Header & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">4</div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Review Questions ({parsedQuestions.length})</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Inspect layout & solutions for both Website Desktop view and Mobile App screen</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Preview Layout Mode Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewLayoutMode('both')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewLayoutMode === 'both'
                      ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Show both Website and Mobile App preview side-by-side"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Both Views</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLayoutMode('web')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewLayoutMode === 'web'
                      ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Show Website Desktop Preview only"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>Website</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLayoutMode('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewLayoutMode === 'mobile'
                      ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Show Mobile App Frame Preview only"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Mobile App</span>
                </button>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={previewLanguage}
                  onChange={(e) => setPreviewLanguage(e.target.value as 'en' | 'hi')}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section Legend */}
          {Object.keys(sectionColors).length > 0 && (
            <div className="px-6 pt-4 flex flex-wrap gap-2">
              {Object.entries(sectionColors).map(([sec, color]) => (
                <span key={sec} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {sec}
                </span>
              ))}
            </div>
          )}

          {/* Question Navigator Pills */}
          <div className="px-6 py-4 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto border-b border-slate-100 dark:border-slate-800">
            {parsedQuestions.map((q: any, idx: number) => {
              const sec = q.section || 'General';
              const color = sectionColors[sec] || '#6B7280';
              const isActive = previewQuestionIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPreviewQuestionIndex(idx)}
                  className={`h-7 w-7 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                    isActive ? 'text-white scale-110 shadow-md ring-2 ring-blue-500' : 'text-white opacity-60 hover:opacity-90'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Q${idx + 1}: ${sec}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Active Question Preview Content */}
          {(() => {
            const activeQ = parsedQuestions[previewQuestionIndex];
            if (!activeQ) return null;
            const qPassage = previewLanguage === 'en' 
              ? (activeQ.passageEn || activeQ.passage?.en)
              : (activeQ.passageHi || activeQ.passage?.hi || activeQ.passageEn || activeQ.passage?.en);
            const qText = previewLanguage === 'en' ? activeQ.textEn : activeQ.textHi;
            const qOptions = previewLanguage === 'en' ? activeQ.optionsEn : activeQ.optionsHi;
            const qExp = previewLanguage === 'en' ? activeQ.explanationEn : activeQ.explanationHi;
            const sec = activeQ.section || 'General Studies';
            const secColor = sectionColors[sec] || '#3B82F6';

            // Render Website Preview Component
            const renderWebsitePreview = () => (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex-1">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/80">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Website Desktop Preview</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${secColor}20`, color: secColor }}>
                      {sec}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold">Q{previewQuestionIndex + 1} of {parsedQuestions.length}</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      🎯 Marks: {activeQ.positiveMarks !== undefined ? `+${activeQ.positiveMarks}` : '+2.0'} / {activeQ.negativeMarks !== undefined ? `-${activeQ.negativeMarks}` : '-0.5'}
                    </span>
                    <button
                      type="button"
                      onClick={() => loadQuestionIntoForm(previewQuestionIndex)}
                      className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800"
                    >
                      Edit in Form
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this question?')) {
                          const updated = formQuestionsList.filter((_: any, i: number) => i !== previewQuestionIndex);
                          setFormQuestionsList(updated);
                          setParsedQuestions(updated);
                          setJsonInput(JSON.stringify(updated, null, 2));
                          setPreviewQuestionIndex(Math.min(previewQuestionIndex, updated.length - 1));
                          showToast('Question deleted.');
                        }
                      }}
                      className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Passage Text if present */}
                  {qPassage && (
                    <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Passage / Comprehension Text</span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed markup-content font-medium" dangerouslySetInnerHTML={{ __html: decodeHtml(qPassage) }} />
                    </div>
                  )}

                  {/* Question Text */}
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed markup-content" dangerouslySetInnerHTML={{ __html: decodeHtml(qText) }} />

                  {/* Options */}
                  <div className="space-y-2">
                    {(qOptions || []).map((opt: string, i: number) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                          i === activeQ.correctIndex
                            ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800 text-green-800 dark:text-green-300 font-bold shadow-sm'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className={`font-black text-[11px] w-5 shrink-0 ${i === activeQ.correctIndex ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <div className="flex-1 markup-content" dangerouslySetInnerHTML={{ __html: decodeHtml(opt) }} />
                        {i === activeQ.correctIndex && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto shrink-0" />}
                      </div>
                    ))}
                  </div>

                  {/* Solution / Explanation */}
                  {qExp && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span>Website Solution & Explanation</span>
                      </div>
                      <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed markup-content font-semibold" dangerouslySetInnerHTML={{ __html: decodeHtml(qExp) }} />
                    </div>
                  )}
                </div>
              </div>
            );

            // Render Mobile App Size Frame Preview Component
            const renderMobileAppPreview = () => (
              <div className="flex flex-col items-center justify-start">
                {/* Mobile Smartphone Frame Container */}
                <div className="w-full max-w-[360px] bg-slate-950 rounded-[40px] p-3 shadow-2xl border-[6px] border-slate-800/90 font-sans">
                  <div className="bg-slate-900 rounded-[30px] overflow-hidden border border-slate-800 text-slate-100 flex flex-col min-h-[560px] shadow-inner">
                    
                    {/* Mobile Device Status Bar */}
                    <div className="bg-slate-950 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400 font-bold border-b border-slate-800/60">
                      <span>09:41</span>
                      {/* Notch */}
                      <div className="w-16 h-3 bg-slate-900 rounded-full flex items-center justify-center">
                        <div className="w-4 h-1 bg-slate-800 rounded-full" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Wifi className="h-3 w-3 text-slate-400" />
                        <Battery className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </div>

                    {/* Mobile App Header Bar */}
                    <div className="bg-blue-600 dark:bg-blue-700 text-white px-3.5 py-2.5 flex items-center justify-between shadow-md">
                      <div className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        <div>
                          <p className="text-xs font-black leading-tight tracking-tight">Mock Test App</p>
                          <p className="text-[9px] text-blue-200 font-semibold">{sec}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black bg-blue-800/90 px-2 py-0.5 rounded-full text-blue-100 border border-blue-400/30">
                        {previewLanguage.toUpperCase()}
                      </span>
                    </div>

                    {/* Mobile Screen Body Viewport */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3 bg-slate-950 overflow-y-auto">
                      <div className="space-y-3">
                        
                        {/* Question Meta Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-[10px] font-extrabold tracking-wider">
                          <span className="text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50">
                            Q.{previewQuestionIndex + 1} / {parsedQuestions.length}
                          </span>
                          <span className="text-emerald-400 font-black bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                            +2.0  -0.5
                          </span>
                        </div>

                        {/* Passage text if present */}
                        {qPassage && (
                          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1">
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider block">📖 Passage Text:</span>
                            <div className="text-[11px] text-slate-300 leading-relaxed markup-content line-clamp-4" dangerouslySetInnerHTML={{ __html: decodeHtml(qPassage) }} />
                          </div>
                        )}

                        {/* Mobile Question Text */}
                        <div 
                          className="text-xs font-semibold text-slate-100 leading-relaxed markup-content"
                          dangerouslySetInnerHTML={{ __html: decodeHtml(qText) }} 
                        />

                        {/* Mobile Touchable Option Cards */}
                        <div className="space-y-2 pt-1">
                          {(qOptions || []).map((opt: string, i: number) => {
                            const isCorrect = i === activeQ.correctIndex;
                            return (
                              <div
                                key={i}
                                className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs font-medium transition-all border ${
                                  isCorrect
                                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold shadow-md shadow-emerald-950/40'
                                    : 'bg-slate-900/90 border-slate-800/90 text-slate-300'
                                }`}
                              >
                                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                  isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {String.fromCharCode(65 + i)}
                                </div>
                                <div className="flex-1 text-[11px] leading-snug markup-content" dangerouslySetInnerHTML={{ __html: decodeHtml(opt) }} />
                                {isCorrect && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 ml-auto" />}
                              </div>
                            );
                          })}
                        </div>

                        {/* Mobile App Solution / Explanation Box */}
                        {qExp && (
                          <div className="bg-amber-950/50 border border-amber-800/60 rounded-xl p-3 mt-3 space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 uppercase tracking-wider">
                              <Sparkles className="h-3 w-3 text-amber-400" />
                              <span>Mobile Solution Card</span>
                            </div>
                            <div 
                              className="text-[11px] text-amber-200/95 leading-relaxed markup-content font-medium" 
                              dangerouslySetInnerHTML={{ __html: decodeHtml(qExp) }} 
                            />
                          </div>
                        )}
                      </div>

                      {/* Mobile Navigation Simulation */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-extrabold text-slate-400">
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">‹ Prev</span>
                        <span className="text-emerald-400 bg-emerald-950/90 border border-emerald-800/60 px-2 py-0.5 rounded">Solution Mode</span>
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Next ›</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );

            return (
              <div className="p-6">
                {previewLayoutMode === 'both' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {renderWebsitePreview()}
                    {renderMobileAppPreview()}
                  </div>
                )}
                {previewLayoutMode === 'web' && renderWebsitePreview()}
                {previewLayoutMode === 'mobile' && renderMobileAppPreview()}
              </div>
            );
          })()}
        </div>
      )}

      {/* STEP 5 — Full Test Analysis & Pre-Import Audit Report */}
      {parsedQuestions.length > 0 && testAnalysis && (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden font-sans space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 text-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center shrink-0 font-black">
                5
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-purple-500/30 text-purple-200 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border border-purple-400/30">Pre-Import Audit</span>
                  <h3 className="font-extrabold text-base tracking-tight text-white">Full Test Paper Analysis & Verification</h3>
                </div>
                <p className="text-xs text-purple-200/80 mt-0.5">
                  Audit total questions, calculated max marks, sectional timings, and question quality before confirming save
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15">
              <Database className="w-4 h-4 text-purple-300" />
              <div className="text-left text-xs">
                <span className="block text-[9px] text-purple-200 uppercase font-extrabold">Target Mock Test</span>
                <span className="font-bold text-white">{selectedTest?.title || 'Selected Test'}</span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* MARKING STRATEGY SELECTION BOX */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl border border-indigo-800/60 space-y-4 text-white font-sans shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-black text-sm">
                    🎯
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white uppercase tracking-wide">Select Test Marking Strategy</h4>
                    <p className="text-[11px] text-indigo-200/80 font-medium">Choose one marking rule strategy for this mock test paper before final analysis</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-3 py-1 rounded-lg bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
                  Active Strategy: {scoringStrategyMode === 'test' ? '1. Complete Test Marks' : scoringStrategyMode === 'section' ? '2. Section-Wise Marks' : '3. Question-Wise Custom Marks'}
                </span>
              </div>

              {/* 3 Strategy Mode Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Option 1: Complete Test Marks */}
                <button
                  type="button"
                  onClick={() => setScoringStrategyMode('test')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    scoringStrategyMode === 'test'
                      ? 'bg-indigo-600/90 border-indigo-400 text-white shadow-lg ring-2 ring-indigo-400'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs">1. Complete Test Marks</span>
                    {scoringStrategyMode === 'test' && <CheckCircle2 className="w-4 h-4 text-indigo-200" />}
                  </div>
                  <p className="text-[10px] text-slate-300/80 leading-relaxed font-medium">
                    Apply uniform positive (+ve) & negative (-ve) marks to all questions across the paper.
                  </p>
                </button>

                {/* Option 2: Section-Wise Marks */}
                <button
                  type="button"
                  onClick={() => setScoringStrategyMode('section')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    scoringStrategyMode === 'section'
                      ? 'bg-purple-600/90 border-purple-400 text-white shadow-lg ring-2 ring-purple-400'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs">2. Section-Wise Marks</span>
                    {scoringStrategyMode === 'section' && <CheckCircle2 className="w-4 h-4 text-purple-200" />}
                  </div>
                  <p className="text-[10px] text-slate-300/80 leading-relaxed font-medium">
                    Specify distinct positive (+ve) & negative (-ve) marks for each section.
                  </p>
                </button>

                {/* Option 3: Question-Wise Marks */}
                <button
                  type="button"
                  onClick={() => setScoringStrategyMode('question')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    scoringStrategyMode === 'question'
                      ? 'bg-emerald-600/90 border-emerald-400 text-white shadow-lg ring-2 ring-emerald-400'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs">3. Question-Wise Marks</span>
                    {scoringStrategyMode === 'question' && <CheckCircle2 className="w-4 h-4 text-emerald-200" />}
                  </div>
                  <p className="text-[10px] text-slate-300/80 leading-relaxed font-medium">
                    Respect individual positive (+ve) & negative (-ve) marks defined per question.
                  </p>
                </button>
              </div>

              {/* Active Mode Interactive Controls */}
              {scoringStrategyMode === 'test' && (
                <div className="p-4 bg-indigo-950/60 border border-indigo-800/80 rounded-xl space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">Set Uniform Test Marking Rule</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Positive Marks (+ve per correct answer)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={testLevelPosMarks}
                        onChange={(e) => setTestLevelPosMarks(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-indigo-700/60 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Negative Penalty (-ve per wrong answer)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={testLevelNegMarks}
                        onChange={(e) => setTestLevelNegMarks(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-indigo-700/60 rounded-lg px-3 py-2 text-xs text-red-300 font-bold focus:outline-none focus:border-red-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {scoringStrategyMode === 'section' && (
                <div className="p-4 bg-purple-950/60 border border-purple-800/80 rounded-xl space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300">Configure Marks Per Section</span>
                  <div className="space-y-2">
                    {detectedSectionsList.map((secName) => {
                      const currentRule = sectionLevelMarks[secName] || { positiveMarks: 2.0, negativeMarks: 0.5 };
                      return (
                        <div key={secName} className="p-3 bg-slate-900/90 border border-purple-900/60 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          <div className="sm:col-span-6 font-bold text-xs text-white">
                            {secName}
                          </div>
                          <div className="sm:col-span-3">
                            <label className="block text-[9px] font-bold text-purple-300 uppercase mb-0.5">+ve Marks</label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={currentRule.positiveMarks}
                              onChange={(e) => {
                                setSectionLevelMarks({
                                  ...sectionLevelMarks,
                                  [secName]: { ...currentRule, positiveMarks: Number(e.target.value) }
                                });
                              }}
                              className="w-full bg-slate-950 border border-purple-700/60 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-bold focus:outline-none"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="block text-[9px] font-bold text-purple-300 uppercase mb-0.5">-ve Marks</label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={currentRule.negativeMarks}
                              onChange={(e) => {
                                setSectionLevelMarks({
                                  ...sectionLevelMarks,
                                  [secName]: { ...currentRule, negativeMarks: Number(e.target.value) }
                                });
                              }}
                              className="w-full bg-slate-950 border border-purple-700/60 rounded-lg px-2.5 py-1 text-xs text-red-400 font-bold focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {scoringStrategyMode === 'question' && (
                <div className="p-4 bg-emerald-950/80 border border-emerald-800/80 rounded-xl space-y-4 font-sans">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/50 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 block">
                        Question-Wise Custom Marking Editor
                      </span>
                      <p className="text-[11px] text-emerald-200/80 font-medium">
                        Set positive (+ve) and negative (-ve) marks for each question individually below.
                      </p>
                    </div>

                    {/* Bulk Fast Fill Controls */}
                    <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-emerald-700/50">
                      <span className="text-[10px] font-bold text-slate-300 uppercase">Fast Fill All Qs:</span>
                      <input
                        type="number"
                        placeholder="+ve"
                        step="0.01"
                        id="bulkPosInput"
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 font-bold focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="-ve"
                        step="0.01"
                        id="bulkNegInput"
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-red-400 font-bold focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const pVal = (document.getElementById('bulkPosInput') as HTMLInputElement)?.value;
                          const nVal = (document.getElementById('bulkNegInput') as HTMLInputElement)?.value;
                          if (pVal !== '' || nVal !== '') {
                            const updated = parsedQuestions.map((q: any) => ({
                              ...q,
                              positiveMarks: pVal !== '' ? Number(pVal) : (q.positiveMarks ?? 2.0),
                              negativeMarks: nVal !== '' ? Number(nVal) : (q.negativeMarks ?? 0.5),
                            }));
                            setParsedQuestions(updated);
                          }
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition cursor-pointer shadow-xs"
                      >
                        Apply to All Qs
                      </button>
                    </div>
                  </div>

                  {/* High-Density Scrollable Questions Table */}
                  <div className="max-h-96 overflow-y-auto border border-emerald-800/60 rounded-xl bg-slate-900/95 font-sans shadow-inner">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-300 uppercase text-[9px] font-black tracking-wider border-b border-emerald-800/60 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3.5 w-16">Q #</th>
                          <th className="py-2.5 px-3">Question Text & Section</th>
                          <th className="py-2.5 px-3 w-36 text-center">Positive Marks (+ve)</th>
                          <th className="py-2.5 px-3 w-36 text-center">Negative Marks (-ve)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {parsedQuestions.map((q: any, idx: number) => {
                          const qText = stripHtmlToPlainText(q.textEn || q.textHi || q.questionText?.en || q.questionText?.hi || `Question ${idx + 1}`);
                          const qSec = (q.section || q.sectionName || q.subject || 'General Studies').trim();
                          const posVal = q.positiveMarks !== undefined && q.positiveMarks !== null && q.positiveMarks !== '' ? Number(q.positiveMarks) : 2.0;
                          const negVal = q.negativeMarks !== undefined && q.negativeMarks !== null && q.negativeMarks !== '' ? Number(q.negativeMarks) : 0.5;

                          return (
                            <tr key={idx} className="hover:bg-slate-800/50 transition">
                              <td className="py-2.5 px-3.5 font-black text-emerald-400 text-xs">
                                Q{idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="font-bold text-white line-clamp-1 text-xs">
                                  {qText}
                                </p>
                                <span className="text-[10px] text-indigo-300 font-semibold">
                                  Section: {qSec}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  value={posVal}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const updated = [...parsedQuestions];
                                    updated[idx] = { ...updated[idx], positiveMarks: val };
                                    setParsedQuestions(updated);
                                  }}
                                  className="w-24 bg-slate-950 border border-emerald-700/60 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-bold text-center focus:outline-none focus:border-emerald-400"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  value={negVal}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const updated = [...parsedQuestions];
                                    updated[idx] = { ...updated[idx], negativeMarks: val };
                                    setParsedQuestions(updated);
                                  }}
                                  className="w-24 bg-slate-950 border border-red-700/60 rounded-lg px-2.5 py-1 text-xs text-red-400 font-bold text-center focus:outline-none focus:border-red-400"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Overview Stat Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1: Total Questions */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Questions</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{testAnalysis.totalQuestions}</span>
                  <span className="text-xs font-bold text-slate-500">Qs</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">✓ Fully Loaded</span>
              </div>

              {/* Card 2: Calculated Max Marks */}
              <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-1">
                <span className="text-[10px] font-extrabold text-purple-700 dark:text-purple-400 uppercase tracking-wider block">Calculated Max Marks</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-purple-900 dark:text-purple-100">{testAnalysis.totalMaxMarks}</span>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Marks</span>
                </div>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium block">Sum of question positive marks</span>
              </div>

              {/* Card 3: Total Test Duration */}
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 space-y-1">
                <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">Total Test Time</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-blue-900 dark:text-blue-100">{testAnalysis.totalTestDurationMinutes}</span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Minutes</span>
                </div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block">
                  {testAnalysis.hasSectionalTimings ? `⏱️ Sectional Timing Enabled` : `⏳ Overall Test Duration`}
                </span>
              </div>

              {/* Card 4: Detected Sections */}
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-1">
                <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Sections Count</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-amber-900 dark:text-amber-100">{testAnalysis.sectionsCount}</span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Sections</span>
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">Categorized subjects</span>
              </div>
            </div>

            {/* Sectional Breakdown Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Section-Wise Scoring & Timing Breakdown
                </h4>
                {testAnalysis.hasSectionalTimings && testAnalysis.sectionalTimingsList.length > 0 && (
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Sectional Durations: {testAnalysis.sectionalTimingsList.join(' min, ')} min
                  </span>
                )}
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase text-[9px] font-black tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Section Name</th>
                      <th className="py-2.5 px-4 text-center">Questions</th>
                      <th className="py-2.5 px-4 text-center">+ve Marks / Q</th>
                      <th className="py-2.5 px-4 text-center">-ve Penalty / Q</th>
                      <th className="py-2.5 px-4 text-center">Section Total Marks</th>
                      <th className="py-2.5 px-4 text-center">Passage Qs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                    {testAnalysis.sectionsList.map((sec, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                          {sec.name}
                        </td>
                        <td className="py-3 px-4 text-center font-extrabold">{sec.count} Qs</td>
                        <td className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">{sec.positiveMarks}</td>
                        <td className="py-3 px-4 text-center text-red-600 dark:text-red-400 font-bold">{sec.negativeMarks}</td>
                        <td className="py-3 px-4 text-center font-black text-purple-700 dark:text-purple-300">{sec.totalMarks} Marks</td>
                        <td className="py-3 px-4 text-center text-slate-500 font-bold">{sec.passageCount > 0 ? `${sec.passageCount} Qs` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900/80 font-black text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                    <tr>
                      <td className="py-3 px-4">TOTAL PAPER AUDIT</td>
                      <td className="py-3 px-4 text-center text-purple-600 dark:text-purple-400">{testAnalysis.totalQuestions} Qs</td>
                      <td className="py-3 px-4 text-center text-slate-500">—</td>
                      <td className="py-3 px-4 text-center text-slate-500">—</td>
                      <td className="py-3 px-4 text-center text-purple-600 dark:text-purple-400">{testAnalysis.totalMaxMarks} Marks</td>
                      <td className="py-3 px-4 text-center text-slate-500">{testAnalysis.passageQuestionsCount} Qs</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Quality & Integrity Audit Checks Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <h4 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Content Quality & Integrity Verification</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2.5 p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="font-extrabold block text-slate-900 dark:text-white">Explanations & Solutions</span>
                    <span className="text-[11px] text-slate-500 font-semibold">{testAnalysis.explanationCount} of {testAnalysis.totalQuestions} questions ({Math.round((testAnalysis.explanationCount / testAnalysis.totalQuestions) * 100)}%)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="font-extrabold block text-slate-900 dark:text-white">Language Medium</span>
                    <span className="text-[11px] text-slate-500 font-semibold">{testAnalysis.englishCount} English • {testAnalysis.hindiCount} Hindi</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                  {testAnalysis.optionWarnings === 0 && testAnalysis.answerKeyWarnings === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <span className="font-extrabold block text-slate-900 dark:text-white">Answer Key Integrity</span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      {testAnalysis.optionWarnings === 0 && testAnalysis.answerKeyWarnings === 0
                        ? '✓ All options & correct answers verified'
                        : `${testAnalysis.answerKeyWarnings} potential key warnings`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6 — Confirm & Save to Database */}
      <div className={`rounded-2xl border-2 p-6 transition-all ${
        parsedQuestions.length > 0
          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
          : 'bg-slate-50 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`h-7 w-7 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0 ${parsedQuestions.length > 0 ? 'bg-green-600' : 'bg-slate-400'}`}>6</div>
          <h3 className={`font-extrabold text-sm uppercase tracking-wide ${parsedQuestions.length > 0 ? 'text-green-800 dark:text-green-300' : 'text-slate-400 dark:text-slate-600'}`}>
            Confirm & Save to Database
          </h3>
        </div>
        {parsedQuestions.length > 0 ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-green-800 dark:text-green-300">
              <p className="font-bold">{parsedQuestions.length} question{parsedQuestions.length !== 1 ? 's' : ''} verified and ready to save</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                Target: <strong>{selectedTest?.title || 'No test selected'}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={handleFinalSaveWithStrategy}
              disabled={!selectedUploadTestId}
              className="flex items-center gap-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl text-sm active:scale-95 transition-all cursor-pointer shadow-lg shadow-green-500/25"
            >
              <CheckCircle2 className="h-5 w-5" />
              Confirm & Save to Database
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Add and verify questions in steps 3–4, then save them here to the selected mock test.
          </p>
        )}
      </div>
    </div>
  );
};
