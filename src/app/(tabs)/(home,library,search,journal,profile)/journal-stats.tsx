import { t as tr } from '../../../i18n';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { journalStats, loadJournal } from '../../../journal';
import { cardName } from '../../../decks';
import { CardImage } from '../../../components/Cards';
import CardSheet from '../../../components/CardSheet';
import { fmtDate } from '../../../components/ui';
import { c, F, themed } from '../../../theme';
import { Page, ss } from '../../../components/settings-ui';
import EmptyState from '../../../components/EmptyState';

const TAROT = ['tarot'];

function Bars({ rows }: { rows: readonly (readonly [string, number])[] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <View style={ss.card}>
      {rows.map(([k, n]) => (
        <View key={k} style={s.bar}>
          <Text style={s.barLabel} numberOfLines={1}>
            {k}
          </Text>
          <View style={s.track}>
            <View style={[s.fill, { width: `${(n / max) * 100}%` }]} />
          </View>
          <Text style={s.barNum}>{n}</Text>
        </View>
      ))}
    </View>
  );
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileValue}>{value}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </View>
  );
}

export default function JournalStats() {
  const [st, setSt] = useState(() => journalStats(loadJournal()));
  useFocusEffect(useCallback(() => setSt(journalStats(loadJournal())), []));
  const [open, setOpen] = useState<{ id: string; role: string } | null>(null);
  if (!st.total)
    return (
      <Page>
        <EmptyState paths={TAROT} text={tr("No readings yet. Your stats grow as you log readings and cards of the day.")} />
      </Page>
    );
  return (
    <Page>
      <View style={s.tiles}>
        <Tile value={st.total} label="readings" />
        <Tile value={st.cards} label={tr("cards drawn")} />
      </View>
      <View style={s.tiles}>
        <Tile value={st.streak} label={tr("day streak · best {0}", { 0: st.best })} />
        <Tile value={`${st.reversed}%`} label="reversed" />
      </View>
      <Text style={ss.h2}>{tr("Last 12 months")}</Text>
      <Bars rows={st.months.map(([m, n]) => [fmtDate(`${m}-01`, { month: 'short', year: '2-digit' }), n] as const)} />
      {st.top.length > 0 && (
        <>
          <Text style={ss.h2}>{tr("Most drawn")}</Text>
          <View style={[ss.card, s.cards]}>
            {st.top.map(([id, n]) => (
              <Pressable key={id} style={s.cardCol} onPress={() => setOpen({ id, role: `Drawn ${n} times.` })}>
                <CardImage id={id} width={48} />
                <Text style={s.tileLabel} numberOfLines={1}>
                  {n}× {cardName(id).split(' · ').pop()}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {st.groups.length > 0 && (
        <>
          <Text style={ss.h2}>{tr("Majors and suits")}</Text>
          <Bars rows={st.groups} />
        </>
      )}
      {st.areas.length > 0 && (
        <>
          <Text style={ss.h2}>{tr("Areas")}</Text>
          <Bars rows={st.areas} />
        </>
      )}
      <Text style={ss.h2}>{tr("Who for")}</Text>
      <Bars rows={st.people} />
      <Text style={ss.h2}>{tr("Spreads")}</Text>
      <Bars rows={st.spreads} />
      <Text style={ss.h2}>{tr("Days of the week")}</Text>
      <Bars rows={st.weekdays} />
      <CardSheet id={open?.id ?? null} role={open?.role} onClose={() => setOpen(null)} />
    </Page>
  );
}

const s = themed(() => ({
  tiles: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  tile: { flex: 1, backgroundColor: c.panel, borderRadius: 12, padding: 14, gap: 2 },
  tileValue: { color: c.gold, fontSize: 28, fontFamily: F.heading },
  tileLabel: { color: c.dim, fontSize: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { color: c.text, fontSize: 13, width: 96 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: c.raised, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: c.gold },
  barNum: { color: c.dim, fontSize: 12, width: 28, textAlign: 'right' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardCol: { width: 64, alignItems: 'center', gap: 4 },
}));
