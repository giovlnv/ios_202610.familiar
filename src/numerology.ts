import { getProfile, load } from './tracker';
import { getOnboarding } from './familiar';
import { CARDS } from './decks';

const MASTERS = [11, 22, 33];

const digitSum = (n: number) => [...String(n)].reduce((a, x) => a + Number(x), 0);

export const reduce = (n: number, masters = true) => {
  while (n > 9 && !(masters && MASTERS.includes(n))) n = digitSum(n);
  return n;
};

export const show = (n: number) => (MASTERS.includes(n) ? `${n}/${reduce(n, false)}` : String(n));

const letters = (word: string) =>
  word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');

const value = (ch: string) => ((ch.charCodeAt(0) - 65) % 9) + 1;

const nameNumber = (name: string, pick: (ch: string) => boolean) =>
  reduce(
    name
      .split(/\s+/)
      .map((w) => reduce([...letters(w)].filter(pick).reduce((a, ch) => a + value(ch), 0)))
      .reduce((a, n) => a + n, 0),
  );

export const expression = (name: string) => nameNumber(name, () => true);
const vowels = () => (getOnboarding().yVowel ? 'AEIOUY' : 'AEIOU');

export type NumSystem = 'pythagorean' | 'chaldean' | 'nct';
export const SYSTEMS: NumSystem[] = ['pythagorean', 'chaldean', 'nct'];
export const SYSTEM_NAME: Record<NumSystem, string> = { pythagorean: 'Pythagorean', chaldean: 'Chaldean', nct: 'Cabalística (NCT)' };

export function activeSystem(): NumSystem {
  const own = getOnboarding().numSystem;
  if (own) return own;
  return load().books.find((b) => b.paths?.includes('numerology') && b.numSystem)?.numSystem ?? 'pythagorean';
}

const CHALDEAN: Record<string, number> = Object.fromEntries(
  ['AIJQY', 'BKR', 'CGLS', 'DMT', 'EHN', 'UVW', 'OZ', 'FP'].flatMap((g, i) => [...g].map((ch) => [ch, i + 1])),
);

const MARK: Record<string, (v: number) => number> = {
  '\u0301': (v) => v + 2,
  '\u0303': (v) => v + 3,
  '\u0302': (v) => v + 7,
  '\u030A': (v) => v + 7,
  '\u0300': (v) => v * 2,
  '\u0308': (v) => v * 2,
  '\u0327': (v) => v * 2,
};

type Glyph = { ch: string; v: number };

export function glyphs(name: string, sys: NumSystem): Glyph[] {
  const o = getOnboarding();
  const x = o.numX ?? 5;
  const out: Glyph[] = [];
  for (const g of name.normalize('NFD').toUpperCase().match(/[A-Z][\u0300-\u036f]*/g) ?? []) {
    const ch = g[0];
    let v = sys === 'pythagorean' ? value(ch) : ch === 'X' ? x : CHALDEAN[ch];
    if (!v) continue;
    if (sys === 'nct' && o.numAccents) for (const m of g.slice(1)) v = MARK[m]?.(v) ?? v;
    out.push({ ch, v });
  }
  return out;
}

const sum = (gs: Glyph[], pick: (ch: string) => boolean = () => true) => gs.filter((g) => pick(g.ch)).reduce((a, g) => a + g.v, 0);

export function triangle(name: string) {
  const rows = [glyphs(name, 'nct').map((g) => reduce(g.v, false))];
  while (rows[rows.length - 1].length > 1) {
    const r = rows[rows.length - 1];
    rows.push(r.slice(1).map((n, i) => reduce(r[i] + n, false)));
  }
  const seqs = new Set<string>();
  rows.forEach((r) => r.join('').match(/(\d)\1\1+/g)?.forEach((m) => seqs.add(m.slice(0, 3))));
  return { rows, seqs: [...seqs].sort() };
}

export function karmicLessons(name: string) {
  const have = new Set(glyphs(name, 'nct').map((g) => reduce(g.v, false)));
  return [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => !have.has(n));
}
export const soulUrge = (name: string, v = vowels()) => nameNumber(name, (ch) => v.includes(ch));
export const personality = (name: string, v = vowels()) => nameNumber(name, (ch) => !v.includes(ch));

export const lifePath = (dob: string) => {
  const [y, m, d] = dob.split('-').map(Number);
  return reduce(reduce(d) + reduce(m) + reduce(digitSum(y)));
};
export const birthday = (dob: string) => reduce(Number(dob.split('-')[2]));
export const maturity = (dob: string, name: string) => reduce(lifePath(dob) + expression(name));

const RANK_IDS = ['wands', 'cups', 'swords', 'pents'];

export function numberCards(n: number) {
  const root = reduce(n, false);
  const majors = CARDS.filter((c, i) => i > 0 && i < 22 && reduce(i, false) === root);
  const own = n === 22 ? ['m00'] : n === 11 ? ['m11'] : [];
  const minors = RANK_IDS.flatMap((s) => [`${s}${String(root).padStart(2, '0')}`, ...(root === 1 ? [`${s}10`] : [])]);
  return [...own, ...majors.map((c) => c.id).filter((id) => !own.includes(id)), ...minors];
}

