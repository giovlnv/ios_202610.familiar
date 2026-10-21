import { t as tr } from '../../../../i18n';
import { usePad } from '../../../../playback';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getBook, loadConsults, loadNotes, loadProgress } from '../../../../storage';
import { fmtHours, fmtTime } from '../../../../format';
import { Consult, Note, Progress } from '../../../../types';
import { c, F, themed } from '../../../../theme';

export default function BookPage() {
  const pad = usePad();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useMemo(() => getBook(id), [id]);
  const [progress, setProgress] = useState<Progress>({ section: 0, time: 0 });
  const [notes, setNotes] = useState<Note[]>([]);
  const [consults, setConsults] = useState<Consult[]>([]);

  useFocusEffect(
    useCallback(() => {
      setProgress(loadProgress(id));
      setNotes(loadNotes(id));
      setConsults(loadConsults(id));
    }, [id])
  );

  if (!item) return <Text style={s.empty}>{tr("Book not found.")}</Text>;
  const { book } = item;
  const done = new Set(progress.done ?? []);
  const total = book.sections.reduce((t, x) => t + x.duration, 0);
  const noteCount = (sid: string) => notes.filter((n) => n.section === sid).length;
  const open = (section?: number) =>
    router.push({ pathname: '/player/[id]', params: { id, ...(section !== undefined && { section: String(section) }) } });
  const current = book.sections[progress.section];

  return (
    <View style={s.wrap}>
      <Stack.Screen options={{ title: '' }} />
      <FlatList
        data={book.sections}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ paddingBottom: 40 + pad }}
        ListHeaderComponent={
          <View style={s.head}>
            <Text style={s.title}>{book.title}</Text>
            <Text style={s.meta}>
              {book.sections.length}{' '}{tr("sections ·")}{' '}{fmtHours(total)} · {done.size}{' '}{tr("finished ·")}{' '}{notes.length}{' '}{tr("notes ·")}{' '}{consults.length} consults
            </Text>
            <Pressable style={s.btn} onPress={() => open()}>
              <Text style={s.btnText}>{progress.time || progress.section ? tr("Continue") : tr("Start listening")}</Text>
              {current && (progress.time > 0 || progress.section > 0) && (
                <Text style={s.btnSub} numberOfLines={1}>
                  {current.title} · {fmtTime(progress.time)}
                </Text>
              )}
            </Pressable>
            <View style={s.tools}>
              <Pressable style={s.tool} onPress={() => router.push({ pathname: '/read/[id]', params: { id } })}>
                <Ionicons name="book-outline" size={18} color={c.gold} />
                <Text style={s.toolText}>{tr("Read")}</Text>
              </Pressable>
              <Pressable style={s.tool} onPress={() => router.push({ pathname: '/booksearch', params: { folder: id } })}>
                <Ionicons name="search-outline" size={18} color={c.gold} />
                <Text style={s.toolText}>{tr("Search")}</Text>
              </Pressable>
              <Pressable style={s.tool} onPress={() => router.push({ pathname: '/marks/[id]', params: { id } })}>
                <Ionicons name="bookmarks-outline" size={18} color={c.gold} />
                <Text style={s.toolText}>{tr("Marks")}</Text>
              </Pressable>
            </View>
            <Text style={s.h2}>{tr("Sections")}</Text>
          </View>
        }
        renderItem={({ item: x, index }) => {
          const n = noteCount(x.id);
          const k = consults.filter((y) => y.section === x.id).length;
          return (
            <Pressable style={[s.row, index === progress.section && s.rowOn]} onPress={() => open(index)}>
              <View style={s.rowTop}>
                <Text style={s.num}>{index + 1}</Text>
                <Text style={[s.secTitle, done.has(x.id) && s.secDone]} numberOfLines={1}>
                  {x.title}
                </Text>
                <Text style={s.marks}>
                  {!!k && <Ionicons name="sparkles-outline" size={12} color={c.claude} />}
                  {k ? `${k}  ` : ''}
                  {!!n && <Ionicons name="create-outline" size={12} color={c.gold} />}
                  {n ? `${n}  ` : ''}
                  {done.has(x.id) ? <Ionicons name="checkmark-circle" size={14} color={c.gold} /> : fmtTime(x.duration)}
                </Text>
              </View>
              {!!x.summary && (
                <Text style={s.summary} numberOfLines={2}>
                  {x.summary}
                </Text>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const s = themed(() => ({
  tools: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tool: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.panel, borderRadius: 10, paddingVertical: 10 },
  toolText: { color: c.gold, fontWeight: '600' },
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  empty: { color: c.dim, padding: 16 },
  head: { paddingBottom: 8 },
  title: { color: c.gold, fontSize: 26, fontWeight: '700' },
  meta: { color: c.dim, marginTop: 6 },
  btn: { backgroundColor: c.gold, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  btnText: { color: c.bg, fontWeight: '700', fontSize: 16 },
  btnSub: { color: c.bg, opacity: 0.75, fontSize: 13, marginTop: 2 },
  h2: { color: c.text, fontSize: 18, marginTop: 24, marginBottom: 8, fontFamily: F.heading },
  row: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, marginBottom: 2 },
  rowOn: { backgroundColor: c.raised },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  num: { color: c.dim, width: 24, fontVariant: ['tabular-nums'] },
  secTitle: { color: c.text, fontSize: 16, flex: 1 },
  secDone: { color: c.dim },
  marks: { color: c.dim, fontSize: 13, fontVariant: ['tabular-nums'] },
  summary: { color: c.dim, fontSize: 14, lineHeight: 19, marginTop: 4, marginLeft: 34 },
}));
