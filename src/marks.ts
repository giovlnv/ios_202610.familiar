import { File, Paths } from 'expo-file-system';

export type HighlightColour = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
export const HIGHLIGHTS: { id: HighlightColour; name: string; bg: string; dot: string }[] = [
  { id: 'yellow', name: 'Yellow', bg: 'rgba(242, 201, 76, 0.28)', dot: '#F2C94C' },
  { id: 'green', name: 'Green', bg: 'rgba(127, 196, 138, 0.28)', dot: '#7FC48A' },
  { id: 'blue', name: 'Blue', bg: 'rgba(143, 184, 222, 0.30)', dot: '#8FB8DE' },
  { id: 'pink', name: 'Pink', bg: 'rgba(212, 154, 158, 0.32)', dot: '#D49A9E' },
  { id: 'purple', name: 'Purple', bg: 'rgba(180, 140, 217, 0.30)', dot: '#B48CD9' },
];
export const highlightBg = (c?: HighlightColour) => HIGHLIGHTS.find((h) => h.id === c)?.bg;

export type Mark = {
  id: string;
  kind: 'highlight' | 'bookmark';
  section?: string;
  para?: number;
  chapter?: number;
  block?: number;
  colour?: HighlightColour;
  quote: string;
  created: number;
};

const file = (folder: string) => new File(Paths.document, 'books', folder, 'marks.json');
export function loadMarks(folder: string): Mark[] {
  try {
    const f = file(folder);
    return f.exists ? JSON.parse(f.textSync()) : [];
  } catch {
    return [];
  }
}
export function saveMarks(folder: string, list: Mark[]) {
  const f = file(folder);
  if (!f.exists) f.create();
  f.write(JSON.stringify(list));
}

const same = (m: Mark, at: Partial<Mark>) =>
  at.section !== undefined ? m.section === at.section && m.para === at.para : m.chapter === at.chapter && m.block === at.block;

export function setHighlight(folder: string, at: Omit<Mark, 'id' | 'kind' | 'created'>, colour: HighlightColour | null) {
  const list = loadMarks(folder).filter((m) => !(m.kind === 'highlight' && same(m, at)));
  if (colour) list.push({ ...at, colour, id: `${Date.now()}`, kind: 'highlight', created: Date.now() });
  saveMarks(folder, list);
  return list;
}

export function toggleBookmark(folder: string, at: Omit<Mark, 'id' | 'kind' | 'created' | 'colour'>) {
  const list = loadMarks(folder);
  const had = list.some((m) => m.kind === 'bookmark' && same(m, at));
  const next = had ? list.filter((m) => !(m.kind === 'bookmark' && same(m, at))) : [...list, { ...at, id: `${Date.now()}`, kind: 'bookmark' as const, created: Date.now() }];
  saveMarks(folder, next);
  return next;
}
