import { useEffect, useReducer } from 'react';
import { File, Paths } from 'expo-file-system';

export type Subject = { id: string; name: string; color: string; created: number };
export type StudyNote = { id: string; subject: string; title: string; text: string; book?: string; created: number; updated: number };
export type Flashcard = {
  id: string;
  subject: string;
  front: string;
  back: string;
  book?: string;
  section?: string;
  para?: number;
  created: number;
  due?: string;
  interval?: number;
  reps?: number;
  lapses?: number;
};
export type ReviewMode = 'simple' | 'spaced';
export type StudyData = { subjects: Subject[]; notes: StudyNote[]; cards: Flashcard[]; review: ReviewMode };

export const SUBJECT_COLORS = ['#E8C767', '#9CC9A0', '#C9A0DC', '#E0A877', '#8FB8DE', '#E8A0B4'];

const file = () => new File(Paths.document, 'study.json');
let cache: StudyData | null = null;
const listeners = new Set<() => void>();

export function loadStudy(): StudyData {
  if (cache) return cache;
  const empty: StudyData = { subjects: [], notes: [], cards: [], review: 'spaced' };
  try {
    cache = file().exists ? { ...empty, ...JSON.parse(file().textSync()) } : empty;
  } catch {
    cache = empty;
  }
  return cache!;
}

export function updateStudy(fn: (d: StudyData) => void) {
  const d: StudyData = JSON.parse(JSON.stringify(loadStudy()));
  fn(d);
  const f = file();
  if (!f.exists) f.create();
  f.write(JSON.stringify(d));
  cache = d;
  listeners.forEach((l) => l());
}

export function useStudy() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(bump);
    return () => void listeners.delete(bump);
  }, []);
  return loadStudy();
}

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const isSubject = (id?: string) => !!id && /^st[a-z0-9]+$/.test(id);
export const listSubjects = () => loadStudy().subjects;
export const subjectOf = (id?: string) => loadStudy().subjects.find((s) => s.id === id);

export function addSubject(name: string) {
  const n = loadStudy().subjects.length;
  const s: Subject = { id: `st${Date.now().toString(36)}`, name, color: SUBJECT_COLORS[n % SUBJECT_COLORS.length], created: Date.now() };
  updateStudy((d) => d.subjects.push(s));
  return s;
}

export const patchSubject = (id: string, patch: Partial<Subject>) => updateStudy((d) => (d.subjects = d.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s))));

export const removeSubject = (id: string) =>
  updateStudy((d) => {
    d.subjects = d.subjects.filter((s) => s.id !== id);
    d.notes = d.notes.filter((n) => n.subject !== id);
    d.cards = d.cards.filter((c) => c.subject !== id);
  });

export function saveNote(n: Omit<StudyNote, 'id' | 'created' | 'updated'> & { id?: string }) {
  const id = n.id ?? uid('n');
  updateStudy((d) => {
    const old = d.notes.find((x) => x.id === id);
    const next = { ...n, id, created: old?.created ?? Date.now(), updated: Date.now() };
    d.notes = old ? d.notes.map((x) => (x.id === id ? next : x)) : [...d.notes, next];
  });
  return id;
}
export const removeNote = (id: string) => updateStudy((d) => (d.notes = d.notes.filter((n) => n.id !== id)));

export type CardDraft = Partial<Flashcard>;

export function saveCard(c: Omit<Flashcard, 'id' | 'created'> & { id?: string }) {
  const id = c.id ?? uid('f');
  updateStudy((d) => {
    const old = d.cards.find((x) => x.id === id);
    const next = { ...old, ...c, id, created: old?.created ?? Date.now() };
    d.cards = old ? d.cards.map((x) => (x.id === id ? next : x)) : [...d.cards, next];
  });
  return id;
}
export const removeCard = (id: string) => updateStudy((d) => (d.cards = d.cards.filter((c) => c.id !== id)));

const day = (offset = 0) => {
  const d = new Date(Date.now() + offset * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const isDue = (c: Flashcard) => !c.due || c.due <= day();
export const dueCards = (subject?: string) => loadStudy().cards.filter((c) => (!subject || c.subject === subject) && isDue(c));

export function grade(id: string, ok: boolean) {
  const spaced = loadStudy().review === 'spaced';
  updateStudy((d) => {
    const c = d.cards.find((x) => x.id === id);
    if (!c) return;
    c.reps = (c.reps ?? 0) + 1;
    if (!ok) c.lapses = (c.lapses ?? 0) + 1;
    if (!spaced) return;
    c.interval = ok ? (c.interval ? Math.max(c.interval + 1, Math.round(c.interval * 2.5)) : 1) : 0;
    c.due = day(c.interval);
  });
}

