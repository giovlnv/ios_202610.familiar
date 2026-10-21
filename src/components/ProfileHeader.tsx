import { pronounLabel, t as tr } from '../i18n';
import { streaks } from '../streaks';
import { useCallback, useState } from 'react';
import { Href, router, useFocusEffect } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getProfile, load, Profile } from '../tracker';
import { c, F, read, themed, write } from '../theme';
import { birthCards, dailyCard, loadJournal, mostDrawn, showDate } from '../journal';
import { lenormandPrefs } from '../lenormand';
import { isCustomSystem } from '../systems';
import { isDue, isSubject, useStudy } from '../study';
import { cardName } from '../decks';
import { CardImage } from './Cards';
import CardSheet from './CardSheet';
import { FamiliarArt } from './Familiar';
import { getOnboarding, nightNow, allPaths } from '../familiar';
import { currentGuide } from '../guide';
import { usePlayback } from '../playback';
import { numbers, personal, show } from '../numerology';
import { fmtDeg, myChart, signOf, sky } from '../astrology';

export async function pickPhoto() {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, quality: 0.7 });
  const a = r.assets?.[0];
  if (r.canceled || !a) return;
  const name = `avatar-${Date.now()}.jpg`;
  const old = getProfile().photo;
  new File(a.uri).copySync(new File(Paths.document, name));
  if (old) {
    const f = new File(Paths.document, old);
    if (f.exists) f.delete();
  }
  return name;
}

export function Avatar({ photo, name, size }: { photo?: string; name?: string; size: number }) {
  const st = { width: size, height: size, borderRadius: size / 2 };
  if (photo) return <Image source={{ uri: new File(Paths.document, photo).uri }} style={[st, { borderWidth: 2, borderColor: c.gold }]} />;
  return (
    <View style={[st, s.empty]}>
      {name ? <Text style={[s.initial, { fontSize: size * 0.4 }]}>{name[0].toUpperCase()}</Text> : <Ionicons name="person" size={size * 0.45} color={c.dim} />}
    </View>
  );
}

