import { t as tr } from './i18n';
import { Directory, File, Paths } from 'expo-file-system';
import { Book, Section } from './types';
import { read, write } from './theme';

export type Saved = { para?: number; quote?: string; text: string; at: number; noted?: boolean };
export type Store = Record<string, { section?: Saved; passages?: Saved[] }>;

const file = (folder: string) => new File(new Directory(Paths.document, 'books', folder), 'explained.json');

export function loadExplained(folder: string): Store {
  try {
    const f = file(folder);
    return f.exists ? JSON.parse(f.textSync()) : {};
  } catch {
    return {};
  }
}

export function markExplainedNoted(folder: string, sectionId: string, at: number) {
  const all = loadExplained(folder);
  const cur = all[sectionId];
  if (!cur) return all;
  if (cur.section?.at === at) cur.section.noted = true;
  cur.passages?.forEach((p) => p.at === at && (p.noted = true));
  file(folder).write(JSON.stringify(all));
  return all;
}

export function saveExplained(folder: string, sectionId: string, item: Saved, kind: 'passage' | 'section') {
  const all = loadExplained(folder);
  const cur = all[sectionId] ?? {};
  if (kind === 'section') cur.section = item;
  else cur.passages = [...(cur.passages ?? []).filter((p) => !(p.para === item.para && p.quote === item.quote)), item];
  all[sectionId] = cur;
  const f = file(folder);
  if (!f.exists) f.create();
  f.write(JSON.stringify(all));
  return all;
}

export type Chip = { id: string; label: string; line: string; section?: boolean };

export const CHIPS: Chip[] = [
  { id: 'plain', label: tr("Plain meaning"), line: 'What it means, in plain words (2–3 sentences)' },
  { id: 'jung', label: tr("Jungian"), line: 'The Jungian angle: the archetype(s) or psychological idea behind it' },
  { id: 'pop', label: tr("Pop culture (3)"), line: 'Three examples from fictional characters or pop culture, each with the specific traits that show it, plus its shadow side' },
  { id: 'famous', label: tr("Famous people (3)"), line: 'Three real-life famous people (artists, historical figures), each with the specific characteristics that embody it' },
  { id: 'reading', label: tr("In a reading"), line: 'How it can show up in a reading (upright and reversed, if it is about a card)' },
  { id: 'keep', label: tr("Keep in mind"), line: 'Keep in mind: main symbols (positive and negative) and what the book says about it as a tendency, in love and as the card of the day', section: true },
  { id: 'keywords', label: tr("Keywords"), line: 'Keywords: 3–4 for the light side and 3–4 for the shadow side' },
  { id: 'questions', label: tr("Questions (2–3)"), line: '2–3 questions to reflect on' },
];

export const loadChips = () => {
  const v = read('explain-chips.txt');
  return v ? v.split(',') : CHIPS.map((x) => x.id);
};
export const saveChips = (ids: string[]) => write('explain-chips.txt', ids.join(','));

export function explainPrompt(o: { kind: 'passage' | 'section'; book: Book; section: Section; card?: string; passage?: string; chips: string[] }) {
  const lines = CHIPS.filter((x) => o.chips.includes(x.id) && (o.kind === 'section' || !x.section)).map((x) => `- ${x.line}`);
  const text = o.section.paras.filter((p) => p.kind === 'book' || p.kind === 'head').map((p) => p.text).join('\n\n');
  return [
    `[Familiar · Explain ${o.kind}]`,
    `Book: ${o.book.title}`,
    `Section: ${o.section.title}${o.card ? ` · Card: ${o.card}` : ''}`,
    o.kind === 'passage' ? `Passage: "${o.passage}"` : `Section text:\n${text}`,
    '',
    `Explain this ${o.kind} for my tarot study:`,
    ...lines,
    o.kind === 'passage'
      ? 'About 150–200 words (about 1 min 30 s if read aloud). Plain text, no tables or headings, so I can save it and listen to it in the app.'
      : 'About 250–330 words. Plain text, no tables or headings.',
  ].join('\n');
}
