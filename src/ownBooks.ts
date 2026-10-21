import { Directory, File, Paths } from 'expo-file-system';
import { createAudioPlayer } from 'expo-audio';
import { strFromU8, unzipSync } from 'fflate';
import { Book, Para, Section } from './types';

export type Draft = { title: string; text: Para[]; words: number; keep: boolean };
export class DrmError extends Error {}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };
export const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENT[e] ?? m),
  );
export const clean = (s: string) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
const wordCount = (ps: Para[]) => ps.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);

export function join(base: string, href: string) {
  const parts = base.split('/').slice(0, -1);
  for (const x of decodeURIComponent(href).split('#')[0].split('/')) {
    if (x === '..') parts.pop();
    else if (x && x !== '.') parts.push(x);
  }
  return parts.join('/');
}

function paragraphs(html: string): Para[] {
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  const marked = body
    .replace(/<h[1-6][^>]*>/gi, '\n\n\u0001')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/?(p|div|li|blockquote|section|br|tr)[^>]*>/gi, '\n\n');
  return marked
    .split(/\n\n+/)
    .map((x) => ({ head: x.includes('\u0001'), text: clean(x.replace('\u0001', '')) }))
    .filter((x) => x.text)
    .map((x) => ({ kind: x.head ? 'head' : 'book', text: x.text, start: 0, end: 0 }) as Para);
}

export function openEpub(bytes: Uint8Array) {
  const zip = unzipSync(bytes);
  const text = (p: string) => (zip[p] ? strFromU8(zip[p]) : '');
  if (zip['META-INF/rights.xml']) throw new DrmError('rights');
  const enc = text('META-INF/encryption.xml');
  if (enc && [...enc.matchAll(/<EncryptionMethod[^>]*Algorithm="([^"]+)"/g)].some((m) => !/idpf\.org\/2008\/embedding|ns\.adobe\.com\/pdf\/enc#RC/.test(m[1])))
    throw new DrmError('encrypted');
  const opfPath = attr(text('META-INF/container.xml').match(/<rootfile\s[^>]*>/i)?.[0] ?? '', 'full-path');
  if (!opfPath) throw new Error('Not an EPUB file');
  const opf = text(opfPath);
  const title = clean(opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)?.[1] ?? '') || 'Untitled';
  const items: Record<string, { href: string; props?: string; type?: string }> = {};
  for (const tag of opf.match(/<item\s[^>]*>/gi) ?? [])
    items[attr(tag, 'id') ?? ''] = { href: join(opfPath, attr(tag, 'href') ?? ''), props: attr(tag, 'properties'), type: attr(tag, 'media-type') };

  const names: Record<string, string> = {};
  const nav = Object.values(items).find((x) => x.props?.split(' ').includes('nav'));
  const ncx = Object.values(items).find((x) => x.type === 'application/x-dtbncx+xml');
  if (nav)
    for (const m of text(nav.href).matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const f = join(nav.href, m[1]);
      if (!names[f]) names[f] = clean(m[2]);
    }
  else if (ncx)
    for (const m of text(ncx.href).matchAll(/<navLabel>\s*<text>([\s\S]*?)<\/text>[\s\S]*?<content[^>]*src=["']([^"']+)["']/gi)) {
      const f = join(ncx.href, m[2]);
      if (!names[f]) names[f] = clean(m[1]);
    }

  const spine: { href: string; named?: string }[] = [];
  for (const ref of opf.match(/<itemref\s[^>]*>/gi) ?? []) {
    if (attr(ref, 'linear') === 'no') continue;
    const it = items[attr(ref, 'idref') ?? ''];
    if (it) spine.push({ href: it.href, named: names[it.href] });
  }
  return { zip, text, title, spine };
}

export function readEpub(bytes: Uint8Array): { title: string; drafts: Draft[] } {
  const { text, title, spine } = openEpub(bytes);
  const drafts: Draft[] = [];
  for (const it of spine) {
    const ps = paragraphs(text(it.href));
    if (!ps.length) continue;
    const named = it.named;
    if (!named && drafts.length) {
      const last = drafts[drafts.length - 1];
      last.text.push(...ps);
      last.words = wordCount(last.text);
      continue;
    }
    const head = named ?? ps.find((p) => p.kind === 'head')?.text ?? `Section ${drafts.length + 1}`;
    const body = ps[0]?.kind === 'head' && ps[0].text.toLowerCase() === head.toLowerCase() ? ps.slice(1) : ps;
    const words = wordCount(body);
    drafts.push({ title: head, text: body, words, keep: words >= 25 });
  }
  return { title, drafts };
}