function Tile({ value, label, onPress }: { value: string; label: string; onPress?: () => void }) {
  return (
    <Pressable style={s.tile} onPress={onPress}>
      <Text style={s.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={s.tileLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function More({ label, to }: { label: string; to: Href }) {
  return (
    <Pressable onPress={() => router.push(to)} style={s.more}>
      <Text style={s.moreText}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={c.gold} />
    </Pressable>
  );
}

function TarotPanel({ dob, onCard }: { dob?: string; onCard: (id: string, role: string) => void }) {
  const ROLE: Record<string, string> = {
    Personality: tr('Your personality card: how you show up in the world and the lessons you meet outwardly. The sum of the digits of your birth date.'),
    Essence: tr('Your essence card: the inner core beneath the personality, reduced from it to a single digit.'),
  };
  const roleOf = (label: string) => ROLE[label] ?? tr('Your card for {0}: the theme of the year, from your birth day and month plus the current year.', { 0: new Date().getFullYear() });
  const bc = birthCards(dob);
  if (!bc) return <Text style={s.user}>{tr("Add your birth date to see your personality cards.")}</Text>;
  const birth: [string, string | undefined][] = [
    ['Personality', bc.personality],
    ['Essence', bc.essence !== bc.personality ? bc.essence : undefined],
    ['Year', bc.yearCard],
  ];
  return (
    <View style={s.cards}>
      {birth
        .filter(([, id]) => id)
        .map(([label, id]) => (
          <Pressable key={label} style={s.cardCol} onPress={() => onCard(id!, roleOf(label))}>
            <CardImage id={id!} width={54} />
            <Text style={s.cardLabel}>{label === 'Year' ? tr('Year {0}', { 0: new Date().getFullYear() }) : tr(label)}</Text>
            <Text style={s.cardName} numberOfLines={2}>
              {cardName(id!).split(' · ').pop()}
            </Text>
          </Pressable>
        ))}
    </View>
  );
}

function LenormandPanel({ onCard }: { onCard: (id: string, role: string) => void }) {
  const readings = loadJournal().readings.filter((r) => r.system === 'lenormand');
  const top = mostDrawn(readings, 1)[0]?.[0];
  const list: [string, string | undefined, string][] = [
    ['You', lenormandPrefs().significator, tr('Your significator: the card that stands for you in a Grand Tableau. Change it in Settings → Lenormand.')],
    ['Today', dailyCard('lenormand'), tr('Today’s calculated Lenormand card.')],
    ['Most drawn', top, tr('The Lenormand card that appears most often in your journal.')],
  ];
  return (
    <>
      <View style={s.cards}>
        {list
          .filter(([, id]) => id)
          .map(([label, id, role]) => (
            <Pressable key={label} style={s.cardCol} onPress={() => onCard(id!, role)}>
              <CardImage id={id!} width={54} />
              <Text style={s.cardLabel}>{tr(label)}</Text>
              <Text style={s.cardName} numberOfLines={2}>
                {cardName(id!).split(' · ').pop()}
              </Text>
            </Pressable>
          ))}
      </View>
      <Text style={s.line}>
        {readings.length}{' '}{tr("Lenormand")}{' '}{tr(readings.length === 1 ? 'reading' : 'readings')}{' '}{tr("in your journal")}
      </Text>
    </>
  );
}

function SystemPanel({ id, onCard }: { id: string; onCard: (id: string, role: string) => void }) {
  const readings = loadJournal().readings.filter((r) => r.system === id);
  const top = mostDrawn(readings, 1)[0]?.[0];
  const today = dailyCard(id);
  const list: [string, string | undefined, string][] = [
    ['Today', today || undefined, tr('Today’s calculated card.')],
    ['Most drawn', top, tr('The card that appears most often in your journal.')],
  ];
  return (
    <>
      <View style={s.cards}>
        {list
          .filter(([, x]) => x)
          .map(([label, x, role]) => (
            <Pressable key={label} style={s.cardCol} onPress={() => onCard(x!, role)}>
              <CardImage id={x!} width={54} />
              <Text style={s.cardLabel}>{tr(label)}</Text>
              <Text style={s.cardName} numberOfLines={2}>
                {cardName(x!).split(' · ').pop()}
              </Text>
            </Pressable>
          ))}
      </View>
      <Text style={s.line}>
        {readings.length} {tr(readings.length === 1 ? 'reading' : 'readings')}{' '}{tr("in your journal")}
      </Text>
      <More label={tr("Edit this system")} to={`/settings/system/${id}`} />
    </>
  );
}

function NumerologyPanel({ dob }: { dob?: string }) {
  if (!dob) return <Text style={s.user}>{tr("Add your birth date to see your numbers.")}</Text>;
  const n = numbers();
  const go = () => router.push('/numerology');
  const pn = personal(dob);
  return (
    <>
      <View style={s.tiles}>
        {n.core.slice(0, 1).concat(n.core.filter((r) => ['expression', 'soulUrge', 'personality', 'name'].includes(r.key))).map((r) => (
          <Tile key={r.key} value={show(r.value)} label={r.label} onPress={go} />
        ))}
      </View>
      {!n.birthName && <Text style={s.user}>{tr("Add your full birth name for the name numbers.")}</Text>}
      <Text style={s.line}>{tr("Today: personal day")}{' '}{pn.day}{' '}{tr("· month")}{' '}{pn.month}{' '}{tr("· year")}{' '}{pn.year}</Text>
      <More label={tr("All numbers")} to="/numerology" />
    </>
  );
}

function AstrologyPanel() {
  const ch = myChart();
  if (!ch) return <Text style={s.user}>{tr("Add your birth date, time and place to see your chart.")}</Text>;
  const go = () => router.push('/astrology');
  const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0];
  return (
    <>
      <View style={s.tiles}>
        {ch.list
          .filter((x) => ['Sun', 'Moon', 'Ascendant'].includes(x.name))
          .map((x) => (
            <Tile key={x.name} value={`${signOf(x.lon).glyph} ${tr(signOf(x.lon).name)}`} label={`${x.name === 'Ascendant' ? tr("Rising") : tr(x.name)} · ${fmtDeg(x.lon)}`} onPress={go} />
          ))}
      </View>
      {!ch.timed && <Text style={s.user}>{tr("Add your birth time and place for your rising sign.")}</Text>}
      <Text style={s.line}>
        {tr("Mostly")}{' '}{tr(top(ch.elements) ?? '')} · {tr(top(ch.modes) ?? '')}
      </Text>
      <Text style={s.line}>{tr("Today:")}{' '}{sky()}</Text>
      <More label={tr("Birth chart")} to="/astrology" />
    </>
  );
}

function StudyPanel({ id }: { id: string }) {
  const d = useStudy();
  const pool = d.cards.filter((x) => x.subject === id);
  const books = load().books.filter((b) => b.paths?.includes(id)).length;
  const tiles: [number, string][] = [
    [books, tr('books')],
    [d.notes.filter((n) => n.subject === id).length, tr('notes')],
    [pool.length, tr('flashcards')],
    [pool.filter(isDue).length, tr('due today')],
  ];
  return (
    <>
      <View style={s.tiles}>
        {tiles.map(([v, l]) => (
          <View key={l} style={s.tile}>
            <Text style={s.tileValue}>{v}</Text>
            <Text style={s.tileLabel}>{l}</Text>
          </View>
        ))}
      </View>
      <More label={tr('Review flashcards')} to={`/study/review?subject=${id}`} />
    </>
  );
}

export default function ProfileHeader() {
  const [p, setP] = useState<Profile>(getProfile);
  const [paths, setPaths] = useState<string[]>(() => getOnboarding().paths ?? []);
  useFocusEffect(useCallback(() => (setP(getProfile()), setPaths(getOnboarding().paths ?? [])), []));
  const playing = usePlayback().status.playing;
  const [open, setOpen] = useState<{ id: string; role: string } | null>(null);
  const shown = allPaths().filter((x) => paths.includes(x.id));
  const list = shown.length ? shown : allPaths().slice(0, 1);
  const [tab, setTab] = useState(() => read('profile-path.txt') || 'tarot');
  const active = list.find((x) => x.id === tab) ?? list[0];
  const pick = (id: string) => (write('profile-path.txt', id), setTab(id));
  return (
    <View style={s.head}>
      <Pressable style={s.top} onPress={() => router.push('/settings/profile')}>
        <Avatar photo={p.photo} name={p.name} size={84} />
        <FamiliarArt familiar={currentGuide()} pose={playing ? 'reading' : nightNow() ? 'sleeping' : 'idle'} size={84} vial alive />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{p.name || tr("Set up your profile")}</Text>
          <Text style={s.user}>{p.username ? `@${p.username}${p.pronouns ? ` · ${pronounLabel(p.pronouns)}` : ""}` : (pronounLabel(p.pronouns) ?? tr("Add a photo, name and username"))}</Text>
          {!!p.dob && <Text style={s.user}>{tr("Born")}{' '}{showDate(p.dob)}</Text>}
          {(() => {
            const st = streaks();
            return st.longest > 0 ? (
              <Text style={[s.user, { color: c.gold }]}>
                {st.current > 0 ? tr("{0}-day streak", { 0: st.current }) : tr("No streak today yet")}{' '}{tr("· longest")}{' '}{st.longest}
              </Text>
            ) : null;
          })()}
        </View>
        <Ionicons name="create-outline" size={18} color={c.dim} />
      </Pressable>
      {list.length > 1 && (
        <View style={s.chips}>
          {list.map((x) => {
            const on = x.id === active.id;
            return (
              <Pressable key={x.id} onPress={() => pick(x.id)} style={[s.chip, { borderColor: on ? x.color : 'transparent', backgroundColor: on ? x.color + '2e' : c.raised }]}>
                <Text style={[s.chipText, { color: on ? x.color : c.dim }]}>{x.name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {active.id === 'tarot' && <TarotPanel dob={p.dob} onCard={(id, role) => setOpen({ id, role })} />}
      {active.id === 'numerology' && <NumerologyPanel dob={p.dob} />}
      {active.id === 'astrology' && <AstrologyPanel />}
      {active.id === 'lenormand' && <LenormandPanel onCard={(id, role) => setOpen({ id, role })} />}
      {active.id === 'custom' && (
        <Pressable onPress={() => router.push('/settings/decks/custom')}>
          <Text style={s.user}>{tr("Make a system of your own in Settings → Make your own.")}</Text>
        </Pressable>
      )}
      {isSubject(active.id) && <StudyPanel id={active.id} />}
      {isCustomSystem(active.id) && <SystemPanel id={active.id} onCard={(id, role) => setOpen({ id, role })} />}
      <CardSheet id={open?.id ?? null} role={open?.role} onClose={() => setOpen(null)} />
    </View>
  );
}

const s = themed(() => ({
  head: { backgroundColor: c.panel, borderRadius: 14, padding: 14, marginTop: 12, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 14, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, backgroundColor: c.raised, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 2 },
  tileValue: { color: c.gold, fontSize: 18, fontFamily: F.heading },
  tileLabel: { color: c.dim, fontSize: 11 },
  line: { color: c.text, fontSize: 13 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  moreText: { color: c.gold, fontWeight: '600', fontSize: 13 },
  cards: { flexDirection: 'row', justifyContent: 'space-around', gap: 8 },
  cardCol: { alignItems: 'center', gap: 4, flex: 1 },
  cardLabel: { color: c.gold, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  cardName: { color: c.text, fontSize: 13, fontFamily: F.heading, textAlign: 'center' },
  empty: { backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line },
  initial: { color: c.gold, fontWeight: '700' },
  name: { color: c.text, fontSize: 21, fontWeight: '700' },
  user: { color: c.dim, marginTop: 2 },
}));
