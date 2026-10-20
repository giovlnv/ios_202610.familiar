import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { File, Paths } from 'expo-file-system';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { useTextToSpeech } from 'react-native-executorch';
import { englishVoice, saveM4a } from '../kokoro';
import { usePlayback } from '../playback';
import { chosenVoice, langOf } from '../languages';
import { c, themed } from '../theme';

const hash = (t: string) => {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

export default function ListenBar({ text }: { text: string }) {
  const tts = useTextToSpeech(englishVoice);
  const pb = usePlayback();
  const player = useRef<AudioPlayer | null>(null);
  const [state, setState] = useState<'idle' | 'making' | 'playing' | 'paused'>('idle');
  const [msg, setMsg] = useState('');
  useEffect(() => () => player.current?.remove(), []);

  const play = (uri: string) => {
    if (pb.status.playing) pb.toggle();
    player.current?.remove();
    const p = createAudioPlayer({ uri });
    p.addListener('playbackStatusUpdate', (st) => st.didJustFinish && setState('idle'));
    player.current = p;
    p.play();
    setState('playing');
  };

  const start = async () => {
    if (state === 'playing') return (player.current?.pause(), setState('paused'));
    if (state === 'paused') return (player.current?.play(), setState('playing'));
    const f = new File(Paths.cache, `explain-${hash(chosenVoice(langOf('en')) + text)}.m4a`);
    if (f.exists) return play(f.uri);
    if (!tts.isReady || !tts.synthesize) return setMsg('The voice is still loading…');
    setState('making');
    try {
      const parts: Float32Array[] = [];
      let rate = 24000;
      for await (const ch of tts.synthesize(text, { voice: chosenVoice(langOf('en')) as never, speed: 1 })) {
        parts.push(ch.audio);
        rate = ch.sampleRate;
        setMsg(`Preparing ${ch.chunkIndex + 1} of ${ch.totalChunks}`);
      }
      await saveM4a(parts, rate, f);
      setMsg('');
      play(f.uri);
    } catch (e) {
      setState('idle');
      setMsg(`Couldn’t make the audio (${String((e as Error).message ?? e)})`);
    }
  };

  const ready = tts.isReady;
  const raw = tts.downloadProgress ?? 0;
  const pct = Math.min(100, Math.round(raw > 1 ? raw : raw * 100));
  return (
    <View style={s.bar}>
      <Pressable style={s.play} onPress={start} disabled={state === 'making'} accessibilityLabel="Listen">
        {state === 'making' ? <ActivityIndicator color={c.bg} /> : <Ionicons name={state === 'playing' ? 'pause' : 'play'} size={20} color={c.bg} />}
      </Pressable>
      <Text style={s.text}>
        {msg || (ready ? (state === 'playing' ? 'Playing' : 'Listen with your familiar’s voice') : pct < 100 ? `Downloading the voice · ${pct}%` : 'Loading the voice…')}
      </Text>
    </View>
  );
}

const s = themed(() => ({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel, borderRadius: 12, padding: 10 },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center' },
  text: { color: c.text, fontSize: 14, flex: 1 },
}));
