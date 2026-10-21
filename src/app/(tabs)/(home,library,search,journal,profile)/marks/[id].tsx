import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getBook } from '../../../../storage';
import { HIGHLIGHTS, loadMarks, Mark, saveMarks } from '../../../../marks';
import { Chip } from '../../../../components/ui';
import EmptyState from '../../../../components/EmptyState';
import { t as tr } from '../../../../i18n';
import { usePad } from '../../../../playback';
import { c, themed } from '../../../../theme';

export default function Marks() {
  const pad = usePad();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useMemo(() => getBook(id), [id]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [filter, setFilter] = useState<string>('all');
  useFocusEffect(useCallback(() => setMarks(loadMarks(id)), [id]));
  if (!item) return <Text style={{ color: c.dim, padding: 20 }}>{tr('Book not found.')}</Text>;
  const secIndex = new Map(item.book.sections.map((s, i) => [s.id, i]));
  const shown = marks
    .filter((m) => filter === 'all' || (filter === 'bookmark' ? m.kind === 'bookmark' : m.colour === filter))
    .sort((a, b) => (secIndex.get(a.section ?? '') ?? 0) - (secIndex.get(b.section ?? '') ?? 0) || (a.para ?? 0) - (b.para ?? 0));
  const open = (m: Mark) =>
    m.section !== undefined
      ? router.push({ pathname: '/player/[id]', params: { id, section: String(secIndex.get(m.section) ?? 0), para: String(m.para ?? 0) } })
      : router.push({ pathname: '/read/[id]', params: { id, chapter: String(m.chapter ?? 0), block: String(m.block ?? 0) } });
  const remove = (m: Mark) =>
    Alert.alert(tr('Remove this mark?'), m.quote.slice(0, 120), [
      { text: tr('Cancel'), style: 'cancel' },
      { text: tr('Remove'), style: 'destructive', onPress: () => (saveMarks(id, marks.filter((x) => x.id !== m.id)), setMarks(loadMarks(id))) },
    ]);
  return (
    <View style={s.wrap}>
      <Stack.Screen options={{ title: tr('Bookmarks and highlights') }} />
      <View style={s.chips}>
        <Chip label={tr('All')} on={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={tr('Bookmarks')} on={filter === 'bookmark'} onPress={() => setFilter('bookmark')} />
        {HIGHLIGHTS.filter((h) => marks.some((m) => m.colour === h.id)).map((h) => (
          <Chip key={h.id} label={tr(h.name)} on={filter === h.id} onPress={() => setFilter(h.id)} />
        ))}
      </View>
      <FlatList
        data={shown}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingBottom: 40 + pad }}
        ListEmptyComponent={<EmptyState text={tr('Hold a paragraph while listening or reading to bookmark or highlight it.')} />}
        renderItem={({ item: m }) => (
          <Pressable style={s.row} onPress={() => open(m)} onLongPress={() => remove(m)}>
            {m.kind === 'bookmark' ? (
              <Ionicons name="bookmark" size={18} color={c.gold} />
            ) : (
              <View style={[s.dot, { backgroundColor: HIGHLIGHTS.find((h) => h.id === m.colour)?.dot }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.where}>{m.section !== undefined ? item.book.sections[secIndex.get(m.section) ?? 0]?.title : tr('Reader')}</Text>
              <Text style={s.quote} numberOfLines={4}>
                {m.quote}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line + '66', alignItems: 'flex-start' },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 3 },
  where: { color: c.dim, fontSize: 12, marginBottom: 2 },
  quote: { color: c.text, fontSize: 15, lineHeight: 21 },
}));
