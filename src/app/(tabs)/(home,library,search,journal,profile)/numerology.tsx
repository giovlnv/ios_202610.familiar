import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { activeSystem, karmicLessons, numberCards, numbers, NumberRow, NumSystem, personal, show, SYSTEM_NAME, SYSTEMS, triangle } from '../../../numerology';
import { Chip } from '../../../components/ui';
import { getProfile } from '../../../tracker';
import { CardImage } from '../../../components/Cards';
import CardSheet from '../../../components/CardSheet';
import { showDate } from '../../../journal';
import { c, F, themed } from '../../../theme';
import { Btn, Page, ss } from '../../../components/settings-ui';

function Rows({ rows, onCard }: { rows: NumberRow[]; onCard: (id: string, n: number) => void }) {
  return (
    <View style={ss.card}>
      {rows.map((r) => (
        <View key={r.key} style={s.row}>
          <Text style={s.num}>{show(r.value)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{r.label}</Text>
            {!!r.compound && <Text style={[ss.meta, { color: c.text }]}>Compound {r.compound}</Text>}
            <Text style={ss.meta}>{r.about}</Text>
            <View style={s.cards}>
              {numberCards(r.value).map((id) => (
                <Pressable key={id} onPress={() => onCard(id, r.value)}>
                  <CardImage id={id} width={30} />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const today = (dob: string): NumberRow[] => {
  const p = personal(dob);
  return [
    { key: 'day', label: 'Personal day', value: p.day, about: 'The theme of today.' },
    { key: 'month', label: 'Personal month', value: p.month, about: 'The theme of this month.' },
    { key: 'year', label: 'Personal year', value: p.year, about: `The theme of ${new Date().getFullYear()}, in a nine-year cycle.` },
  ];
};

const INTRO: Record<NumSystem, string> = {
  pythagorean: 'Pythagorean numerology: letters A to Z run 1 to 9 in order.',
  chaldean: 'Chaldean numerology: letters by sound, 1 to 8, never 9. Uses the name you are known by.',
  nct: 'Numerologia Cabalística: letters 1 to 8, full birth name as registered.',
};

const inRun = (r: number[], j: number) => {
  let a = j, b = j;
  while (a > 0 && r[a - 1] === r[j]) a--;
  while (b < r.length - 1 && r[b + 1] === r[j]) b++;
  return b - a >= 2;
};

function Triangle({ name }: { name: string }) {
  const t = triangle(name);
  const lessons = karmicLessons(name);
  return (
    <>
      <Text style={ss.h2}>Inverted triangle</Text>
      <View style={ss.card}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ alignItems: 'center' }}>
            {t.rows.map((r, i) => (
              <Text key={i} style={s.tri}>
                {r.map((d, j) => (
                  <Text key={j} style={inRun(r, j) ? { color: c.gold } : undefined}>
                    {d}
                  </Text>
                ))}
              </Text>
            ))}
          </View>
        </ScrollView>
        <Text style={ss.meta}>
          {t.seqs.length ? `Negative sequences: ${t.seqs.join(', ')}` : 'No negative sequences (three equal digits in a row).'}
        </Text>
      </View>
      <Text style={ss.h2}>Karmic lessons</Text>
      <View style={ss.card}>
        <Text style={[ss.meta, { color: c.text }]}>{lessons.length ? lessons.join(' · ') : 'None: every number from 1 to 8 is in your name.'}</Text>
        <Text style={ss.meta}>Numbers missing from the letters of the name.</Text>
      </View>
    </>
  );
}

export default function Numerology() {
  const [sys, setSys] = useState<NumSystem>(activeSystem);
  const [n, setN] = useState(() => numbers(sys));
  useFocusEffect(useCallback(() => setN(numbers(sys)), [sys]));
  const pick = (v: NumSystem) => (setSys(v), setN(numbers(v)));
  const edit = () => router.push('/settings/profile');
  const [open, setOpen] = useState<{ id: string; n: number } | null>(null);
  const onCard = (id: string, v: number) => setOpen({ id, n: v });
  return (
    <Page>
      <View style={s.chips}>
        {SYSTEMS.map((v) => (
          <Chip key={v} label={SYSTEM_NAME[v]} on={v === sys} onPress={() => pick(v)} />
        ))}
      </View>
      <Text style={ss.p}>{INTRO[sys]} Master numbers are shown with their reduced digit, like 11/2.</Text>
      {!!getProfile().dob && (
        <>
          <Text style={ss.h2}>Today</Text>
          <Rows rows={today(getProfile().dob!)} onCard={onCard} />
        </>
      )}
      {n.core.length > 0 && (
        <>
          <Text style={ss.h2}>Core numbers{n.birthName ? ` · ${n.birthName}` : ''}</Text>
          <Rows rows={n.core} onCard={onCard} />
        </>
      )}
      {!n.birthName && <Text style={ss.p}>Add your full birth name to see expression, soul urge, personality and maturity.</Text>}
      {n.current.length > 0 && (
        <>
          <Text style={ss.h2}>{sys === 'chaldean' ? 'Birth name' : 'Current name'} · {n.currentName}</Text>
          <Text style={ss.p}>
            {sys === 'chaldean' ? 'The name on your birth certificate, for comparison.' : 'The name you use now: its vibration sits on top of your core numbers.'}
          </Text>
          <Rows rows={n.current} onCard={onCard} />
        </>
      )}
      {sys === 'nct' && !!n.birthName && <Triangle name={n.birthName} />}
      {n.history.length > 1 && (
        <>
          <Text style={ss.h2}>Names</Text>
          <View style={ss.card}>
            {n.history.map((h, i) => (
              <Text key={i} style={[ss.meta, { color: c.text }]}>
                {h.name}
                {h.since ? `  ·  since ${showDate(h.since)}` : ''}
              </Text>
            ))}
          </View>
        </>
      )}
      <Btn label="Edit names and birth date" onPress={edit} />
      <CardSheet id={open?.id ?? null} role={open ? `A card of the number ${show(open.n)}.` : undefined} onClose={() => setOpen(null)} />
    </Page>
  );
}

const s = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tri: { color: c.dim, fontFamily: 'Menlo', fontSize: 13, letterSpacing: 4 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  num: { color: c.gold, fontSize: 26, fontFamily: F.heading, minWidth: 54, textAlign: 'center' },
  label: { color: c.text, fontSize: 16, fontWeight: '600' },
}));
