import { t as tr } from '../../../../i18n';
import { Text, View } from 'react-native';
import { Pressable } from '../../../../components/Pressable';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cardName } from '../../../../decks';
import { intro, IntroPage, lx, order, PAGES, study } from '../../../../cardStudy';
import { CardStudyView, IntroView } from '../../../../components/CardStudy';
import { Page } from '../../../../components/settings-ui';
import { c, themed } from '../../../../theme';

const label = (id: string) =>
  id === 'how-to' ? lx(intro.howTo.title) : id === 'colours' ? lx(intro.colours.title) : id === 'planes' ? lx(intro.planes.title) : cardName(id);

export default function StudyPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const all = order();
  const i = all.indexOf(id);
  const prev = all[i - 1];
  const next = all[i + 1];
  const d = study(id);
  const isIntro = (PAGES as readonly string[]).includes(id);
  const go = (to: string) => router.replace({ pathname: '/card-study/[id]', params: { id: to } });

  return (
    <Page>
      <Stack.Screen options={{ title: isIntro ? lx(intro.title) : label(id) }} />
      {isIntro ? <IntroView page={id as IntroPage} /> : d ? <CardStudyView d={d} /> : <Text style={s.dim}>{tr("This card has no study yet.")}</Text>}
      <View style={s.nav}>
        {prev ? (
          <Pressable style={s.btn} onPress={() => go(prev)}>
            <Ionicons name="chevron-back" size={16} color={c.gold} />
            <Text style={s.btnText} numberOfLines={1}>{label(prev)}</Text>
          </Pressable>
        ) : (
          <View />
        )}
        {next && (
          <Pressable style={[s.btn, { justifyContent: 'flex-end' }]} onPress={() => go(next)}>
            <Text style={s.btnText} numberOfLines={1}>{label(next)}</Text>
            <Ionicons name="chevron-forward" size={16} color={c.gold} />
          </Pressable>
        )}
      </View>
    </Page>
  );
}

const s = themed(() => ({
  dim: { color: c.dim, lineHeight: 20 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 24 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.panel, borderRadius: 12, padding: 12, maxWidth: '50%' },
  btnText: { color: c.gold, fontWeight: '600', flexShrink: 1 },
}));
