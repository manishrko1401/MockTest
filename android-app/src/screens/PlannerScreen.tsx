import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { CalendarClock, Check, ChevronLeft, ChevronRight, Plus, Target, Trash2, X } from 'lucide-react-native';
import { request, friendlyError } from '../api';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { Button, Card, confirm, Empty, ErrorBox, Field, Header, HeaderButton, Loading, Pill, ProgressBar, SectionTitle, Segmented, Sheet } from '../ui';
import { useNav } from '../nav';
import { TourTarget, useScreenTour, useTourScroll } from '../tour';
import {
  addDays, chapterCounts, checkinKey, daysBetween, isDone, isRepeating, localDay, newId, percent, PlannerData, PlannerExam, PlannerTask,
  revisionDue, Syllabus, syllabusCounts, tasksForDay,
} from '../shared/plannerShared';
import { SYLLABUS_TEMPLATES } from '../shared/syllabusTemplates';

type Section = 'today' | 'tasks' | 'exams' | 'syllabus' | 'targets';
const CATEGORY_LABEL: Record<string, [string, string]> = {
  study: ['Study', 'पढ़ाई'], mock_test: ['Mock test', 'मॉक टेस्ट'], typing: ['Typing', 'टाइपिंग'], revision: ['Revision', 'रिवीजन'],
  current_affairs: ['Current affairs', 'करेंट अफेयर्स'], other: ['Other', 'अन्य'],
};
const WEEKDAYS: [string, string][] = [['Sun', 'रवि'], ['Mon', 'सोम'], ['Tue', 'मंगल'], ['Wed', 'बुध'], ['Thu', 'गुरु'], ['Fri', 'शुक्र'], ['Sat', 'शनि']];
const prettyDay = (d: string, hi: boolean) => new Date(`${d}T00:00:00`).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export default function PlannerScreen() {
  const t = useTheme();
  const { hi } = useI18n();
  const [data, setData] = useState<PlannerData | null>(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState<Section>('today');
  const [day, setDay] = useState(localDay());
  const [refreshing, setRefreshing] = useState(false);
  const [editTask, setEditTask] = useState<Partial<PlannerTask> | null>(null);
  const [editExam, setEditExam] = useState<Partial<PlannerExam> | null>(null);
  const [openSyllabus, setOpenSyllabus] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setData(await request('planner-get', { today: localDay(), tzOffset: new Date().getTimezoneOffset() })); setError(''); }
    catch (e) { setError(friendlyError(e)); } finally { setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const checkins = useMemo(() => new Set((data?.checkins || []).map(c => checkinKey(c.taskId, c.day))), [data]);
  const L = (en: string, h: string) => (hi ? h : en);

  // First visit: what the planner does
  const nav = useNav();
  const scroll = useTourScroll('app_planner');
  useScreenTour('app_planner', hi ? [
    { title: 'स्टडी प्लानर', text: 'अपनी तैयारी की योजना बनाएं: परीक्षा की तारीख, रोज़ के टास्क, सिलेबस और लक्ष्य, सब एक जगह। आपकी योजना आपके खाते में सेव रहती है।' },
    { target: 'planner.sections', fixed: true, title: 'पांच हिस्से', text: '"आज": आज के टास्क और परीक्षा में बचे दिन। "टास्क": सभी टास्क। "परीक्षाएं": आपकी परीक्षा की तारीखें। "सिलेबस": विषय-वार टिक करें। "लक्ष्य": रोज़ कितने टेस्ट देने हैं।' },
    { target: 'planner.add', fixed: true, title: 'टास्क या परीक्षा जोड़ें', text: '+ दबाएं: नया टास्क (एक बार या रोज़/हर हफ़्ते दोहराने वाला) या नई परीक्षा की तारीख जोड़ें।' },
    { target: 'planner.day', title: 'दिन-ब-दिन', text: 'तीरों से दूसरे दिन देखें। टास्क पूरा होने पर उस पर टिक करें, प्रगति अपने आप गिनी जाती है।' },
  ] : [
    { title: 'Study Planner', text: 'Plan your preparation: exam dates, daily tasks, the syllabus and targets, all in one place. Your plan is saved to your account.' },
    { target: 'planner.sections', fixed: true, title: 'Five parts', text: '"Today": today\'s tasks and days left to your exam. "Tasks": all tasks. "Exams": your exam dates. "Syllabus": tick off topics. "Targets": how many tests to take each day.' },
    { target: 'planner.add', fixed: true, title: 'Add a task or exam', text: 'Tap + to add a task (once, or repeating daily or weekly) or a new exam date.' },
    { target: 'planner.day', title: 'Day by day', text: 'Use the arrows to see another day. Tick a task when it is done and your progress is counted for you.' },
  ], !!data && section === 'today' && nav.tab === 'planner' && nav.stack.length === 0);

  const setDone = async (task: PlannerTask, done: boolean) => {
    // Update at once, then save
    setData(d => {
      if (!d) return d;
      if (isRepeating(task)) {
        const rest = d.checkins.filter(c => !(c.taskId === task.id && c.day === day));
        return { ...d, checkins: done ? [...rest, { taskId: task.id, day }] : rest };
      }
      return { ...d, tasks: d.tasks.map(x => (x.id === task.id ? { ...x, doneAt: done ? new Date().toISOString() : null } : x)) };
    });
    try { await request('planner-set-done', { id: task.id, done, day }); } catch (e) { setError(friendlyError(e)); load(); }
  };

  if (!data) return <View style={{ flex: 1, backgroundColor: t.bg }}><Header large title={L('Study Planner', 'स्टडी प्लानर')} />{error ? <ErrorBox message={error} onRetry={load} /> : <Loading />}</View>;

  const today = data.today;
  const act = data.activity[today] || { mock: 0, typing: 0 };
  const upcomingExams = [...data.exams].filter(e => daysBetween(today, e.examDate) >= 0).sort((a, b) => a.examDate.localeCompare(b.examDate));
  const dayTasks = tasksForDay(data.tasks, day);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header large title={L('Study Planner', 'स्टडी प्लानर')}
        right={section === 'tasks' || section === 'today' ? <TourTarget id="planner.add"><HeaderButton label="Add task" icon={<Plus size={24} color={t.headerText} />} onPress={() => setEditTask({ dueDate: day, category: 'study', priority: 'medium', repeatDays: [] })} /></TourTarget>
          : section === 'exams' ? <HeaderButton label="Add exam" icon={<Plus size={24} color={t.headerText} />} onPress={() => setEditExam({ examDate: addDays(today, 30) })} /> : undefined} />
      <TourTarget id="planner.sections">
      <Segmented options={[
        { key: 'today', label: L('Today', 'आज') }, { key: 'tasks', label: L('Tasks', 'टास्क') }, { key: 'exams', label: L('Exams', 'परीक्षाएं') },
        { key: 'syllabus', label: L('Syllabus', 'सिलेबस') }, { key: 'targets', label: L('Targets', 'लक्ष्य') },
      ]} value={section} onChange={setSection} />
      </TourTarget>
      {error ? <ErrorBox message={error} /> : null}

      <ScrollView {...scroll} contentContainerStyle={{ padding: 14, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[t.primary]} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {section === 'today' ? (
          <>
            {data.targets.mockTestsPerDay || data.targets.typingTestsPerDay ? (
              <Card style={{ flexDirection: 'row', gap: 10 }}>
                {[[act.mock, data.targets.mockTestsPerDay, L('Mock tests', 'मॉक टेस्ट')], [act.typing, data.targets.typingTestsPerDay, L('Typing tests', 'टाइपिंग टेस्ट')]].filter(([, goal]) => goal).map(([done, goal, label]) => (
                  <View key={String(label)} style={{ flex: 1 }}>
                    <Text style={{ color: t.textSoft, fontSize: 12 }}>{label as string}</Text>
                    <Text style={{ color: t.text, fontSize: 20, fontWeight: '900' }}>{done as number}<Text style={{ color: t.textMuted, fontSize: 14 }}> / {goal as number}</Text></Text>
                    <View style={{ marginTop: 8 }}><ProgressBar value={percent(done as number, goal as number) / 100} color={(done as number) >= (goal as number) ? t.success : t.primary} /></View>
                  </View>
                ))}
              </Card>
            ) : null}
            {upcomingExams.slice(0, 3).map(e => (
              <Card key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <CalendarClock size={22} color={t.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: '700' }}>{e.name}</Text>
                  <Text style={{ color: t.textSoft, fontSize: 12 }}>{prettyDay(e.examDate, hi)}</Text>
                </View>
                <Text style={{ color: t.primary, fontSize: 22, fontWeight: '900' }}>{daysBetween(today, e.examDate)}</Text>
                <Text style={{ color: t.textSoft, fontSize: 12 }}>{L('days', 'दिन')}</Text>
              </Card>
            ))}
            <TourTarget id="planner.day">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 6 }}>
              <Pressable onPress={() => setDay(addDays(day, -1))} style={{ padding: 6 }} accessibilityLabel="Previous day"><ChevronLeft size={20} color={t.text} /></Pressable>
              <Text style={{ flex: 1, textAlign: 'center', color: t.text, fontWeight: '800' }}>{day === today ? L('Today', 'आज') : prettyDay(day, hi)}</Text>
              <Pressable onPress={() => setDay(addDays(day, 1))} style={{ padding: 6 }} accessibilityLabel="Next day"><ChevronRight size={20} color={t.text} /></Pressable>
            </View>
            </TourTarget>
            {dayTasks.length === 0 ? <Empty title={L('Nothing planned', 'कुछ योजना नहीं')} text={L('Tap + to add a task for this day.', 'इस दिन का टास्क जोड़ने के लिए + दबाएं।')} /> : null}
            {dayTasks.map(task => <TaskRow key={task.id} task={task} done={isDone(task, day, checkins)} onToggle={d => setDone(task, d)} onEdit={() => setEditTask(task)} />)}
          </>
        ) : section === 'tasks' ? (
          <>
            {(() => {
              const open = data.tasks.filter(x => !isRepeating(x) && !x.doneAt).sort((a, b) => (a.dueDate || '9').localeCompare(b.dueDate || '9'));
              const repeating = data.tasks.filter(isRepeating);
              const doneList = data.tasks.filter(x => !isRepeating(x) && x.doneAt).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || '')).slice(0, 30);
              return (
                <>
                  <SectionTitle>{L('To do', 'करना है')} ({open.length})</SectionTitle>
                  {open.length ? open.map(x => <TaskRow key={x.id} task={x} done={false} onToggle={d => setDone(x, d)} onEdit={() => setEditTask(x)} showDate />) : <Text style={{ color: t.textMuted }}>{L('All done!', 'सब पूरा!')}</Text>}
                  {repeating.length ? <SectionTitle>{L('Repeating', 'दोहराए जाने वाले')} ({repeating.length})</SectionTitle> : null}
                  {repeating.map(x => <TaskRow key={x.id} task={x} done={isDone(x, today, checkins)} onToggle={d => setDone(x, d)} onEdit={() => setEditTask(x)} />)}
                  {doneList.length ? <SectionTitle>{L('Completed', 'पूरे हुए')}</SectionTitle> : null}
                  {doneList.map(x => <TaskRow key={x.id} task={x} done onToggle={d => setDone(x, d)} onEdit={() => setEditTask(x)} showDate />)}
                </>
              );
            })()}
          </>
        ) : section === 'exams' ? (
          <>
            {data.exams.length === 0 ? <Empty title={L('No exams added', 'कोई परीक्षा नहीं')} text={L('Add your exam dates to see a countdown.', 'काउंटडाउन देखने के लिए परीक्षा की तारीख जोड़ें।')} /> : null}
            {[...data.exams].sort((a, b) => a.examDate.localeCompare(b.examDate)).map(e => {
              const left = daysBetween(today, e.examDate);
              return (
                <Pressable key={e.id} onPress={() => setEditExam(e)}>
                  <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, opacity: left < 0 ? 0.6 : 1 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.text, fontWeight: '800' }}>{e.name}</Text>
                      <Text style={{ color: t.textSoft, fontSize: 12 }}>{prettyDay(e.examDate, hi)}{e.notes ? ` · ${e.notes}` : ''}</Text>
                    </View>
                    {left >= 0 ? <><Text style={{ color: t.primary, fontSize: 24, fontWeight: '900' }}>{left}</Text><Text style={{ color: t.textSoft }}>{L('days', 'दिन')}</Text></> : <Pill text={L('Done', 'हो गई')} />}
                  </Card>
                </Pressable>
              );
            })}
          </>
        ) : section === 'syllabus' ? (
          <SyllabusList data={data} onOpen={setOpenSyllabus} onChanged={load} />
        ) : (
          <TargetsForm data={data} onSaved={targets => setData(d => (d ? { ...d, targets } : d))} />
        )}
      </ScrollView>

      {editTask ? <TaskEditor task={editTask} today={today} onClose={() => setEditTask(null)} onSaved={() => { setEditTask(null); load(); }} /> : null}
      {editExam ? <ExamEditor exam={editExam} onClose={() => setEditExam(null)} onSaved={() => { setEditExam(null); load(); }} /> : null}
      {openSyllabus ? <SyllabusEditor syllabus={data.syllabi.find(s => s.id === openSyllabus)!} onClose={() => { setOpenSyllabus(null); load(); }} /> : null}
    </View>
  );
}

