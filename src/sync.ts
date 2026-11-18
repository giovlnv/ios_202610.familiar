import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';

const DATA_FILES = ['notes.json', 'consults.json', 'progress.json', 'cards.json', 'marks.json'];

type Backup = {
  version: 1;
  created: number;
  books: Record<string, Record<string, unknown>>;
  tracker?: unknown;
  extra?: Record<string, unknown>;
};

const EXTRA_FILES = ['familiars.json', 'onboarding.json', 'card-sources.json', 'text-style.json', 'explanations.json', 'lenormand.json', 'systems.json', 'cloud-voices.json', 'study.json'];

export type SyncState = { lastFile?: number; lastAres?: number; pending?: boolean; lastError?: string };

const booksDir = () => new Directory(Paths.document, 'books');
const stateFile = () => new File(Paths.document, '.sync-state.json');

export function getState(): SyncState {
  try {
    return stateFile().exists ? JSON.parse(stateFile().textSync()) : {};
  } catch {
    return {};
  }
}

function setState(patch: SyncState) {
  const f = stateFile();
  if (!f.exists) f.create();
  f.write(JSON.stringify({ ...getState(), ...patch }));
}

export function collect(): Backup {
  const books: Backup['books'] = {};
  const root = booksDir();
  if (root.exists)
    for (const d of root.list()) {
      if (!(d instanceof Directory)) continue;
      const entry: Record<string, unknown> = {};
      for (const name of DATA_FILES) {
        const f = new File(d, name);
        if (f.exists) entry[name] = JSON.parse(f.textSync());
      }
      const meta = new File(d, 'book.json');
      if (meta.exists) entry.title = JSON.parse(meta.textSync()).title;
      if (Object.keys(entry).length) books[d.name] = entry;
    }
  const tf = new File(Paths.document, 'tracker.json');
  const extra: Record<string, unknown> = {};
  for (const name of EXTRA_FILES) {
    const f = new File(Paths.document, name);
    if (f.exists) extra[name] = JSON.parse(f.textSync());
  }
  return { version: 1, created: Date.now(), books, tracker: tf.exists ? JSON.parse(tf.textSync()) : undefined, extra };
}

export function apply(b: Backup) {
  if (b.tracker) {
    const tf = new File(Paths.document, 'tracker.json');
    if (!tf.exists) tf.create();
    tf.write(JSON.stringify(b.tracker));
  }
  for (const [name, data] of Object.entries(b.extra ?? {})) {
    if (!EXTRA_FILES.includes(name)) continue;
    const f = new File(Paths.document, name);
    if (!f.exists) f.create();
    f.write(JSON.stringify(data));
  }
  for (const [folder, entry] of Object.entries(b.books ?? {})) {
    const d = new Directory(booksDir(), folder);
    d.create({ idempotent: true, intermediates: true });
    for (const name of DATA_FILES) {
      if (!(name in entry)) continue;
      const f = new File(d, name);
      if (!f.exists) f.create();
      f.write(JSON.stringify(entry[name]));
    }
  }
  return Object.keys(b.books ?? {}).length;
}

export async function backupToFile() {
  const stamp = new Date().toISOString().slice(0, 10);
  const f = new File(Paths.cache, `Familiar backup ${stamp}.json`);
  if (f.exists) f.delete();
  f.create();
  f.write(JSON.stringify(collect(), null, 1));
  await Sharing.shareAsync(f.uri, { UTI: 'public.json', dialogTitle: 'Save backup' });
  setState({ lastFile: Date.now() });
}

export async function restoreFromFile() {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (res.canceled) return null;
  return apply(JSON.parse(await new File(res.assets[0].uri).text()));
}

export const getToken = () => SecureStore.getItemAsync('github-token');
export const setToken = (t: string) =>
  t ? SecureStore.setItemAsync('github-token', t.trim()) : SecureStore.deleteItemAsync('github-token');

export async function getAres(): Promise<{ url: string; token: string } | null> {
  const [url, token] = await Promise.all([SecureStore.getItemAsync('ares-url'), SecureStore.getItemAsync('ares-token')]);
  return url && token ? { url, token } : null;
}

export async function setAres(url: string, token: string) {
  const u = url.trim().replace(/\/+$/, '');
  if (u) await SecureStore.setItemAsync('ares-url', u);
  else await SecureStore.deleteItemAsync('ares-url');
  if (token.trim()) await SecureStore.setItemAsync('ares-token', token.trim());
  else await SecureStore.deleteItemAsync('ares-token');
}

const timed = (ms: number) => {
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), ms);
  return ctl.signal;
};

let pushing: Promise<boolean> | null = null;
let again = false;
/** sends the backup to ares; when ares can't be reached it stays pending until the next try */
export function pushToAres(): Promise<boolean> {
  if (pushing) {
    again = true;
    return pushing;
  }
  pushing = push().finally(() => {
    pushing = null;
    if (again) {
      again = false;
      void pushToAres();
    }
  });
  return pushing;
}

let soon: ReturnType<typeof setTimeout> | undefined;
/** a push a few seconds after the last edit, so typing an interpretation sends one backup, not one per key */
export function pushSoon() {
  if (soon) clearTimeout(soon);
  soon = setTimeout(() => {
    soon = undefined;
    void pushToAres();
  }, 3000);
}

async function push(): Promise<boolean> {
  const ares = await getAres();
  if (!ares) return false;
  try {
    const res = await fetch(`${ares.url}/familiar/backup`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ares.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(collect()),
      signal: timed(20000),
    });
    if (res.status === 409) {
      setState({ pending: false, lastError: 'ares has a bigger backup: restore from ares first' });
      return false;
    }
    if (!res.ok) throw new Error(res.status === 401 ? 'ares refused the token' : `ares ${res.status}`);
    setState({ lastAres: Date.now(), pending: false, lastError: undefined });
    return true;
  } catch (e) {
    const err = e as Error;
    setState({ pending: true, lastError: err.name === 'AbortError' || err.message === 'Network request failed' ? "can't reach ares" : String(err.message ?? e) });
    return false;
  }
}

export async function restoreFromAres(): Promise<number | null> {
  const ares = await getAres();
  if (!ares) throw new Error('Add the ares address and token first.');
  const res = await fetch(`${ares.url}/familiar/backup`, { headers: { Authorization: `Bearer ${ares.token}` }, cache: 'no-store', signal: timed(30000) });
  if (!res.ok) throw new Error(res.status === 404 ? 'No backup on ares yet.' : res.status === 401 ? 'ares refused the token' : `ares ${res.status}`);
  return apply(JSON.parse(await res.text()));
}

export function lastBackup() {
  const s = getState();
  return Math.max(s.lastFile ?? 0, s.lastAres ?? 0);
}
