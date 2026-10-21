import { t as tr } from '../../../../i18n';
import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import Ionicons from '@expo/vector-icons/Ionicons';
import { load, patchList, removeList, TBook, Tracker } from '../../../../tracker';
import { Button, Cover } from '../../../../components/ui';
import { usePad } from '../../../../playback';
import { c, F, themed } from '../../../../theme';

export default function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pad = usePad();
  const [t, setT] = useState<Tracker>(() => load());
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const card = useRef<View>(null);
  const refresh = useCallback(() => setT(load()), []);
  useFocusEffect(refresh);

  const list = t.lists?.find((l) => l.id === id);
  if (!list) return <View style={s.wrap} />;
  const byId = new Map(t.books.map((b) => [b.id, b]));
  const items = list.items.map((x) => ({ ...x, b: byId.get(x.bookId) })).filter((x): x is typeof x & { b: TBook } => !!x.b);
  const change = (fn: Parameters<typeof patchList>[1]) => (patchList(list.id, fn), refresh());
  const move = (i: number, to: number) =>
    change((l) => {
      const [x] = l.items.splice(i, 1);
      l.items.splice(Math.max(0, Math.min(to, l.items.length)), 0, x);
    });

  const menu = (i: number) =>
    Alert.alert(items[i].b.title, undefined, [
      { text: tr("Move up"), onPress: () => move(i, i - 1) },
      { text: tr("Move down"), onPress: () => move(i, i + 1) },
      { text: tr("Move to #1"), onPress: () => move(i, 0) },
      {
        text: items[i].note ? tr("Edit note") : tr("Add note"),
        onPress: () =>
          Alert.prompt(tr("Note"), tr("Why #{0}?", { 0: i + 1 }), (note) => change((l) => (l.items[i].note = note?.trim() || undefined)), 'plain-text', items[i].note),
      },
      { text: tr("Remove from list"), style: 'destructive', onPress: () => change((l) => l.items.splice(i, 1)) },
      { text: tr("Cancel"), style: 'cancel' },
    ]);

  const share = async () => {
    try {
      const { captureRef } = await import('react-native-view-shot');
      const uri = await captureRef(card, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    } catch {
      await Share.share({
        message: `${list.name}\n\n${items.map((x, i) => `${i + 1}. ${x.b.title}${x.b.authors[0] ? ` — ${x.b.authors[0]}` : ''}${x.note ? `\n   ${x.note}` : ''}`).join('\n')}`,
      });
    }
  };

  const candidates = t.books
    .filter((b) => !list.items.some((x) => x.bookId === b.id))
    .filter((b) => !q || (b.title + ' ' + b.authors.join(' ')).toLowerCase().includes(q.toLowerCase()))
    .slice(0, 60);

  return (
    <>
      <Stack.Screen
        options={{
          title: list.name,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <Pressable hitSlop={10} onPress={share}>
                <Ionicons name="share-outline" size={22} color={c.gold} />
              </Pressable>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  Alert.alert(list.name, undefined, [
                    { text: tr("Rename"), onPress: () => Alert.prompt(tr("Rename list"), undefined, (n) => n?.trim() && change((l) => (l.name = n.trim())), 'plain-text', list.name) },
                    { text: tr("Delete list"), style: 'destructive', onPress: () => (removeList(list.id), router.back()) },
                    { text: tr("Cancel"), style: 'cancel' },
                  ])
                }
              >
                <Ionicons name="ellipsis-horizontal-circle" size={24} color={c.gold} />
              </Pressable>
            </View>
          ),
        }}
      />
      <FlatList
        style={s.wrap}
        data={items}
        keyExtractor={(x) => x.bookId}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + pad }}
        ListHeaderComponent={<Text style={s.dim}>{tr("Long-press a book to reorder, add a note or remove it.")}</Text>}
        ListFooterComponent={
          <View style={{ marginTop: 16 }}>
            <Button label={tr("Add book to list")} icon="add" onPress={() => setAdding(true)} />
          </View>
        }
        renderItem={({ item: x, index }) => (
          <Pressable style={s.row} onLongPress={() => menu(index)} onPress={() => router.push({ pathname: '/title/[id]', params: { id: x.bookId } })}>
            <Text style={s.rank}>{index + 1}</Text>
            <Cover book={x.b} width={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.title} numberOfLines={2}>
                {x.b.title}
              </Text>
              {!!x.b.authors[0] && <Text style={s.author}>{x.b.authors[0]}</Text>}
              {!!x.note && <Text style={s.note}>{x.note}</Text>}
            </View>
            <Pressable hitSlop={8} onPress={() => menu(index)}>
              <Ionicons name="reorder-three-outline" size={22} color={c.dim} />
            </Pressable>
          </Pressable>
        )}
      />

      <View style={s.offscreen} pointerEvents="none">
        <View ref={card} collapsable={false} style={s.shareCard}>
          <Text style={s.shareTitle}>{list.name}</Text>
          {items.slice(0, 10).map((x, i) => (
            <View key={x.bookId} style={s.shareRow}>
              <Text style={s.shareRank}>{i + 1}</Text>
              <Cover book={x.b} width={40} />
              <View style={{ flex: 1 }}>
                <Text style={s.title} numberOfLines={2}>
                  {x.b.title}
                </Text>
                {!!x.b.authors[0] && <Text style={s.author}>{x.b.authors[0]}</Text>}
                {!!x.note && <Text style={s.note}>{x.note}</Text>}
              </View>
            </View>
          ))}
          <Text style={s.brand}>{tr("Familiar")}</Text>
        </View>
      </View>

      <Modal visible={adding} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAdding(false)}>
        <View style={[s.wrap, { padding: 16, gap: 10 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={s.h2}>{tr("Add to")}{' '}{list.name}</Text>
            <Pressable onPress={() => setAdding(false)} hitSlop={10}>
              <Text style={{ color: c.gold, fontSize: 16 }}>{tr("Done")}</Text>
            </Pressable>
          </View>
          <TextInput style={s.input} value={q} onChangeText={setQ} placeholder={tr("Search your library")} placeholderTextColor={c.dim} autoCorrect={false} />
          <FlatList
            data={candidates}
            keyExtractor={(b) => b.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: b }) => (
              <Pressable style={s.row} onPress={() => change((l) => l.items.push({ bookId: b.id }))}>
                <Cover book={b} width={36} />
                <View style={{ flex: 1 }}>
                  <Text style={s.title} numberOfLines={1}>
                    {b.title}
                  </Text>
                  {!!b.authors[0] && <Text style={s.author}>{b.authors[0]}</Text>}
                </View>
                <Ionicons name="add" size={22} color={c.gold} />
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg },
  dim: { color: c.dim, fontSize: 13, marginBottom: 8 },
  h2: { color: c.text, fontSize: 19, fontFamily: F.heading },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  rank: { color: c.gold, fontSize: 26, fontWeight: '800', width: 32, textAlign: 'center' },
  title: { color: c.text, fontSize: 15, fontWeight: '600' },
  author: { color: c.gold, fontSize: 13 },
  note: { color: c.dim, fontSize: 13, fontStyle: 'italic' },
  input: { backgroundColor: c.panel, color: c.text, borderRadius: 10, padding: 12, fontSize: 15 },
  offscreen: { position: 'absolute', left: -2000, top: 0 },
  shareCard: { width: 390, backgroundColor: c.bg, padding: 24, gap: 14 },
  shareTitle: { color: c.gold, fontSize: 26, fontWeight: '800' },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shareRank: { color: c.gold, fontSize: 22, fontWeight: '800', width: 28, textAlign: 'center' },
  brand: { color: c.dim, fontSize: 12, textAlign: 'right', marginTop: 6 },
}));
