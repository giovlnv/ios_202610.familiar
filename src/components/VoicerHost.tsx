import { useEffect } from 'react';
import { useTextToSpeech } from 'react-native-executorch';
import { AUDIO_LANGS, chosenVoice } from '../languages';
import { setSynth } from '../voicer';

export default function VoicerHost({ lang }: { lang: string }) {
  const l = AUDIO_LANGS.find((x) => x.id === lang || x.book === lang) ?? AUDIO_LANGS[0];
  const tts = useTextToSpeech(l.model);
  const { synthesize } = tts;
  useEffect(() => {
    if (!tts.isReady || !synthesize) return;
    const voice = chosenVoice(l);
    setSynth((text) => synthesize(text, { voice: voice as never, speed: 1 }));
    return () => setSynth(null);
  }, [tts.isReady, synthesize, l]);
  return null;
}
