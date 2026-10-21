import { t as tr } from '../../../i18n';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { astroCards, fmtDeg, HOUSES, myChart, Placement, signOf } from '../../../astrology';
import { getOnboarding } from '../../../familiar';
import { CardImage } from '../../../components/Cards';
import CardSheet from '../../../components/CardSheet';
import { c, themed } from '../../../theme';
import { Btn, Page, ss } from '../../../components/settings-ui';

function Row({ p, open, onToggle, onCard }: { p: Placement; open: boolean; onToggle: () => void; onCard: (id: string, role: string) => void }) {
  const sign = signOf(p.lon);
  const cards = [...new Set([...astroCards(p.name), ...astroCards(sign.name)])];
  return (
    <Pressable onPress={onToggle} style={s.row}>
      <View style={s.line}>
        <Text style={s.glyph}>{p.glyph}</Text>
        <Text style={s.name}>{tr(p.name)}</Text>
        <Text style={s.sign}>
          {sign.glyph} {tr(sign.name)} {fmtDeg(p.lon)}
          {p.retro ? ' ℞︎' : ''}
        </Text>
        <Text style={s.house}>{p.house ? `H${p.house}` : ''}</Text>
      </View>
      {open && cards.length > 0 && (
        <View style={s.cards}>
          {cards.map((id) => (
            <Pressable key={id} onPress={() => onCard(id, tr('Linked to {0} in {1}.', { 0: tr(p.name), 1: tr(sign.name) }))}>
              <CardImage id={id} width={30} />
            </Pressable>
          ))}
        </View>
      )}
    </Pressable>
  );
}

export default function Astrology() {
  const [ch, setCh] = useState(myChart);
  useFocusEffect(useCallback(() => setCh(myChart()), []));
  const [open, setOpen] = useState<string | null>(null);
  const [card, setCard] = useState<{ id: string; role: string } | null>(null);
  const edit = () => router.push('/settings/profile');
  if (!ch)
    return (
      <Page>
        <Text style={ss.p}>{tr("Add your birth date, time and place to see your birth chart.")}</Text>
        <Btn label={tr("Edit birth details")} onPress={edit} />
      </Page>
    );
  const bal = (o: Record<string, number>) =>
    Object.entries(o)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${tr(k)} ${n}`)
      .join(' · ');
  return (
    <Page>
      <Text style={ss.p}>{tr("Tropical zodiac,")}{' '}{tr(HOUSES.find((h) => h.id === (getOnboarding().houses ?? 'placidus'))?.name ?? '')}{' '}{tr("houses. Tap a planet to see its tarot cards.")}</Text>
      {!ch.timed && <Text style={ss.p}>{tr("Add your birth time and place for the Ascendant, Midheaven and houses.")}</Text>}
      <View style={ss.card}>
        {ch.list.map((p) => (
          <Row key={p.name} p={p} open={open === p.name} onToggle={() => setOpen(open === p.name ? null : p.name)} onCard={(id, role) => setCard({ id, role })} />
        ))}
      </View>
      <Text style={ss.h2}>{tr("Balance")}</Text>
      <View style={ss.card}>
        <Text style={ss.meta}>{tr("Elements:")}{' '}{bal(ch.elements)}</Text>
        <Text style={ss.meta}>{tr("Modalities:")}{' '}{bal(ch.modes)}</Text>
        <Text style={ss.meta}>{tr("Counted: Sun to Pluto")}{ch.timed ? tr(" and the Ascendant") : ''}.</Text>
      </View>
      <Btn label={tr("Edit birth details")} onPress={edit} />
      <CardSheet id={card?.id ?? null} role={card?.role} onClose={() => setCard(null)} />
    </Page>
  );
}

const s = themed(() => ({
  row: { paddingVertical: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  glyph: { color: c.gold, fontSize: 18, width: 28, textAlign: 'center' },
  name: { color: c.text, fontSize: 15, fontWeight: '600', width: 92 },
  sign: { color: c.text, fontSize: 14, flex: 1 },
  house: { color: c.dim, fontSize: 13, width: 32, textAlign: 'right' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6, marginLeft: 36 },
}));
