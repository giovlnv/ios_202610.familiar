import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, Text, TextInput, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { JournalData, loadJournal, matchesReading, mostDrawn, newReading, Reading } from '../../../journal';
import { today } from '../../../tracker';
import { cardName } from '../../../decks';
import { CardImage } from '../../../components/Cards';
import ReadingRow from '../../../components/ReadingRow';
import CardSheet from '../../../components/CardSheet';
import { Chip, fmtDate } from '../../../components/ui';
import { usePad } from '../../../playback';
import { c, themed } from '../../../theme';
import EmptyState from '../../../components/EmptyState';

const TAROT = ['tarot'];

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const day = (r: Reading) => r.at.slice(0, 10);
const short = (id: string) => cardName(id).split(' · ').pop()!;

export default function Journal() {
  const pad = usePad();
  const [j, setJ] = useState<JournalData>(loadJournal);
  const [view, setView] = useState<'timeline' | 'calendar'>('timeline');
  const [area, setArea] = useState<string | null>(null);
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [picked, setPicked] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<{ id: string; role: string } | null>(null);
  useFocusEffect(
    useCallback(() => {
      const refresh = () => setJ(loadJournal());
      refresh();
      const t = setTimeout(refresh, 400);
      return () => clearTimeout(t);
    }, []),
  );

  const readings = useMemo(
    () =>
      [...j.readings]
        .filter((r) => (!area || r.area === area) && matchesReading(r, q, j.people))
        .sort((a, b) => b.at.localeCompare(a.at) || b.created - a.created),
    [j, area, q],
  );
  const areas = [...new Set(j.readings.map((r) => r.area).filter((a): a is string => !!a))];
  const top = mostDrawn(j.readings, 1)[0];
  const thisMonth = j.readings.filter((r) => r.at.startsWith(today().slice(0, 7))).length;

  const create = () => router.push({ pathname: '/reading/[id]', params: { id: newReading().id } });

  const sections = useMemo(() => {
    const list = view === 'calendar' ? readings.filter((r) => (picked ? day(r) === picked : r.at.startsWith(month))) : readings;
    const out: { title: string; data: Reading[] }[] = [];
    for (const r of list) {
      const title = fmtDate(day(r), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      const last = out[out.length - 1];
      if (last?.title === title) last.data.push(r);
      else out.push({ title, data: [r] });
    }
    return out;
  }, [readings, view, month, picked]);

  const areaCount = new Map<string, number>();
  for (const r of j.readings) if (r.area) areaCount.set(r.area, (areaCount.get(r.area) ?? 0) + 1);
  const topArea = [...areaCount.entries()].sort((a, b) => b[1] - a[1])[0];

  const header = (
    <View>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable hitSlop={10} onPress={create} accessibilityLabel="New reading">
              <Ionicons name="add-circle-outline" size={26} color={c.gold} />
            </Pressable>
          ),
        }}
      />
      <Text style={s.h3}>Readings</Text>
      <View style={s.stats}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.big}>{thisMonth}</Text>
          <Text style={s.tileLabel}>this month</Text>
          <Text style={[s.statLine, { marginTop: 10 }]}>{j.readings.length} in total</Text>
          {topArea && <Text style={s.statLine}>Most asked about: {topArea[0]}</Text>}
          <Pressable onPress={() => router.push('/journal-stats')} hitSlop={6} style={{ marginTop: 8 }}>
            <Text style={s.moreStats}>More stats ›</Text>
          </Pressable>
        </View>
        {top ? (
          <Pressable style={{ alignItems: 'center', gap: 4, width: 96 }} onPress={() => setOpen({ id: top[0], role: `Your most drawn card · ${top[1]} times.` })}>
            <CardImage id={top[0]} width={64} />
            <Text style={s.tileLabel}>Most drawn · {top[1]}×</Text>
            <Text style={[s.tileCard, { textAlign: 'center' }]} numberOfLines={2}>
              {short(top[0])}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={s.search}>
        <Ionicons name="search" size={16} color={c.dim} />
        <TextInput
          style={s.searchInput}
          value={q}
          onChangeText={setQ}
          placeholder="Search questions, notes, cards, people"
          placeholderTextColor={c.dim}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>
      <View style={s.views}>
        {(['timeline', 'calendar'] as const).map((v) => (
          <Pressable key={v} style={[s.view, view === v && s.viewOn]} onPress={() => (setView(v), setPicked(null))}>
            <Ionicons name={v === 'timeline' ? 'list' : 'calendar-outline'} size={15} color={view === v ? c.bg : c.dim} />
            <Text style={[s.viewText, view === v && { color: c.bg }]}>{v === 'timeline' ? 'Timeline' : 'Calendar'}</Text>
          </Pressable>
        ))}
      </View>

      {!!areas.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <Chip label="All" on={!area} onPress={() => setArea(null)} />
          {areas.map((a) => (
            <Chip key={a} label={a} on={area === a} onPress={() => setArea(area === a ? null : a)} />
          ))}
        </ScrollView>
      )}

      {view === 'calendar' && (
        <Calendar
          month={month}
          setMonth={(m) => (setMonth(m), setPicked(null))}
          days={new Set(readings.map(day))}
          picked={picked}
          onPick={(d) => setPicked(picked === d ? null : d)}
        />
      )}
      <CardSheet id={open?.id ?? null} role={open?.role} onClose={() => setOpen(null)} />
    </View>
  );

  return (
    <SectionList
      style={s.wrap}
      sections={sections}
      keyExtractor={(r) => r.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 40 + pad }}
      renderSectionHeader={({ section }) => <Text style={s.day}>{section.title}</Text>}
      renderItem={({ item }) => <ReadingRow r={item} j={j} />}
      ListEmptyComponent={
        <EmptyState
          paths={TAROT}
          onPress={create}
          action="Log a reading"
          text={j.readings.length ? 'No readings here.' : 'Log your first reading: question, spread, cards and what you saw in them.'}
        />
      }
    />
  );
}