const root = () => new Directory(Paths.document, 'books');
function newFolder(title: string) {
  const base = title.normalize('NFD').replace(/[^\w ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 50) || 'book';
  let name = base;
  for (let i = 2; new Directory(root(), name).exists; i++) name = `${base}-${i}`;
  const d = new Directory(root(), name);
  d.create({ intermediates: true });
  return d;
}
const sid = (i: number) => String(i + 1).padStart(3, '0');

export function saveTextBook(title: string, lang: string, drafts: Draft[]) {
  const dir = newFolder(title);
  const sections: Section[] = drafts
    .filter((d) => d.keep)
    .map((d, i) => ({
      id: sid(i),
      title: d.title,
      audio: `${sid(i)}.m4a`,
      duration: 0,
      paras: [{ kind: 'title', text: d.title, start: 0, end: 0 }, ...d.text.map((p) => ({ ...p }))],
    }));
  const book = { title, lang, phone: true, own: true, sections } as Book;
  new File(dir, 'book.json').write(JSON.stringify(book));
  return dir.name;
}

export function durationOf(uri: string) {
  return new Promise<number>((resolve) => {
    const p = createAudioPlayer({ uri });
    const done = (d: number) => {
      clearTimeout(timer);
      sub.remove();
      p.remove();
      resolve(d);
    };
    const timer = setTimeout(() => done(p.duration || 0), 10000);
    const sub = p.addListener('playbackStatusUpdate', (s) => s.isLoaded && s.duration > 0 && done(s.duration));
  });
}

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const fileTitle = (name: string) =>
  name
    .replace(/\.[^.]+$/, '')
    .replace(/^[\d\s._-]+/, '')
    .replace(/[_-]+/g, ' ')
    .trim() || name;

export async function saveAudioBook(title: string, files: { uri: string; name: string }[], drafts: Draft[] = [], onStep?: (i: number) => void) {
  const dir = newFolder(title);
  let sorted: { uri: string; name: string; title?: string }[] = [...files].sort((a, b) => natural(a.name, b.name));
  let whole: File | null = null;
  if (sorted.length === 1 && /\.(m4b|m4a)$/i.test(sorted[0].name)) {
    whole = new File(dir, `whole${sorted[0].name.match(/\.[^.]+$/)![0]}`);
    new File(sorted[0].uri).copySync(whole);
    const parts = await splitChapters(whole, dir);
    if (parts) sorted = parts;
    else whole = null;
  }
  const sections: Section[] = [];
  const text = drafts.filter((d) => d.keep);
  for (const [i, f] of sorted.entries()) {
    onStep?.(i);
    const ext = f.name.match(/\.[^.]+$/)?.[0]?.toLowerCase() ?? '.mp3';
    const dest = new File(dir, `${sid(i)}${ext}`);
    if (whole) new File(f.uri).move(dest);
    else new File(f.uri).copySync(dest);
    const duration = await durationOf(dest.uri);
    const d = text[i];
    const name = d?.title ?? f.title ?? fileTitle(f.name);
    const paras: Para[] = [{ kind: 'title', text: name, start: 0, end: d ? 0 : duration }];
    if (d) {
      const total = Math.max(1, d.words);
      let at = 0;
      for (const p of d.text) {
        const w = p.text.split(/\s+/).filter(Boolean).length;
        const start = (at / total) * duration;
        at += w;
        paras.push({ ...p, start: +start.toFixed(2), end: +((at / total) * duration).toFixed(2) });
      }
    }
    sections.push({ id: sid(i), title: name, audio: dest.name, duration: +duration.toFixed(2), paras });
  }
  whole?.delete();
  const book = { title, own: true, sections } as Book;
  new File(dir, 'book.json').write(JSON.stringify(book));
  return { folder: dir.name, unmatched: text.length && text.length !== sorted.length ? Math.abs(text.length - sorted.length) : 0 };
}

export async function exportAudio(folder: string, s: Section) {
  const f = new File(Paths.document, 'books', folder, s.audio);
  if (!f.exists) return false;
  const out = new File(Paths.cache, `${s.title.replace(/[\\/:*?"<>|]+/g, '').slice(0, 60) || s.id}${s.audio.match(/\.[^.]+$/)?.[0] ?? '.m4a'}`);
  if (out.exists) out.delete();
  f.copySync(out);
  const Sharing = await import('expo-sharing');
  await Sharing.shareAsync(out.uri, { dialogTitle: s.title });
  return true;
}

export async function exportBookZip(folder: string, book: Book) {
  const { zipSync } = await import('fflate');
  const files: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const s of book.sections) {
    const f = new File(Paths.document, 'books', folder, s.audio);
    if (f.exists) files[`${s.id} ${s.title.replace(/[\\/:*?"<>|]+/g, '').slice(0, 60)}${s.audio.match(/\.[^.]+$/)?.[0] ?? ''}`] = [await f.bytes(), { level: 0 }];
  }
  const out = new File(Paths.cache, `${book.title.replace(/[\\/:*?"<>|]+/g, '').slice(0, 60) || 'audiobook'}.zip`);
  if (out.exists) out.delete();
  out.write(zipSync(files));
  const Sharing = await import('expo-sharing');
  await Sharing.shareAsync(out.uri, { mimeType: 'application/zip', dialogTitle: book.title });
}

