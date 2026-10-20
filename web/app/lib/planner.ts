import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { prismaTyping } from './prismaTyping';

// -----------------------------------------------------------------------------
// Study Planner: to-do tasks (one-off, dated, or repeating on chosen weekdays), exam
// countdowns, daily mock / typing test targets, and syllabus trackers (subjects → chapters). Every action is a "user" action in
// api/db: data.userId is always the logged-in user, and every query is limited to it.
//
// Dates are the student's local calendar days ("YYYY-MM-DD"); the client sends its
// timezone offset so "tests done today" is counted on the student's day, not UTC's.
// -----------------------------------------------------------------------------

export const PLANNER_ACTIONS = [
  'planner-get', 'planner-save-task', 'planner-delete-task', 'planner-set-done',
  'planner-save-exam', 'planner-delete-exam', 'planner-save-targets',
  'planner-save-syllabus', 'planner-delete-syllabus',
] as const;

const CATEGORIES = ['study', 'mock_test', 'typing', 'revision', 'current_affairs', 'other'];
const PRIORITIES = ['low', 'medium', 'high'];
const MAX_TASKS = 3000;
const MAX_EXAMS = 30;
const MAX_SYLLABI = 20;
const MAX_SUBJECTS = 40;
const MAX_CHAPTERS_PER_SUBJECT = 300;
const MAX_CHAPTERS_TOTAL = 3000;
const CHAPTER_STATUSES = ['todo', 'doing', 'done'];
const ID_RE = /^[A-Za-z0-9_-]{4,40}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
// Category tasks get an "Open" button to the matching page (no free-form links)
const CATEGORY_LINKS: Record<string, string | null> = {
  mock_test: '/mock-tests', typing: '/typing-test', current_affairs: '/updates',
};

let tablesReady: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      for (const sql of [
        `CREATE TABLE IF NOT EXISTS study_tasks (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT 'study',
          priority TEXT NOT NULL DEFAULT 'medium',
          "dueDate" DATE,
          "dueTime" TEXT,
          "repeatDays" JSONB NOT NULL DEFAULT '[]',
          "repeatUntil" DATE,
          checklist JSONB NOT NULL DEFAULT '[]',
          "doneAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS study_tasks_user_idx ON study_tasks ("userId", "dueDate")`,
        `CREATE TABLE IF NOT EXISTS study_task_checkins (
          "taskId" TEXT NOT NULL REFERENCES study_tasks(id) ON DELETE CASCADE,
          day DATE NOT NULL,
          "doneAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          PRIMARY KEY ("taskId", day)
        )`,
        `CREATE TABLE IF NOT EXISTS study_exams (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          "examDate" DATE NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS study_exams_user_idx ON study_exams ("userId")`,
        `CREATE TABLE IF NOT EXISTS study_targets (
          "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          "mockTestsPerDay" INT NOT NULL DEFAULT 0,
          "typingTestsPerDay" INT NOT NULL DEFAULT 0,
          "reminderTime" TEXT,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`,
        // A syllabus is one document: subjects with their chapters (saved whole by its owner)
        `CREATE TABLE IF NOT EXISTS study_syllabi (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          "examId" TEXT REFERENCES study_exams(id) ON DELETE SET NULL,
          subjects JSONB NOT NULL DEFAULT '[]',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS study_syllabi_user_idx ON study_syllabi ("userId")`,
        `ALTER TABLE study_syllabi ENABLE ROW LEVEL SECURITY`,
        // Not readable through Supabase's public REST API (the app's own connection bypasses RLS)
        `ALTER TABLE study_tasks ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE study_task_checkins ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE study_exams ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE study_targets ENABLE ROW LEVEL SECURITY`,
      ]) {
        await prisma.$executeRawUnsafe(sql);
      }
    })().catch((err) => { tablesReady = null; throw err; });
  }
  return tablesReady;
}