export function cardNumber(id: string) {
  if (id === 'm00') return '0 · also read as 22/4';
  const i = Number(id.slice(-2));
  if (id.startsWith('m')) return i > 9 ? `${i} → ${reduce(i, false)}` : String(i);
  if (i > 10) return undefined;
  return i === 10 ? '10 → 1' : String(i);
}

export function personal(dob: string, on = new Date()) {
  const [, m, d] = dob.split('-').map(Number);
  const year = reduce(reduce(d, false) + reduce(m, false) + reduce(on.getFullYear(), false), false);
  const month = reduce(year + on.getMonth() + 1, false);
  return { year, month, day: reduce(month + on.getDate(), false) };
}

export type NumberRow = { key: string; label: string; value: number; about: string; compound?: number };

export const MEANING: Record<string, string> = {
  lifePath: 'From your birth date: the main path and lesson of this life.',
  birthday: 'From the day you were born: a specific gift you bring.',
  expression: 'All the letters of the name: your talents and how you express them.',
  soulUrge: 'The vowels: what you long for inside.',
  personality: 'The consonants: how others first see you.',
  maturity: 'Life path plus expression: who you grow into.',
  name: 'All the letters of the name you are known by. The compound number is read first, then the single digit.',
  birth: 'The day you were born.',
  destiny: 'Every digit of your birth date added together.',
  motivacao: 'Motivação, the vowels: what moves you inside.',
  impressao: 'Impressão, the consonants: the impression you make.',
  expressao: 'Expressão, all the letters: how you act in the world.',
};

const withCompound = (key: string, label: string, compound: number, about: string): NumberRow => ({
  key,
  label,
  value: reduce(compound),
  compound: compound > 9 && !MASTERS.includes(compound) ? compound : undefined,
  about,
});

const chaldeanName = (key: string, label: string, name: string) => withCompound(key, label, sum(glyphs(name, 'chaldean')), MEANING.name);

const nctRows = (name: string): NumberRow[] => {
  const gs = glyphs(name, 'nct');
  const v = vowels();
  return [
    { key: 'expression', label: 'Expression', value: reduce(sum(gs)), about: MEANING.expressao },
    { key: 'soulUrge', label: 'Motivation', value: reduce(sum(gs, (ch) => v.includes(ch))), about: MEANING.motivacao },
    { key: 'personality', label: 'Impression', value: reduce(sum(gs, (ch) => !v.includes(ch))), about: MEANING.impressao },
  ];
};

const nameRows = (name: string): NumberRow[] => [
  { key: 'expression', label: 'Expression', value: expression(name), about: MEANING.expression },
  { key: 'soulUrge', label: 'Soul urge', value: soulUrge(name), about: MEANING.soulUrge },
  { key: 'personality', label: 'Personality', value: personality(name), about: MEANING.personality },
];

export function numbers(sys: NumSystem = activeSystem()) {
  const p = getProfile();
  const current = p.names?.at(-1)?.name;
  if (sys === 'chaldean') {
    const known = current ?? p.birthName;
    const core: NumberRow[] = [];
    if (p.dob) {
      const day = Number(p.dob.split('-')[2]);
      core.push(withCompound('destiny', 'Destiny', digitSum(Number(p.dob.replace(/-/g, ''))), MEANING.destiny));
      core.push(withCompound('birth', 'Birth number', day, MEANING.birth));
    }
    if (known) core.push(chaldeanName('name', 'Name number', known));
    const other = p.birthName && current && letters(current) !== letters(p.birthName) ? [chaldeanName('birthName', 'Birth name', p.birthName)] : [];
    return { core, current: other, currentName: current ? p.birthName : undefined, birthName: known, history: p.names ?? [] };
  }
  if (sys === 'nct') {
    const core: NumberRow[] = p.dob
      ? [
          { key: 'lifePath', label: 'Destiny', value: lifePath(p.dob), about: MEANING.lifePath },
          { key: 'birthday', label: 'Birthday', value: birthday(p.dob), about: MEANING.birthday },
        ]
      : [];
    if (p.birthName) core.push(...nctRows(p.birthName));
    const now = current && letters(current) !== letters(p.birthName ?? '') ? nctRows(current) : [];
    return { core, current: now, currentName: current, birthName: p.birthName, history: p.names ?? [] };
  }
  const core: NumberRow[] = p.dob
    ? [
        { key: 'lifePath', label: 'Life path', value: lifePath(p.dob), about: MEANING.lifePath },
        { key: 'birthday', label: 'Birthday', value: birthday(p.dob), about: MEANING.birthday },
      ]
    : [];
  if (p.birthName) {
    core.push(...nameRows(p.birthName));
    if (p.dob) core.push({ key: 'maturity', label: 'Maturity', value: maturity(p.dob, p.birthName), about: MEANING.maturity });
  }
  const now = current && letters(current) !== letters(p.birthName ?? '') ? nameRows(current) : [];
  return { core, current: now, currentName: current, birthName: p.birthName, history: p.names ?? [] };
}
