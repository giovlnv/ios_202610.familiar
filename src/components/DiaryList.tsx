import { usePad } from '../playback';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { load, Tracker } from '../tracker';
import { Cover, fmtDate, Stars } from '../components/ui';
import { c, themed } from '../theme';
import EmptyState from './EmptyState';

export default function DiaryList({ header }: { header?: ReactElement }) {
  const pad = usePad();
  const [t, setT] = useState<Tracker>({ books: [], logs: [] });
  useFocusEffect(useCallback(() => setT(load()), []));

  const byId = new Map(t.books.map((b) => [b.id, b]));
  const sorted = [...t.logs].sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);
  const sections: { title: string; data: typeof sorted }[] = [];
  for (const l of sorted) {
    const title = fmtDate(l.date, { month: 'long', year: 'numeric' });
    const last = sections[sections.length - 1];
    if (last?.title === title) last.data.push(l);
    else sections.push({ title, data: [l] });
  }

  return (
    <SectionList
      style={s.wrap}
      sections={sections}
      keyExtractor={(l) => l.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 40 + pad }}
      ListEmptyComponent={
        <EmptyState pose="reading" text="Your diary is empty. Open a book and tap “Log” when you finish it." />
      }
      renderSectionHeader={({ section }) => (
        <Text style={s.month}>
          {section.title} · {section.data.length}
        </Text>
      )}
      renderItem={({ item: l }) => {
        const b = byId.get(l.bookId);
        if (!b) return null;
        return (
          <Pressable style={s.row} onPress={() => router.push({ pathname: '/title/[id]', params: { id: b.id } })}>
            <Text style={s.day}>{new Date(`${l.date}T12:00:00`).getDate()}</Text>
            <Cover book={b} width={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={1}>
                {b.title}
              </Text>
              <Text style={s.author} numberOfLines={1}>
                {b.authors.join(', ')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Stars value={l.rating} size={12} />
              {l.reread && <Ionicons name="repeat" size={14} color={c.dim} />}
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg },
  month: { color: c.gold, fontWeight: '700', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginTop: 18, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  day: { color: c.text, fontSize: 20, fontWeight: '700', width: 28, textAlign: 'center' },
  title: { color: c.text, fontSize: 15, fontWeight: '600' },
  author: { color: c.dim, fontSize: 13, marginTop: 2 },
}));
