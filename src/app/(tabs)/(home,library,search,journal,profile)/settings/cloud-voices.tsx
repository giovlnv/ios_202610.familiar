import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AUDIO_LANGS, SYSTEM_LANGS } from '../../../../languages';
import {
  cloudError,
  elevenVoices,
  GEMINI_VOICES,
  getCloud,
  getKey,
  Provider,
  PROVIDER_NAME,
  setCloud,
  setKey,
  testVoice,
} from '../../../../cloudVoices';
import { Chip } from '../../../../components/ui';
import { c } from '../../../../theme';
import { Btn, Page, ss } from '../../../../components/settings-ui';

const PROVIDERS: Provider[] = ['gemini', 'elevenlabs'];
const LANGS = [
  ...AUDIO_LANGS.filter((l, i, a) => a.findIndex((x) => x.book === l.book) === i).map((l) => ({ book: l.book, name: l.native })),
  ...SYSTEM_LANGS.map((l) => ({ book: l.book, name: l.native })),
];
const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 6 } as const;

function KeyCard({ p, has, onSaved }: { p: Provider; has: boolean; onSaved: () => void }) {
  const [draft, setDraft] = useState('');
  const save = (k: string) => setKey(p, k).then(() => (setDraft(''), onSaved()));
  return (
    <View style={ss.card}>
      <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{PROVIDER_NAME[p]}</Text>
      <Text style={ss.meta}>Status: {has ? 'key saved' : 'no key'}</Text>
      <TextInput
        style={ss.input}
        placeholder={has ? 'Saved — paste a new key to replace' : `Paste your ${PROVIDER_NAME[p]} API key`}
        placeholderTextColor={c.dim}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        value={draft}
        onChangeText={setDraft}
      />
      <View style={ss.row}>
        <Btn label="Save key" primary onPress={() => draft.trim() && save(draft.trim())} />
        {has && <Btn label="Remove key" onPress={() => save('')} />}
      </View>
    </View>
  );
}

export default function CloudVoices() {
  const [keys, setKeys] = useState<Record<Provider, boolean>>({ gemini: false, elevenlabs: false });
  const [prefs, setPrefs] = useState(getCloud);
  const [eleven, setEleven] = useState<{ id: string; name: string }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = useCallback(() => {
    Promise.all(PROVIDERS.map(getKey)).then(([g, e]) => setKeys({ gemini: !!g, elevenlabs: !!e }));
    setPrefs(getCloud());
  }, []);
  useFocusEffect(refresh);

  const loadEleven = async () => {
    const k = await getKey('elevenlabs');
    if (!k) return;
    setBusy('eleven');
    elevenVoices(k)
      .then(setEleven)
      .catch((e) => Alert.alert('Could not load voices', String(e.message ?? e)))
      .finally(() => setBusy(null));
  };

  const choose = (lang: string, p: Provider | null) => {
    if (!p) setCloud(lang, null);
    else if (p === 'gemini') setCloud(lang, { provider: p, voice: prefs[lang]?.provider === p ? prefs[lang].voice : 'Kore' });
    else {
      const v = prefs[lang]?.provider === p ? prefs[lang] : eleven?.[0] && { provider: p, voice: eleven[0].id, voiceName: eleven[0].name };
      if (!v) return void loadEleven();
      setCloud(lang, v);
    }
    setPrefs(getCloud());
  };

  const test = async (lang: string) => {
    const ch = prefs[lang];
    const k = ch && (await getKey(ch.provider));
    if (!ch || !k) return;
    setBusy(lang);
    testVoice(ch, k)
      .then((ok) => Alert.alert(ok ? 'It works' : 'No audio came back'))
      .catch((e) => Alert.alert('It did not work', String(e.message ?? e)))
      .finally(() => setBusy(null));
  };

  return (
    <Page>
      <Text style={ss.p}>
        Read a language with a cloud voice instead of the voices on this iPhone. You use your own key, so the cost goes to your own Gemini or ElevenLabs
        account, and the book text being read is sent to that provider. Needs internet while a section is being voiced.
      </Text>
      {PROVIDERS.map((p) => (
        <KeyCard key={p} p={p} has={keys[p]} onSaved={refresh} />
      ))}
      {!!cloudError() && <Text style={[ss.meta, { color: '#E07A7A' }]}>Last error · {cloudError()}</Text>}
      <Text style={ss.h2}>Voice per language</Text>
      {LANGS.map((l) => {
        const ch = prefs[l.book];
        return (
          <View key={l.book} style={ss.card}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{l.name}</Text>
            <View style={row}>
              <Chip label="This iPhone" on={!ch} onPress={() => choose(l.book, null)} />
              {PROVIDERS.filter((p) => keys[p]).map((p) => (
                <Chip key={p} label={PROVIDER_NAME[p]} on={ch?.provider === p} onPress={() => choose(l.book, p)} />
              ))}
            </View>
            {ch?.provider === 'gemini' && (
              <View style={row}>
                {GEMINI_VOICES.map((v) => (
                  <Chip key={v} label={v} on={ch.voice === v} onPress={() => (setCloud(l.book, { provider: 'gemini', voice: v }), setPrefs(getCloud()))} />
                ))}
              </View>
            )}
            {ch?.provider === 'elevenlabs' &&
              (eleven ? (
                <View style={row}>
                  {eleven.map((v) => (
                    <Chip
                      key={v.id}
                      label={v.name}
                      on={ch.voice === v.id}
                      onPress={() => (setCloud(l.book, { provider: 'elevenlabs', voice: v.id, voiceName: v.name }), setPrefs(getCloud()))}
                    />
                  ))}
                </View>
              ) : (
                <Btn label={`Voice: ${ch.voiceName ?? ch.voice} · show all voices`} onPress={loadEleven} />
              ))}
            {!!ch && (busy === l.book ? <ActivityIndicator color={c.gold} /> : <Btn label="Test this voice" onPress={() => test(l.book)} />)}
          </View>
        );
      })}
      {busy === 'eleven' && <ActivityIndicator color={c.gold} />}
      <Text style={ss.meta}>Gemini detects the language by itself. ElevenLabs uses its multilingual model, which covers Arabic and Portuguese.</Text>
    </Page>
  );
}
