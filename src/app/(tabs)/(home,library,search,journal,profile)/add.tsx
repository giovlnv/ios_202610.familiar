import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { uploadBook } from '../../../jobs';
import { Button, Chip } from '../../../components/ui';
import { usePad } from '../../../playback';
import { c, themed } from '../../../theme';
import { watchForReadyBooks } from '../../../ready';
import { bookLangChoices } from '../../../languages';

const HINTS = [
  'Bullet points',
  'Examples from famous characters and pop culture',
  'At most 1 min 30 s per section',
  'Plain, everyday language',
  'Link each idea to a tarot card',
  'Practical: how to use it in a reading',
];

export default function AddBook() {
  const pad = usePad();
  const [file, setFile] = useState<{ uri: string; name: string; size?: number } | null>(null);
  const params = useLocalSearchParams<{ title?: string }>();
  const [title, setTitle] = useState(params.title ?? '');
  const [instructions, setInstructions] = useState('');
  const [lang, setLang] = useState('en');
  const [explain, setExplain] = useState(true);
  const addHint = (h: string) => setInstructions((v) => (v.trim() ? `${v.trim()}\n• ${h}` : `• ${h}`));
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/epub+zip', '*/*'], copyToCacheDirectory: true });
    const a = r.assets?.[0];
    if (r.canceled || !a) return;
    if (!/\.(pdf|epub)$/i.test(a.name)) return Alert.alert('Choose a PDF or EPUB file');
    setFile({ uri: a.uri, name: a.name, size: a.size });
    if (!title) setTitle(a.name.replace(/\.(pdf|epub)$/i, '').replace(/[_-]+/g, ' ').trim());
  };

  const upload = async () => {
    if (!file || !title.trim()) return;
    setBusy(true);
    try {
      watchForReadyBooks().catch(() => {});
      const slug = await uploadBook({ ...file, title: title.trim(), instructions: explain ? instructions.trim() : '', lang, explanations: explain });
      router.replace({ pathname: '/jobs', params: { fresh: slug } });
    } catch (e) {
      Alert.alert('Upload failed', String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView automaticallyAdjustKeyboardInsets style={s.wrap} contentContainerStyle={{ gap: 12, paddingBottom: 40 + pad }} keyboardShouldPersistTaps="handled">
      <Pressable style={s.drop} onPress={pick}>
        <Ionicons name={file ? 'document-text-outline' : 'cloud-upload-outline'} size={34} color={c.gold} />
        <Text style={s.dropTitle}>{file ? file.name : 'Choose EPUB or PDF'}</Text>
        <Text style={s.dim}>{file ? `${((file.size ?? 0) / 1e6).toFixed(1)} MB · tap to change` : 'from Files or iCloud Drive'}</Text>
      </Pressable>
      <Text style={s.label}>Title</Text>
      <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Book title" placeholderTextColor={c.dim} />
      <View style={s.switchRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.switchTitle}>Add explanations</Text>
          <Text style={s.dim}>{explain ? 'Claude explains each section in a second voice.' : 'Only the book is read aloud. Faster and smaller.'}</Text>
        </View>
        <Switch value={explain} onValueChange={setExplain} trackColor={{ true: c.gold }} />
      </View>
      {explain && (
        <>
          <Text style={s.label}>How should the explanations be? (optional)</Text>
          <TextInput
            style={[s.input, { minHeight: 110, textAlignVertical: 'top' }]}
            multiline
            value={instructions}
            onChangeText={setInstructions}
            placeholder="e.g. bullet points with famous characters or pop culture, at most 1 min 30 s each…"
            placeholderTextColor={c.dim}
          />
          <View style={s.hints}>
            {HINTS.map((h) => (
              <Pressable key={h} style={s.hint} onPress={() => addHint(h)}>
                <Ionicons name="add" size={14} color={c.gold} />
                <Text style={s.hintText}>{h}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Text style={s.label}>Language</Text>
      <View style={s.row}>
        {bookLangChoices().map((l) => (
          <Chip key={l.book} label={l.native} on={lang === l.book} onPress={() => setLang(l.book)} />
        ))}
        <Chip label="More languages…" onPress={() => router.push('/settings/languages')} />
      </View>
      <Button label={busy ? 'Uploading…' : 'Upload & start'} icon="cloud-upload-outline" primary onPress={busy ? () => {} : upload} />
      <Text style={s.small}>
        Goes to your private ios_202610.familiar_library repo only. The book is split into sections and you check the split.{' '}
        {explain ? 'Then Claude writes the explanations in the FAMILIAR project and the voices are generated on GitHub.' : 'Then the voices start on GitHub by themselves.'}
      </Text>
    </ScrollView>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, padding: 16 },
  drop: { alignItems: 'center', gap: 8, paddingVertical: 28, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line },
  dropTitle: { color: c.text, fontSize: 15, fontWeight: '600', textAlign: 'center', paddingHorizontal: 12 },
  dim: { color: c.dim, fontSize: 13 },
  label: { color: c.dim, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  input: { backgroundColor: c.panel, color: c.text, borderRadius: 10, padding: 12, fontSize: 15 },
  row: { flexDirection: 'row', gap: 8 },
  small: { color: c.dim, fontSize: 12, lineHeight: 17 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel, borderRadius: 12, padding: 14, marginTop: 4 },
  switchTitle: { color: c.text, fontSize: 16, fontWeight: '600' },
  hints: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: c.line, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10 },
  hintText: { color: c.text, fontSize: 13 },
}));
