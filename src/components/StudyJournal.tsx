import { ReactNode, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CardDraft, Flashcard, isDue, StudyNote, updateStudy, useStudy } from '../study';
import { CardEditor, NoteEditor, promptSubject } from './StudyEditors';
import { Chip, fmtDate } from './ui';
import { usePad } from '../playback';
import { t as tr } from '../i18n';
import { c, F, themed } from '../theme';

const dateOf = (t: number) => fmtDate(new Date(t).toISOString().slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' });

export default function StudyJournal({ tab, switcher }: { tab: 'notes' | 'cards'; switcher: ReactNode }) {
  const pad = usePad();
  const d = useStudy();
  const [subject, setSubject] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [note, setNote] = useState<Partial<StudyNote> | null>(null);
  const [card, setCard] = useState<CardDraft | null>(null);
  const color = new Map(d.subjects.map((x) => [x.id, x.color]));
  const match = (...t: string[]) => !q || t.some((x) => x.toLowerCase().includes(q.toLowerCase()));

  const notes = d.notes.filter((n) => (!subject || n.subject === subject) && match(n.title, n.text)).sort((a, b) => b.updated - a.updated);
  const cards = d.cards.filter((x) => (!subject || x.subject === subject) && match(x.front, x.back)).sort((a, b) => b.created - a.created);
  const pool = d.cards.filter((x) => !subject || x.subject === subject);
  const due = d.review === 'spaced' ? pool.filter(isDue).length : pool.length;
  const add = () => (tab === 'notes' ? setNote({ subject: subject ?? undefined }) : setCard({ subject: subject ?? undefined }));

  const header = (
    <View style={{ gap: 10 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable hitSlop={10} onPress={d.subjects.length ? add : () => promptSubject()} accessibilityLabel={tab === 'notes' ? tr('New note') : tr('New flashcard')}>
              <Ionicons name="add-circle-outline" size={26} color={c.gold} />
            </Pressable>
          ),
        }}
      />
      {switcher}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        <Chip label={tr('All')} on={!subject} onPress={() => setSubject(null)} />
        {d.subjects.map((x) => (
          <Chip key={x.id} label={x.name} on={subject === x.id} onPress={() => setSubject(subject === x.id ? null : x.id)} />
        ))}
        <Chip label={tr('+ Subject')} onPress={() => promptSubject((x) => setSubject(x.id))} />
      </ScrollView>
      {tab === 'cards' && pool.length > 0 && (
        <View style={s.review}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.big}>{due}</Text>
            <Text style={s.meta}>{d.review === 'spaced' ? tr('due today') : tr('cards to review')}</Text>
            <View style={[s.chips, { paddingHorizontal: 0, marginTop: 6 }]}>
              {(['spaced', 'simple'] as const).map((m) => (
                <Chip key={m} label={m === 'spaced' ? tr('Spaced') : tr('Simple')} on={d.review === m} onPress={() => updateStudy((x) => (x.review = m))} />
              ))}
            </View>
          </View>
          <Pressable style={[s.go, !due && { opacity: 0.4 }]} disabled={!due} onPress={() => router.push({ pathname: '/study/review', params: subject ? { subject } : {} })}>
            <Ionicons name="play" size={16} color={c.bg} />
            <Text style={s.goText}>{tr('Review')}</Text>
          </Pressable>
        </View>
      )}
      <View style={s.search}>
        <Ionicons name="search" size={16} color={c.dim} />
        <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder={tab === 'notes' ? tr('Search notes') : tr('Search flashcards')} placeholderTextColor={c.dim} clearButtonMode="while-editing" />
      </View>
    </View>
  );

  const empty = (
    <View style={s.empty}>
      <Ionicons name={tab === 'notes' ? 'book-outline' : 'layers-outline'} size={36} color={c.gold} />
      <Text style={s.meta}>
        {!d.subjects.length
          ? tr('Study anything: add a subject, tag books to it, then keep notes and flashcards here.')
          : tab === 'notes'
            ? tr('No notes yet. Tap + to write one.')
            : tr('No flashcards yet. Tap +, or hold a passage in a book → Make a flashcard.')}
      </Text>
      <Pressable style={s.go} onPress={d.subjects.length ? add : () => promptSubject()}>
        <Text style={s.goText}>{!d.subjects.length ? tr('Add a subject') : tab === 'notes' ? tr('New note') : tr('New flashcard')}</Text>
      </Pressable>
    </View>
  );

  return (
    <>
      {tab === 'notes' ? (
        <FlatList
          style={s.wrap}
          data={notes}
          keyExtractor={(n) => n.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 + pad }}
          renderItem={({ item: n }) => (
            <Pressable style={s.row} onPress={() => setNote(n)}>
              <View style={[s.dot, { backgroundColor: color.get(n.subject) ?? c.dim }]} />
              <View style={{ flex: 1, gap: 3 }}>
                {!!n.title && <Text style={s.title}>{n.title}</Text>}
                {!!n.text && (
                  <Text style={s.text} numberOfLines={3}>
                    {n.text}
                  </Text>
                )}
                <Text style={s.small}>{dateOf(n.updated)}</Text>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          style={s.wrap}
          data={cards}
          keyExtractor={(x) => x.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 + pad }}
          renderItem={({ item: x }: { item: Flashcard }) => (
            <Pressable style={s.row} onPress={() => setCard(x)}>
              <View style={[s.dot, { backgroundColor: color.get(x.subject) ?? c.dim }]} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.title} numberOfLines={2}>
                  {x.front}
                </Text>
                <Text style={s.text} numberOfLines={2}>
                  {x.back}
                </Text>
                {d.review === 'spaced' && <Text style={s.small}>{isDue(x) ? tr('Due today') : tr('Next: {0}', { 0: fmtDate(x.due!, { day: 'numeric', month: 'short' }) })}</Text>}
              </View>
            </Pressable>
          )}
        />
      )}
      {note && <NoteEditor draft={note} onClose={() => setNote(null)} />}
      {card && <CardEditor draft={card} onClose={() => setCard(null)} />}
    </>
  );
}

