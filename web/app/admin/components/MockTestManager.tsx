import React, { useState } from 'react';
import { PlusCircle, ArrowDown, ArrowUp, Edit, Trash2, X, Search, FileText, Clock, Plus, RotateCcw, Zap, Lock, CheckCircle2 } from 'lucide-react';
import { formatTestMarkingScheme } from '../../lib/markingUtils';

const DEFAULT_SECTIONAL_TIMING_PRESETS = [
  '15, 15, 15, 15',
  '20, 20, 20',
  '20, 20, 20, 20',
  '15, 15, 15',
  '25, 25, 25, 25',
  '16, 16, 16, 16',
  '60, 60',
];

interface MockTestManagerProps {
  examCatalog: any[];
  newMockCategoryParent: string;
  setNewMockCategoryParent: (val: string) => void;
  newMockSubCategoryParent: string;
  setNewMockSubCategoryParent: (val: string) => void;
  newMockSubSubCategoryParent: string;
  setNewMockSubSubCategoryParent: (val: string) => void;
  editingMockTestId: string | null;
  setEditingMockTestId: (val: string | null) => void;
  newMockTitle: string;
  setNewMockTitle: (val: string) => void;
  newMockDuration: number;
  setNewMockDuration: (val: number) => void;
  newMockQsCount: number;
  setNewMockQsCount: (val: number) => void;
  newMockMaxMarks: number;
  setNewMockMaxMarks: (val: number) => void;
  newMockRequiredTier: 'None' | 'Testbook Pass' | 'Testbook Pass Pro';
  setNewMockRequiredTier: (val: 'None' | 'Testbook Pass' | 'Testbook Pass Pro') => void;
  newMockHasSectionalTiming: boolean;
  setNewMockHasSectionalTiming: (val: boolean) => void;
  newMockSectionalTimingsStr: string;
  setNewMockSectionalTimingsStr: (val: string) => void;
  newMockPositiveMarks: number;
  setNewMockPositiveMarks: (val: number) => void;
  newMockNegativeMarks: number;
  setNewMockNegativeMarks: (val: number) => void;
  newMockTestbookTotalUsers: number;
  setNewMockTestbookTotalUsers: (val: number) => void;
  newMockTestbookTopperScore: number;
  setNewMockTestbookTopperScore: (val: number) => void;
  newMockTestbookAverageScore: number;
  setNewMockTestbookAverageScore: (val: number) => void;
  newMockTestbookCutoffScore: number;
  setNewMockTestbookCutoffScore: (val: number) => void;
  addMockTest: (catId: string, subId: string, subsubId: string, test: any) => void;
  showToast: (msg: string) => void;
  getCustomQuestionsCount: (testId: string) => number;
  reorderMockTests: (catId: string, subId: string, subsubId: string, tests: any[]) => void;
  deleteMockTest: (catId: string, subId: string, testId: string) => void;
  editingMockTestTitle: string;
  setEditingMockTestTitle: (val: string) => void;
  editingMockPositiveMarks: number;
  setEditingMockPositiveMarks: (val: number) => void;
  editingMockNegativeMarks: number;
  setEditingMockNegativeMarks: (val: number) => void;
  editingMockTestbookTotalUsers: number;
  setEditingMockTestbookTotalUsers: (val: number) => void;
  editingMockTestbookTopperScore: number;
  setEditingMockTestbookTopperScore: (val: number) => void;
  editingMockTestbookAverageScore: number;
  setEditingMockTestbookAverageScore: (val: number) => void;
  editingMockTestbookCutoffScore: number;
  setEditingMockTestbookCutoffScore: (val: number) => void;
  editMockTestTitle: (catId: string, subId: string, subsubId: string, testId: string, title: string, stats?: any) => void;
  newMockCount?: number;
  setNewMockCount?: (val: number) => void;
}

