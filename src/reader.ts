import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { clean, join, openEpub } from './ownBooks';
import { getToken } from './sync';
import { Book } from './types';

export type Block = { t: 'h' | 'p' | 'img'; text?: string; src?: string; ratio?: number; at?: [number, number] };
export type Chapter = { title: string; blocks: Block[] };
export type ReaderBook = { version: 1; chapters: Chapter[] };

const dir = (folder: string) => new Directory(Paths.document, 'books', folder);
export const sourceFile = (folder: string) => ['source.epub', 'source.pdf'].map((n) => new File(dir(folder), n)).find((f) => f.exists);
const readerFile = (folder: string) => new File(dir(folder), 'reader.json');
export const imageUri = (folder: string, src: string) => new File(dir(folder), 'reader', src).uri;

export function keepSource(folder: string, uri: string, name: string) {
  const ext = /\.pdf$/i.test(name) ? 'pdf' : 'epub';
  const dest = new File(dir(folder), `source.${ext}`);
  if (dest.exists) dest.delete();
  new File(uri).copySync(dest);
}

const LIB = 'https://raw.githubusercontent.com/giovlnv/ios_202610.familiar_library/main/sources';
export async function fetchSource(folder: string) {
  const token = await getToken();
  if (!token) throw new Error('Add your GitHub key in Settings → Keys.');
  for (const name of ['book.epub', 'book.pdf']) {
    const r = await fetch(`${LIB}/${encodeURIComponent(folder)}/${name}`, { headers: { Authorization: `token ${token}` } });
    if (!r.ok) continue;
    const dest = new File(dir(folder), `source.${name.split('.')[1]}`);
    if (dest.exists) dest.delete();
    dest.create();
    dest.write(new Uint8Array(await r.arrayBuffer()));
    return dest;
  }
  throw new Error('The original file is not in your library on GitHub.');
}

const key = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 50);

function blocks(html: string, base: string, img: (src: string) => string | undefined): Block[] {
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  const marked = body
    .replace(/<img[^>]*?src=["']([^"']+)["'][^>]*>/gi, (_, src: string) => `\n\n\u0002${src}\n\n`)
    .replace(/<image[^>]*?href=["']([^"']+)["'][^>]*>/gi, (_, src: string) => `\n\n\u0002${src}\n\n`)
    .replace(/<h[1-6][^>]*>/gi, '\n\n\u0001')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/?(p|div|li|blockquote|section|br|tr|figure|figcaption)[^>]*>/gi, '\n\n');
  const out: Block[] = [];
  for (const raw of marked.split(/\n\n+/)) {
    if (raw.startsWith('\u0002')) {
      const src = img(join(base, raw.slice(1).trim()));
      if (src) out.push({ t: 'img', src });
      continue;
    }
    const text = clean(raw.replace('\u0001', ''));
    if (text) out.push({ t: raw.includes('\u0001') ? 'h' : 'p', text });
  }
  return out;
}

export function loadReader(folder: string): ReaderBook | null {
  try {
    const f = readerFile(folder);
    return f.exists ? JSON.parse(f.textSync()) : null;
  } catch {
    return null;
  }
}

export async function buildReader(folder: string, book: Book, onStep?: (msg: string) => void): Promise<ReaderBook> {
  const src = sourceFile(folder);
  if (!src || !src.name.endsWith('.epub')) throw new Error('No EPUB for this book.');
  const { zip, text, spine } = openEpub(await src.bytes());
  const imgDir = new Directory(dir(folder), 'reader');
  if (imgDir.exists) imgDir.delete();
  imgDir.create();
  const pics: { name: string; path: string }[] = [];
  const img = (path: string) => {
    if (!zip[path]) return undefined;
    const name = `${pics.length + 1}${path.match(/\.[^.]+$/)?.[0]?.toLowerCase() ?? '.jpg'}`;
    pics.push({ name, path });
    return name;
  };
  const chapters: Chapter[] = [];
  for (const it of spine) {
    const bs = blocks(text(it.href), it.href, img);
    if (!bs.length) continue;
    if (!it.named && chapters.length) chapters[chapters.length - 1].blocks.push(...bs);
    else chapters.push({ title: it.named ?? bs.find((b) => b.t === 'h')?.text ?? `${chapters.length + 1}`, blocks: bs });
  }
  const ratio: Record<string, { src: string; ratio: number }> = {};
  for (const [i, p] of pics.entries()) {
    onStep?.(`${i + 1}/${pics.length}`);
    const f = new File(imgDir, p.name);
    f.create();
    f.write(zip[p.path]);
    try {
      const im = await ImageManipulator.manipulate(f.uri).renderAsync();
      let w = im.width;
      let h = im.height;
      if (w > 1200 || !/\.(jpe?g|png)$/.test(p.name)) {
        const out = await ImageManipulator.manipulate(f.uri).resize({ width: Math.min(w, 1200) }).renderAsync();
        const saved = await out.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
        f.delete();
        const jpg = new File(imgDir, p.name.replace(/\.[^.]+$/, '.jpg'));
        new File(saved.uri).move(jpg);
        h = Math.round((h * Math.min(w, 1200)) / w);
        w = Math.min(w, 1200);
        ratio[p.name] = { src: jpg.name, ratio: w / h };
      } else ratio[p.name] = { src: p.name, ratio: w / h };
    } catch {
      f.delete();
    }
  }
  const at = new Map<string, [number, number]>();
  book.sections.forEach((s, si) => s.paras.forEach((p, pi) => p.kind !== 'explain' && p.kind !== 'explainhead' && key(p.text).length >= 12 && !at.has(key(p.text)) && at.set(key(p.text), [si, pi])));
  for (const ch of chapters)
    ch.blocks = ch.blocks.flatMap((b): Block[] => {
      if (b.t !== 'img') return [{ ...b, at: at.get(key(b.text!)) }];
      const r = ratio[b.src!];
      return r ? [{ ...b, src: r.src, ratio: r.ratio }] : [];
    });
  const out: ReaderBook = { version: 1, chapters };
  readerFile(folder).write(JSON.stringify(out));
  return out;
}

const posFile = (folder: string) => new File(dir(folder), 'reader-pos.json');
export function getPos(folder: string): { chapter: number; block: number } {
  try {
    return JSON.parse(posFile(folder).textSync());
  } catch {
    return { chapter: 0, block: 0 };
  }
}
export function setPos(folder: string, chapter: number, block: number) {
  const f = posFile(folder);
  if (!f.exists) f.create();
  f.write(JSON.stringify({ chapter, block }));
}
