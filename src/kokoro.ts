import { File, Paths } from 'expo-file-system';
import AudioEncoder from '../modules/audio-encoder';
import { KokoroTtsModel, models } from 'react-native-executorch';

export const englishVoice = models.textToSpeech.KOKORO.EN_US.COREML_FP32 as KokoroTtsModel<string>;

export const BITRATE = 48000;

export async function saveM4a(parts: Float32Array[], rate: number, dest: File) {
  const tmp = new File(Paths.cache, `${dest.name}.wav`);
  tmp.write(wav(parts, rate));
  try {
    await AudioEncoder.toM4a(tmp.uri, dest.uri, BITRATE);
  } finally {
    tmp.delete();
  }
}

export const wav = (parts: Float32Array[], rate: number) => {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const v = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, n * 2, true);
  let o = 44;
  for (const p of parts)
    for (let i = 0; i < p.length; i++, o += 2) {
      const s = Math.max(-1, Math.min(1, p[i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  return new Uint8Array(v.buffer);
};
