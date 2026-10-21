import { t as tr } from '../i18n';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CardImage } from './Cards';
import { JournalData, Reading, spreadOf } from '../journal';
import { c, themed } from '../theme';

export default function ReadingRow({ r, j }: { r: Reading; j: JournalData }) {
  const sp = spreadOf(j, r.spreadId);
  const person = j.people.find((p) => p.id === r.personId);
  const placed = r.cards.filter((p) => p?.card);
  const open = (r.openQuestions ?? '').split('\n').filter((l) => l.trim()).length;
  return (
    <Pressable style={s.card} onPress={() => router.push({ pathname: '/reading/[id]', params: { id: r.id } })}>
      <View style={s.top}>
        <Text style={s.q} numberOfLines={2}>
          {r.question || tr("Untitled reading")}
        </Text>
        <Text style={s.time}>{r.at.slice(11, 16)}</Text>
      </View>
      {!!placed.length && (
        <View style={s.cards}>
          {placed.slice(0, 6).map((p, i) => (
            <CardImage key={i} id={p.card!} reversed={p.reversed} width={30} />
          ))}
          {placed.length > 6 && <Text style={s.dim}>+{placed.length - 6}</Text>}
        </View>
      )}
      <View style={s.tags}>
        <Text style={s.tag}>{sp.name}</Text>
        {!!r.area && <Text style={s.tag}>{tr(r.area)}</Text>}
        <Text style={s.tag}>{person?.name ?? tr("Me")}</Text>
        {!!open && <Text style={[s.tag, { color: c.gold, borderColor: c.gold }]}>{open} open</Text>}
      </View>
    </Pressable>
  );
}

const s = themed(() => ({
  card: { backgroundColor: c.panel, borderRadius: 12, padding: 12, marginBottom: 10, gap: 8 },
  top: { flexDirection: 'row', gap: 8 },
  q: { color: c.text, fontSize: 15, fontWeight: '600', flex: 1 },
  time: { color: c.dim, fontSize: 12 },
  cards: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { color: c.dim, fontSize: 12, borderWidth: 1, borderColor: c.line, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  dim: { color: c.dim, fontSize: 12 },
}));
