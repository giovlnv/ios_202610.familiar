import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CardDraft, dueCards, grade, loadStudy, subjectOf, useStudy } from '../../../../study';
import { CardEditor, confirmDeleteCard } from '../../../../components/StudyEditors';
import { usePad } from '../../../../playback';
import { t as tr } from '../../../../i18n';
import { c, F, themed } from '../../../../theme';

const shuffle = <T,>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

export default function Review() {
  const { subject, book } = useLocalSearchParams<{ subject?: string; book?: string }>();
  const pad = usePad();
  const [queue, setQueue] = useState(() => {
    const d = loadStudy();
    const ids = (d.review === 'spaced' ? dueCards(subject) : d.cards.filter((x) => !subject || x.subject === subject)).filter((x) => !book || x.book === book).map((x) => x.id);
    return shuffle(ids);
  });
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [score, setScore] = useState({ ok: 0, again: 0 });
  const [editing, setEditing] = useState<CardDraft | null>(null);
  const study = useStudy();
  const card = study.cards.find((x) => x.id === queue[i]);
  const sub = subjectOf(card?.subject ?? subject);

  const answer = (ok: boolean) => {
    if (!card) return;
    grade(card.id, ok);
    setScore((x) => (ok ? { ...x, ok: x.ok + 1 } : { ...x, again: x.again + 1 }));
    if (!ok) setQueue((q) => [...q, card.id]);
    setFlipped(false);
    setI(i + 1);
  };

  return (
    <View style={[s.wrap, { paddingBottom: 24 + pad }]}>
      <Stack.Screen
        options={{
          title: subjectOf(subject)?.name ?? tr('Review'),
          headerRight: () =>
            card ? (
              <View style={{ flexDirection: 'row', gap: 18 }}>
                <Pressable hitSlop={10} onPress={() => setEditing(card)} accessibilityLabel={tr('Edit')}>
                  <Ionicons name="create-outline" size={21} color={c.gold} />
                </Pressable>
                <Pressable hitSlop={10} onPress={() => confirmDeleteCard(card.id, () => (setQueue((q) => q.filter((id, j) => j < i || id !== card.id)), setFlipped(false)))} accessibilityLabel={tr('Delete')}>
                  <Ionicons name="trash-outline" size={20} color={c.gold} />
                </Pressable>
              </View>
            ) : null,
        }}
      />
      {!card ? (
        <View style={s.done}>
          <Ionicons name="checkmark-circle-outline" size={48} color={c.gold} />
          <Text style={s.doneTitle}>{queue.length ? tr('Done for now') : tr('Nothing to review')}</Text>
          {queue.length > 0 && <Text style={s.meta}>{tr('{0} got it · {1} again', { 0: score.ok, 1: score.again })}</Text>}
          <Pressable style={s.btn} onPress={() => router.back()}>
            <Text style={s.btnText}>{tr('Back')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={s.meta}>
            {sub?.name ? `${sub.name} · ` : ''}
            {tr('{0} of {1}', { 0: i + 1, 1: queue.length })}
          </Text>
          <Pressable style={[s.card, { borderColor: sub?.color ?? c.line }]} onPress={() => setFlipped(!flipped)}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 18 }}>
              <Text style={s.front}>{card.front}</Text>
              {flipped ? <Text style={s.back}>{card.back}</Text> : <Text style={s.hint}>{tr('Tap to see the answer')}</Text>}
            </ScrollView>
          </Pressable>
          {flipped && (
            <View style={s.row}>
              <Pressable style={[s.btn, s.again]} onPress={() => answer(false)}>
                <Text style={[s.btnText, { color: c.text }]}>{tr('Again')}</Text>
              </Pressable>
              <Pressable style={s.btn} onPress={() => answer(true)}>
                <Text style={s.btnText}>{tr('Got it')}</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
      {editing && <CardEditor draft={editing} onClose={() => setEditing(null)} />}
    </View>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, padding: 16, gap: 14 },
  meta: { color: c.dim, fontSize: 14, textAlign: 'center' },
  card: { flex: 1, backgroundColor: c.panel, borderRadius: 20, borderWidth: 1, padding: 22 },
  front: { color: c.text, fontSize: 22, fontFamily: F.heading, textAlign: 'center' },
  back: { color: c.text, fontSize: 17, lineHeight: 25, textAlign: 'center' },
  hint: { color: c.dim, fontSize: 14, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, alignItems: 'center', backgroundColor: c.gold, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 },
  again: { backgroundColor: c.raised },
  btnText: { color: c.bg, fontWeight: '700', fontSize: 16 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  doneTitle: { color: c.text, fontSize: 22, fontFamily: F.heading },
}));
