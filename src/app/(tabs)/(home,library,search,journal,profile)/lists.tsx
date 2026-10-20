import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addList, load, Tracker } from '../../../tracker';
import { Cover } from '../../../components/ui';
import { usePad } from '../../../playback';
import { c, themed } from '../../../theme';
import EmptyState from '../../../components/EmptyState';

export const newList = (then: (id: string) => void) =>
  Alert.prompt('New list', 'e.g. Best tarot books', (name) => name?.trim() && then(addList(name).id));

export default function Lists() {
  const pad = usePad();
  const [t, setT] = useState<Tracker>({ books: [], logs: [] });
  useFocusEffect(useCallback(() => setT(load()), []));
  const byId = new Map(t.books.map((b) => [b.id, b]));
  const open = (id: string) => router.push({ pathname: '/list/[id]', params: { id } });

  return (
    <FlatList
      style={s.wrap}
      data={t.lists ?? []}
      keyExtractor={(l) => l.id}
      contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 40 + pad }}
      ListHeaderComponent={
        <Stack.Screen
          options={{
            headerRight: () => (
              <Pressable hitSlop={10} onPress={() => newList(open)}>
                <Ionicons name="add" size={26} color={c.gold} />
              </Pressable>
            ),
          }}
        />
      }
      ListEmptyComponent={<EmptyState text="Ranked lists you order yourself, with a note per book. Tap + to start one." />}
      renderItem={({ item: l }) => (
        <Pressable style={s.card} onPress={() => open(l.id)}>
          <View style={s.covers}>
            {l.items.slice(0, 4).map((x, i) => {
              const b = byId.get(x.bookId);
              return b ? (
                <View key={x.bookId} style={{ marginLeft: i ? -18 : 0, zIndex: 4 - i }}>
                  <Cover book={b} width={44} />
                </View>
              ) : null;
            })}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{l.name}</Text>
            <Text style={s.dim}>{l.items.length} books</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.dim} />
        </Pressable>
      )}
    />
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel, borderRadius: 12, padding: 12 },
  covers: { flexDirection: 'row', minWidth: 44 },
  title: { color: c.text, fontSize: 16, fontWeight: '600' },
  dim: { color: c.dim, fontSize: 13 },
}));