function TaskRow({ task, done, onToggle, onEdit, showDate }: { task: PlannerTask; done: boolean; onToggle: (d: boolean) => void; onEdit: () => void; showDate?: boolean }) {
  const t = useTheme();
  const { hi } = useI18n();
  const color = task.priority === 'high' ? t.danger : task.priority === 'low' ? t.textMuted : t.warning;
  return (
    <Pressable onPress={onEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: color }}>
      <Pressable onPress={() => onToggle(!done)} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: done }}
        style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: done ? t.success : t.textMuted, backgroundColor: done ? t.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {done ? <Check size={16} color="#fff" /> : null}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ color: done ? t.textMuted : t.text, fontWeight: '700', textDecorationLine: done ? 'line-through' : 'none' }}>{task.title}</Text>
        <Text style={{ color: t.textSoft, fontSize: 12 }}>
          {(hi ? CATEGORY_LABEL[task.category]?.[1] : CATEGORY_LABEL[task.category]?.[0]) || task.category}
          {task.dueTime ? ` · ${task.dueTime}` : ''}
          {showDate && task.dueDate ? ` · ${prettyDay(task.dueDate, hi)}` : ''}
          {isRepeating(task) ? ` · ${task.repeatDays.length === 7 ? (hi ? 'रोज़' : 'Every day') : task.repeatDays.map(d => (hi ? WEEKDAYS[d][1] : WEEKDAYS[d][0])).join(' ')}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function Chips<K extends string | number>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K | K[]; onChange: (k: K) => void }) {
  const t = useTheme();
  const on = (k: K) => (Array.isArray(value) ? value.includes(k) : value === k);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      {options.map(o => (
        <Pressable key={String(o.key)} onPress={() => onChange(o.key)} style={{ paddingHorizontal: 12, height: 34, borderRadius: 999, justifyContent: 'center', backgroundColor: on(o.key) ? t.primary : t.card, borderWidth: 1, borderColor: on(o.key) ? t.primary : t.border }}>
          <Text style={{ color: on(o.key) ? t.primaryText : t.text, fontWeight: '700', fontSize: 13 }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function TaskEditor({ task, today, onClose, onSaved }: { task: Partial<PlannerTask>; today: string; onClose: () => void; onSaved: () => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const L = (en: string, h: string) => (hi ? h : en);
  const [f, setF] = useState({
    title: task.title || '', notes: task.notes || '', category: task.category || 'study', priority: task.priority || 'medium',
    dueDate: task.dueDate || '', dueTime: task.dueTime || '', repeatDays: task.repeatDays || [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!f.title.trim()) { setError(L('Please enter a task.', 'कृपया टास्क लिखें।')); return; }
    if (f.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(f.dueDate)) { setError('Date: YYYY-MM-DD'); return; }
    if (f.dueTime && !/^\d{2}:\d{2}$/.test(f.dueTime)) { setError('Time: HH:MM'); return; }
    setBusy(true);
    try { await request('planner-save-task', { task: { ...task, ...f, title: f.title.trim(), dueDate: f.dueDate || null, dueTime: f.dueTime || null } }); onSaved(); }
    catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  };
  return (
    <Sheet title={task.id ? L('Edit task', 'टास्क बदलें') : L('New task', 'नया टास्क')} onClose={onClose}>
      {error ? <ErrorBox message={error} /> : null}
      <Field label={L('Task', 'टास्क')} value={f.title} onChangeText={v => setF(s => ({ ...s, title: v }))} placeholder={L('e.g. Revise Indian Polity chapter 3', 'जैसे राजव्यवस्था अध्याय 3 दोहराएं')} />
      <Text style={{ color: t.textSoft, fontWeight: '600', marginBottom: 6 }}>{L('Type', 'प्रकार')}</Text>
      <Chips options={Object.keys(CATEGORY_LABEL).map(k => ({ key: k, label: hi ? CATEGORY_LABEL[k][1] : CATEGORY_LABEL[k][0] }))} value={f.category} onChange={k => setF(s => ({ ...s, category: k as any }))} />
      <Text style={{ color: t.textSoft, fontWeight: '600', marginBottom: 6 }}>{L('Priority', 'प्राथमिकता')}</Text>
      <Chips options={[{ key: 'high', label: L('High', 'उच्च') }, { key: 'medium', label: L('Medium', 'मध्यम') }, { key: 'low', label: L('Low', 'कम') }]} value={f.priority} onChange={k => setF(s => ({ ...s, priority: k as any }))} />
      <Text style={{ color: t.textSoft, fontWeight: '600', marginBottom: 6 }}>{L('Date', 'तारीख')}</Text>
      <Chips options={[{ key: today, label: L('Today', 'आज') }, { key: addDays(today, 1), label: L('Tomorrow', 'कल') }, { key: addDays(today, 7), label: L('In a week', 'एक हफ्ते में') }, { key: '', label: L('No date', 'कोई तारीख नहीं') }]} value={f.dueDate} onChange={k => setF(s => ({ ...s, dueDate: k }))} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field value={f.dueDate} onChangeText={v => setF(s => ({ ...s, dueDate: v }))} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /></View>
        <View style={{ width: 110 }}><Field value={f.dueTime} onChangeText={v => setF(s => ({ ...s, dueTime: v }))} placeholder={L('HH:MM', 'समय')} keyboardType="numbers-and-punctuation" maxLength={5} /></View>
      </View>
      <Text style={{ color: t.textSoft, fontWeight: '600', marginBottom: 6 }}>{L('Repeat on', 'दोहराएं')}</Text>
      <Chips options={WEEKDAYS.map((w, i) => ({ key: i, label: hi ? w[1] : w[0] }))} value={f.repeatDays}
        onChange={k => setF(s => ({ ...s, repeatDays: s.repeatDays.includes(k) ? s.repeatDays.filter(x => x !== k) : [...s.repeatDays, k].sort() }))} />
      <Field label={L('Notes', 'नोट्स')} value={f.notes} onChangeText={v => setF(s => ({ ...s, notes: v }))} multiline style={{ minHeight: 70 }} />
      <Button title={L('Save', 'सेव करें')} loading={busy} onPress={save} />
      {task.id ? <Button style={{ marginTop: 10 }} outline tone="danger" title={L('Delete task', 'टास्क हटाएं')} icon={<Trash2 size={18} color={t.danger} />}
        onPress={() => confirm(L('Delete task?', 'टास्क हटाएं?'), task.title || '', L('Delete', 'हटाएं'), async () => { await request('planner-delete-task', { id: task.id }).catch(() => {}); onSaved(); })} /> : null}
    </Sheet>
  );
}

function ExamEditor({ exam, onClose, onSaved }: { exam: Partial<PlannerExam>; onClose: () => void; onSaved: () => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const L = (en: string, h: string) => (hi ? h : en);
  const [f, setF] = useState({ name: exam.name || '', examDate: exam.examDate || '', notes: exam.notes || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await request('planner-save-exam', { exam: { ...exam, ...f } }); onSaved(); } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  };
  return (
    <Sheet title={exam.id ? L('Edit exam', 'परीक्षा बदलें') : L('Add exam', 'परीक्षा जोड़ें')} onClose={onClose}>
      {error ? <ErrorBox message={error} /> : null}
      <Field label={L('Exam name', 'परीक्षा का नाम')} value={f.name} onChangeText={v => setF(s => ({ ...s, name: v }))} placeholder="SSC CGL 2026 Tier 1" />
      <Field label={L('Exam date (YYYY-MM-DD)', 'परीक्षा तिथि (YYYY-MM-DD)')} value={f.examDate} onChangeText={v => setF(s => ({ ...s, examDate: v }))} keyboardType="numbers-and-punctuation" />
      <Field label={L('Notes', 'नोट्स')} value={f.notes} onChangeText={v => setF(s => ({ ...s, notes: v }))} />
      <Button title={L('Save', 'सेव करें')} loading={busy} onPress={save} />
      {exam.id ? <Button style={{ marginTop: 10 }} outline tone="danger" title={L('Delete', 'हटाएं')} icon={<Trash2 size={18} color={t.danger} />}
        onPress={() => confirm(L('Delete exam?', 'परीक्षा हटाएं?'), exam.name || '', L('Delete', 'हटाएं'), async () => { await request('planner-delete-exam', { id: exam.id }).catch(() => {}); onSaved(); })} /> : null}
    </Sheet>
  );
}

function TargetsForm({ data, onSaved }: { data: PlannerData; onSaved: (t: PlannerData['targets']) => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const L = (en: string, h: string) => (hi ? h : en);
  const [mock, setMock] = useState(String(data.targets.mockTestsPerDay || 0));
  const [typing, setTyping] = useState(String(data.targets.typingTestsPerDay || 0));
  const [reminder, setReminder] = useState(data.targets.reminderTime || '');
  const [note, setNote] = useState('');
  const save = async () => {
    try {
      const r = await request('planner-save-targets', { mockTestsPerDay: Number(mock) || 0, typingTestsPerDay: Number(typing) || 0, reminderTime: reminder || null });
      onSaved(r.targets); setNote(L('Saved.', 'सेव हो गया।'));
    } catch (e) { setNote(friendlyError(e)); }
  };
  return (
    <>
      <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <Target size={22} color={t.primary} />
        <Text style={{ color: t.textSoft, flex: 1 }}>{L('Set daily goals. Tests you finish count automatically.', 'रोज़ के लक्ष्य तय करें। पूरे किए गए टेस्ट अपने आप गिने जाते हैं।')}</Text>
      </Card>
      <Field label={L('Mock tests per day', 'रोज़ मॉक टेस्ट')} value={mock} onChangeText={setMock} keyboardType="number-pad" maxLength={2} />
      <Field label={L('Typing tests per day', 'रोज़ टाइपिंग टेस्ट')} value={typing} onChangeText={setTyping} keyboardType="number-pad" maxLength={2} />
      <Field label={L('Reminder time (HH:MM, optional)', 'रिमाइंडर समय (HH:MM, वैकल्पिक)')} value={reminder} onChangeText={setReminder} keyboardType="numbers-and-punctuation" maxLength={5} />
      <Button title={L('Save targets', 'लक्ष्य सेव करें')} onPress={save} />
      {note ? <Text style={{ color: t.success, marginTop: 8 }}>{note}</Text> : null}
    </>
  );
}

function SyllabusList({ data, onOpen, onChanged }: { data: PlannerData; onOpen: (id: string) => void; onChanged: () => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const L = (en: string, h: string) => (hi ? h : en);
  const [adding, setAdding] = useState(false);
  const add = async (tpl?: typeof SYLLABUS_TEMPLATES[number]) => {
    const syllabus: Partial<Syllabus> = {
      name: tpl ? (hi ? tpl.nameHi : tpl.name) : L('My syllabus', 'मेरा सिलेबस'), examId: null,
      subjects: tpl ? tpl.subjects.map(s => ({ id: newId(), name: s.name, chapters: s.chapters.map(c => ({ id: newId(), name: c, status: 'todo' as const, revisions: 0, completedAt: null, revisedAt: null })) })) : [],
    };
    try { const r = await request('planner-save-syllabus', { syllabus }); setAdding(false); onChanged(); onOpen(r.syllabus.id); } catch { /* shown on reload */ }
  };
  return (
    <>
      {data.syllabi.map(s => {
        const c = syllabusCounts(s);
        return (
          <Pressable key={s.id} onPress={() => onOpen(s.id)}>
            <Card style={{ marginBottom: 10 }}>
              <Text style={{ color: t.text, fontWeight: '800' }}>{s.name}</Text>
              <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 2 }}>{c.done}/{c.total} {L('chapters done', 'अध्याय पूरे')} · {s.subjects.length} {L('subjects', 'विषय')}</Text>
              <View style={{ marginTop: 10 }}><ProgressBar value={percent(c.done, c.total) / 100} color={t.success} /></View>
            </Card>
          </Pressable>
        );
      })}
      {data.syllabi.length === 0 ? <Empty title={L('No syllabus yet', 'अभी कोई सिलेबस नहीं')} text={L('Track every chapter you complete.', 'पूरे किए गए हर अध्याय को ट्रैक करें।')} /> : null}
      <Button title={L('Add syllabus', 'सिलेबस जोड़ें')} icon={<Plus size={18} color={t.primaryText} />} onPress={() => setAdding(true)} />
      {adding ? (
        <Sheet title={L('Choose a syllabus', 'सिलेबस चुनें')} onClose={() => setAdding(false)}>
          {SYLLABUS_TEMPLATES.map(tpl => (
            <Pressable key={tpl.id} onPress={() => add(tpl)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Text style={{ color: t.text, fontWeight: '700' }}>{hi ? tpl.nameHi : tpl.name}</Text>
              <Text style={{ color: t.textSoft, fontSize: 12 }}>{tpl.subjects.length} {L('subjects', 'विषय')} · {tpl.subjects.reduce((n, s) => n + s.chapters.length, 0)} {L('chapters', 'अध्याय')}</Text>
            </Pressable>
          ))}
          <Button style={{ marginTop: 14 }} outline title={L('Start blank', 'खाली से शुरू करें')} onPress={() => add()} />
        </Sheet>
      ) : null}
    </>
  );
}

function SyllabusEditor({ syllabus: initial, onClose }: { syllabus: Syllabus; onClose: () => void }) {
  const t = useTheme();
  const { hi } = useI18n();
  const L = (en: string, h: string) => (hi ? h : en);
  const [s, setS] = useState(initial);
  const [newSubject, setNewSubject] = useState('');
  const [newChapter, setNewChapter] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const persist = async (next: Syllabus) => {
    setS(next); setSaving(true);
    try { await request('planner-save-syllabus', { syllabus: next }); } catch { /* retried on next change */ } finally { setSaving(false); }
  };
  const cycle = (subjectId: string, chapterId: string) => persist({
    ...s,
    subjects: s.subjects.map(sub => sub.id !== subjectId ? sub : {
      ...sub,
      chapters: sub.chapters.map(c => {
        if (c.id !== chapterId) return c;
        const status = c.status === 'todo' ? 'doing' : c.status === 'doing' ? 'done' : 'todo';
        return { ...c, status, completedAt: status === 'done' ? new Date().toISOString() : status === 'todo' ? null : c.completedAt };
      }),
    }),
  });
  const revise = (subjectId: string, chapterId: string) => persist({
    ...s, subjects: s.subjects.map(sub => sub.id !== subjectId ? sub : { ...sub, chapters: sub.chapters.map(c => (c.id === chapterId ? { ...c, revisions: c.revisions + 1, revisedAt: new Date().toISOString() } : c)) }),
  });
  const c = syllabusCounts(s);
  return (
    <Sheet title={s.name} onClose={onClose}>
      <Text style={{ color: t.textSoft, marginBottom: 10 }}>{c.done}/{c.total} {L('chapters done', 'अध्याय पूरे')} ({percent(c.done, c.total)}%){saving ? ' · …' : ''}</Text>
      <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 10 }}>{L('Tap a chapter: to do → doing → done.', 'अध्याय पर टैप करें: करना है → चल रहा है → पूरा।')}</Text>
      {s.subjects.map(sub => {
        const cc = chapterCounts(sub.chapters);
        return (
          <Card key={sub.id} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: t.text, fontWeight: '800', flex: 1 }}>{sub.name}</Text>
              <Text style={{ color: t.textSoft, fontSize: 12 }}>{cc.done}/{cc.total}</Text>
            </View>
            {sub.chapters.map(ch => {
              const due = ch.status === 'done' && revisionDue(ch);
              const color = ch.status === 'done' ? t.success : ch.status === 'doing' ? t.warning : t.textMuted;
              return (
                <View key={ch.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border, gap: 10 }}>
                  <Pressable onPress={() => cycle(sub.id, ch.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color, backgroundColor: ch.status === 'done' ? color : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {ch.status === 'done' ? <Check size={13} color="#fff" /> : ch.status === 'doing' ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /> : null}
                    </View>
                    <Text style={{ color: t.text, flex: 1, textDecorationLine: ch.status === 'done' ? 'line-through' : 'none' }}>{ch.name}</Text>
                  </Pressable>
                  {ch.status === 'done' ? (
                    <Pressable onPress={() => revise(sub.id, ch.id)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: due ? t.warningSoft : t.cardAlt }}>
                      <Text style={{ color: due ? t.warning : t.textSoft, fontSize: 11, fontWeight: '700' }}>{due ? L('Revise', 'दोहराएं') : `↻ ${ch.revisions}`}</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}><Field value={newChapter[sub.id] || ''} onChangeText={v => setNewChapter(m => ({ ...m, [sub.id]: v }))} placeholder={L('Add chapter', 'अध्याय जोड़ें')} /></View>
              <Button small title="+" onPress={() => {
                const name = (newChapter[sub.id] || '').trim();
                if (!name) return;
                setNewChapter(m => ({ ...m, [sub.id]: '' }));
                persist({ ...s, subjects: s.subjects.map(x => (x.id === sub.id ? { ...x, chapters: [...x.chapters, { id: newId(), name, status: 'todo', revisions: 0, completedAt: null, revisedAt: null }] } : x)) });
              }} style={{ height: 46 }} />
            </View>
          </Card>
        );
      })}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Field value={newSubject} onChangeText={setNewSubject} placeholder={L('Add subject', 'विषय जोड़ें')} /></View>
        <Button small title="+" style={{ height: 46 }} onPress={() => { if (!newSubject.trim()) return; persist({ ...s, subjects: [...s.subjects, { id: newId(), name: newSubject.trim(), chapters: [] }] }); setNewSubject(''); }} />
      </View>
      <Button style={{ marginTop: 14 }} outline tone="danger" title={L('Delete syllabus', 'सिलेबस हटाएं')} icon={<Trash2 size={18} color={t.danger} />}
        onPress={() => confirm(L('Delete syllabus?', 'सिलेबस हटाएं?'), s.name, L('Delete', 'हटाएं'), async () => { await request('planner-delete-syllabus', { id: s.id }).catch(() => {}); onClose(); })} />
    </Sheet>
  );
}


