import { useState } from 'react';
import { Alert, Pressable, Switch, Text, useWindowDimensions, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { deleteSystem, importIntoSystem, removeCustomCard, setCardImage } from '../../../../../decks';
import { cardIdOf, getSystem, nextKey, patchSystem, SYSTEM_COLORS } from '../../../../../systems';
import { getOnboarding, setOnboarding } from '../../../../../familiar';
import { CardImage, useDecks } from '../../../../../components/Cards';
import { Chip } from '../../../../../components/ui';
import { Btn, Page, ss } from '../../../../../components/settings-ui';
import { c, themed } from '../../../../../theme';

export default function SystemScreen() {
  useDecks();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const sys = getSystem(id);
  if (!sys) return <Page><Text style={ss.p}>This system was deleted.</Text></Page>;
  const own = !sys.base;
  const groups = [...new Set(sys.cards.map((x) => x.group))];
  const shown = group && groups.includes(group) ? sys.cards.filter((x) => x.group === group) : sys.cards;
  const w = (width - 32 - 28 - 20) / 3;

  const photo = async (key: string) => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85 });
    const a = r.assets?.[0];
    if (!r.canceled && a) await setCardImage(sys.id, cardIdOf(sys.id, key), a.uri);
  };
  const rename = (key: string, cur: string) =>
    Alert.prompt('Card name', undefined, (n) => n?.trim() && patchSystem(sys.id, (s) => (s.cards.find((x) => x.key === key)!.name = n.trim())), 'plain-text', cur);
  const askGroup = (then: (g: string) => void) =>
    Alert.alert('Group', 'Like a suit', [
      ...groups.map((g) => ({ text: g, onPress: () => then(g) })),
      { text: 'New group…', onPress: () => Alert.prompt('New group', undefined, (g) => g?.trim() && then(g.trim())) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  const addCard = () =>
    Alert.prompt('New card', 'Name', (n) => {
      const name = n?.trim();
      if (!name) return;
      const put = (g: string) =>
        patchSystem(sys.id, (s) => {
          s.cards.push({ key: nextKey(s), name, group: g });
        });
      if (!groups.length) put('Cards');
      else askGroup(put);
    });
  const cardMenu = (key: string) => {
    const card = sys.cards.find((x) => x.key === key)!;
    Alert.alert(card.name, card.group, [
      { text: 'Choose a picture', onPress: () => photo(key) },
      { text: 'Rename', onPress: () => rename(key, card.name) },
      ...(own
        ? [
            { text: 'Change group', onPress: () => askGroup((g) => patchSystem(sys.id, (s) => (s.cards.find((x) => x.key === key)!.group = g))) },
            { text: 'Remove card', style: 'destructive' as const, onPress: () => removeCustomCard(sys.id, key) },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const doImport = async () => {
    setBusy(true);
    try {
      const r = await importIntoSystem(sys.id);
      if (r) setMsg(`${r.matched} pictures added${r.added ? ` · ${r.added} new cards` : ''}${r.skipped.length ? ` · ${r.skipped.length} files not recognised` : ''}`);
    } catch (e) {
      Alert.alert('Import', String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };
  const remove = () =>
    Alert.alert(`Delete ${sys.name}?`, 'Its cards and pictures are deleted. Readings made with it stay in your journal, with the card names gone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setOnboarding({ paths: (getOnboarding().paths ?? []).filter((p) => p !== sys.id) });
          deleteSystem(sys.id);
          router.back();
        },
      },
    ]);

  return (
    <Page>
      <Stack.Screen options={{ title: sys.name }} />
      <View style={ss.card}>
        <Pressable style={s.row} onPress={() => Alert.prompt('Name', undefined, (n) => n?.trim() && patchSystem(sys.id, (x) => (x.name = n.trim())), 'plain-text', sys.name)}>
          <Text style={ss.paletteName}>{sys.name}</Text>
          <Text style={s.link}>Rename</Text>
        </Pressable>
        <Text style={ss.meta}>
          {sys.base === 'tarot' ? 'Based on tarot: its spreads are here too.' : sys.base === 'lenormand' ? 'Based on Lenormand: its spreads and the Grand Tableau are here too.' : 'Your own deck.'} Make spreads of its own from a reading with “+ Custom”.
        </Text>
        <Text style={ss.label}>Path colour</Text>
        <View style={ss.row}>
          {SYSTEM_COLORS.map((col) => (
            <Pressable
              key={col}
              onPress={() => patchSystem(sys.id, (x) => (x.color = col))}
              style={[s.swatch, { backgroundColor: col }, sys.color === col && { borderColor: c.text }]}
              accessibilityLabel={`Colour ${col}`}
            />
          ))}
        </View>
        <View style={s.row}>
          <Text style={ss.paletteName}>Reversed cards</Text>
          <Switch value={sys.reversals} onValueChange={(v) => patchSystem(sys.id, (x) => (x.reversals = v))} trackColor={{ true: c.claude }} />
        </View>
      </View>

      <Text style={ss.h2}>Cards · {sys.cards.length}</Text>
      <View style={ss.card}>
        <View style={ss.row}>
          <Btn label={busy ? 'Importing…' : 'Import pictures'} primary onPress={doImport} />
          {own && <Btn label="Add a card" onPress={addCard} />}
        </View>
        <Text style={ss.meta}>
          {own
            ? 'Pick images or one .zip. Each picture becomes a card named after its file (“03-the-river.jpg” → The river); folders in a zip become groups.'
            : `Pick images or one .zip. Files are matched to the ${sys.base} cards by name, like ${sys.base === 'tarot' ? '“the-fool.jpg” or “cups01.png”' : '“01.jpg” or “o-cavaleiro.png”'}.`}
        </Text>
        {!!msg && <Text style={ss.meta}>{msg}</Text>}
        {groups.length > 1 && (
          <View style={ss.row}>
            <Chip label="All" on={!group} onPress={() => setGroup(null)} />
            {groups.map((g) => (
              <Chip key={g} label={g} on={group === g} onPress={() => setGroup(g)} />
            ))}
          </View>
        )}
        <View style={s.grid}>
          {shown.map((x) => (
            <Pressable key={x.key} style={{ width: w }} onPress={() => cardMenu(x.key)}>
              <CardImage id={cardIdOf(sys.id, x.key)} width={w} reversed={false} />
              <Text style={s.name} numberOfLines={2}>
                {x.name}
              </Text>
            </Pressable>
          ))}
        </View>
        {!sys.cards.length && <Text style={ss.meta}>No cards yet. Import pictures or add cards one by one.</Text>}
      </View>

      <View style={[ss.row, { marginBottom: 30 }]}>
        <Btn label="Delete this system" onPress={remove} />
      </View>
    </Page>
  );
}

const s = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  link: { color: c.gold, fontWeight: '600' },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  name: { color: c.dim, fontSize: 12, marginTop: 4 },
}));
