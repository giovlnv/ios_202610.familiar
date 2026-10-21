import { load, today } from './tracker';
import { loadJournal } from './journal';

const MIN_LISTEN = 60;

export function activeDays() {
  const t = load();
  const days = new Set<string>();
  for (const r of loadJournal().readings) days.add(r.at.slice(0, 10));
  for (const [d, m] of Object.entries(t.listened ?? {})) if (Object.values(m).reduce((a, s) => a + s, 0) >= MIN_LISTEN) days.add(d);
  for (const l of t.logs) days.add(l.date);
  return days;
}

const shift = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export function streaks(year?: string) {
  const days = activeDays();
  const inYear = (d: string) => days.has(d) && (!year || d.startsWith(year));
  let current = 0;
  for (let d = days.has(today()) ? today() : today(-1); days.has(d); d = shift(d, -1)) current++;
  let longest = 0;
  for (const x of days) {
    if (!inYear(x) || inYear(shift(x, -1))) continue;
    let n = 0;
    for (let y = x; inYear(y); y = shift(y, 1)) n++;
    longest = Math.max(longest, n);
  }
  return { current, longest, today: days.has(today()) };
}
