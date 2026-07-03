// Pure helpers for recurring task milestones + in-app reminders.
// Dates are calendar-day strings ("YYYY-MM-DD"); all math is done in UTC so it
// never drifts across the user's local timezone. Dependency-free (client/server).

const pad = (n) => String(n).padStart(2, "0");

function parse(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toStr(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addStep(date, freq) {
  const d = new Date(date.getTime());
  if (freq === "daily") d.setUTCDate(d.getUTCDate() + 1);
  else if (freq === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (freq === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

// Cap so a mis-set (or endless) series can never generate unbounded work.
export const MAX_OCCURRENCES = 200;

/**
 * Occurrence date strings for a task within [rangeStart, rangeEnd] inclusive.
 * A one-off task yields [due] when in range; a recurring task steps from `due`
 * by `recurFreq` up to `recurUntil` (or the range end), capped at MAX_OCCURRENCES.
 *
 * @param {{due:string, recurFreq?:string|null, recurUntil?:string|null}} task
 * @param {string} rangeStart  "YYYY-MM-DD"
 * @param {string} rangeEnd    "YYYY-MM-DD"
 * @returns {string[]}
 */
export function expandTaskOccurrences(task, rangeStart, rangeEnd) {
  if (!task || !task.due) return [];
  const start = parse(rangeStart);
  const end = parse(rangeEnd);
  const base = parse(task.due);

  if (!task.recurFreq) {
    return base >= start && base <= end ? [task.due] : [];
  }

  const until = task.recurUntil ? parse(task.recurUntil) : null;
  const hardEnd = until && until < end ? until : end;

  const out = [];
  let cur = base;
  let guard = 0;
  while (cur <= hardEnd && guard < MAX_OCCURRENCES) {
    if (cur >= start) out.push(toStr(cur));
    cur = addStep(cur, task.recurFreq);
    guard += 1;
  }
  return out;
}

/**
 * Whether a given occurrence date is inside its reminder window today.
 * True when a lead time is set, the task isn't done, and today falls in
 * [occDate - remindDays, occDate].
 *
 * @param {string} occDateStr   "YYYY-MM-DD"
 * @param {number|null} remindDays
 * @param {string} status
 * @param {string} todayStr     "YYYY-MM-DD"
 * @returns {boolean}
 */
export function isReminding(occDateStr, remindDays, status, todayStr) {
  if (remindDays == null || status === "done" || !occDateStr) return false;
  const occ = parse(occDateStr);
  const today = parse(todayStr);
  const windowStart = new Date(occ.getTime());
  windowStart.setUTCDate(windowStart.getUTCDate() - Number(remindDays));
  return today >= windowStart && today <= occ;
}

export const RECUR_FREQS = ["daily", "weekly", "monthly"];
export const REMIND_OPTIONS = [1, 2, 3, 7, 14, 30];
