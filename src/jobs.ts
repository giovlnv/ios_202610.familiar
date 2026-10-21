import { Directory, File, Paths } from 'expo-file-system';
import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';
import { getToken } from './sync';
import { getVoiceMode } from './voicer';

const API = 'https://api.github.com/repos/giovlnv/ios_202610.familiar_library';

export type Stage = 'splitting' | 'review' | 'fix' | 'explanations' | 'queued' | 'voices' | 'ready' | 'imported' | 'error' | 'cancelling';
export type Job = {
  slug: string;
  title: string;
  stage: Stage;
  lang?: string;
  instructions?: string;
  explanations?: boolean;
  sections?: { title: string; words: number }[];
  words?: number;
  hours?: number;
  files?: string[];
  note?: string;
  error?: string;
  created?: number;
  started?: number;
  updated?: number;
};

export const STAGE_LABEL: Record<Stage, string> = {
  splitting: 'Splitting into sections…',
  review: 'Check the sections',
  fix: 'Waiting for Claude to fix the split',
  explanations: 'Waiting for Claude’s explanations',
  queued: 'Starting the voices…',
  voices: 'Generating voices',
  ready: 'Ready to download',
  imported: 'In your library',
  error: 'Something went wrong',
  cancelling: 'Cancelling…',
};

async function gh(path: string, init: RequestInit & { raw?: boolean } = {}) {
  const token = await getToken();
  if (!token) throw new Error('Add your GitHub key in Settings first.');
  const r = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: init.raw ? 'application/vnd.github.raw' : 'application/vnd.github+json' },
  });
  if (!r.ok && r.status !== 404) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return r;
}

const b64 = (s: string) => {
  let bin = '';
  new TextEncoder().encode(s).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};

async function put(path: string, content: string, message: string) {
  const cur = await gh(`/contents/${path}`);
  const sha = cur.ok ? (await cur.json()).sha : undefined;
  await gh(`/contents/${path}`, { method: 'PUT', body: JSON.stringify({ message, content, sha }) });
}

export const slugify = (t: string) =>
  (t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'book') +
  '-' +
  Date.now().toString(36).slice(-4);

const BIG = 30 * 1024 * 1024;

/** Big books go to the "inbox" release as an asset (up to 2 GB); the contents API stops near 50 MB. */
async function uploadAsset(uri: string, name: string) {
  let r = await gh('/releases/tags/inbox');
  if (!r.ok)
    r = await gh('/releases', { method: 'POST', body: JSON.stringify({ tag_name: 'inbox', name: 'Inbox', body: 'Uploaded books waiting to be prepared.' }) });
  const release = (await r.json()) as { id: number; assets?: { id: number; name: string }[] };
  const old = release.assets?.find((a) => a.name === name);
  if (old) await gh(`/releases/assets/${old.id}`, { method: 'DELETE' });
  const token = await getToken();
  const up = await uploadAsync(`https://uploads.github.com/repos/giovlnv/ios_202610.familiar_library/releases/${release.id}/assets?name=${encodeURIComponent(name)}`, uri, {
    httpMethod: 'POST',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream', Accept: 'application/vnd.github+json' },
  });
  if (up.status >= 300) throw new Error(`GitHub ${up.status}: ${up.body.slice(0, 160)}`);
  return name;
}

export async function uploadBook(o: { uri: string; name: string; title: string; instructions: string; lang: string; explanations: boolean; split?: 'toc' | 'cards' }) {
  const slug = slugify(o.title);
  const ext = o.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'epub';
  const src = new File(o.uri);
  let asset: string | undefined;
  if ((src.size ?? 0) > BIG) asset = await uploadAsset(src.uri, `${slug}.${ext}`);
  else await put(`inbox/${slug}/book.${ext}`, src.base64Sync(), `Upload ${o.title}`);
  await put(
    `inbox/${slug}/request.json`,
    b64(JSON.stringify({ title: o.title, instructions: o.instructions, lang: o.lang, explanations: o.explanations, split: o.split ?? 'toc', asset, voices: o.lang === 'ar' ? 'phone' : getVoiceMode(), created: Date.now() })),
    `Request ${o.title}`
  );
  return slug;
}

export async function listJobs(): Promise<Job[]> {
  const [jr, ir] = await Promise.all([gh('/contents/jobs'), gh('/contents/inbox')]);
  const jobs: Job[] = [];
  if (jr.ok)
    for (const f of (await jr.json()) as { name: string; path: string }[])
      if (f.name.endsWith('.json')) jobs.push(await (await gh(`/contents/${f.path}`, { raw: true })).json());
  if (ir.ok)
    for (const d of (await ir.json()) as { name: string; type: string }[])
      if (d.type === 'dir' && !jobs.some((j) => j.slug === d.name)) jobs.push({ slug: d.name, title: d.name.replace(/-[a-z0-9]{4}$/, '').replace(/-/g, ' '), stage: 'splitting' });
  return jobs.sort((a, b) => (b.updated ?? b.created ?? Date.now()) - (a.updated ?? a.created ?? Date.now()));
}

export async function getJob(slug: string): Promise<Job | null> {
  const r = await gh(`/contents/jobs/${slug}.json`, { raw: true });
  return r.ok ? r.json() : null;
}

export async function setStage(job: Job, stage: Stage, extra: Partial<Job> = {}) {
  const next = { ...job, ...extra, stage, updated: Date.now() };
  await put(`jobs/${job.slug}.json`, b64(JSON.stringify(next, null, 1)), `Job: ${job.slug} → ${stage}`);
  return next;
}

export async function downloadJob(job: Job, onProgress: (done: number, total: number) => void, withAudio = false) {
  const token = await getToken();
  const files = (job.files ?? []).filter((f) => !f.startsWith('.'));
  if (!files.includes('book.json')) throw new Error('This job has no files yet.');
  const dir = new Directory(Paths.document, 'books', job.slug);
  dir.create({ idempotent: true, intermediates: true });
  const order = withAudio ? [...files.filter((f) => f !== 'book.json'), 'book.json'] : ['book.json'];
  for (let i = 0; i < order.length; i++) {
    await File.downloadFileAsync(`${API}/contents/${order[i]}?ref=${encodeURIComponent(`audio/${job.slug}`)}`, new File(dir, order[i]), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw' },
      idempotent: true,
    });
    onProgress(i + 1, order.length);
  }
  return setStage(job, 'imported');
}

export const canCancel = (job: Job) => job.stage !== 'imported';

export async function cancelJob(job: Job) {
  await put(`cancel/${job.slug}`, b64(String(Date.now())), `Cancel ${job.slug}`);
  return { ...job, stage: 'cancelling' as const, updated: Date.now() };
}

export const estimateMinutes = (job: Job) => Math.round(((job.words ?? 0) / 150 / 2.4 / 6) * 1.2 + 8);
