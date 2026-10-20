import { Directory, File, Paths } from 'expo-file-system';
import { download, KokoroTtsModel, models } from 'react-native-executorch';
import { listBooks } from './storage';
import { Book } from './types';

type Model = KokoroTtsModel<string> & { phonemizer: Record<string, string>; voices: Record<string, string>; modelPaths: Record<string, string> };
const K = models.textToSpeech.KOKORO;

export type AudioLang = { id: string; book: string; name: string; native: string; model: Model };

export const AUDIO_LANGS: AudioLang[] = [
  { id: 'en', book: 'en', name: 'English (US)', native: 'English', model: K.EN_US.COREML_FP32 as Model },
  { id: 'en-gb', book: 'en', name: 'English (UK)', native: 'English', model: K.EN_GB.COREML_FP32 as Model },
  { id: 'pt', book: 'pt', name: 'Portuguese', native: 'Português', model: K.PT.COREML_FP32 as Model },
  { id: 'es', book: 'es', name: 'Spanish', native: 'Español', model: K.ES.COREML_FP32 as Model },
  { id: 'fr', book: 'fr', name: 'French', native: 'Français', model: K.FR.COREML_FP32 as Model },
  { id: 'it', book: 'it', name: 'Italian', native: 'Italiano', model: K.IT.COREML_FP32 as Model },
  { id: 'hi', book: 'hi', name: 'Hindi', native: 'हिन्दी', model: K.HI.COREML_FP32 as Model },
];

export const UI_LANGS = [
  { id: 'en', name: 'English', ready: true },
  { id: 'pt', name: 'Português (Brasil)', ready: false },
];

export const langOf = (id: string) => AUDIO_LANGS.find((l) => l.id === id)!;

export const voiceName = (v: string) => {
  const [pre, name] = v.split('_');
  return `${name[0].toUpperCase()}${name.slice(1)} · ${pre[1] === 'f' ? 'female' : 'male'}`;
};

const djb2 = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  return h;
};

export const voiceDir = () => new Directory(Paths.document, 'react-native-executorch');
const fileFor = (url: string) => new File(voiceDir(), `${djb2(url.split('?')[0])}_${url.split('?')[0].split('/').pop()}`);
const urls = (o: Record<string, string>) => Object.values(o).filter((x) => /^https?:/.test(x));

const phonemizerFiles = (l: AudioLang) => urls(l.model.phonemizer).map(fileFor);
export const voices = (l: AudioLang) => Object.keys(l.model.voices);
export const hasVoice = (l: AudioLang, v: string) => fileFor(l.model.voices[v]).exists;
export const installed = (l: AudioLang) => phonemizerFiles(l).every((f) => f.exists) && voices(l).some((v) => hasVoice(l, v));
export const langSize = (l: AudioLang) =>
  [...phonemizerFiles(l), ...voices(l).map((v) => fileFor(l.model.voices[v]))].reduce((n, f) => n + (f.exists ? (f.size ?? 0) : 0), 0);

export function bookLanguages() {
  const langs = new Set(['en']);
  for (const b of listBooks()) {
    const l = (b.book as Book & { lang?: string }).lang;
    if (l) langs.add(l.slice(0, 2));
  }
  return langs;
}

/** Book languages the user can pick: English plus every downloaded audiobook language. */
export const bookLangChoices = () => {
  const seen = new Set<string>();
  return AUDIO_LANGS.filter((l) => (l.id === 'en' || installed(l)) && !seen.has(l.book) && seen.add(l.book));
};

export const keptByBooks = (l: AudioLang) => l.id === 'en' || (l.book !== 'en' && bookLanguages().has(l.book));

export const downloadVoices = (l: AudioLang, list: string[], onProgress: (p: number) => void) =>
  download(
    {
      modelPaths: urls(l.model.modelPaths),
      phonemizer: urls(l.model.phonemizer),
      voices: list.map((v) => l.model.voices[v]),
    },
    { onProgress },
  );

export function removeVoice(l: AudioLang, v: string) {
  const f = fileFor(l.model.voices[v]);
  if (f.exists) f.delete();
}

export function removeLanguage(l: AudioLang) {
  for (const f of [...phonemizerFiles(l), ...voices(l).map((v) => fileFor(l.model.voices[v]))]) if (f.exists) f.delete();
}

export function unusedVoices() {
  const d = voiceDir();
  if (!d.exists) return [] as File[];
  const drop = new Set<string>();
  for (const l of AUDIO_LANGS)
    if (!keptByBooks(l)) for (const f of [...phonemizerFiles(l), ...voices(l).map((v) => fileFor(l.model.voices[v]))]) drop.add(f.name);
  return d.list().filter((x): x is File => x instanceof File && (/xnnpack/i.test(x.name) || drop.has(x.name)));
}

export function removeUnusedVoices() {
  let freed = 0;
  for (const f of unusedVoices()) {
    freed += f.size ?? 0;
    f.delete();
  }
  return freed;
}

const prefs = () => new File(Paths.document, 'languages.json');
type Prefs = { ui: string; voice: Record<string, string> };
export function getLangPrefs(): Prefs {
  try {
    return { ui: 'en', voice: {}, ...JSON.parse(prefs().textSync()) };
  } catch {
    return { ui: 'en', voice: {} };
  }
}
export function setLangPrefs(p: Prefs) {
  const f = prefs();
  if (!f.exists) f.create();
  f.write(JSON.stringify(p));
}
export const chosenVoice = (l: AudioLang) => {
  const v = getLangPrefs().voice[l.id];
  return v && hasVoice(l, v) ? v : (voices(l).find((x) => hasVoice(l, x)) ?? voices(l)[0]);
};
