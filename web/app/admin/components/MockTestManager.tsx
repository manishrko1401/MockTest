import React from 'react';
import { PlusCircle, ArrowDown, ArrowUp, Edit, Trash2, X, Search, FileText } from 'lucide-react';

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
  editingMockTestbookTotalUsers: number;
  setEditingMockTestbookTotalUsers: (val: number) => void;
  editingMockTestbookTopperScore: number;
  setEditingMockTestbookTopperScore: (val: number) => void;
  editingMockTestbookAverageScore: number;
  setEditingMockTestbookAverageScore: (val: number) => void;
  editingMockTestbookCutoffScore: number;
  setEditingMockTestbookCutoffScore: (val: number) => void;
  editMockTestTitle: (catId: string, subId: string, subsubId: string, testId: string, title: string, stats?: any) => void;
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
  const filteredMocks: { cat: any; sub: any; subsub: any; test: any; }[] = [];
  examCatalog
    .filter((cat: any) => !newMockCategoryParent || cat.id === newMockCategoryParent)
    .forEach((cat: any) => {
      cat.subCategories
        .filter((sub: any) => !newMockSubCategoryParent || sub.id === newMockSubCategoryParent)
        .forEach((sub: any) => {
          (sub.subSubCategories || [])
            .filter((subsub: any) => !newMockSubSubCategoryParent || subsub.id === newMockSubSubCategoryParent)
            .forEach((subsub: any) => {
              subsub.tests.forEach((test: any) => {
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
                addMockTest(newMockCategoryParent, newMockSubCategoryParent, newMockSubSubCategoryParent, {
                  title: newMockTitle.trim(),
                  questionsCount: Number(newMockQsCount),
                  durationMinutes: finalDuration,
                  maxMarks: Number(newMockMaxMarks),
                  isPremium: newMockRequiredTier !== 'None',
                  requiredTier: newMockRequiredTier,
                  hasSectionalTiming: newMockHasSectionalTiming,
                  sectionalTimings: newMockHasSectionalTiming ? sectionalTimings : undefined,
                  testbookTotalUsers: Number(newMockTestbookTotalUsers),
                  testbookTopperScore: Number(newMockTestbookTopperScore),
                  testbookAverageScore: Number(newMockTestbookAverageScore),
                  testbookCutoffScore: Number(newMockTestbookCutoffScore),
                } as any);
                setNewMockTitle('');
                setNewMockSubSubCategoryParent('');
                setNewMockHasSectionalTiming(false);
                setNewMockSectionalTimingsStr('');
                setNewMockTestbookTotalUsers(0);
                setNewMockTestbookTopperScore(0.0);
                setNewMockTestbookAverageScore(0.0);
                setNewMockTestbookCutoffScore(0.0);
                setEditingMockTestId(null);
                showToast('Mock test created successfully!');
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
                    {examCatalog.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
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
                    {examCatalog.find((c: any) => c.id === newMockCategoryParent)?.subCategories.map((sub: any) => <option key={sub.id} value={sub.id}>{sub.name}</option>) || null}
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

              {/* Test Title */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-555 dark:text-slate-400 uppercase tracking-wider mb-2">Test Title</label>
                <input type="text" required value={newMockTitle} onChange={(e) => setNewMockTitle(e.target.value)} placeholder="e.g. SSC CGL 2026 - Mock Test 1" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold font-sans" />
              </div>

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
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={newMockHasSectionalTiming} onChange={(e) => { setNewMockHasSectionalTiming(e.target.checked); if (!e.target.checked) setNewMockSectionalTimingsStr(''); }} className="w-4 h-4 accent-blue-600 cursor-pointer rounded" />
                  <span className="text-xs font-bold text-slate-705 dark:text-slate-200">Enable Sectional Timing</span>
                  <span className="text-[10px] text-slate-400">(lock users per section)</span>
                </label>
                {newMockHasSectionalTiming && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Section Durations (minutes, comma-separated)</label>
                    <input type="text" value={newMockSectionalTimingsStr} onChange={(e) => setNewMockSectionalTimingsStr(e.target.value)} placeholder="e.g. 20, 20, 20" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500" />
                    {newMockSectionalTimingsStr.trim() && (() => {
                      const timings = newMockSectionalTimingsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
                      const total = timings.reduce((a, b) => a + b, 0);
                      return total > 0 ? <p className="text-[10px] text-blue-550 mt-1">{timings.length} section(s) · Total: <strong>{total} min</strong> (overrides Duration)</p> : null;
                    })()}
                  </div>
                )}
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
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-505 uppercase tracking-wider">
            <Search className="h-3.5 w-3.5" /> Filter
          </div>
          <select
            value={newMockCategoryParent}
            onChange={(e) => { setNewMockCategoryParent(e.target.value); setNewMockSubCategoryParent(''); setNewMockSubSubCategoryParent(''); }}
            className="flex-1 min-w-[140px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
          >
            <option value="">All Exam Categories</option>
            {examCatalog.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <select
            value={newMockSubCategoryParent}
            onChange={(e) => { setNewMockSubCategoryParent(e.target.value); setNewMockSubSubCategoryParent(''); }}
            disabled={!newMockCategoryParent}
            className="flex-1 min-w-[140px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold disabled:opacity-40"
          >
            <option value="">All Sub Categories</option>
            {examCatalog.find((c: any) => c.id === newMockCategoryParent)?.subCategories.map((sub: any) => <option key={sub.id} value={sub.id}>{sub.name}</option>) || null}
          </select>
          <select
            value={newMockSubSubCategoryParent}
            onChange={(e) => setNewMockSubSubCategoryParent(e.target.value)}
            disabled={!newMockSubCategoryParent}
            className="flex-1 min-w-[140px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-202 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold disabled:opacity-40"
          >
            <option value="">All Sub-Sub Categories</option>
            {examCatalog.find((c: any) => c.id === newMockCategoryParent)?.subCategories.find((s: any) => s.id === newMockSubCategoryParent)?.subSubCategories?.map((subsub: any) => <option key={subsub.id} value={subsub.id}>{subsub.name}</option>) || null}
          </select>
          {(newMockCategoryParent || newMockSubCategoryParent || newMockSubSubCategoryParent) && (
            <button type="button" onClick={() => { setNewMockCategoryParent(''); setNewMockSubCategoryParent(''); setNewMockSubSubCategoryParent(''); }} className="text-[11px] text-slate-550 hover:text-red-500 font-bold cursor-pointer flex items-center gap-1 transition-colors">
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
                    <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-bold text-slate-505 dark:text-slate-400">
                      <span className="flex items-center gap-1">📋 {test.questionsCount} Qs</span>
                      <span>·</span>
                      <span>⏱ {test.durationMinutes} min</span>
                      <span>·</span>
                      <span>🏆 {test.maxMarks} marks</span>
                      {test.hasSectionalTiming && (
                        <span className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-955/30 text-purple-650 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50 rounded-md text-[9px] font-extrabold uppercase tracking-wider">Sectional</span>
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
                        {test.requiredTier === 'None' ? 'Free' : test.requiredTier.replace('Testbook', 'Mock')}
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
                          setEditingMockTestbookTotalUsers(test.testbookTotalUsers ?? 0);
                          setEditingMockTestbookTopperScore(test.testbookTopperScore ?? 0);
                          setEditingMockTestbookAverageScore(test.testbookAverageScore ?? 0);
                          setEditingMockTestbookCutoffScore(test.testbookCutoffScore ?? 0);
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
                  <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-4">
                    <p className="text-[10px] font-extrabold text-blue-600 dark:text-blue-450 uppercase tracking-wider flex items-center gap-1.5">
                      <Edit className="h-3 w-3" /> Editing: {test.title}
                    </p>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Title</label>
                      <input type="text" value={editingMockTestTitle} onChange={(e) => setEditingMockTestTitle(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-850 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Total Pool</label>
                        <input type="number" value={editingMockTestbookTotalUsers} onChange={(e) => setEditingMockTestbookTotalUsers(Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-slate-202 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Topper Score</label>
                        <input type="number" step="0.1" value={editingMockTestbookTopperScore} onChange={(e) => setEditingMockTestbookTopperScore(Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-855 dark:text-slate-202 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Average Score</label>
                        <input type="number" step="0.1" value={editingMockTestbookAverageScore} onChange={(e) => setEditingMockTestbookAverageScore(Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-855 dark:text-slate-202 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Cutoff Score</label>
                        <input type="number" step="0.1" value={editingMockTestbookCutoffScore} onChange={(e) => setEditingMockTestbookCutoffScore(Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-855 dark:text-slate-202 focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                      <button type="button" onClick={() => setEditingMockTestId(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-505 dark:text-slate-400 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition">
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editingMockTestTitle.trim()) {
                            editMockTestTitle(cat.id, sub.id, subsub.id, test.id, editingMockTestTitle.trim(), {
                              testbookTotalUsers: Number(editingMockTestbookTotalUsers),
                              testbookTopperScore: Number(editingMockTestbookTopperScore),
                              testbookAverageScore: Number(editingMockTestbookAverageScore),
                              testbookCutoffScore: Number(editingMockTestbookCutoffScore),
                            });
                            setEditingMockTestId(null);
                            showToast('Mock test updated successfully.');
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
