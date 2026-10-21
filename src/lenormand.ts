import { t as tr } from './i18n';
import { File, Paths } from 'expo-file-system';

const RAW: [string, string, string, string][] = [
  ['Rider', 'O Cavaleiro', '9♥', 'news, arrival'],
  ['Clover', 'O Trevo', '6♦', 'small luck · obstacles'],
  ['Ship', 'O Navio', '10♠', 'travel, distance'],
  ['House', 'A Casa', 'K♥', 'home, family'],
  ['Tree', 'A Árvore', '7♥', 'health, growth'],
  ['Clouds', 'As Nuvens', 'K♣', 'confusion'],
  ['Snake', 'A Serpente', 'Q♣', 'complication, detour'],
  ['Coffin', 'O Caixão', '9♦', 'ending'],
  ['Bouquet', 'O Buquê', 'Q♠', 'gift, pleasure'],
  ['Scythe', 'A Foice', 'J♦', 'sudden cut'],
  ['Whip', 'O Chicote', 'J♣', 'conflict, repetition'],
  ['Birds', 'Os Pássaros', '7♦', 'talk, nerves'],
  ['Child', 'A Criança', 'J♠', 'new start, small'],
  ['Fox', 'A Raposa', '9♣', 'cunning, work'],
  ['Bear', 'O Urso', '10♣', 'power, protection'],
  ['Stars', 'As Estrelas', '6♥', 'hope, guidance'],
  ['Stork', 'A Cegonha', 'Q♥', 'change'],
  ['Dog', 'O Cachorro', '10♥', 'friend, loyalty'],
  ['Tower', 'A Torre', '6♠', 'institution, solitude'],
  ['Garden', 'O Jardim', '8♠', 'public, social'],
  ['Mountain', 'A Montanha', '8♣', 'obstacle'],
  ['Crossroads', 'Os Caminhos', 'Q♦', 'choice'],
  ['Mice', 'Os Ratos', '7♣', 'loss, wear'],
  ['Heart', 'O Coração', 'J♥', 'love'],
  ['Ring', 'O Anel', 'A♣', 'commitment, contract'],
  ['Book', 'O Livro', '10♦', 'secret, study'],
  ['Letter', 'A Carta', '7♠', 'message, document'],
  ['Man', 'O Cigano', 'A♥', 'the querent · a man'],
  ['Lady', 'A Cigana', 'A♠', 'the querent · a woman'],
  ['Lilies', 'Os Lírios', 'K♠', 'peace, maturity'],
  ['Sun', 'O Sol', 'A♦', 'success'],
  ['Moon', 'A Lua', '8♥', 'recognition, feelings'],
  ['Key', 'A Chave', '8♦', 'solution, certainty'],
  ['Fish', 'Os Peixes', 'K♦', 'money, business'],
  ['Anchor', 'A Âncora', '9♠', 'stability'],
  ['Cross', 'A Cruz', '6♣', 'burden, fate'],
];

const ALIASES: Record<number, string[]> = {
  2: ['trevo', 'clover'],
  9: ['flores', 'flowers', 'buque', 'bouquet'],
  11: ['birch', 'broom', 'vassoura', 'chicote', 'whip'],
  22: ['paths', 'caminho', 'crossroad'],
  25: ['alianca'],
  28: ['gentleman', 'homem'],
  29: ['woman', 'mulher', 'dama'],
};

export type LCard = { id: string; n: number; en: string; pt: string; inset: string; keywords: string };

export const LENORMAND: LCard[] = RAW.map(([en, pt, inset, keywords], i) => ({
  id: `l${String(i + 1).padStart(2, '0')}`,
  n: i + 1,
  en,
  pt,
  inset,
  keywords,
}));

export const isLenormand = (id: string) => /^l\d{2}$/.test(id);
export const lcard = (id: string) => LENORMAND[Number(id.slice(1)) - 1];

type Prefs = { names: 'pt' | 'en'; significator: 'l28' | 'l29' };
const prefsFile = () => new File(Paths.document, 'lenormand.json');
let prefs: Prefs = (() => {
  const base: Prefs = { names: 'pt', significator: 'l29' };
  try {
    return prefsFile().exists ? { ...base, ...JSON.parse(prefsFile().textSync()) } : base;
  } catch {
    return base;
  }
})();
export const lenormandPrefs = () => prefs;
export function setLenormandPrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch };
  const f = prefsFile();
  if (!f.exists) f.create();
  f.write(JSON.stringify(prefs));
}

