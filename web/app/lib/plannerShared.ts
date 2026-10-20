// Study Planner types and date helpers shared by the planner page and the desktop reminders.
// Days are local calendar days as "YYYY-MM-DD" strings; arithmetic is done in UTC so it
// never shifts by a day around daylight-saving changes.

export type ChecklistItem = { id: string; text: string; done: boolean };
export type PlannerTask = {
  id: string; title: string; notes: string;
  category: 'study' | 'mock_test' | 'typing' | 'revision' | 'current_affairs' | 'other';
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null; dueTime: string | null;
  repeatDays: number[]; repeatUntil: string | null;
  checklist: ChecklistItem[]; link: string | null;
  doneAt: string | null; createdAt: string; updatedAt: string;
};
export type PlannerExam = { id: string; name: string; examDate: string; notes: string };
export type PlannerTargets = { mockTestsPerDay: number; typingTestsPerDay: number; reminderTime: string | null };
export type ChapterStatus = 'todo' | 'doing' | 'done';
export type SyllabusChapter = { id: string; name: string; status: ChapterStatus; revisions: number; completedAt: string | null; revisedAt: string | null };
export type SyllabusSubject = { id: string; name: string; chapters: SyllabusChapter[] };
export type Syllabus = { id: string; name: string; examId: string | null; subjects: SyllabusSubject[]; updatedAt: string };

export type PlannerData = {
  today: string;
  tasks: PlannerTask[];
  checkins: { taskId: string; day: string }[];
  exams: PlannerExam[];
  targets: PlannerTargets;
  activity: Record<string, { mock: number; typing: number }>;
  syllabi: Syllabus[];
};

/** Short random id for subjects / chapters created in the browser. */
export const newId = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

export function chapterCounts(chapters: SyllabusChapter[]) {
  let done = 0, doing = 0;
  for (const c of chapters) { if (c.status === 'done') done++; else if (c.status === 'doing') doing++; }
  return { total: chapters.length, done, doing, todo: chapters.length - done - doing };
}

export function syllabusCounts(s: Syllabus) {
  return chapterCounts(s.subjects.flatMap(sub => sub.chapters));
}

export const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** A finished chapter not revised for 7+ days is due for revision (spaced repetition). */
export const REVISION_GAP_DAYS = 7;
export function revisionDue(c: SyllabusChapter, now = Date.now()) {
  if (c.status !== 'done') return false;
  const last = Date.parse(c.revisedAt || c.completedAt || '');
  return Number.isFinite(last) && now - last >= REVISION_GAP_DAYS * 86400000;
}

export const localDay = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const asUtc = (day: string) => new Date(`${day}T00:00:00Z`);
export const addDays = (day: string, n: number) => new Date(asUtc(day).getTime() + n * 86400000).toISOString().slice(0, 10);
export const weekdayOf = (day: string) => asUtc(day).getUTCDay(); // 0 = Sunday
export const daysBetween = (from: string, to: string) => Math.round((asUtc(to).getTime() - asUtc(from).getTime()) / 86400000);

export const isRepeating = (t: PlannerTask) => t.repeatDays.length > 0;

/** Does a repeating task fall on this day? */
export function occursOn(t: PlannerTask, day: string) {
  if (!isRepeating(t) || !t.dueDate || day < t.dueDate) return false;
  if (t.repeatUntil && day > t.repeatUntil) return false;
  return t.repeatDays.includes(weekdayOf(day));
}

export const checkinKey = (taskId: string, day: string) => `${taskId}|${day}`;

/** Is the task done (for repeating tasks: on that day)? */
export function isDone(t: PlannerTask, day: string, checkins: Set<string>) {
  return isRepeating(t) ? checkins.has(checkinKey(t.id, day)) : !!t.doneAt;
}

/** Tasks shown for a day: repeating ones that fall on it, plus one-off tasks dated that day. */
export function tasksForDay(tasks: PlannerTask[], day: string) {
  return tasks.filter(t => (isRepeating(t) ? occursOn(t, day) : t.dueDate === day));
}

/** Days in a row (ending today, or yesterday if today isn't done yet) on which the daily test targets were met. */
export function targetStreak(activity: PlannerData['activity'], targets: PlannerTargets, today: string) {
  const { mockTestsPerDay: m, typingTestsPerDay: t } = targets;
  if (!m && !t) return 0;
  const met = (day: string) => {
    const a = activity[day] || { mock: 0, typing: 0 };
    return a.mock >= m && a.typing >= t;
  };
  let day = met(today) ? today : addDays(today, -1);
  let streak = 0;
  while (met(day) && streak < 60) { streak++; day = addDays(day, -1); }
  return streak;
}
