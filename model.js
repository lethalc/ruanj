export const CATEGORIES = ['工作', '学习', '生活', '健康'];
export const STORAGE_KEY = 'dayline.data.v1';
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function parseDate(value) { return new Date(`${value}T12:00:00`); }
export function shiftDate(value, days) { const d = parseDate(value); d.setDate(d.getDate() + days); return dateKey(d); }
export function weekStart(value) { const d = parseDate(value); return shiftDate(value, -((d.getDay() + 6) % 7)); }
export function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(parseDate(value)) && dateKey(parseDate(value)) === value; }
export function newState() { return { tasks: [], entries: [], reflections: {}, settings: { name: '' } }; }
export function id() { return globalThis.crypto?.randomUUID?.() || `d${Date.now()}${Math.random().toString(36).slice(2)}`; }
const text = (v, max = 2000) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const time = v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : '';
const category = v => CATEGORIES.includes(v) ? v : '生活';
const minutes = v => Math.max(0, Math.min(1440, Math.round(Number(v) || 0)));
export function normalizeState(raw) {
  if (!raw || !Array.isArray(raw.tasks) || !Array.isArray(raw.entries) || raw.tasks.length > 50000 || raw.entries.length > 50000) throw new Error('备份格式不正确，请选择日序导出的 JSON 文件。');
  const seen = new Set();
  const getID = value => { const next = typeof value === 'string' && /^[a-zA-Z0-9_-]{1,99}$/.test(value) && !seen.has(value) ? value : id(); seen.add(next); return next; };
  const tasks = raw.tasks.map(t => {
    if (!t || !text(t.title, 180) || !validDate(t.date)) throw new Error('备份中有无效的计划。');
    return { id: getID(t.id), title: text(t.title, 180), date: t.date, time: time(t.time), category: category(t.category), priority: t.priority === 'high' ? 'high' : 'normal', minutes: minutes(t.minutes), completed: t.completed === true, completedAt: text(t.completedAt, 50), createdAt: text(t.createdAt, 50) };
  });
  const entries = raw.entries.map(t => {
    if (!t || !text(t.text) || !validDate(t.date)) throw new Error('备份中有无效的记录。');
    return { id: getID(t.id), text: text(t.text), date: t.date, time: time(t.time), category: category(t.category), minutes: minutes(t.minutes), createdAt: text(t.createdAt, 50) };
  });
  const reflections = {};
  for (const [key, value] of Object.entries(raw.reflections || {})) {
    if (!validDate(key) || !value || typeof value !== 'object') continue;
    reflections[key] = { mood: Number.isInteger(value.mood) && value.mood >= 1 && value.mood <= 5 ? value.mood : 0, win: text(value.win), improve: text(value.improve), tomorrow: text(value.tomorrow), updatedAt: text(value.updatedAt, 50) };
  }
  return { tasks, entries, reflections, settings: { name: text(raw.settings?.name, 24) } };
}
export function createBackup(state) { return { app: 'dayline', version: 1, exportedAt: new Date().toISOString(), data: normalizeState(state) }; }
export function readBackup(value) {
  if (!value || value.app !== 'dayline' || value.version !== 1) throw new Error('这不是日序支持的备份文件。');
  return normalizeState(value.data);
}
export function dayStats(state, day) {
  const tasks = state.tasks.filter(t => t.date === day);
  const entries = state.entries.filter(t => t.date === day);
  const complete = tasks.filter(t => t.completed).length;
  return { tasks: tasks.length, complete, entries: entries.length, minutes: entries.reduce((a, e) => a + e.minutes, 0), percent: tasks.length ? Math.round(complete / tasks.length * 100) : 0 };
}
export function hasActivity(state, day) {
  const r = state.reflections[day];
  return state.entries.some(e => e.date === day) || state.tasks.some(t => t.date === day && t.completed) || !!(r && (r.mood || r.win || r.improve || r.tomorrow));
}
export function streak(state, today = dateKey()) {
  let day = hasActivity(state, today) ? today : shiftDate(today, -1);
  let count = 0;
  while (count < 36600 && hasActivity(state, day)) { count++; day = shiftDate(day, -1); }
  return count;
}
export function weekStats(state, start) {
  const days = Array.from({ length: 7 }, (_, i) => ({ date: shiftDate(start, i), ...dayStats(state, shiftDate(start, i)) }));
  return { days, tasks: days.reduce((a, d) => a + d.tasks, 0), complete: days.reduce((a, d) => a + d.complete, 0), entries: days.reduce((a, d) => a + d.entries, 0), minutes: days.reduce((a, d) => a + d.minutes, 0), activeDays: days.filter(d => hasActivity(state, d.date)).length };
}
