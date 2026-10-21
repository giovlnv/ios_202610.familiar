import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Asset } from 'expo-asset';
import { Book, Consult, Note, Progress } from './types';

const root = () => {
  const d = new Directory(Paths.document, 'books');
  d.create({ idempotent: true, intermediates: true });
  return d;
};

export type LibraryItem = { folder: string; book: Book };

const readJson = <T,>(f: File, fallback: T): T => {
  try {
    return f.exists ? (JSON.parse(f.textSync()) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (f: File, data: unknown) => {
  if (!f.exists) f.create();
  f.write(JSON.stringify(data));
};

export function listBooks(): LibraryItem[] {
  return root()
    .list()
    .filter((x): x is Directory => x instanceof Directory)
    .map((d) => ({ folder: d.name, book: readJson<Book | null>(new File(d, 'book.json'), null) }))
    .filter((x): x is LibraryItem => !!x.book)
    .sort((a, b) => a.book.title.localeCompare(b.book.title));
}

export function getBook(folder: string): LibraryItem | null {
  const book = readJson<Book | null>(new File(root(), folder, 'book.json'), null);
  return book ? { folder, book } : null;
}

const RAW = 'https://raw.githubusercontent.com/giovlnv/ios_202610.familiar_library/refs/heads/audio';
let token = '';
export const setStreamToken = (t: string | null) => (token = t ?? '');

export const remoteAudio = (folder: string, name: string) => ({
  uri: `${RAW}/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`,
  headers: token ? { Authorization: `token ${token}` } : undefined,
});

export function audioSource(folder: string, name: string) {
  const f = new File(root(), folder, name);
  return f.exists ? { uri: f.uri } : remoteAudio(folder, name);
}

const audioFiles = (folder: string) =>
  new Directory(root(), folder).list().filter((x): x is File => x instanceof File && /\.(m4a|mp3|aac)$/i.test(x.name));

export function bookSizes(folder: string) {
  const d = new Directory(root(), folder);
  if (!d.exists) return { audio: 0, other: 0 };
  let audio = 0, other = 0;
  for (const x of d.list()) {
    if (!(x instanceof File)) continue;
    if (/\.(m4a|mp3|aac)$/i.test(x.name)) audio += x.size ?? 0;
    else other += x.size ?? 0;
  }
  return { audio, other };
}

export async function canStream(folder: string, book: Book) {
  const first = book.sections[0];
  if (!first || !token) return false;
  const src = remoteAudio(folder, first.audio);
  const r = await fetch(src.uri, { method: 'HEAD', headers: src.headers }).catch(() => null);
  return !!r?.ok;
}

/** Folders restored from a backup have notes and progress but no book.json: fetch it from GitHub. */
async function restoreMissingBooks() {
  const dir = root();
  if (!dir.exists) return 0;
  let n = 0;
  for (const d of dir.list()) {
    if (!(d instanceof Directory) || new File(d, 'book.json').exists) continue;
    const src = remoteAudio(d.name, 'book.json');
    const r = await fetch(src.uri, { headers: src.headers }).catch(() => null);
    if (!r?.ok) continue;
    const text = await r.text();
    try {
      JSON.parse(text);
    } catch {
      continue;
    }
    new File(d, 'book.json').write(text);
    n++;
  }
  return n;
}

export async function refreshStreamingBooks() {
  if (!token) return 0;
  let n = await restoreMissingBooks();
  for (const b of listBooks()) {
    if (bookSizes(b.folder).audio > 0) continue;
    const src = remoteAudio(b.folder, 'book.json');
    const r = await fetch(src.uri, { headers: src.headers }).catch(() => null);
    if (!r?.ok) continue;
    const text = await r.text();
    const f = new File(root(), b.folder, 'book.json');
    if (f.exists && f.textSync() === text) continue;
    try {
      JSON.parse(text);
    } catch {
      continue;
    }
    f.write(text);
    n++;
  }
  return n;
}

export function removeAudio(folder: string) {
  for (const f of audioFiles(folder)) f.delete();
}

export async function downloadAudio(folder: string, book: Book, onProgress: (done: number, total: number) => void) {
  const dir = new Directory(root(), folder);
  for (let i = 0; i < book.sections.length; i++) {
    const s = book.sections[i];
    const dest = new File(dir, s.audio);
    if (!dest.exists) {
      const src = remoteAudio(folder, s.audio);
      await File.downloadFileAsync(src.uri, dest, { headers: src.headers, idempotent: true });
    }
    onProgress(i + 1, book.sections.length);
  }
}

export function cacheSize() {
  const d = new Directory(Paths.cache);
  return d.exists ? d.list().reduce((n, x) => n + ((x as File).size ?? 0), 0) : 0;
}

export function clearCache() {
  const d = new Directory(Paths.cache);
  if (!d.exists) return;
  for (const x of d.list()) {
    try {
      x.delete();
    } catch {}
  }
}

export function dirSize(d: Directory): number {
  if (!d.exists) return 0;
  let n = 0;
  for (const x of d.list()) n += x instanceof Directory ? dirSize(x) : ((x as File).size ?? 0);
  return n;
}

const voiceDir = () => new Directory(Paths.document, 'react-native-executorch');

export function clearOldExplanationAudio(days = 7) {
  const d = new Directory(Paths.cache);
  if (!d.exists) return;
  const cutoff = Date.now() - days * 86400000;
  for (const x of d.list())
    if (x instanceof File && x.name.startsWith('explain-') && (x.modificationTime ?? Date.now()) < cutoff) {
      try {
        x.delete();
      } catch {}
    }
}

export function storageBreakdown() {
  let audio = 0, books = 0;
  for (const b of listBooks()) {
    const z = bookSizes(b.folder);
    audio += z.audio;
    books += z.other;
  }
  const decks = dirSize(new Directory(Paths.document, 'decks'));
  const voices = dirSize(voiceDir());
  const temp = dirSize(new Directory(Paths.cache));
  const all = dirSize(new Directory(Paths.document));
  const other = Math.max(0, all - audio - books - decks - voices);
  return { audio, books, decks, voices, other, temp, total: all + temp };
}

export const totalSpace = () => {
  try {
    return Paths.totalDiskSpace;
  } catch {
    return 0;
  }
};

export const freeSpace = () => {
  try {
    return Paths.availableDiskSpace;
  } catch {
    return 0;
  }
};

export const estimateAudio = (book: Book) => book.sections.reduce((n, s) => n + s.duration, 0) * 6400;

export const mb = (bytes: number) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`);

export async function importBook(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (res.canceled) return null;
  const json = res.assets.find((a) => a.name.endsWith('.json'));
  if (!json) throw new Error('Select the book.json file together with the audio files.');
  const book = JSON.parse(await new File(json.uri).text()) as Book;
  const folder = book.title.replace(/[^\w ]+/g, '').trim().slice(0, 60) || 'Book';
  const dir = new Directory(root(), folder);
  dir.create({ idempotent: true });
  for (const a of res.assets) {
    const dest = new File(dir, a.name);
    if (dest.exists) dest.delete();
    new File(a.uri).copySync(dest);
  }
  const missing = book.sections.filter((s) => !new File(dir, s.audio).exists).length;
  return missing ? `${book.title}: ${missing} audio file(s) missing — import them too.` : `${book.title} imported.`;
}

export function deleteBook(folder: string) {
  new Directory(root(), folder).delete();
}

export const loadNotes = (folder: string) => readJson<Note[]>(new File(root(), folder, 'notes.json'), []);
export const saveNotes = (folder: string, notes: Note[]) => writeJson(new File(root(), folder, 'notes.json'), notes);
export const loadProgress = (folder: string) =>
  readJson<Progress>(new File(root(), folder, 'progress.json'), { section: 0, time: 0 });
export const saveProgress = (folder: string, p: Progress) => writeJson(new File(root(), folder, 'progress.json'), p);

export function exportNotesFile(folder: string, book: Book, notes: Note[]): string {
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const lines = [`# Notes — ${book.title}`, ''];
  for (const s of book.sections) {
    const ns = notes.filter((n) => n.section === s.id).sort((a, b) => a.time - b.time);
    if (!ns.length) continue;
    lines.push(`## ${s.title}`, '');
    for (const n of ns) lines.push(`- [${fmt(n.time)}] “${n.quote}”`, `  ${n.text}`, '');
  }
  const f = new File(Paths.cache, `${folder} notes.md`);
  if (f.exists) f.delete();
  f.create();
  f.write(lines.join('\n'));
  return f.uri;
}

export const loadConsults = (folder: string) => readJson<Consult[]>(new File(root(), folder, 'consults.json'), []);
export const saveConsults = (folder: string, list: Consult[]) => writeJson(new File(root(), folder, 'consults.json'), list);

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function exportConsultsFile(folder: string, book: Book, list: Consult[]): string {
  const lines = [`# Claude consults — ${book.title}`, ''];
  for (const s of book.sections) {
    const cs = list.filter((c) => c.section === s.id).sort((a, b) => a.id - b.id);
    if (!cs.length) continue;
    lines.push(`## ${s.title}`, '');
    for (const c of cs) {
      lines.push(`### #C${c.id} · ${fmt(c.time)}${c.parent ? ` (follow-up to #C${c.parent})` : ''}`, `> ${c.quote}`, '', `**Q:** ${c.question}`, '');
      lines.push(c.answer ? `**Claude:** ${c.answer}` : '_Waiting for answer_', '');
    }
  }
  const f = new File(Paths.cache, `${folder} consults.md`);
  if (f.exists) f.delete();
  f.create();
  f.write(lines.join('\n'));
  return f.uri;
}

const SAMPLE = 'Welcome to Tarot Reader sample';
const sampleAudio: Record<string, number> = {
  '001.m4a': require('../assets/sample/001.m4a'),
  '002.m4a': require('../assets/sample/002.m4a'),
};

export async function installSampleOnce() {
  const flag = new File(Paths.document, '.sample-installed');
  if (flag.exists) return false;
  const dir = new Directory(root(), SAMPLE);
  dir.create({ idempotent: true });
  for (const [name, mod] of Object.entries(sampleAudio)) {
    const [asset] = await Asset.loadAsync(mod);
    const dest = new File(dir, name);
    if (dest.exists) dest.delete();
    new File(asset.localUri!).copySync(dest);
  }
  writeJson(new File(dir, 'book.json'), require('../assets/sample/book.json'));
  writeJson(flag, { at: Date.now() });
  return true;
}