export function JournalTabs({ tab, onTab }: { tab: 'readings' | 'notes' | 'cards'; onTab: (t: 'readings' | 'notes' | 'cards') => void }) {
  const items = [
    ['readings', 'Readings', 'albums-outline'],
    ['notes', 'Notes', 'create-outline'],
    ['cards', 'Flashcards', 'layers-outline'],
  ] as const;
  return (
    <View style={s.tabs}>
      {items.map(([id, label, icon]) => (
        <Pressable key={id} style={[s.tab, tab === id && s.tabOn]} onPress={() => onTab(id)}>
          <Ionicons name={icon} size={15} color={tab === id ? c.bg : c.dim} />
          <Text style={[s.tabText, tab === id && { color: c.bg }]}>{tr(label)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg },
  tabs: { flexDirection: 'row', backgroundColor: c.panel, borderRadius: 12, padding: 3, gap: 3 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10 },
  tabOn: { backgroundColor: c.gold },
  tabText: { color: c.dim, fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: 8 },
  review: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.panel, borderRadius: 14, padding: 14, gap: 12 },
  big: { color: c.gold, fontSize: 30, fontFamily: F.heading },
  meta: { color: c.dim, fontSize: 14, textAlign: 'center' },
  go: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.gold, borderRadius: 18, paddingVertical: 9, paddingHorizontal: 16 },
  goText: { color: c.bg, fontWeight: '700', fontSize: 15 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.panel, borderRadius: 10, paddingHorizontal: 10 },
  searchInput: { flex: 1, color: c.text, paddingVertical: 9, fontSize: 15 },
  row: { flexDirection: 'row', gap: 10, backgroundColor: c.panel, borderRadius: 12, padding: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  title: { color: c.text, fontSize: 16, fontFamily: F.heading },
  text: { color: c.dim, fontSize: 14, lineHeight: 19 },
  small: { color: c.dim, fontSize: 12 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 40, paddingHorizontal: 24 },
}));

export function StudyDay({ id }: { id: string }) {
  const d = useStudy();
  const sub = d.subjects.find((x) => x.id === id);
  const pool = d.cards.filter((x) => x.subject === id);
  const due = d.review === 'spaced' ? pool.filter(isDue).length : pool.length;
  const last = d.notes.filter((n) => n.subject === id).sort((a, b) => b.updated - a.updated)[0];
  const [note, setNote] = useState<Partial<StudyNote> | null>(null);
  if (!sub) return null;
  return (
    <View style={{ gap: 10, paddingVertical: 6 }}>
      <Text style={[s.small, { color: sub.color, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }]}>{sub.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.big}>{due}</Text>
          <Text style={[s.small, { fontSize: 13 }]}>{d.review === 'spaced' ? tr('flashcards due today') : tr('flashcards')}</Text>
        </View>
        <Pressable style={[s.go, !due && { opacity: 0.4 }]} disabled={!due} onPress={() => router.push({ pathname: '/study/review', params: { subject: id } })}>
          <Ionicons name="play" size={14} color={c.bg} />
          <Text style={s.goText}>{tr('Review')}</Text>
        </Pressable>
      </View>
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => setNote(last ?? { subject: id })}>
        <Ionicons name="create-outline" size={16} color={c.gold} />
        <Text style={[s.text, { flex: 1 }]} numberOfLines={1}>
          {last ? last.title || last.text : tr('Write a note')}
        </Text>
      </Pressable>
      {note && <NoteEditor draft={note} onClose={() => setNote(null)} />}
    </View>
  );
}
