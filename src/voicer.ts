import { Directory, File, Paths } from 'expo-file-system';
import type { KokoroTtsChunk } from 'react-native-executorch';
import { saveM4a, wav } from './kokoro';
import { read, write } from './theme';
import { Book, Para, Section } from './types';

export type VoiceMode = 'phone' | 'github';
export const getVoiceMode = (): VoiceMode => (read('voice-mode.txt') === 'github' ? 'github' : 'phone');
export const setVoiceMode = (m: VoiceMode) => write('voice-mode.txt', m);

type Synth = (text: string) => AsyncGenerator<KokoroTtsChunk>;
type Live = { folder: string; id: string; parts: Float32Array[]; rate: number; seconds: number; done: boolean };

const AHEAD = 2;
const NOT_YET = 1e9;
const bookFile = (folder: string) => new File(Paths.document, 'books', folder, 'book.json');
const audioFile = (folder: string, s: Section) => new File(new Directory(Paths.document, 'books', folder), s.audio);

let synth: Synth | null = null;
let queue: { folder: string; book: Book; index: number }[] = [];
let live: Live | null = null;
let running = false;
let stopped = false;
const listeners = new Set<(folder: string, id: string) => void>();

export const onVoicer = (fn: (folder: string, id: string) => void) => (listeners.add(fn), () => void listeners.delete(fn));
const emit = (folder: string, id: string) => listeners.forEach((fn) => fn(folder, id));

export const isPhoneBook = (b: Book) => !!(b as Book & { phone?: boolean }).phone;
export const needsVoice = (folder: string, b: Book, s?: Section) => !!s && isPhoneBook(b) && !audioFile(folder, s).exists;
export const liveFor = (folder: string, id: string) => (live?.folder === folder && live.id === id ? live : null);

export function prepareBook(b: Book) {
  for (const s of b.sections)
    for (const p of s.paras)
      if (p.start === undefined) {
        p.start = NOT_YET;
        p.end = NOT_YET;
      }
}

export function setSynth(fn: Synth | null) {
  synth = fn;
  if (fn) run();
}

/** Voice section `index` now, then the next AHEAD sections that are missing. */
export function want(folder: string, book: Book, index: number) {
  if (!isPhoneBook(book)) return;
  const next = [];
  for (let i = index; i <= index + AHEAD && i < book.sections.length; i++)
    if (needsVoice(folder, book, book.sections[i])) next.push({ folder, book, index: i });
  queue = next;
  if (live && !next.some((q) => q.folder === live!.folder && q.book.sections[q.index].id === live!.id)) stopped = true;
  run();
}

/** Writes what is voiced so far to a temporary WAV the player can open. */
export function snapshot(l: Live) {
  const f = new File(Paths.cache, `live-${l.folder}-${l.id}-${Math.round(l.seconds)}.wav`);
  if (!f.exists) f.write(wav(l.parts, l.rate));
  return { uri: f.uri, seconds: l.seconds };
}

const silence = (rate: number, sec: number) => new Float32Array(Math.round(rate * sec));

async function voice(folder: string, book: Book, s: Section) {
  const l: Live = { folder, id: s.id, parts: [], rate: 24000, seconds: 0, done: false };
  live = l;
  stopped = false;
  for (const p of s.paras as (Para & { say?: string; gap?: number })[]) {
    const start = l.seconds;
    for await (const ch of synth!(p.say ?? p.text)) {
      if (stopped) return;
      l.parts.push(ch.audio);
      l.rate = ch.sampleRate;
      l.seconds += ch.audio.length / ch.sampleRate;
    }
    p.start = +start.toFixed(2);
    p.end = +l.seconds.toFixed(2);
    l.parts.push(silence(l.rate, p.gap ?? 0.7));
    l.seconds += p.gap ?? 0.7;
    emit(folder, s.id);
  }
  await saveM4a(l.parts, l.rate, audioFile(folder, s));
  s.duration = +l.seconds.toFixed(2);
  const f = bookFile(folder);
  if (f.exists) {
    const saved = JSON.parse(f.textSync()) as Book;
    saved.sections = saved.sections.map((x) => (x.id === s.id ? { ...s } : x));
    f.write(JSON.stringify(saved));
  }
  l.done = true;
  emit(folder, s.id);
  for (const x of new Directory(Paths.cache).list()) if (x instanceof File && x.name.startsWith(`live-${folder}-${s.id}-`)) x.delete();
}

async function run() {
  if (running || !synth) return;
  running = true;
  try {
    while (queue.length && synth) {
      const q = queue.shift()!;
      const s = q.book.sections[q.index];
      if (!needsVoice(q.folder, q.book, s)) continue;
      try {
        await voice(q.folder, q.book, s);
      } catch {
        stopped = false;
      }
    }
  } finally {
    if (live?.done || stopped) live = null;
    running = false;
  }
}