export const MockTestManager: React.FC<MockTestManagerProps> = ({
  examCatalog,
  newMockCategoryParent,
  setNewMockCategoryParent,
  newMockSubCategoryParent,
  setNewMockSubCategoryParent,
  newMockSubSubCategoryParent,
  setNewMockSubSubCategoryParent,
  editingMockTestId,
  setEditingMockTestId,
  newMockTitle,
  setNewMockTitle,
  newMockCount: propNewMockCount,
  setNewMockCount: propSetNewMockCount,
  newMockDuration,
  setNewMockDuration,
  newMockQsCount,
  setNewMockQsCount,
  newMockMaxMarks,
  setNewMockMaxMarks,
  newMockRequiredTier,
  setNewMockRequiredTier,
  newMockHasSectionalTiming,
  setNewMockHasSectionalTiming,
  newMockSectionalTimingsStr,
  setNewMockSectionalTimingsStr,
  newMockPositiveMarks,
  setNewMockPositiveMarks,
  newMockNegativeMarks,
  setNewMockNegativeMarks,
  newMockTestbookTotalUsers,
  setNewMockTestbookTotalUsers,
  newMockTestbookTopperScore,
  setNewMockTestbookTopperScore,
  newMockTestbookAverageScore,
  setNewMockTestbookAverageScore,
  newMockTestbookCutoffScore,
  setNewMockTestbookCutoffScore,
  addMockTest,
  showToast,
  getCustomQuestionsCount,
  reorderMockTests,
  deleteMockTest,
  editingMockTestTitle,
  setEditingMockTestTitle,
  editingMockPositiveMarks,
  setEditingMockPositiveMarks,
  editingMockNegativeMarks,
  setEditingMockNegativeMarks,
  editingMockTestbookTotalUsers,
  setEditingMockTestbookTotalUsers,
  editingMockTestbookTopperScore,
  setEditingMockTestbookTopperScore,
  editingMockTestbookAverageScore,
  setEditingMockTestbookAverageScore,
  editingMockTestbookCutoffScore,
  setEditingMockTestbookCutoffScore,
  editMockTestTitle,
}) => {
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubCategory, setFilterSubCategory] = useState('');
  const [filterSubSubCategory, setFilterSubSubCategory] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Quick Sectional Timing Presets State
  const [quickTimingPresets, setQuickTimingPresets] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('admin_quick_sectional_timings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to load quick sectional timing presets:', e);
      }
    }
    return DEFAULT_SECTIONAL_TIMING_PRESETS;
  });

  const [newPresetInput, setNewPresetInput] = useState('');
  const [showAddPresetForm, setShowAddPresetForm] = useState(false);

  // New mock test lock section on submit state
  const [newMockLockSectionOnSubmit, setNewMockLockSectionOnSubmit] = useState<boolean>(false);

  // Additional state for editing mock tests
  const [editingMockDuration, setEditingMockDuration] = useState<number>(60);
  const [editingMockQsCount, setEditingMockQsCount] = useState<number>(100);
  const [editingMockMaxMarks, setEditingMockMaxMarks] = useState<number>(200);
  const [editingMockRequiredTier, setEditingMockRequiredTier] = useState<'None' | 'Testbook Pass' | 'Testbook Pass Pro'>('None');
  const [editingMockHasSectionalTiming, setEditingMockHasSectionalTiming] = useState<boolean>(false);
  const [editingMockSectionalTimingsStr, setEditingMockSectionalTimingsStr] = useState<string>('');
  const [editingMockLockSectionOnSubmit, setEditingMockLockSectionOnSubmit] = useState<boolean>(false);

  const handleAddCustomPreset = (valStr?: string) => {
    const targetStr = (valStr || newPresetInput).trim();
    if (!targetStr) return;

    const parts = targetStr.split(',').map(s => s.trim()).filter(Boolean);
    const nums = parts.map(Number);
    if (parts.length === 0 || nums.some(n => isNaN(n) || n <= 0)) {
      alert('Please enter valid comma-separated section durations in minutes (e.g. 15, 15, 15, 15)');
      return;
    }

    const formattedPreset = nums.join(', ');
    const totalMin = nums.reduce((a, b) => a + b, 0);

    let updated = quickTimingPresets;
    if (!quickTimingPresets.includes(formattedPreset)) {
      updated = [...quickTimingPresets, formattedPreset];
      setQuickTimingPresets(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_quick_sectional_timings', JSON.stringify(updated));
      }
    }

    setNewMockHasSectionalTiming(true);
    setNewMockSectionalTimingsStr(formattedPreset);
    if (totalMin > 0) {
      setNewMockDuration(totalMin);
    }

    setNewPresetInput('');
    setShowAddPresetForm(false);
    showToast('Quick timing preset saved and applied!');
  };

  const handleDeletePreset = (presetToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = quickTimingPresets.filter(p => p !== presetToDelete);
    setQuickTimingPresets(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_quick_sectional_timings', JSON.stringify(updated));
    }
    showToast('Preset removed.');
  };

  const handleResetPresets = () => {
    if (window.confirm('Reset quick sectional timing presets to default?')) {
      setQuickTimingPresets(DEFAULT_SECTIONAL_TIMING_PRESETS);
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_quick_sectional_timings', JSON.stringify(DEFAULT_SECTIONAL_TIMING_PRESETS));
      }
      showToast('Presets reset to default.');
    }
  };

  const [internalMockCount, setInternalMockCount] = useState(1);
  const countValue = propNewMockCount !== undefined ? propNewMockCount : internalMockCount;
  const updateCount = propSetNewMockCount || setInternalMockCount;

  const testSeriesCatalog = React.useMemo(() => {
    return examCatalog || [];
  }, [examCatalog]);

  const filteredMocks: { cat: any; sub: any; subsub: any; test: any; }[] = [];
  testSeriesCatalog
    .filter((cat: any) => !filterCategory || cat.id === filterCategory)
    .forEach((cat: any) => {
      cat.subCategories
        .filter((sub: any) => !filterSubCategory || sub.id === filterSubCategory)
        .forEach((sub: any) => {
          (sub.subSubCategories || [])
            .filter((subsub: any) => !filterSubSubCategory || subsub.id === filterSubSubCategory)
            .forEach((subsub: any) => {
              subsub.tests
                .filter((test: any) => !filterSearch.trim() || test.title.toLowerCase().includes(filterSearch.toLowerCase()))
                .forEach((test: any) => {
                  filteredMocks.push({ cat, sub, subsub, test });
                });
            });
        });
    });

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Manage Mock Tests</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Create, edit, reorder, and delete mock tests across all categories</p>
        </div>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">{filteredMocks.length} test{filteredMocks.length !== 1 ? 's' : ''} shown</span>
      </div>

      {/* Create New Mock Test — Collapsible */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setEditingMockTestId(editingMockTestId === '__new__' ? null : '__new__')}
          className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <PlusCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-slate-900 dark:text-white">Create New Mock Test</p>
              <p className="text-[11px] text-slate-505 dark:text-slate-400">Click to expand the creation form</p>
            </div>
          </div>
          <div className={`transition-transform duration-200 ${editingMockTestId === '__new__' ? 'rotate-180' : ''}`}>
            <ArrowDown className="h-4 w-4 text-slate-500" />
          </div>
        </button>

        {editingMockTestId === '__new__' && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newMockCategoryParent || !newMockSubCategoryParent || !newMockSubSubCategoryParent || !newMockTitle.trim()) {
                  alert('Please select category, subcategory, sub-subcategory and enter a test title.');
                  return;
                }
                let sectionalTimings: number[] | undefined = undefined;
                let finalDuration = Number(newMockDuration);
                if (newMockHasSectionalTiming && newMockSectionalTimingsStr.trim()) {
                  sectionalTimings = newMockSectionalTimingsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
                  finalDuration = sectionalTimings.reduce((a, b) => a + b, 0);
                }

                const count = Math.max(1, Number(countValue) || 1);
                for (let i = 1; i <= count; i++) {
                  const titleToUse = count === 1 ? newMockTitle.trim() : `${newMockTitle.trim()} ${i}`;
                  addMockTest(newMockCategoryParent, newMockSubCategoryParent, newMockSubSubCategoryParent, {
                    title: titleToUse,
                    questionsCount: Number(newMockQsCount),
                    durationMinutes: finalDuration,
                    maxMarks: Number(newMockMaxMarks),
                    isPremium: newMockRequiredTier !== 'None',
                    requiredTier: newMockRequiredTier,
                    hasSectionalTiming: newMockHasSectionalTiming,
                    sectionalTimings: newMockHasSectionalTiming ? sectionalTimings : undefined,
                    lockSectionOnSubmit: newMockLockSectionOnSubmit,
                    testbookTotalUsers: Number(newMockTestbookTotalUsers),
                    testbookTopperScore: Number(newMockTestbookTopperScore),
                    testbookAverageScore: Number(newMockTestbookAverageScore),
                    testbookCutoffScore: Number(newMockTestbookCutoffScore),
                    positiveMarks: 2.0,
                    negativeMarks: 0.5,
                  } as any);
                }

                setNewMockTitle('');
                updateCount(1);
                setNewMockSubSubCategoryParent('');
                setNewMockHasSectionalTiming(false);
                setNewMockSectionalTimingsStr('');
                setNewMockLockSectionOnSubmit(false);
                setNewMockTestbookTotalUsers(0);
                setNewMockTestbookTopperScore(0.0);
                setNewMockTestbookAverageScore(0.0);
                setNewMockTestbookCutoffScore(0.0);
                setEditingMockTestId(null);
                showToast(count === 1 ? 'Mock test created successfully!' : `Successfully created ${count} mock tests!`);
              }}
              className="space-y-5"
            >
              {/* Category / Sub / SubSub cascade selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-555 dark:text-slate-400 uppercase tracking-wider mb-2">Category</label>
                  <select
                    required
                    value={newMockCategoryParent}
                    onChange={(e) => { setNewMockCategoryParent(e.target.value); setNewMockSubCategoryParent(''); setNewMockSubSubCategoryParent(''); }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                  >
                    <option value="">-- Select --</option>
                    {testSeriesCatalog.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-555 dark:text-slate-400 uppercase tracking-wider mb-2">Sub Category</label>
                  <select
                    required
                    value={newMockSubCategoryParent}
                    onChange={(e) => { setNewMockSubCategoryParent(e.target.value); setNewMockSubSubCategoryParent(''); }}
                    disabled={!newMockCategoryParent}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold disabled:opacity-50"
                  >
                    <option value="">-- Select --</option>
                    {testSeriesCatalog.find((c: any) => c.id === newMockCategoryParent)?.subCategories.map((sub: any) => <option key={sub.id} value={sub.id}>{sub.name}</option>) || null}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-555 dark:text-slate-400 uppercase tracking-wider mb-2">Sub-Sub Category</label>
                  <select
                    required
                    value={newMockSubSubCategoryParent}
                    onChange={(e) => setNewMockSubSubCategoryParent(e.target.value)}
                    disabled={!newMockSubCategoryParent}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold disabled:opacity-50"
                  >
                    <option value="">-- Select --</option>
                    {examCatalog.find((c: any) => c.id === newMockCategoryParent)?.subCategories.find((s: any) => s.id === newMockSubCategoryParent)?.subSubCategories?.map((subsub: any) => <option key={subsub.id} value={subsub.id}>{subsub.name}</option>) || null}
                  </select>
                </div>
              </div>

              {/* Test Title & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-extrabold text-slate-555 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Test Title {countValue > 1 && <span className="text-blue-600 dark:text-blue-400 font-normal lowercase">(base title for batch)</span>}
                  </label>
                  <input
                    type="text"
                    required
                    value={newMockTitle}
                    onChange={(e) => setNewMockTitle(e.target.value)}
                    placeholder="e.g. SSC CGL Full Test"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-555 dark:text-slate-400 uppercase tracking-wider mb-2">
                    No. of Tests to Create
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={50}
                    value={countValue}
                    onChange={(e) => updateCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold font-sans"
                  />
                </div>
              </div>

              {/* Live Bulk Title Preview Badge */}
              {countValue > 1 && newMockTitle.trim() && (
                <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                    <span>⚡ Bulk Creation Preview ({countValue} Mock Tests):</span>
                  </div>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 font-medium">
                    Will create tests with titles suffixing 1 to {countValue}:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Array.from({ length: Math.min(countValue, 5) }).map((_, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[10px] font-mono font-semibold rounded-md border border-blue-200 dark:border-blue-700">
                        {newMockTitle.trim()} {idx + 1}
                      </span>
                    ))}
                    {countValue > 5 && (
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[10px] font-mono font-semibold rounded-md border border-blue-200 dark:border-blue-800">
                        ... up to "{newMockTitle.trim()} {countValue}"
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Settings */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-450 uppercase mb-2">Duration (min)</label>
                  <input type="number" required min={1} value={newMockDuration} onChange={(e) => setNewMockDuration(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-455 uppercase mb-2">Questions</label>
                  <input type="number" required min={1} value={newMockQsCount} onChange={(e) => setNewMockQsCount(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-455 uppercase mb-2">Max Marks</label>
                  <input type="number" required min={1} value={newMockMaxMarks} onChange={(e) => setNewMockMaxMarks(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-455 uppercase mb-2">Access Tier</label>
                  <select value={newMockRequiredTier} onChange={(e) => setNewMockRequiredTier(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer">
                    <option value="None">Free</option>
                    <option value="Testbook Pass">Pass</option>
                    <option value="Testbook Pass Pro">Pass Pro</option>
                  </select>
                </div>
              </div>

              {/* Sectional Timing */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 font-sans">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMockHasSectionalTiming}
                      onChange={(e) => {
                        setNewMockHasSectionalTiming(e.target.checked);
                        if (!e.target.checked) setNewMockSectionalTimingsStr('');
                      }}
                      className="w-4 h-4 accent-blue-600 cursor-pointer rounded"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Enable Sectional Timing
                    </span>
                    <span className="text-[10px] text-slate-400">(lock users per section)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddPresetForm(!showAddPresetForm)}
                      className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer bg-blue-50 dark:bg-blue-955/40 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg transition"
                    >
                      <Plus className="w-3 h-3" />
                      + Add Quick Timing
                    </button>
                    {quickTimingPresets.length > 0 && (
                      <button
                        type="button"
                        onClick={handleResetPresets}
                        title="Reset to default presets"
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Timing Presets Selector Chips */}
                <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                      Quick Sectional Timing Presets (1-Click Apply)
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    {quickTimingPresets.map((preset) => {
                      const timings = preset.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
                      const totalMin = timings.reduce((a, b) => a + b, 0);

                      const normalizedCurrent = newMockSectionalTimingsStr.split(',').map(s => s.trim()).filter(Boolean).join(', ');
                      const normalizedPreset = timings.join(', ');
                      const isActive = newMockHasSectionalTiming && normalizedCurrent === normalizedPreset;

                      return (
                        <div
                          key={preset}
                          onClick={() => {
                            setNewMockHasSectionalTiming(true);
                            setNewMockSectionalTimingsStr(normalizedPreset);
                            if (totalMin > 0) {
                              setNewMockDuration(totalMin);
                            }
                          }}
                          className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                            isActive
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30 ring-2 ring-blue-400 dark:ring-blue-500'
                              : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 shadow-xs'
                          }`}
                        >
                          <span>{normalizedPreset}</span>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                            isActive 
                              ? 'bg-blue-700 text-blue-100' 
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-955'
                          }`}>
                            {totalMin}m
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleDeletePreset(preset, e)}
                            className={`opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-0.5 rounded-full ${
                              isActive ? 'text-blue-200 hover:text-white' : 'text-slate-400'
                            }`}
                            title="Remove this preset"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Form to Add Custom Preset */}
                {showAddPresetForm && (
                  <div className="p-3 bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-2">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Create New Quick Timing Preset
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newPresetInput}
                        onChange={(e) => setNewPresetInput(e.target.value)}
                        placeholder="e.g. 15, 15, 15, 15 or 20, 20, 20"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomPreset();
                          }
                        }}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCustomPreset()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shrink-0"
                      >
                        Save & Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddPresetForm(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Enter section durations in minutes separated by commas. Saved presets will be available for 1-click test creation.
                    </p>
                  </div>
                )}

                {/* Manual Text Input Field */}
                {newMockHasSectionalTiming && (
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                      Selected Section Durations (minutes, comma-separated)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMockSectionalTimingsStr}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewMockSectionalTimingsStr(val);
                          const timings = val.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
                          const total = timings.reduce((a, b) => a + b, 0);
                          if (total > 0) {
                            setNewMockDuration(total);
                          }
                        }}
                        placeholder="e.g. 15, 15, 15, 15 or 20, 20, 20"
                        className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono font-semibold"
                      />
                      {newMockSectionalTimingsStr.trim() && !quickTimingPresets.includes(newMockSectionalTimingsStr.split(',').map(s => s.trim()).filter(Boolean).join(', ')) && (
                        <button
                          type="button"
                          onClick={() => handleAddCustomPreset(newMockSectionalTimingsStr)}
                          title="Save current custom timing as a quick preset"
                          className="px-2.5 py-2 bg-slate-100 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-955 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Save as Preset
                        </button>
                      )}
                    </div>
                    {newMockSectionalTimingsStr.trim() && (() => {
                      const timings = newMockSectionalTimingsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
                      const total = timings.reduce((a, b) => a + b, 0);
                      return total > 0 ? (
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-955/60 border border-blue-200 dark:border-blue-800 rounded-md">
                            {timings.length} section{timings.length !== 1 ? 's' : ''} ({timings.join(' min, ')} min)
                          </span>
                          <span>·</span>
                          <span>Total Duration: <strong>{total} minutes</strong> (automatically applied)</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>

              {/* Section Lock on Submit (Single Total Test Time with Non-Revisitable Sections) */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 font-sans">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMockLockSectionOnSubmit}
                    onChange={(e) => setNewMockLockSectionOnSubmit(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-amber-600 cursor-pointer rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Lock Section on Submit
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Total Test Duration · Sequential Non-revisitable Sections
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                      The mock test runs on the total overall test duration. When a student completes and submits a section, it advances them to the next section and <strong>permanently locks previously submitted sections</strong> so they cannot go back.
                    </p>
                  </div>
                </label>
              </div>
              


              {/* Benchmark Stats */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Benchmark Statistics <span className="font-normal normal-case">— optional</span></h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Total Pool</label>
                    <input type="number" value={newMockTestbookTotalUsers} onChange={(e) => setNewMockTestbookTotalUsers(Number(e.target.value))} placeholder="e.g. 15000" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-805 dark:text-slate-200 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Topper Score</label>
                    <input type="number" step="0.1" value={newMockTestbookTopperScore} onChange={(e) => setNewMockTestbookTopperScore(Number(e.target.value))} placeholder="e.g. 185.5" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-805 dark:text-slate-200 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Average Score</label>
                    <input type="number" step="0.1" value={newMockTestbookAverageScore} onChange={(e) => setNewMockTestbookAverageScore(Number(e.target.value))} placeholder="e.g. 94.2" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-805 dark:text-slate-200 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Cutoff Score</label>
                    <input type="number" step="0.1" value={newMockTestbookCutoffScore} onChange={(e) => setNewMockTestbookCutoffScore(Number(e.target.value))} placeholder="e.g. 112.5" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-805 dark:text-slate-200 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end font-sans">
                <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl text-sm transition active:scale-95 cursor-pointer shadow-md shadow-blue-500/20">
                  <PlusCircle className="h-4 w-4" />
                  Create Mock Test
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm font-sans">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            <Search className="h-3.5 w-3.5 text-slate-400" /> Filter
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search mock test title..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setFilterSubCategory(''); setFilterSubSubCategory(''); }}
            className="flex-1 min-w-[140px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
          >
            <option value="">All Exam Categories</option>
            {examCatalog.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <select
            value={filterSubCategory}
            onChange={(e) => { setFilterSubCategory(e.target.value); setFilterSubSubCategory(''); }}
            disabled={!filterCategory}
            className="flex-1 min-w-[140px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold disabled:opacity-40"
          >
            <option value="">All Sub Categories</option>
            {examCatalog.find((c: any) => c.id === filterCategory)?.subCategories.map((sub: any) => <option key={sub.id} value={sub.id}>{sub.name}</option>) || null}
          </select>
          <select
            value={filterSubSubCategory}
            onChange={(e) => setFilterSubSubCategory(e.target.value)}
            disabled={!filterSubCategory}
            className="flex-1 min-w-[140px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold disabled:opacity-40"
          >
            <option value="">All Sub-Sub Categories</option>
            {examCatalog.find((c: any) => c.id === filterCategory)?.subCategories.find((s: any) => s.id === filterSubCategory)?.subSubCategories?.map((subsub: any) => <option key={subsub.id} value={subsub.id}>{subsub.name}</option>) || null}
          </select>
          {(filterSearch || filterCategory || filterSubCategory || filterSubSubCategory) && (
            <button type="button" onClick={() => { setFilterSearch(''); setFilterCategory(''); setFilterSubCategory(''); setFilterSubSubCategory(''); }} className="text-[11px] text-slate-500 hover:text-red-500 font-bold cursor-pointer flex items-center gap-1 transition-colors">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Mock Tests Card List */}
      <div className="space-y-3 font-sans">
        {filteredMocks.length === 0 ? (
          <div className="bg-white dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="font-bold text-slate-505 dark:text-slate-400">No mock tests found</p>
            <p className="text-xs text-slate-400 dark:text-slate-505 mt-1">Use the filter above or create a new test above</p>
          </div>
        ) : (
          filteredMocks.map(({ cat, sub, subsub, test }) => {
            const isEditing = editingMockTestId === test.id;
            const hasCustomQs = getCustomQuestionsCount(test.id) > 0;
            const tierColor = test.requiredTier === 'None' ? 'green' : test.requiredTier === 'Testbook Pass' ? 'blue' : 'yellow';

            return (
              <div key={test.id} className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-xs">
                {/* Card Header */}
                <div className="flex items-start gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    {/* Breadcrumb */}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mb-1">
                      {cat.name} › {sub.name} › {subsub.name}
                    </p>
                    {/* Title */}
                    <p className="font-black text-sm text-slate-900 dark:text-white leading-snug truncate">{test.title}</p>

                    {/* Settings strip */}
                    <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md">
                        📋 {test.questionsCount} Qs
                      </span>
                      <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md">
                        🏆 {test.maxMarks} Marks
                      </span>
                      {(() => {
                        const scheme = formatTestMarkingScheme(test);
                        return (
                          <span className={`flex items-center gap-1 border px-2 py-0.5 rounded-md font-extrabold ${
                            scheme.isCustom
                              ? 'bg-amber-50 dark:bg-amber-955/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {scheme.isCustom ? '⚡ ' : '🎯 '}{scheme.badgeText}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Sectional Timing & Duration Display */}
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      {test.hasSectionalTiming ? (() => {
                        let timingsArr: number[] = [];
                        if (Array.isArray(test.sectionalTimings)) {
                          timingsArr = (test.sectionalTimings as any[]).map((n: any) => Number(n)).filter((n: number) => !isNaN(n));
                        } else if (typeof test.sectionalTimings === 'string' && (test.sectionalTimings as string).trim()) {
                          timingsArr = (test.sectionalTimings as string).split(',').map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n));
                        }
                        const sumTotal = timingsArr.reduce((a: number, b: number) => a + b, 0);

                        return (
                          <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-955/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 shadow-xs">
                            <Zap className="w-3 h-3 text-purple-600 dark:text-purple-400 fill-purple-500" />
                            Sectional: {timingsArr.length > 0 ? `${timingsArr.join('m, ')}m` : 'Enabled'} 
                            <span className="text-[10px] text-purple-500 font-semibold">({sumTotal > 0 ? sumTotal : test.durationMinutes} min total)</span>
                          </span>
                        );
                      })() : (
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" /> Overall Duration: {test.durationMinutes} min
                        </span>
                      )}
                    </div>

                    {/* Benchmark stats strip */}
                    {(test.testbookTotalUsers ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-955/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                          Pool: {test.testbookTotalUsers?.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-50 dark:bg-green-955/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/50">
                          Top: {test.testbookTopperScore}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-955/30 text-purple-650 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50">
                          Avg: {test.testbookAverageScore}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-955/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                          Cut: {test.testbookCutoffScore}
                        </span>
                      </div>
                    )}

                    {/* Status badges */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                        tierColor === 'green' ? 'bg-green-50 dark:bg-green-955/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50'
                        : tierColor === 'blue' ? 'bg-blue-50 dark:bg-blue-955/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
                        : 'bg-amber-50 dark:bg-amber-955/30 text-amber-705 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
                      }`}>
                        {test.requiredTier === 'None' || test.requiredTierName === 'None' ? 'Free' : (test.requiredTierName || test.requiredTier || '').replace('Testbook', 'Mock')}
                      </span>
                      {hasCustomQs ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-green-955/30 text-green-455 border border-green-800">
                          ✓ {getCustomQuestionsCount(test.id)} Custom Qs
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800">
                          Default Qs
                        </span>
                      )}
                      {test.lockSectionOnSubmit && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 dark:bg-amber-955/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Section Lock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Reorder */}
                    <button
                      disabled={subsub.tests.indexOf(test) === 0}
                      onClick={() => {
                        const idx = subsub.tests.indexOf(test);
                        if (idx > 0) {
                          const newTests = [...subsub.tests];
                          [newTests[idx], newTests[idx - 1]] = [newTests[idx - 1], newTests[idx]];
                          reorderMockTests(cat.id, sub.id, subsub.id, newTests);
                          showToast('Mock test moved up.');
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={subsub.tests.indexOf(test) === subsub.tests.length - 1}
                      onClick={() => {
                        const idx = subsub.tests.indexOf(test);
                        if (idx < subsub.tests.length - 1) {
                          const newTests = [...subsub.tests];
                          [newTests[idx], newTests[idx + 1]] = [newTests[idx + 1], newTests[idx]];
                          reorderMockTests(cat.id, sub.id, subsub.id, newTests);
                          showToast('Mock test moved down.');
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (isEditing) {
                          setEditingMockTestId(null);
                        } else {
                          setEditingMockTestId(test.id);
                          setEditingMockTestTitle(test.title);
                          setEditingMockPositiveMarks(test.positiveMarks ?? 2.0);
                          setEditingMockNegativeMarks(test.negativeMarks ?? 0.5);
                          setEditingMockTestbookTotalUsers(test.testbookTotalUsers ?? 0);
                          setEditingMockTestbookTopperScore(test.testbookTopperScore ?? 0);
                          setEditingMockTestbookAverageScore(test.testbookAverageScore ?? 0);
                          setEditingMockTestbookCutoffScore(test.testbookCutoffScore ?? 0);

                          setEditingMockDuration(test.durationMinutes ?? 60);
                          setEditingMockQsCount(test.questionsCount ?? 100);
                          setEditingMockMaxMarks(test.maxMarks ?? 200);
                          setEditingMockRequiredTier((test.requiredTierName || test.requiredTier || 'None') as any);
                          setEditingMockHasSectionalTiming(!!test.hasSectionalTiming);
                          setEditingMockLockSectionOnSubmit(!!test.lockSectionOnSubmit);

                          let initialTimingsStr = '';
                          if (Array.isArray(test.sectionalTimings)) {
                            initialTimingsStr = test.sectionalTimings.join(', ');
                          } else if (typeof test.sectionalTimings === 'string') {
                            initialTimingsStr = test.sectionalTimings;
                          }
                          setEditingMockSectionalTimingsStr(initialTimingsStr);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                        isEditing ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300' : 'bg-blue-50 dark:bg-blue-955/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-955/50'
                      }`}
                    >
                      {isEditing ? <X className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" />}
                      {isEditing ? 'Close' : 'Edit'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this mock test?')) {
                          deleteMockTest(cat.id, sub.id, test.id);
                          showToast('Mock test deleted.');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition bg-red-50 dark:bg-red-955/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-955/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Inline Edit Panel */}
                {isEditing && (
                  <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-4 font-sans">
                    <p className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Edit className="h-3 w-3" /> Editing Mock Test: {test.title}
                    </p>

                    {/* Title */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Title</label>
                      <input type="text" value={editingMockTestTitle} onChange={(e) => setEditingMockTestTitle(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold" />
                    </div>

                    {/* Main Config: Duration, Questions, Max Marks, Access Tier */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Duration (min)</label>
                        <input type="number" min={1} value={editingMockDuration} onChange={(e) => setEditingMockDuration(Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Questions Count</label>
                        <input type="number" min={1} value={editingMockQsCount} onChange={(e) => setEditingMockQsCount(Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Max Marks</label>
                        <input type="number" min={1} value={editingMockMaxMarks} onChange={(e) => setEditingMockMaxMarks(Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Access Tier</label>
                        <select value={editingMockRequiredTier} onChange={(e) => setEditingMockRequiredTier(e.target.value as any)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold">
                          <option value="None">Free</option>
                          <option value="Testbook Pass">Pass</option>
                          <option value="Testbook Pass Pro">Pass Pro</option>
                        </select>
                      </div>
                    </div>

                    {/* Sectional Timing in Edit Panel */}
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingMockHasSectionalTiming}
                          onChange={(e) => {
                            setEditingMockHasSectionalTiming(e.target.checked);
                            if (!e.target.checked) setEditingMockSectionalTimingsStr('');
                          }}
                          className="w-4 h-4 accent-blue-600 cursor-pointer rounded"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          Enable Sectional Timing
                        </span>
                        <span className="text-[10px] text-slate-400">(lock users per section)</span>
                      </label>

                      {/* Quick Timing Presets for Edit Form */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-900">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                          Quick Presets (1-Click Apply)
                        </span>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {quickTimingPresets.map((preset) => {
                            const timings = preset.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
                            const totalMin = timings.reduce((a, b) => a + b, 0);

                            const normalizedCurrent = editingMockSectionalTimingsStr.split(',').map(s => s.trim()).filter(Boolean).join(', ');
                            const normalizedPreset = timings.join(', ');
                            const isActive = editingMockHasSectionalTiming && normalizedCurrent === normalizedPreset;

                            return (
                              <button
                                key={`edit-${preset}`}
                                type="button"
                                onClick={() => {
                                  setEditingMockHasSectionalTiming(true);
                                  setEditingMockSectionalTimingsStr(normalizedPreset);
                                  if (totalMin > 0) {
                                    setEditingMockDuration(totalMin);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  isActive
                                    ? 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-400'
                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-400'
                                }`}
                              >
                                {normalizedPreset} <span className="text-[9px] opacity-80">({totalMin}m)</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {editingMockHasSectionalTiming && (
                        <div className="pt-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Section Durations (minutes, comma-separated)</label>
                          <input
                            type="text"
                            value={editingMockSectionalTimingsStr}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingMockSectionalTimingsStr(val);
                              const timings = val.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
                              const total = timings.reduce((a, b) => a + b, 0);
                              if (total > 0) {
                                setEditingMockDuration(total);
                              }
                            }}
                            placeholder="e.g. 15, 15, 15, 15"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-mono font-semibold"
                          />
                          {editingMockSectionalTimingsStr.trim() && (() => {
                            const timings = editingMockSectionalTimingsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
                            const total = timings.reduce((a, b) => a + b, 0);
                            return total > 0 ? (
                              <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-1">
                                {timings.length} section(s) · Total: <strong>{total} min</strong> (overrides Duration)
                              </p>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Lock Section on Submit in Edit Panel */}
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingMockLockSectionOnSubmit}
                          onChange={(e) => setEditingMockLockSectionOnSubmit(e.target.checked)}
                          className="w-4 h-4 mt-0.5 accent-amber-600 cursor-pointer rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              Lock Section on Submit
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-955/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Total Test Duration · Sequential Non-revisitable Sections
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                            The test uses the total test duration. When a student submits a section, they advance to the next section and cannot return to submitted sections.
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Benchmark Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Total Pool</label>
                        <input type="number" value={editingMockTestbookTotalUsers} onChange={(e) => setEditingMockTestbookTotalUsers(Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Topper Score</label>
                        <input type="number" step="0.1" value={editingMockTestbookTopperScore} onChange={(e) => setEditingMockTestbookTopperScore(Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Average Score</label>
                        <input type="number" step="0.1" value={editingMockTestbookAverageScore} onChange={(e) => setEditingMockTestbookAverageScore(Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Cutoff Score</label>
                        <input type="number" step="0.1" value={editingMockTestbookCutoffScore} onChange={(e) => setEditingMockTestbookCutoffScore(Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                      <button type="button" onClick={() => setEditingMockTestId(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition">
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editingMockTestTitle.trim()) {
                            let sectionalTimings: number[] | undefined = undefined;
                            let finalDuration = Number(editingMockDuration);
                            if (editingMockHasSectionalTiming && editingMockSectionalTimingsStr.trim()) {
                              sectionalTimings = editingMockSectionalTimingsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
                              if (sectionalTimings.length > 0) {
                                finalDuration = sectionalTimings.reduce((a, b) => a + b, 0);
                              }
                            }

                            editMockTestTitle(cat.id, sub.id, subsub.id, test.id, editingMockTestTitle.trim(), {
                              testbookTotalUsers: Number(editingMockTestbookTotalUsers),
                              testbookTopperScore: Number(editingMockTestbookTopperScore),
                              testbookAverageScore: Number(editingMockTestbookAverageScore),
                              testbookCutoffScore: Number(editingMockTestbookCutoffScore),
                              durationMinutes: finalDuration,
                              questionsCount: Number(editingMockQsCount),
                              maxMarks: Number(editingMockMaxMarks),
                              requiredTier: editingMockRequiredTier,
                              requiredTierName: editingMockRequiredTier,
                              isPremium: editingMockRequiredTier !== 'None',
                              hasSectionalTiming: editingMockHasSectionalTiming,
                              sectionalTimings: editingMockHasSectionalTiming ? sectionalTimings : undefined,
                              lockSectionOnSubmit: editingMockLockSectionOnSubmit,
                            });
                            setEditingMockTestId(null);
                            showToast('Mock test updated successfully!');
                          }
                        }}
                        className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition active:scale-95 shadow-md shadow-blue-500/20"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
