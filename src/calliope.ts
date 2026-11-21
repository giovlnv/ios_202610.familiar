/** Familiar's books from the calliope api on ares (same address and token as Backups, kept in the keychain). */
import { getAres } from './sync';

export type CalliopeBook = { id: number; title: string; authors: string[]; audio: boolean; complete: boolean; sections: number; seconds: number };

/** Book folders from the GitHub library era → calibre ids. Rider-Waite has no calliope audio and stays as it is. */
export const SLUG_IDS: Record<string, number> = {
  'seventy-eight-degrees-of-wisdom-o8uu': 457,
  'tarot-and-the-archetypal-journey-rmj1': 455,
  'the-pictorial-guide-to-the-tarot-um13': 458,
  'man-and-his-symbols-x78c': 456,
};

export const folderFor = (id: number) => Object.keys(SLUG_IDS).find((k) => SLUG_IDS[k] === id) ?? `calliope-${id}`;

/** calibre id of a book folder: GitHub-era slug, a `calliope-<id>` folder, or book.json's calibre_id */
export function idOf(folder: string, book?: { calibre_id?: number } | null): number | undefined {
  return SLUG_IDS[folder] ?? (Number(folder.match(/^calliope-(\d+)$/)?.[1]) || undefined) ?? book?.calibre_id;
}

let ares: { url: string; token: string } | null = null;
export const loadConnection = async () => (ares = await getAres());
export const connected = () => !!ares;

const timed = (ms: number) => {
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), ms);
  return ctl.signal;
};

const auth = () => (ares ? { Authorization: `Bearer ${ares.token}` } : undefined);

export const audioUrl = (id: number, name: string) =>
  ares ? { uri: `${ares.url}/familiar/books/${id}/audio/${encodeURIComponent(name)}`, headers: auth() } : null;

export const originalUrl = (id: number) => (ares ? { uri: `${ares.url}/read/calliope/${id}/file`, headers: auth() } : null);

async function get(path: string, ms = 20000) {
  if (!ares) throw new Error('Add the ares address and token in Settings → Backups.');
  const r = await fetch(`${ares.url}${path}`, { headers: auth(), cache: 'no-store', signal: timed(ms) });
  if (r.status === 401) throw new Error('ares refused the token');
  return r;
}

export async function listCalliope(): Promise<CalliopeBook[]> {
  const r = await get('/familiar/books');
  if (!r.ok) throw new Error(`ares ${r.status}`);
  return r.json();
}

/** book.json text, or null when calliope has no audio for it (yet) */
export async function bookJsonText(id: number): Promise<string | null> {
  const r = await get(`/familiar/books/${id}/book.json`, 30000);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`ares ${r.status}`);
  return r.text();
}
