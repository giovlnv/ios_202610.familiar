import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import type { KokoroTtsChunk } from 'react-native-executorch';

export type Provider = 'gemini' | 'elevenlabs';
export type CloudChoice = { provider: Provider; voice: string; voiceName?: string };

export const PROVIDER_NAME: Record<Provider, string> = { gemini: 'Gemini', elevenlabs: 'ElevenLabs' };
export const GEMINI_MODEL = 'gemini-3.8-flash-tts';
export const GEMINI_VOICES = [
  'Kore', 'Puck', 'Charon', 'Aoede', 'Fenrir', 'Leda', 'Orus', 'Zephyr', 'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 'Despina',
  'Erinome', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar', 'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi', 'Vindemiatrix',
  'Sadachbia', 'Sadaltager', 'Sulafat',
];

const keyName = (p: Provider) => `cloud-key-${p}`;
export const getKey = (p: Provider) => SecureStore.getItemAsync(keyName(p));
export const setKey = (p: Provider, k: string) => (k ? SecureStore.setItemAsync(keyName(p), k.trim()) : SecureStore.deleteItemAsync(keyName(p)));

const prefsFile = () => new File(Paths.document, 'cloud-voices.json');
export function getCloud(): Record<string, CloudChoice> {
  try {
    return JSON.parse(prefsFile().textSync());
  } catch {
    return {};
  }
}
export function setCloud(lang: string, choice: CloudChoice | null) {
  const all = getCloud();
  if (choice) all[lang] = choice;
  else delete all[lang];
  const f = prefsFile();
  if (!f.exists) f.create();
  f.write(JSON.stringify(all));
}

let lastError: string | null = null;
export const cloudError = () => lastError;

function pcmChunk(bytes: Uint8Array, rate: number): KokoroTtsChunk {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let o = 0;
  let n = Math.floor(bytes.byteLength / 2);
  if (bytes.byteLength > 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF') {
    o = 12;
    while (o + 8 <= v.byteLength) {
      const id = String.fromCharCode(...bytes.subarray(o, o + 4));
      const size = v.getUint32(o + 4, true);
      if (id === 'fmt ') rate = v.getUint32(o + 12, true);
      if (id === 'data') {
        n = Math.floor(Math.min(size, v.byteLength - o - 8) / 2);
        o += 8;
        break;
      }
      o += 8 + size + (size % 2);
    }
  }
  const audio = new Float32Array(n);
  for (let i = 0; i < n; i++) audio[i] = v.getInt16(o + i * 2, true) / 0x8000;
  return { audio, sampleRate: rate, duration: n / rate, chunkIndex: 0, totalChunks: 1 };
}

const fromBase64 = (b64: string) => {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};

function findAudio(x: unknown): string | undefined {
  if (!x || typeof x !== 'object') return;
  const o = x as Record<string, unknown>;
  if (o.type === 'audio' && typeof o.data === 'string') return o.data;
  for (const v of Object.values(o)) {
    const hit = findAudio(v);
    if (hit) return hit;
  }
}

async function check(r: Response) {
  if (r.ok) return r;
  const body = await r.text().catch(() => '');
  throw new Error(`${r.status} ${body.slice(0, 200)}`);
}

async function gemini(key: string, voice: string, text: string) {
  const r = await check(
    await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        input: [{ type: 'user_input', content: [{ type: 'text', text }] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice }] },
      }),
    }),
  );
  const data = findAudio(await r.json());
  if (!data) throw new Error('No audio in the answer');
  return pcmChunk(fromBase64(data), 24000);
}

async function elevenlabs(key: string, voice: string, text: string) {
  const r = await check(
    await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=pcm_24000`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }),
  );
  return pcmChunk(new Uint8Array(await r.arrayBuffer()), 24000);
}

const pieces = (text: string, max = 2500) => {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let cur = '';
  for (const s of text.match(/[^.!?。؟]+[.!?。؟]*\s*/g) ?? [text]) {
    if (cur && cur.length + s.length > max) {
      out.push(cur);
      cur = '';
    }
    cur += s;
  }
  if (cur) out.push(cur);
  return out;
};

export function cloudSynth(choice: CloudChoice, key: string) {
  const call = choice.provider === 'gemini' ? gemini : elevenlabs;
  return async function* (text: string) {
    try {
      for (const t of pieces(text)) yield await call(key, choice.voice, t);
      lastError = null;
    } catch (e) {
      lastError = `${PROVIDER_NAME[choice.provider]}: ${(e as Error).message}`;
      throw e;
    }
  };
}

export async function elevenVoices(key: string) {
  const r = await check(await fetch('https://api.elevenlabs.io/v2/voices?page_size=100&sort=name', { headers: { 'xi-api-key': key } }));
  const j = (await r.json()) as { voices: { voice_id: string; name: string }[] };
  return j.voices.map((v) => ({ id: v.voice_id, name: v.name }));
}

export async function testVoice(choice: CloudChoice, key: string) {
  const gen = cloudSynth(choice, key)('Your familiar knows the way.');
  const { value } = await gen.next();
  return !!value?.audio.length;
}
