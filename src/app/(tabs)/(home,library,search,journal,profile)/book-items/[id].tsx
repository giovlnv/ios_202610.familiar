import { useCallback, useMemo, useState } from 'react';
import { ActionSheetIOS, FlatList, Pressable, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getBook, loadConsults, loadNotes } from '../../../../storage';
import { fmtTime } from '../../../../format';
import { CardDraft, Flashcard, isDue, useStudy } from '../../../../study';
import { CardEditor, confirmDeleteCard } from '../../../../components/StudyEditors';
import EmptyState from '../../../../components/EmptyState';
import { usePad } from '../../../../playback';
import { t as tr } from '../../../../i18n';
import { c, F, themed } from '../../../../theme';

type Kind = 'notes' | 'consults' | 'cards';
const TITLES: Record<Kind, string> = { notes: 'Notes', consults: 'Consults', cards: 'Flashcards' };

export default function BookItems() {
  const pad = usePad();
  const { id, kind } = useLocalSearchParams<{ id: string; kind: Kind }>();
  const item = useMemo(() => getBook(id), [id]);
  const [notes, setNotes] = useState(() => loadNotes(id));
  const [consults, setConsults] = useState(() => loadConsults(id));
  const [card, setCard] = useState<CardDraft | null>(null);
  const study = useStudy();
  useFocusEffect(useCallback(() => (setNotes(loadNotes(id)), setConsults(loadConsults(id))), [id]));
  if (!item) return <Text style={s.meta}>{tr('Book not found.')}</Text>;
  const { book } = item;
  const secIndex = new Map(book.sections.map((x, i) => [x.id, i]));
  const where = (section?: string, time?: number) => {
    const i = secIndex.get(section ?? '');
    return i === undefined ? '' : `${book.sections[i].title}${time !== undefined ? ` · ${fmtTime(time)}` : ''}`;
  };
  const play = (section?: string, para?: number) =>
    router.push({ pathname: '/player/[id]', params: { id, section: String(secIndex.get(section ?? '') ?? 0), para: String(para ?? 0) } });
  const cards = study.cards.filter((x) => x.book === id).sort((a, b) => (secIndex.get(a.section ?? '') ?? 0) - (secIndex.get(b.section ?? '') ?? 0) || (a.para ?? 0) - (b.para ?? 0));
  const sub = new Map(study.subjects.map((x) => [x.id, x]));
  const menu = (x: Flashcard) =>
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [tr('Edit'), ...(x.section ? [tr('Go to passage')] : []), tr('Delete'), tr('Cancel')], destructiveButtonIndex: x.section ? 2 : 1, cancelButtonIndex: x.section ? 3 : 2 },
      (i) => {
        if (i === 0) setCard(x);
        else if (x.section && i === 1) play(x.section, x.para);
        else if (i === (x.section ? 2 : 1)) confirmDeleteCard(x.id);
      },
    );
  const due = cards.filter((x) => study.review === 'simple' || isDue(x)).length;

  const list = (() => {
    if (kind === 'cards')
      return (
        <FlatList
          data={cards}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 40 + pad }}
          ListHeaderComponent={
            cards.length ? (
              <Pressable style={[s.go, !due && { opacity: 0.4 }]} disabled={!due} onPress={() => router.push({ pathname: '/study/review', params: { book: id } })}>
                <Ionicons name="play" size={14} color={c.bg} />
                <Text style={s.goText}>{tr('Review this book’s flashcards ({0})', { 0: due })}</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={<EmptyState text={tr('Hold a passage while listening or reading → Make a flashcard.')} />}
          renderItem={({ item: x }) => (
            <Pressable style={s.row} onPress={() => setCard(x)} onLongPress={() => menu(x)}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.where}>{[sub.get(x.subject)?.name, where(x.section)].filter(Boolean).join(' · ')}</Text>
                <Text style={s.title} numberOfLines={2}>
                  {x.front}
                </Text>
                <Text style={s.text} numberOfLines={3}>
                  {x.back}
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={() => menu(x)} accessibilityLabel={tr('Edit or delete')}>
                <Ionicons name="ellipsis-horizontal" size={18} color={c.dim} />
              </Pressable>
            </Pressable>
          )}
        />
      );
    if (kind === 'consults')
      return (
        <FlatList
          data={[...consults].sort((a, b) => b.created - a.created)}
          keyExtractor={(x) => String(x.id)}
          contentContainerStyle={{ gap: 10, paddingBottom: 40 + pad }}
          ListEmptyComponent={<EmptyState text={tr('Hold a passage while listening → Ask Claude.')} />}
          renderItem={({ item: x }) => (
            <Pressable style={s.row} onPress={() => play(x.section, x.para)}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.where}>{where(x.section, x.time)}</Text>
                <Text style={s.title}>{x.question}</Text>
                {!!x.answer && (
                  <Text style={s.text} numberOfLines={4}>
                    {x.answer}
                  </Text>
                )}
              </View>
            </Pressable>
          )}
        />
      );
    return (
      <FlatList
        data={[...notes].sort((a, b) => (secIndex.get(a.section) ?? 0) - (secIndex.get(b.section) ?? 0) || a.time - b.time)}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 40 + pad }}
        ListEmptyComponent={<EmptyState text={tr('Hold a passage while listening → Add note.')} />}
        renderItem={({ item: x }) => (
          <Pressable style={s.row} onPress={() => play(x.section, x.para)}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.where}>{where(x.section, x.time)}</Text>
              {!!x.quote && (
                <Text style={s.quote} numberOfLines={3}>
                  “{x.quote}”
                </Text>
              )}
              <Text style={s.text}>{x.text}</Text>
            </View>
          </Pressable>
        )}
      />
    );
  })();

  return (
    <View style={s.wrap}>
      <Stack.Screen options={{ title: tr(TITLES[kind] ?? 'Notes') }} />
      {list}
      {card && <CardEditor draft={card} source={book.title} onClose={() => setCard(null)} />}
    </View>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16, paddingTop: 8 },
  row: { flexDirection: 'row', gap: 10, backgroundColor: c.panel, borderRadius: 12, padding: 12 },
  where: { color: c.gold, fontSize: 12 },
  title: { color: c.text, fontSize: 16, fontFamily: F.heading },
  text: { color: c.dim, fontSize: 14, lineHeight: 19 },
  quote: { color: c.text, fontSize: 14, fontStyle: 'italic', lineHeight: 19 },
  meta: { color: c.dim, padding: 16 },
  go: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.gold, borderRadius: 12, paddingVertical: 12, marginBottom: 6 },
  goText: { color: c.bg, fontWeight: '700', fontSize: 15 },
}));