const bad = (error: string) => NextResponse.json({ success: false, error }, { status: 400 });
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const day = (v: unknown) => (typeof v === 'string' && DAY_RE.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
const offsetOf = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 900 ? Math.round(v) : -330); // default IST

type TaskRow = {
  id: string; title: string; notes: string; category: string; priority: string; dueDate: string | null;
  dueTime: string | null; repeatDays: number[]; repeatUntil: string | null; checklist: { id: string; text: string; done: boolean }[];
  doneAt: Date | null; createdAt: Date; updatedAt: Date;
};

const TASK_COLUMNS = `id, title, notes, category, priority, to_char("dueDate", 'YYYY-MM-DD') AS "dueDate", "dueTime",
  "repeatDays", to_char("repeatUntil", 'YYYY-MM-DD') AS "repeatUntil", checklist, "doneAt", "createdAt", "updatedAt"`;

type Chapter = { id: string; name: string; status: string; revisions: number; completedAt: string | null; revisedAt: string | null };
type Subject = { id: string; name: string; chapters: Chapter[] };

const isoOrNull = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

/** Cleans a syllabus sent by the client; returns null with a reason when it can't be saved. */
function cleanSubjects(input: unknown): { subjects: Subject[] } | { error: string } {
  if (!Array.isArray(input)) return { subjects: [] };
  if (input.length > MAX_SUBJECTS) return { error: `A syllabus can have up to ${MAX_SUBJECTS} subjects.` };
  let total = 0;
  const subjects: Subject[] = [];
  for (const s of input as any[]) {
    const name = str(s?.name, 100);
    if (!name) continue;
    const chaptersIn = Array.isArray(s?.chapters) ? s.chapters : [];
    if (chaptersIn.length > MAX_CHAPTERS_PER_SUBJECT) return { error: `A subject can have up to ${MAX_CHAPTERS_PER_SUBJECT} chapters.` };
    const chapters: Chapter[] = [];
    for (const c of chaptersIn) {
      const cname = str(c?.name, 200);
      if (!cname) continue;
      const status = CHAPTER_STATUSES.includes(c?.status) ? c.status : 'todo';
      chapters.push({
        id: typeof c?.id === 'string' && ID_RE.test(c.id) ? c.id : crypto.randomUUID().slice(0, 12),
        name: cname,
        status,
        revisions: Math.max(0, Math.min(99, Math.round(Number(c?.revisions) || 0))),
        completedAt: status === 'done' ? isoOrNull(c?.completedAt) || new Date().toISOString() : null,
        revisedAt: isoOrNull(c?.revisedAt),
      });
    }
    total += chapters.length;
    subjects.push({ id: typeof s?.id === 'string' && ID_RE.test(s.id) ? s.id : crypto.randomUUID().slice(0, 12), name, chapters });
  }
  if (total > MAX_CHAPTERS_TOTAL) return { error: `A syllabus can have up to ${MAX_CHAPTERS_TOTAL} chapters.` };
  return { subjects };
}

