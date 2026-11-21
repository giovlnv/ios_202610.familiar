/** Moves positions from one book.json to another (GitHub split → calliope's Kokoro split, or a regenerated book) by matching passage text. Pure: no file access. */
import type { Book, Consult, Note, Progress } from './types';

type At = { section: number; para: number };
type Spot = { section: string; para?: number; time?: number };

/** lowercase letters and digits, without a leading list number ("1. The Magus" = "The Magus") */
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').replace(/^\d+/, '');
const K = 24;
const spoken = (k: string) => k !== 'explain' && k !== 'explainhead';

/** from (section index, para index) in `from` → the same passage in `to`; text first, else the same share of the book */
export function locator(from: Book, to: Book) {
  const flat = (b: Book) => b.sections.flatMap((s, si) => s.paras.map((p, pi) => ({ si, pi, k: spoken(p.kind) ? norm(p.text) : '' })));
  const src = flat(from);
  const dst = flat(to);
  const index = new Map<string, number>();
  dst.forEach((d, i) => d.k.length >= 12 && !index.has(d.k.slice(0, K)) && index.set(d.k.slice(0, K), i));
  const keys = dst.map((d) => d.k);
  const find = (k: string) => {
    if (k.length < 12) return undefined;
    const hit = index.get(k.slice(0, K));
    if (hit !== undefined) return hit;
    const i = keys.findIndex((d) => d.length >= 12 && (k.startsWith(d) || d.startsWith(k)));
    return i < 0 ? undefined : i;
  };
  const pos = new Map(src.map((s, i) => [`${s.si}:${s.pi}`, i]));
  const memo = new Map<number, number | undefined>();
  const match = (j: number) => {
    if (!memo.has(j)) memo.set(j, find(src[j].k));
    return memo.get(j);
  };
  return (section: number, para: number): At | null => {
    if (!dst.length) return null;
    const i = pos.get(`${section}:${para}`) ?? src.findIndex((s) => s.si === section);
    if (i < 0) return { section: 0, para: 0 };
    for (let j = i; j >= 0; j--) {
      const hit = match(j);
      if (hit === undefined) continue;
      // unmatched text follows the last passage that matched (an explanation stays on it), unless that is far back: then the same share of the book
      if (i - j > 40) break;
      const h = j === i || !src[i].k ? hit : Math.min(dst.length - 1, hit + 1);
      return { section: dst[h].si, para: dst[h].pi };
    }
    const d = dst[Math.min(dst.length - 1, Math.floor((i / Math.max(1, src.length)) * dst.length))];
    return { section: d.si, para: d.pi };
  };
}

/** para playing at `time`; phone-voiced books have no timings until voiced (undefined or negative), so those count as the start */
const paraAt = (b: Book, si: number, time: number) => {
  const ps = b.sections[si]?.paras ?? [];
  const timed = (p: { end?: number }) => typeof p.end === 'number' && p.end > 0 && p.end < 1e8;
  if (!ps.some(timed)) return 0;
  const i = ps.findIndex((p) => timed(p) && time < p.end);
  return i < 0 ? Math.max(0, ps.length - 1) : i;
};

export function remapAll(from: Book, to: Book) {
  const at = locator(from, to);
  const sIndex = (b: Book, id: string) => b.sections.findIndex((s) => s.id === id);
  const startOf = (a: At) => to.sections[a.section]?.paras[a.para]?.start ?? 0;

  /** a note/consult/flashcard/mark spot; para wins over time when both are known */
  const spot = <T extends Spot>(x: T): T => {
    const si = sIndex(from, x.section);
    if (si < 0) return x;
    const a = at(si, x.para ?? paraAt(from, si, x.time ?? 0));
    if (!a) return x;
    const out = { ...x, section: to.sections[a.section].id };
    if (x.para !== undefined) out.para = a.para;
    if (x.time !== undefined) out.time = startOf(a);
    return out;
  };

  const progress = (p: Progress): Progress => {
    const a = at(p.section, paraAt(from, p.section, p.time));
    if (!a) return p;
    const doneOld = new Set(p.done ?? []);
    const back = locator(to, from);
    const done = to.sections
      .filter((s, si) => {
        if (!s.paras.length) return false;
        const ends = [back(si, 0), back(si, s.paras.length - 1)];
        return ends.every((e) => e && doneOld.has(from.sections[e.section].id));
      })
      .map((s) => s.id);
    return { section: a.section, time: startOf(a), done };
  };

  /** cards.json: section id → link; the first old section landing on a new one wins */
  const links = <L,>(m: Record<string, L>): Record<string, L> => {
    const out: Record<string, L> = {};
    for (const [id, l] of Object.entries(m)) {
      const si = sIndex(from, id);
      const a = si < 0 ? null : at(si, 0);
      const key = a ? to.sections[a.section].id : id;
      if (!(key in out)) out[key] = l;
    }
    return out;
  };

  return {
    progress,
    notes: (ns: Note[]) => ns.map(spot),
    consults: (cs: Consult[]) => cs.map(spot),
    spot,
    links,
  };
}
