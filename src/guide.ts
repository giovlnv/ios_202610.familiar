import { t as tr } from './i18n';
import { familiarFor } from './familiar';
import { getBook, loadProgress } from './storage';
import { read } from './theme';
import { load } from './tracker';

export function currentGuide() {
  let hidden: Record<string, string> = {};
  try {
    hidden = JSON.parse(read('hidden-listening.json') || '{}');
  } catch {}
  const first = load().books.find((b) => {
    if (!b.audio || !getBook(b.audio)) return false;
    const p = loadProgress(b.audio);
    return (p.time > 0 || p.section > 0) && hidden[b.audio] !== `${p.section}:${Math.floor(p.time)}`;
  });
  return familiarFor(first?.paths);
}

const SYNODIC = 29.530588853;
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const PHASES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];

export function moonPhase(date = new Date()) {
  const age = ((((date.getTime() - NEW_MOON) / 86400000) % SYNODIC) + SYNODIC) % SYNODIC;
  const i = Math.floor((age / SYNODIC) * 8 + 0.5) % 8;
  return { name: tr(PHASES[i]), frac: age / SYNODIC, age: Math.round(age), lit: Math.round(((1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2) * 100) };
}
