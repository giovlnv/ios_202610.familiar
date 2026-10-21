import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Hit, searchBooks } from '../../../bookSearch';
import { getBook } from '../../../storage';
import { t as tr } from '../../../i18n';
import { c, themed } from '../../../theme';
import { usePad } from '../../../playback';
import EmptyState from '../../../components/EmptyState';

const ICON: Record<Hit['kind'], keyof typeof Ionicons.glyphMap> = {
  text: 'document-text-outline',
  note: 'create-outline',
  highlight: 'color-fill-outline',
  bookmark: 'bookmark-outline',
  consult: 'sparkles-outline',
};

export default function BookSearch() {
  const pad = usePad();
  const { folder } = useLocalSearchParams<{ folder?: string }>();
  const [q, setQ] = useState('');
  const [done, setDone] = useState('');
  const hits = useMemo(() => searchBooks(done, folder), [done, folder]);
  const title = folder ? getBook(folder)?.book.title : undefined;
  const open = (h: Hit) => router.push({ pathname: '/player/[id]', params: { id: h.folder, section: String(h.section), ...(h.para !== undefined && { para: String(h.para) }) } });
  return (
    <View style={s.wrap}>
      <Stack.Screen options={{ title: title ? tr('Search in {0}', { 0: title }) : tr('Search in books and notes') }} />
      <TextInput
        style={s.input}
        value={q}
        onChangeText={setQ}
        onSubmitEditing={() => setDone(q)}
        returnKeyType="search"
        placeholder={tr('Words in books, notes, highlights…')}
        placeholderTextColor={c.dim}
        autoFocus
      />
      <FlatList
        data={hits}
        keyExtractor={(h, i) => `${h.folder}-${h.kind}-${h.section}-${h.para}-${i}`}
        contentContainerStyle={{ paddingBottom: 40 + pad }}
        ListHeaderComponent={done && hits.length ? <Text style={s.count}>{tr('{0} results', { 0: hits.length >= 200 ? '200+' : hits.length })}</Text> : null}
        ListEmptyComponent={done.trim().length > 1 ? <EmptyState text={tr('Nothing found for “{0}”.', { 0: done })} /> : null}
        renderItem={({ item: h }) => (
          <Pressable style={s.row} onPress={() => open(h)}>
            <Ionicons name={ICON[h.kind]} size={18} color={c.gold} />
            <View style={{ flex: 1 }}>
              {!folder && <Text style={s.book}>{h.book}</Text>}
              <Text style={s.text} numberOfLines={3}>
                {h.text}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  input: { backgroundColor: c.panel, color: c.text, borderRadius: 10, padding: 12, fontSize: 16, marginTop: 12 },
  count: { color: c.dim, marginTop: 12 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line + '66' },
  book: { color: c.dim, fontSize: 12, marginBottom: 2 },
  text: { color: c.text, fontSize: 15, lineHeight: 21 },
}));
