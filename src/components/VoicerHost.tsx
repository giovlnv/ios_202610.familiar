import { useEffect } from 'react';
import { useTextToSpeech } from 'react-native-executorch';
import { AUDIO_LANGS, AudioLang, chosenVoice, systemLang } from '../languages';
import { setSynth, systemSynth } from '../voicer';

function KokoroHost({ l }: { l: AudioLang }) {
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

function SystemHost({ locale }: { locale: string }) {
  useEffect(() => {
    setSynth(systemSynth(locale, null));
    return () => setSynth(null);
  }, [locale]);
  return null;
}

export default function VoicerHost({ lang }: { lang: string }) {
  const sys = systemLang(lang);
  if (sys) return <SystemHost locale={sys.locale} />;
  return <KokoroHost l={AUDIO_LANGS.find((x) => x.id === lang || x.book === lang) ?? AUDIO_LANGS[0]} />;
}