function pdfParas(pages: string[]): Para[][] {
  const lines = pages.map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean));
  const edge = new Map<string, number>();
  for (const ls of lines) for (const l of [ls[0], ls[ls.length - 1]]) if (l) edge.set(l.replace(/\d+/g, '#'), (edge.get(l.replace(/\d+/g, '#')) ?? 0) + 1);
  const junk = (l: string) => /^\d+$/.test(l) || (pages.length > 4 && (edge.get(l.replace(/\d+/g, '#')) ?? 0) > pages.length * 0.4);
  return lines.map((ls) => {
    const kept = ls.filter((l, j) => !((j === 0 || j === ls.length - 1) && junk(l)));
    const out: Para[] = [];
    let cur = '';
    for (const l of kept) {
      cur = cur ? (cur.endsWith('-') ? cur.slice(0, -1) + l : `${cur} ${l}`) : l;
      if (/[.!?:”"’)]$/.test(l) && l.length < 75) {
        out.push({ kind: 'book', text: cur, start: 0, end: 0 });
        cur = '';
      }
    }
    if (cur) out.push({ kind: 'book', text: cur, start: 0, end: 0 });
    return out;
  });
}

export async function readPdf(uri: string): Promise<{ title: string; drafts: Draft[] }> {
  const { default: AudioEncoder } = await import('../modules/audio-encoder');
  const pages = AudioEncoder.pdfPages(uri);
  if (!pages.join('').trim()) throw new Error('This PDF has no text layer (it is a scan). Text recognition for scans comes later.');
  const per = pdfParas(pages);
  const outline = AudioEncoder.pdfOutline(uri).filter((o) => o.depth === 0);
  const cuts = outline.length > 1 ? outline : Array.from({ length: Math.ceil(pages.length / 10) }, (_, i) => ({ title: `Pages ${i * 10 + 1}–${Math.min(pages.length, i * 10 + 10)}`, page: i * 10, depth: 0 }));
  const drafts: Draft[] = cuts.map((cut, i) => {
    const end = cuts[i + 1]?.page ?? pages.length;
    const text = per.slice(cut.page, Math.max(cut.page + 1, end)).flat();
    const words = wordCount(text);
    return { title: cut.title, text, words, keep: words >= 25 };
  });
  if (cuts[0].page > 0) drafts.unshift({ title: 'Front matter', text: per.slice(0, cuts[0].page).flat(), words: 0, keep: false });
  return { title: '', drafts };
}

export async function splitChapters(file: File, dir: Directory) {
  const { default: AudioEncoder } = await import('../modules/audio-encoder');
  const chapters = await AudioEncoder.audioChapters(file.uri).catch(() => []);
  if (chapters.length < 2) return null;
  const out: { uri: string; name: string; title: string }[] = [];
  for (const [i, ch] of chapters.entries()) {
    const dest = new File(dir, `ch-${String(i + 1).padStart(3, '0')}.m4a`);
    await AudioEncoder.cutAudio(file.uri, dest.uri, ch.start, ch.duration);
    out.push({ uri: dest.uri, name: dest.name, title: ch.title });
  }
  return out;
}