function Calendar({
  month,
  setMonth,
  days,
  picked,
  onPick,
}: {
  month: string;
  setMonth: (m: string) => void;
  days: Set<string>;
  picked: string | null;
  onPick: (d: string) => void;
}) {
  const [y, m] = month.split('-').map(Number);
  const first = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const count = new Date(y, m, 0).getDate();
  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const now = today();
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];

  return (
    <View style={s.cal}>
      <View style={s.calHead}>
        <Pressable hitSlop={10} onPress={() => shift(-1)}>
          <Ionicons name="chevron-back" size={20} color={c.gold} />
        </Pressable>
        <Text style={s.calTitle}>{fmtDate(`${month}-15`, { month: 'long', year: 'numeric' })}</Text>
        <Pressable hitSlop={10} onPress={() => shift(1)}>
          <Ionicons name="chevron-forward" size={20} color={c.gold} />
        </Pressable>
      </View>
      <View style={s.grid}>
        {WEEK.map((w, i) => (
          <Text key={i} style={[s.cell, s.week]}>
            {w}
          </Text>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={s.cell} />;
          const iso = `${month}-${String(d).padStart(2, '0')}`;
          const on = picked === iso;
          return (
            <Pressable key={i} style={[s.cell, on && s.cellOn]} onPress={() => onPick(iso)}>
              <Text style={[s.num, iso === now && { color: c.gold }, on && { color: c.bg }]}>{d}</Text>
              <View style={[s.dot, { backgroundColor: days.has(iso) ? (on ? c.bg : c.gold) : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  h3: { color: c.text, fontSize: 17, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  birthRow: { flexDirection: 'row', gap: 10 },
  birth: { backgroundColor: c.panel, borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 4 },
  addBirth: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: c.panel, borderRadius: 12, padding: 14 },
  stats: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.panel, borderRadius: 14, padding: 16, marginBottom: 14 },
  statLine: { color: c.text, fontSize: 14 },
  moreStats: { color: c.gold, fontWeight: '600', fontSize: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.panel, borderRadius: 10, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, color: c.text, fontSize: 15, paddingVertical: 10 },
  tileLabel: { color: c.dim, fontSize: 12 },
  tileCard: { color: c.text, fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 4 },
  big: { color: c.gold, fontSize: 40, fontWeight: '700' },
  views: { flexDirection: 'row', backgroundColor: c.panel, borderRadius: 10, padding: 3 },
  view: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 8 },
  viewOn: { backgroundColor: c.gold },
  viewText: { color: c.dim, fontWeight: '600' },
  chips: { gap: 8, paddingTop: 12 },
  day: { color: c.gold, fontWeight: '700', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginTop: 18, marginBottom: 8 },
  cal: { backgroundColor: c.panel, borderRadius: 12, padding: 12, marginTop: 12 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 5, borderRadius: 8 },
  cellOn: { backgroundColor: c.gold },
  week: { color: c.dim, fontSize: 12, textAlign: 'center' },
  num: { color: c.text, fontSize: 14 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
}));