function taskOut(r: TaskRow) {
  return {
    ...r,
    link: CATEGORY_LINKS[r.category] ?? null,
    doneAt: r.doneAt ? new Date(r.doneAt).toISOString() : null,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

export async function handlePlannerAction(action: string, data: any): Promise<NextResponse> {
  await ensureTables();
  const userId: string = data.userId;

  switch (action) {
    // Everything the planner page needs in one request
    case 'planner-get': {
      const tz = offsetOf(data.tzOffset);
      const today = day(data.today) || new Date(Date.now() - tz * 60000).toISOString().slice(0, 10);
      const [tasks, checkins, exams, targetRows, syllabi] = await Promise.all([
        // Repeating tasks, open tasks of any age, and anything dated or finished in the last 120 days
        prisma.$queryRawUnsafe<TaskRow[]>(
          `SELECT ${TASK_COLUMNS} FROM study_tasks
           WHERE "userId" = $1 AND (jsonb_array_length("repeatDays") > 0 OR "doneAt" IS NULL
                 OR "dueDate" >= $2::date - 120 OR "doneAt" >= NOW() - INTERVAL '120 days')
           ORDER BY "dueDate" NULLS FIRST, "createdAt" LIMIT ${MAX_TASKS}`, userId, today),
        prisma.$queryRawUnsafe<{ taskId: string; day: string }[]>(
          `SELECT c."taskId", to_char(c.day, 'YYYY-MM-DD') AS day FROM study_task_checkins c
           JOIN study_tasks t ON t.id = c."taskId"
           WHERE t."userId" = $1 AND c.day >= $2::date - 120`, userId, today),
        prisma.$queryRawUnsafe<{ id: string; name: string; examDate: string; notes: string }[]>(
          `SELECT id, name, to_char("examDate", 'YYYY-MM-DD') AS "examDate", notes FROM study_exams
           WHERE "userId" = $1 ORDER BY "examDate"`, userId),
        prisma.$queryRawUnsafe<{ mockTestsPerDay: number; typingTestsPerDay: number; reminderTime: string | null }[]>(
          `SELECT "mockTestsPerDay", "typingTestsPerDay", "reminderTime" FROM study_targets WHERE "userId" = $1`, userId),
        prisma.$queryRawUnsafe<{ id: string; name: string; examId: string | null; subjects: Subject[]; updatedAt: Date }[]>(
          `SELECT id, name, "examId", subjects, "updatedAt" FROM study_syllabi WHERE "userId" = $1 ORDER BY "createdAt"`, userId),
      ]);

      // Tests actually completed per local day (last 60 days) — targets fill in by themselves
      const [mockDays, typingDays] = await Promise.all([
        prisma.$queryRawUnsafe<{ day: string; n: number }[]>(
          `SELECT to_char("completedAt" - make_interval(mins => $2), 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
           FROM user_test_sessions WHERE "userId" = $1 AND status IN ('COMPLETED', 'AUTO_SUBMITTED')
             AND "completedAt" >= NOW() - INTERVAL '61 days' GROUP BY 1`, userId, tz),
        prismaTyping.$queryRawUnsafe<{ day: string; n: number }[]>(
          `SELECT to_char("completedAt" - make_interval(mins => $2), 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
           FROM typing_attempts WHERE "userId" = $1 AND "completedAt" >= NOW() - INTERVAL '61 days' GROUP BY 1`, userId, tz)
          .catch(() => [] as { day: string; n: number }[]),
      ]);
      const activity: Record<string, { mock: number; typing: number }> = {};
      for (const r of mockDays) (activity[r.day] ||= { mock: 0, typing: 0 }).mock = r.n;
      for (const r of typingDays) (activity[r.day] ||= { mock: 0, typing: 0 }).typing = r.n;

      return NextResponse.json({
        success: true,
        today,
        tasks: tasks.map(taskOut),
        checkins,
        exams,
        targets: targetRows[0] || { mockTestsPerDay: 0, typingTestsPerDay: 0, reminderTime: null },
        activity,
        syllabi: syllabi.map(s => ({ ...s, updatedAt: new Date(s.updatedAt).toISOString() })),
      });
    }

    case 'planner-save-task': {
      const t = data.task || {};
      const title = str(t.title, 200);
      if (!title) return bad('Please enter a task.');
      const category = CATEGORIES.includes(t.category) ? t.category : 'study';
      const priority = PRIORITIES.includes(t.priority) ? t.priority : 'medium';
      const dueDate = day(t.dueDate);
      const dueTime = typeof t.dueTime === 'string' && TIME_RE.test(t.dueTime) ? t.dueTime : null;
      const repeatDays = Array.isArray(t.repeatDays)
        ? [...new Set(t.repeatDays.filter((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6))].sort()
        : [];
      if (repeatDays.length && !dueDate) return bad('A repeating task needs a start date.');
      const repeatUntil = repeatDays.length ? day(t.repeatUntil) : null;
      const checklist = repeatDays.length || !Array.isArray(t.checklist) ? [] : t.checklist.slice(0, 30)
        .map((c: any) => ({ id: str(c?.id, 40) || crypto.randomUUID().slice(0, 8), text: str(c?.text, 200), done: !!c?.done }))
        .filter((c: { text: string }) => c.text);
      const notes = str(t.notes, 2000);

      let id = typeof t.id === 'string' ? t.id.slice(0, 60) : '';
      if (id) {
        const updated = await prisma.$executeRawUnsafe(
          `UPDATE study_tasks SET title = $3, notes = $4, category = $5, priority = $6, "dueDate" = $7::date, "dueTime" = $8,
             "repeatDays" = $9::jsonb, "repeatUntil" = $10::date, checklist = $11::jsonb, "updatedAt" = NOW()
           WHERE id = $1 AND "userId" = $2`,
          id, userId, title, notes, category, priority, dueDate, dueTime, JSON.stringify(repeatDays), repeatUntil, JSON.stringify(checklist));
        if (!updated) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      } else {
        const count = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM study_tasks WHERE "userId" = $1`, userId);
        if ((count[0]?.n || 0) >= MAX_TASKS) return bad('You have reached the task limit. Delete some old tasks first.');
        id = crypto.randomUUID();
        await prisma.$executeRawUnsafe(
          `INSERT INTO study_tasks (id, "userId", title, notes, category, priority, "dueDate", "dueTime", "repeatDays", "repeatUntil", checklist)
           VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9::jsonb, $10::date, $11::jsonb)`,
          id, userId, title, notes, category, priority, dueDate, dueTime, JSON.stringify(repeatDays), repeatUntil, JSON.stringify(checklist));
      }
      const rows = await prisma.$queryRawUnsafe<TaskRow[]>(`SELECT ${TASK_COLUMNS} FROM study_tasks WHERE id = $1 AND "userId" = $2`, id, userId);
      return NextResponse.json({ success: true, task: taskOut(rows[0]) });
    }

    case 'planner-delete-task': {
      await prisma.$executeRawUnsafe(`DELETE FROM study_tasks WHERE id = $1 AND "userId" = $2`, String(data.id || ''), userId);
      return NextResponse.json({ success: true });
    }

    // One-off task: done / not done. Repeating task: done / not done for one day.
    case 'planner-set-done': {
      const id = String(data.id || '');
      const done = !!data.done;
      const owned = await prisma.$queryRawUnsafe<{ repeating: boolean }[]>(
        `SELECT jsonb_array_length("repeatDays") > 0 AS repeating FROM study_tasks WHERE id = $1 AND "userId" = $2`, id, userId);
      if (!owned.length) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      if (owned[0].repeating) {
        const d = day(data.day);
        if (!d) return bad('Missing day');
        if (done) await prisma.$executeRawUnsafe(`INSERT INTO study_task_checkins ("taskId", day) VALUES ($1, $2::date) ON CONFLICT DO NOTHING`, id, d);
        else await prisma.$executeRawUnsafe(`DELETE FROM study_task_checkins WHERE "taskId" = $1 AND day = $2::date`, id, d);
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE study_tasks SET "doneAt" = ${done ? 'NOW()' : 'NULL'}, "updatedAt" = NOW() WHERE id = $1 AND "userId" = $2`, id, userId);
      }
      return NextResponse.json({ success: true });
    }

    case 'planner-save-exam': {
      const e = data.exam || {};
      const name = str(e.name, 100);
      const examDate = day(e.examDate);
      if (!name || !examDate) return bad('Please enter the exam name and date.');
      const notes = str(e.notes, 500);
      let id = typeof e.id === 'string' ? e.id.slice(0, 60) : '';
      if (id) {
        const updated = await prisma.$executeRawUnsafe(
          `UPDATE study_exams SET name = $3, "examDate" = $4::date, notes = $5 WHERE id = $1 AND "userId" = $2`, id, userId, name, examDate, notes);
        if (!updated) return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
      } else {
        const count = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM study_exams WHERE "userId" = $1`, userId);
        if ((count[0]?.n || 0) >= MAX_EXAMS) return bad('You can add up to 30 exams.');
        id = crypto.randomUUID();
        await prisma.$executeRawUnsafe(
          `INSERT INTO study_exams (id, "userId", name, "examDate", notes) VALUES ($1, $2, $3, $4::date, $5)`, id, userId, name, examDate, notes);
      }
      return NextResponse.json({ success: true, exam: { id, name, examDate, notes } });
    }

    case 'planner-delete-exam': {
      await prisma.$executeRawUnsafe(`DELETE FROM study_exams WHERE id = $1 AND "userId" = $2`, String(data.id || ''), userId);
      return NextResponse.json({ success: true });
    }

    case 'planner-save-targets': {
      const clamp = (v: unknown) => Math.max(0, Math.min(20, Math.round(Number(v) || 0)));
      const mock = clamp(data.mockTestsPerDay);
      const typing = clamp(data.typingTestsPerDay);
      const reminderTime = typeof data.reminderTime === 'string' && TIME_RE.test(data.reminderTime) ? data.reminderTime : null;
      await prisma.$executeRawUnsafe(
        `INSERT INTO study_targets ("userId", "mockTestsPerDay", "typingTestsPerDay", "reminderTime", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT ("userId") DO UPDATE SET "mockTestsPerDay" = $2, "typingTestsPerDay" = $3, "reminderTime" = $4, "updatedAt" = NOW()`,
        userId, mock, typing, reminderTime);
      return NextResponse.json({ success: true, targets: { mockTestsPerDay: mock, typingTestsPerDay: typing, reminderTime } });
    }

    case 'planner-save-syllabus': {
      const sy = data.syllabus || {};
      const name = str(sy.name, 100);
      if (!name) return bad('Please give the syllabus a name.');
      const cleaned = cleanSubjects(sy.subjects);
      if ('error' in cleaned) return bad(cleaned.error);
      // Only one of the user's own exams can be linked
      let examId: string | null = null;
      if (typeof sy.examId === 'string' && sy.examId) {
        const own = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM study_exams WHERE id = $1 AND "userId" = $2`, sy.examId, userId);
        examId = own[0]?.id || null;
      }
      const json = JSON.stringify(cleaned.subjects);
      let id = typeof sy.id === 'string' ? sy.id.slice(0, 60) : '';
      if (id) {
        const updated = await prisma.$executeRawUnsafe(
          `UPDATE study_syllabi SET name = $3, "examId" = $4, subjects = $5::jsonb, "updatedAt" = NOW() WHERE id = $1 AND "userId" = $2`,
          id, userId, name, examId, json);
        if (!updated) return NextResponse.json({ success: false, error: 'Syllabus not found' }, { status: 404 });
      } else {
        const count = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM study_syllabi WHERE "userId" = $1`, userId);
        if ((count[0]?.n || 0) >= MAX_SYLLABI) return bad(`You can have up to ${MAX_SYLLABI} syllabi.`);
        id = crypto.randomUUID();
        await prisma.$executeRawUnsafe(
          `INSERT INTO study_syllabi (id, "userId", name, "examId", subjects) VALUES ($1, $2, $3, $4, $5::jsonb)`, id, userId, name, examId, json);
      }
      return NextResponse.json({ success: true, syllabus: { id, name, examId, subjects: cleaned.subjects, updatedAt: new Date().toISOString() } });
    }

    case 'planner-delete-syllabus': {
      await prisma.$executeRawUnsafe(`DELETE FROM study_syllabi WHERE id = $1 AND "userId" = $2`, String(data.id || ''), userId);
      return NextResponse.json({ success: true });
    }
  }
  return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
}