export const lname = (id: string, lang = prefs.names) => {
  const x = lcard(id);
  return x ? `${x.n} · ${lang === 'pt' ? x.pt : x.en}` : id;
};
export const lother = (id: string) => {
  const x = lcard(id);
  return x ? (prefs.names === 'pt' ? x.en : x.pt) : '';
};

const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const words = (x: LCard) =>
  [x.en, x.pt.replace(/^(o|a|os|as) /i, ''), ...(ALIASES[x.n] ?? [])].map(plain).map((w) => w.replace(/s$/, ''));

export function matchLenormand(fileName: string): string | undefined {
  const n = plain(fileName).replace(/\.[a-z0-9]+$/, '').replace(/[_\-./]+/g, ' ');
  const num = Number(n.match(/\b(\d{1,2})\b/)?.[1]);
  if (num >= 1 && num <= 36) return LENORMAND[num - 1].id;
  return LENORMAND.find((x) => words(x).some((w) => new RegExp(`\\b${w}s?\\b`).test(n)))?.id;
}

export const lenormandPattern = (id: string) => {
  const x = lcard(id);
  return new RegExp(`\\b(${words(x).join('|')})s?\\b`, 'i');
};

export function lenormandInTitle(title: string) {
  const t = plain(title).replace(/\b(cartas?|cards?|lamina)\s+\d+/g, ' ');
  return LENORMAND.filter((x) => lenormandPattern(x.id).test(t)).map((x) => x.id);
}

export type Layout = 'line' | 'box' | 'gt49' | 'gt84';
export const GRID: Record<'gt49' | 'gt84', { cols: number; rows: number }> = { gt49: { cols: 9, rows: 4 }, gt84: { cols: 8, rows: 4 } };

export function cellOf(layout: 'gt49' | 'gt84', i: number) {
  const { cols, rows } = GRID[layout];
  if (i < cols * rows) return { row: Math.floor(i / cols), col: i % cols };
  return { row: rows, col: 2 + (i - cols * rows) };
}

function indexAt(layout: 'gt49' | 'gt84', row: number, col: number) {
  const { cols, rows } = GRID[layout];
  if (row < 0 || col < 0 || col >= cols || row >= rows) return -1;
  return row * cols + col;
}

export type Helper = 'near' | 'mirror' | 'knight' | 'diagonal' | 'row' | 'column';

export function related(layout: 'gt49' | 'gt84', i: number, kind: Helper): number[] {
  const { cols, rows } = GRID[layout];
  if (i >= cols * rows) return [];
  const { row, col } = cellOf(layout, i);
  const at = (pairs: [number, number][]) => pairs.map(([r, c]) => indexAt(layout, row + r, col + c)).filter((x) => x >= 0);
  if (kind === 'near') return at([[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]);
  if (kind === 'knight') return at([[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]);
  if (kind === 'mirror')
    return [indexAt(layout, row, cols - 1 - col), indexAt(layout, rows - 1 - row, col)].filter((x) => x >= 0 && x !== i);
  if (kind === 'row') return Array.from({ length: cols }, (_, c) => indexAt(layout, row, c)).filter((x) => x !== i);
  if (kind === 'column') return Array.from({ length: rows }, (_, r) => indexAt(layout, r, col)).filter((x) => x !== i);
  const out: number[] = [];
  for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]])
    for (let k = 1; ; k++) {
      const x = indexAt(layout, row + dr * k, col + dc * k);
      if (x < 0) break;
      out.push(x);
    }
  return out;
}

export const HELPERS: { id: Helper; name: string; hint: string }[] = [
  { id: 'near', name: 'Near', hint: tr("the cards touching it") },
  { id: 'mirror', name: 'Mirror', hint: tr("the same place across the middle, left–right and top–bottom") },
  { id: 'knight', name: 'Knighting', hint: tr("a chess knight’s move away") },
  { id: 'diagonal', name: 'Diagonals', hint: tr("the lines running corner to corner") },
  { id: 'row', name: 'Row', hint: tr("the same line") },
  { id: 'column', name: 'Column', hint: tr("the same column") },
];

export function dealt(): string[] {
  const ids = LENORMAND.map((x) => x.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export function lenormandOfTheDay(date = new Date()) {
  const key = `lenormand-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return LENORMAND[h % 36].id;
}
