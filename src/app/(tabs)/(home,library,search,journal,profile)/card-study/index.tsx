import { t as tr } from '../../../../i18n';
import { Image, Text, View } from 'react-native';
import { Pressable } from '../../../../components/Pressable';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CARDS, cardName } from '../../../../decks';
import { hasStudy, intro, lx, PAGES, rwsUri, studyCount } from '../../../../cardStudy';
import { BookletCover } from '../../../../components/CardStudy';
import { Page } from '../../../../components/settings-ui';
import { c, F, themed } from '../../../../theme';

const GROUPS = ['Major Arcana', 'Wands', 'Cups', 'Swords', 'Pentacles'];
const GROUP_PT: Record<string, string> = { 'Major Arcana': 'Arcanos maiores', Wands: 'Paus', Cups: 'Copas', Swords: 'Espadas', Pentacles: 'Ouros' };
const open = (id: string) => router.push({ pathname: '/card-study/[id]', params: { id } });

export default function Booklet() {
  const first = CARDS.find((x) => hasStudy(x.id))?.id;
  return (
    <Page>
      <View style={s.top}>
        <BookletCover size={260} />
        <Text style={s.title}>{lx(intro.title)}</Text>
        <Text style={s.tag}>{lx(intro.tagline)}</Text>
        <Text style={s.count}>{tr("{0} of 78 cards", { 0: studyCount() })}</Text>
        <Pressable style={s.start} onPress={() => open(PAGES[0])}>
          <Text style={s.startText}>{tr("Start reading")}</Text>
        </Pressable>
        {!!first && (
          <Pressable onPress={() => open(first)}>
            <Text style={s.link}>{tr("Go to the cards")}</Text>
          </Pressable>
        )}
      </View>

      <Text accessibilityRole="header" style={s.h2}>{tr("Introduction")}</Text>
      {PAGES.map((p) => (
        <Pressable key={p} style={s.row} onPress={() => open(p)}>
          <Text style={[s.rowText, { flex: 1 }]}>{lx(p === 'how-to' ? intro.howTo.title : p === 'colours' ? intro.colours.title : intro.planes.title)}</Text>
          <Ionicons name="chevron-forward" size={16} color={c.dim} />
        </Pressable>
      ))}

      {GROUPS.map((g) => {
        const list = CARDS.filter((x) => x.group === g);
        const done = list.filter((x) => hasStudy(x.id)).length;
        return (
          <View key={g}>
            <Text accessibilityRole="header" style={s.h2}>
              {lx({ pt: GROUP_PT[g], en: g })} <Text style={s.small}>{done}/{list.length}</Text>
            </Text>
            {list.map((x) => {
              const on = hasStudy(x.id);
              return (
                <Pressable key={x.id} style={[s.row, !on && { opacity: 0.4 }]} disabled={!on} onPress={() => open(x.id)}>
                  <Image source={{ uri: rwsUri(x.id) }} style={s.thumb} />
                  <Text style={[s.rowText, { flex: 1 }]}>{cardName(x.id)}</Text>
                  {on ? <Ionicons name="chevron-forward" size={16} color={c.dim} /> : <Text style={s.small}>{tr("soon")}</Text>}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </Page>
  );
}

const s = themed(() => ({
  top: { alignItems: 'center', gap: 4, marginBottom: 8 },
  title: { color: c.text, fontFamily: F.heading, fontSize: 28, marginTop: 4 },
  tag: { color: c.gold, fontFamily: F.headingItalic, fontSize: 17 },
  count: { color: c.dim, fontSize: 13, marginTop: 4 },
  start: { backgroundColor: c.gold, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginTop: 12 },
  startText: { color: c.bg, fontWeight: '700', fontSize: 17 },
  link: { fontSize: 15, color: c.gold, fontWeight: '600', marginTop: 12 },
  h2: { color: c.text, fontSize: 22, marginTop: 24, marginBottom: 8, fontFamily: F.heading },
  small: { color: c.dim, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel, borderRadius: 12, padding: 12, marginBottom: 6 },
  rowText: { color: c.text, fontSize: 15 },
  thumb: { width: 26, height: 44, borderRadius: 3 },
}));
