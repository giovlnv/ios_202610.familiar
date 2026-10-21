import type React from 'react';
import { t as tr } from '../i18n';
import { usePad } from '../playback';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { load, OLResult, searchOpenLibrary, STATUS_LABEL, TBook } from '../tracker';
import { Cover } from './ui';
import { c, themed } from '../theme';

export default function SearchView({ onPick, header }: { onPick: (r: OLResult) => void; header?: React.ReactNode }) {
  const pad = usePad();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<OLResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const needle = q.trim().toLowerCase();
  const mine: TBook[] = needle
    ? load().books.filter((b) => b.title.toLowerCase().includes(needle) || b.authors.some((a) => a.toLowerCase().includes(needle)) || b.isbn === needle)
    : [];

  const run = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setError('');
    try {
      setResults(await searchOpenLibrary(q.trim()));
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.wrap}>
      {header}
      <TextInput
        style={s.input}
        placeholder={tr("Title, author or ISBN")}
        placeholderTextColor={c.dim}
        value={q}
        onChangeText={setQ}
        onSubmitEditing={run}
        returnKeyType="search"
        autoCorrect={false}
      />
      {busy && <ActivityIndicator color={c.gold} style={{ marginTop: 20 }} />}
      {!!error && <Text style={s.dim}>{tr("Couldn’t search (")}{error}{tr("). Check the connection and try again.")}</Text>}
      <FlatList
        data={results}
        keyExtractor={(r) => r.olKey}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          mine.length ? (
            <View>
              <Text style={s.section}>{tr("In your library")}</Text>
              {mine.map((b) => (
                <Pressable key={b.id} style={s.row} onPress={() => router.push({ pathname: '/title/[id]', params: { id: b.id } })}>
                  <Cover book={b} width={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.title} numberOfLines={2}>
                      {b.title}
                    </Text>
                    <Text style={s.dim} numberOfLines={1}>
                      {[b.authors.join(', '), b.status !== 'none' ? STATUS_LABEL[b.status] : '', b.audio ? 'Audiobook' : ''].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </Pressable>
              ))}
              {!!results.length && <Text style={s.section}>{tr("Open Library")}</Text>}
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 40 + pad }}
        renderItem={({ item: r }) => (
          <Pressable style={s.row} onPress={() => onPick(r)}>
            <Cover book={{ coverId: r.coverId, title: r.title }} width={48} />
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={2}>
                {r.title}
              </Text>
              <Text style={s.dim} numberOfLines={1}>
                {r.authors.join(', ') || tr("Unknown author")}
                {r.year ? ` · ${r.year}` : ''}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16, paddingTop: 12 },
  section: { color: c.dim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 2 },
  input: { backgroundColor: c.panel, color: c.text, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  title: { color: c.text, fontSize: 16, fontWeight: '600' },
  dim: { color: c.dim, marginTop: 2 },
}));
