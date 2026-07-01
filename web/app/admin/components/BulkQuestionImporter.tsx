import React from 'react';
import { Database, Edit, FileText, CheckCircle2, AlertCircle, PlusCircle, X, Globe } from 'lucide-react';

interface BulkQuestionImporterProps {
  examCatalog: any[];
  selectedUploadTestId: string;
  setSelectedUploadTestId: (id: string) => void;
  importerMode: 'json' | 'form';
  setImporterMode: (mode: 'json' | 'form') => void;
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
  handleAddFormQuestion: (e: React.FormEvent) => void;
  previewLanguage: 'en' | 'hi';
  setPreviewLanguage: (lang: 'en' | 'hi') => void;
  previewQuestionIndex: number;
  setPreviewQuestionIndex: (idx: number) => void;
  handleConfirmIngestCustomQuestions: () => void;
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
  const allTests: { id: string; title: string; categoryName: string; subCategoryName: string }[] = [];
  examCatalog.forEach(cat => {
    cat.subCategories.forEach((sub: any) => {
      (sub.subSubCategories || []).forEach((subsub: any) => {
        subsub.tests.forEach((t: any) => {
          allTests.push({
            id: t.id,
            title: t.title,
            categoryName: cat.name,
            subCategoryName: `${sub.name} > ${subsub.name}`
          });
        });
      });
    });
  });

