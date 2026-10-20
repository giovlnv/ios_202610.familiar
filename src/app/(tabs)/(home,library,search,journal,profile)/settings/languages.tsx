import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  AUDIO_LANGS,
  AudioLang,
  chosenVoice,
  downloadVoices,
  getLangPrefs,
  hasVoice,
  installed,
  keptByBooks,
  langSize,
  removeLanguage,
  removeVoice,
  setLangPrefs,
  SYSTEM_LANGS,
  systemVoices,
  UI_LANGS,
  voiceName,
  voices,
} from '../../../../languages';
import { mb } from '../../../../storage';
import { getVoiceMode, setVoiceMode, VoiceMode } from '../../../../voicer';
import { Page, ss } from '../../../../components/settings-ui';
import { c, themed } from '../../../../theme';

export default function Languages() {
  const [, tick] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<{ key: string; pct: number } | null>(null);
  const prefs = getLangPrefs();
  const refresh = () => tick((n) => n + 1);
  const mine = AUDIO_LANGS.filter((l) => l.id === 'en' || installed(l));
  const more = AUDIO_LANGS.filter((l) => !mine.includes(l));

  const get = async (l: AudioLang, v: string) => {
    if (busy) return;
    setBusy({ key: `${l.id}:${v}`, pct: 0 });
    try {
      await downloadVoices(l, [v], (raw) => setBusy({ key: `${l.id}:${v}`, pct: Math.min(100, Math.round(raw > 1 ? raw : raw * 100)) }));
      if (!getLangPrefs().voice[l.id]) choose(l, v);
    } catch {
      Alert.alert('Download failed', 'Check your connection and try again.');
    }
    setBusy(null);
    refresh();
  };

  const choose = (l: AudioLang, v: string) => {
    const p = getLangPrefs();
    setLangPrefs({ ...p, voice: { ...p.voice, [l.id]: v } });
    refresh();
  };

  const add = (l: AudioLang) => {
    setAdding(false);
    setOpen(l.id);
    get(l, voices(l)[0]);
  };

  const drop = (l: AudioLang) =>
    Alert.alert(`Remove ${l.name}?`, `Frees ${mb(langSize(l))}. You can download it again any time.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => (removeLanguage(l), setOpen(null), refresh()) },
    ]);

  return (
    <Page>
      <Text style={ss.label}>App language</Text>
      <View style={[ss.menu, { marginTop: 6 }]}>
        {UI_LANGS.map((u) => (
          <Pressable
            key={u.id}
            style={s.row}
            disabled={!u.ready}
            onPress={() => (setLangPrefs({ ...prefs, ui: u.id }), refresh())}
          >
            <View style={{ flex: 1 }}>
              <Text style={[s.title, !u.ready && { color: c.dim }]}>{u.name}</Text>
              {!u.ready && <Text style={ss.meta}>Work in progress</Text>}
            </View>
            {prefs.ui === u.id && <Ionicons name="checkmark" size={20} color={c.gold} />}
          </Pressable>
        ))}
      </View>

      <Text style={ss.label}>Make book voices</Text>
      <View style={[ss.menu, { marginTop: 6 }]}>
        {(
          [
            ['phone', 'On this iPhone', 'Made while you listen, two sections ahead. Works offline.'],
            ['github', 'On GitHub', 'The whole book is made at once; uses GitHub minutes.'],
          ] as [VoiceMode, string, string][]
        ).map(([m, title, sub]) => (
          <Pressable key={m} style={s.row} onPress={() => (setVoiceMode(m), refresh())}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{title}</Text>
              <Text style={ss.meta}>{sub}</Text>
            </View>
            {getVoiceMode() === m && <Ionicons name="checkmark" size={20} color={c.gold} />}
          </Pressable>
        ))}
      </View>

      <Text style={ss.label}>Audiobook languages</Text>
      <Text style={[ss.p, { marginTop: 6 }]}>Download a language to add books in it and hear them on this iPhone. A language with books in your library is always kept.</Text>
      <View style={ss.menu}>
        {mine.map((l) => {
          const isOpen = open === l.id;
          const v = chosenVoice(l);
          return (
            <View key={l.id}>
              <Pressable style={s.row} onPress={() => setOpen(isOpen ? null : l.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>
                    {l.name}
                    {l.native !== l.name.split(' ')[0] ? ` · ${l.native}` : ''}
                  </Text>
                  <Text style={ss.meta}>
                    {l.id === 'en' ? 'Default · ' : ''}
                    {hasVoice(l, v) ? voiceName(v) : 'Not downloaded'} · {mb(langSize(l))}
                  </Text>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.dim} />
              </Pressable>
              {isOpen && (
                <View style={s.voices}>
                  {voices(l).map((x) => {
                    const have = hasVoice(l, x);
                    const key = `${l.id}:${x}`;
                    const only = voices(l).filter((y) => hasVoice(l, y)).length === 1;
                    return (
                      <Pressable key={x} style={s.voice} onPress={() => (have ? choose(l, x) : get(l, x))}>
                        <Ionicons name={have && v === x ? 'radio-button-on' : 'radio-button-off'} size={18} color={have ? c.gold : c.line} />
                        <Text style={[s.voiceText, !have && { color: c.dim }]}>{voiceName(x)}</Text>
                        {busy?.key === key ? (
                          <Text style={ss.meta}>{busy.pct}%</Text>
                        ) : have ? (
                          !only && (
                            <Pressable hitSlop={10} onPress={() => (removeVoice(l, x), refresh())}>
                              <Ionicons name="trash-outline" size={17} color={c.dim} />
                            </Pressable>
                          )
                        ) : (
                          <Ionicons name="cloud-download-outline" size={18} color={c.gold} />
                        )}
                      </Pressable>
                    );
                  })}
                  {keptByBooks(l) ? (
                    l.id !== 'en' && <Text style={ss.meta}>Kept: you have books in this language.</Text>
                  ) : (
                    installed(l) && (
                      <Pressable onPress={() => drop(l)}>
                        <Text style={s.remove}>Remove language</Text>
                      </Pressable>
                    )
                  )}
                </View>
              )}
            </View>
          );
        })}
        <Pressable style={s.row} onPress={() => setAdding(!adding)} disabled={!more.length}>
          <Ionicons name="add-circle-outline" size={20} color={more.length ? c.gold : c.dim} />
          <Text style={[s.title, { flex: 1, color: more.length ? c.gold : c.dim }]}>Add a language</Text>
        </Pressable>
        {adding &&
          more.map((l) => (
            <Pressable key={l.id} style={[s.row, s.indent]} onPress={() => add(l)}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{l.name}</Text>
                <Text style={ss.meta}>
                  {l.native} · {voices(l).length} {voices(l).length === 1 ? 'voice' : 'voices'}
                </Text>
              </View>
              {busy?.key.startsWith(`${l.id}:`) ? <ActivityIndicator color={c.gold} /> : <Ionicons name="cloud-download-outline" size={18} color={c.gold} />}
            </Pressable>
          ))}
      </View>
      <Text style={ss.label}>iPhone voices</Text>
      <View style={[ss.menu, { marginTop: 6 }]}>
        {SYSTEM_LANGS.map((l) => {
          const vs = systemVoices(l.locale);
          return (
            <View key={l.book} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{l.name}</Text>
                <Text style={ss.meta}>
                  {l.native} · {vs.length ? vs.map((v) => v.name).join(', ') : 'no voice on this iPhone'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={ss.p}>Read by the iPhone's own voice, since Kokoro has none for these. Better-quality voices: iPhone Settings → Accessibility → Spoken Content → Voices.</Text>
    </Page>
  );
}

const s = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line + '66' },
  indent: { paddingLeft: 46 },
  title: { color: c.text, fontSize: 16, fontWeight: '600' },
  voices: { paddingHorizontal: 14, paddingBottom: 12, gap: 2, borderBottomWidth: 1, borderBottomColor: c.line + '66' },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  voiceText: { flex: 1, color: c.text, fontSize: 15 },
  remove: { color: '#E07A7A', fontWeight: '600', paddingTop: 8 },
}));