  const selectedTest = allTests.find(t => t.id === selectedUploadTestId);
  const questionCount = formQuestionsList.length;
  const sectionColors: Record<string, string> = {};
  const sectionColorPalette = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
  getAvailableSections().forEach((sec, i) => {
    sectionColors[sec] = sectionColorPalette[i % sectionColorPalette.length];
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-800 dark:text-slate-100 font-sans">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Bulk Question Importer</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upload questions to any mock test using JSON paste or the interactive form builder</p>
        </div>
        {questionCount > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-955/30 border border-blue-200 dark:border-blue-800 px-4 py-2 rounded-xl">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">{questionCount}</div>
            <div>
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400">{questionCount} Question{questionCount !== 1 ? 's' : ''} Ready</p>
              <p className="text-[10px] text-blue-550 dark:text-blue-550">{[...new Set(formQuestionsList.map((q: any) => q.section).filter(Boolean))].length} section{[...new Set(formQuestionsList.map((q: any) => q.section).filter(Boolean))].length !== 1 ? 's' : ''}</p>
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
            <span className="ml-auto text-xs font-bold text-green-650 dark:text-green-450 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Selected
            </span>
          )}
        </div>
        <select
          value={selectedUploadTestId}
          onChange={(e) => setSelectedUploadTestId(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold transition-colors font-sans"
        >
          <option value="">— Select a Mock Test to upload questions into —</option>
          {examCatalog.map(cat => (
            <optgroup key={cat.id} label={cat.name}>
              {cat.subCategories.flatMap((sub: any) =>
                (sub.subSubCategories || []).flatMap((subsub: any) =>
                  subsub.tests.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {sub.name} › {subsub.name} › {t.title}
                    </option>
                  ))
                )
              )}
            </optgroup>
          ))}
        </select>
        {selectedTest && (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 px-2.5 py-1 rounded-lg">{selectedTest.categoryName}</span>
            <span className="text-slate-400 dark:text-slate-650 self-center">›</span>
            <span className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg">{selectedTest.subCategoryName}</span>
            <span className="text-slate-400 dark:text-slate-650 self-center">›</span>
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
            onClick={() => setImporterMode('json')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border-2 ${
              importerMode === 'json'
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-650 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:text-blue-600'
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
                : 'bg-slate-50 dark:bg-slate-900 text-slate-650 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            <Edit className="h-4 w-4" />
            Form Builder
          </button>
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
            {importerMode === 'json' ? 'Paste JSON Questions Array' : `${editingQuestionIndex !== null ? `Editing Question #${editingQuestionIndex + 1}` : 'Add a New Question'}`}
          </h3>
          {importerMode === 'form' && formQuestionsList.length > 0 && (
            <button
              type="button"
              onClick={handleClearFormQuestions}
              className="ml-auto text-[11px] text-red-500 hover:text-red-650 font-bold flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" /> Clear All ({formQuestionsList.length})
            </button>
          )}
        </div>

        <div className="p-6">
          {importerMode === 'json' ? (
            <form onSubmit={handleBulkUploadSubmit} className="space-y-4">
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
                    ? 'bg-green-50 dark:bg-green-955/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-955/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
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
            <form onSubmit={handleAddFormQuestion} className="space-y-5 text-xs">
              {/* Section + Bilingual Question */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-2">Section</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedSection}
                        onChange={(e) => {
                          setSelectedSection(e.target.value);
                          if (e.target.value !== 'create_new') setCustomSectionName('');
                        }}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-bold"
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
                          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-blue-450 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-2">Question Text (English)</label>
                    <textarea
                      value={formTextEn}
                      onChange={(e) => setFormTextEn(e.target.value)}
                      placeholder="Type the question in English..."
                      rows={4}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-855 dark:text-slate-205 focus:outline-none focus:border-blue-500 resize-none font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-[34px]" />
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-555 dark:text-slate-400 uppercase tracking-wider mb-2">प्रश्न पाठ (Hindi)</label>
                    <textarea
                      value={formTextHi}
                      onChange={(e) => setFormTextHi(e.target.value)}
                      placeholder="हिंदी में प्रश्न टाइप करें..."
                      rows={4}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-855 dark:text-slate-205 focus:outline-none focus:border-blue-500 resize-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Options Grid */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Answer Options</h4>
                  <span className="text-[9px] text-slate-450">(Options 1-4 required · Option 5 optional)</span>
                </div>
                {[
                  { en: opt1En, setEn: setOpt1En, hi: opt1Hi, setHi: setOpt1Hi, idx: 0, label: 'A' },
                  { en: opt2En, setEn: setOpt2En, hi: opt2Hi, setHi: setOpt2Hi, idx: 1, label: 'B' },
                  { en: opt3En, setEn: setOpt3En, hi: opt3Hi, setHi: setOpt3Hi, idx: 2, label: 'C' },
                  { en: opt4En, setEn: setOpt4En, hi: opt4Hi, setHi: setOpt4Hi, idx: 3, label: 'D' },
                  { en: opt5En, setEn: setOpt5En, hi: opt5Hi, setHi: setOpt5Hi, idx: 4, label: 'E' },
                ].map(({ en, setEn, hi, setHi, idx, label }) => (
                  <div key={label} className={`flex items-center gap-3 ${label === 'E' ? 'mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setFormCorrectIndex(idx)}
                      title={`Mark Option ${label} as correct`}
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
                      placeholder={`Option ${label} (English)${label === 'E' ? ' — optional' : ''}`}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-855 dark:text-slate-205 focus:outline-none focus:border-blue-500 font-medium"
                    />
                    <input
                      type="text"
                      value={hi}
                      onChange={(e) => setHi(e.target.value)}
                      placeholder={`विकल्प ${label} (Hindi)${label === 'E' ? ' — वैकल्पिक' : ''}`}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-855 dark:text-slate-205 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                ))}
              </div>

              {/* Explanation */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-wider mb-2">Explanation (English) <span className="text-slate-450 font-normal normal-case">— optional</span></label>
                  <textarea
                    value={formExplanationEn}
                    onChange={(e) => setFormExplanationEn(e.target.value)}
                    placeholder="Add explanation in English..."
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-855 dark:text-slate-205 focus:outline-none focus:border-blue-500 resize-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-wider mb-2">व्याख्या (Hindi) <span className="text-slate-450 font-normal normal-case">— वैकल्पिक</span></label>
                  <textarea
                    value={formExplanationHi}
                    onChange={(e) => setFormExplanationHi(e.target.value)}
                    placeholder="हिंदी में व्याख्या जोड़ें..."
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-855 dark:text-slate-205 focus:outline-none focus:border-blue-500 resize-none font-medium"
                  />
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
                    <><PlusCircle className="h-4 w-4" /> Add to List</>
                  )}
                </button>
                {editingQuestionIndex !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuestionIndex(null);
                      setFormTextEn(''); setFormTextHi('');
                      setOpt1En(''); setOpt1Hi(''); setOpt2En(''); setOpt2Hi('');
                      setOpt3En(''); setOpt3Hi(''); setOpt4En(''); setOpt4Hi('');
                      setOpt5En(''); setOpt5Hi('');
                      setFormCorrectIndex(0); setFormExplanationEn(''); setFormExplanationHi('');
                      setSelectedSection('General Studies'); setCustomSectionName('');
                      showToast("Edit cancelled.");
                    }}
                    className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 font-bold py-2.5 px-5 rounded-xl text-xs active:scale-95 transition-all cursor-pointer animate-fadeIn"
                  >
                    <X className="h-4 w-4" /> Cancel Edit
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* STEP 4 — Review Questions */}
      {parsedQuestions.length > 0 && (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">4</div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Review Questions ({parsedQuestions.length})</h3>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={previewLanguage}
                onChange={(e) => setPreviewLanguage(e.target.value as 'en' | 'hi')}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-350 focus:outline-none cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
              </select>
            </div>
          </div>

          {/* Section Legend */}
          {Object.keys(sectionColors).length > 0 && (
            <div className="px-6 pt-4 flex flex-wrap gap-2">
              {Object.entries(sectionColors).map(([sec, color]) => (
                <span key={sec} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-455">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {sec}
                </span>
              ))}
            </div>
          )}

          {/* Question Navigator Pills */}
          <div className="px-6 py-4 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
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
                    isActive ? 'text-white scale-110 shadow-md' : 'text-white opacity-60 hover:opacity-90'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Q${idx + 1}: ${sec}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Active Question Preview */}
          {(() => {
            const activeQ = parsedQuestions[previewQuestionIndex];
            if (!activeQ) return null;
            const qText = previewLanguage === 'en' ? activeQ.textEn : activeQ.textHi;
            const qOptions = previewLanguage === 'en' ? activeQ.optionsEn : activeQ.optionsHi;
            const qExp = previewLanguage === 'en' ? activeQ.explanationEn : activeQ.explanationHi;
            const sec = activeQ.section || 'General Studies';
            const secColor = sectionColors[sec] || '#6B7280';

            return (
              <div className="mx-6 mb-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800" style={{ backgroundColor: `${secColor}18` }}>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: secColor }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: secColor }}>{sec}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-550 font-semibold">Q{previewQuestionIndex + 1} of {parsedQuestions.length}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const q = formQuestionsList[previewQuestionIndex];
                        if (!q) return;
                        setEditingQuestionIndex(previewQuestionIndex);
                        setFormTextEn(q.textEn || ''); setFormTextHi(q.textHi || '');
                        setOpt1En(q.optionsEn?.[0] || ''); setOpt1Hi(q.optionsHi?.[0] || '');
                        setOpt2En(q.optionsEn?.[1] || ''); setOpt2Hi(q.optionsHi?.[1] || '');
                        setOpt3En(q.optionsEn?.[2] || ''); setOpt3Hi(q.optionsHi?.[2] || '');
                        setOpt4En(q.optionsEn?.[3] || ''); setOpt4Hi(q.optionsHi?.[3] || '');
                        setOpt5En(q.optionsEn?.[4] || ''); setOpt5Hi(q.optionsHi?.[4] || '');
                        setFormCorrectIndex(q.correctIndex ?? 0);
                        setFormExplanationEn(q.explanationEn || ''); setFormExplanationHi(q.explanationHi || '');
                        setSelectedSection(q.section || 'General Studies');
                        setImporterMode('form');
                      }}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-450 hover:underline cursor-pointer"
                    >
                      Edit
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
                <div className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-205 leading-relaxed">{qText}</p>
                  <div className="space-y-1.5">
                    {(qOptions || []).map((opt: string, i: number) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs font-medium border ${
                          i === activeQ.correctIndex
                            ? 'bg-green-50 dark:bg-green-955/30 border-green-200 dark:border-green-800 text-green-705 dark:text-green-405'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400'
                        }`}
                      >
                        <span className={`font-black text-[10px] w-4 shrink-0 ${i === activeQ.correctIndex ? 'text-green-600 dark:text-green-400' : 'text-slate-450'}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                        {i === activeQ.correctIndex && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />}
                      </div>
                    ))}
                  </div>
                  {qExp && (
                    <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3">
                      <p className="text-[10px] font-extrabold text-amber-600 dark:text-amber-505 uppercase tracking-wider mb-1">Explanation</p>
                      <p className="text-xs text-amber-705 dark:text-amber-305 leading-relaxed">{qExp}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* STEP 5 — Save to Database */}
      <div className={`rounded-2xl border-2 p-6 transition-all ${
        parsedQuestions.length > 0
          ? 'bg-green-50 dark:bg-green-955/20 border-green-200 dark:border-green-800'
          : 'bg-slate-50 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`h-7 w-7 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0 ${parsedQuestions.length > 0 ? 'bg-green-600' : 'bg-slate-400'}`}>5</div>
          <h3 className={`font-extrabold text-sm uppercase tracking-wide ${parsedQuestions.length > 0 ? 'text-green-800 dark:text-green-300' : 'text-slate-400 dark:text-slate-600'}`}>
            Save to Database
          </h3>
        </div>
        {parsedQuestions.length > 0 ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-green-850 dark:text-green-300">
              <p className="font-bold">{parsedQuestions.length} question{parsedQuestions.length !== 1 ? 's' : ''} verified and ready to save</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                Target: <strong>{selectedTest?.title || 'No test selected'}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={handleConfirmIngestCustomQuestions}
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
