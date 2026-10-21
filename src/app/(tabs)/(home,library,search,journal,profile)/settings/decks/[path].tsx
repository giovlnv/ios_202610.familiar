import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { createSystem, defaultDeck, deleteDeck, downloadLenormand, importDeckFromFiles, importDeckFromUrl, LENORMAND_DECK, listDecks, setDefaultDeck } from '../../../../../decks';
import { lenormandPrefs, setLenormandPrefs } from '../../../../../lenormand';
import { cardIdOf, listSystems } from '../../../../../systems';
import { getOnboarding, setOnboarding } from '../../../../../familiar';
import { CardImage, CardPicker, useDecks } from '../../../../../components/Cards';
import { Chip } from '../../../../../components/ui';
import { Btn, Page, ss } from '../../../../../components/settings-ui';
import { c } from '../../../../../theme';

export default function PathDecks() {
  const { path } = useLocalSearchParams<{ path: string }>();
  if (path === 'lenormand') return <LenormandDecks />;
  return <Systems />;
}

function Systems() {
  useDecks();
  const list = listSystems();
  const make = (name: string, base?: 'tarot' | 'lenormand') => {
    const sys = createSystem(name, base);
    const paths = getOnboarding().paths ?? [];
    setOnboarding({ paths: [...paths.filter((p) => p !== sys.id), sys.id] });
    router.push({ pathname: '/settings/system/[id]', params: { id: sys.id } });
  };
  const start = () =>
    Alert.prompt('New system', 'Its name is also the name of its path', (n) => {
      const name = n?.trim();
      if (!name) return;
      Alert.alert(name, 'Start from', [
        { text: 'Tarot (78 cards)', onPress: () => make(name, 'tarot') },
        { text: 'Lenormand (36 cards)', onPress: () => make(name, 'lenormand') },
        { text: 'A new deck of my own', onPress: () => make(name) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    });
  return (
    <Page>
      <Stack.Screen options={{ title: 'Make your own' }} />
      <Text style={ss.p}>
        Build your own system. Start from tarot or Lenormand and give the cards new names and art, like a fairy tarot, or make a new deck with your own cards and groups. Each system is its own path: tag books with it and their sections become its meanings.
      </Text>
      <View style={[ss.card, { gap: 2 }]}>
        {list.map((x) => (
          <Pressable key={x.id} style={ss.palette} onPress={() => router.push({ pathname: '/settings/system/[id]', params: { id: x.id } })}>
            <CardImage id={x.cards[0] ? cardIdOf(x.id, x.cards[0].key) : ''} width={26} />
            <View style={{ flex: 1 }}>
              <Text style={ss.paletteName}>{x.name}</Text>
              <Text style={ss.meta}>
                {x.base === 'tarot' ? 'Based on tarot' : x.base === 'lenormand' ? 'Based on Lenormand' : 'Own deck'} · {x.cards.length} cards
              </Text>
            </View>
            <View style={[ss.dot, { backgroundColor: x.color }]} />
            <Ionicons name="chevron-forward" size={16} color={c.dim} />
          </Pressable>
        ))}
        {!list.length && <Text style={ss.meta}>No systems yet.</Text>}
        <View style={[ss.row, { marginTop: 8 }]}>
          <Btn label="New system" primary onPress={start} />
        </View>
      </View>
    </Page>
  );
}

function LenormandDecks() {
  useDecks();
  const decks = listDecks('lenormand');
  const def = defaultDeck('lenormand');
  const [msg, setMsg] = useState('');
  const [browse, setBrowse] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(lenormandPrefs);
  const setPref = (p: Parameters<typeof setLenormandPrefs>[0]) => (setLenormandPrefs(p), setPrefs(lenormandPrefs()));
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      Alert.alert('Deck', String((e as Error).message ?? e));
    } finally {
      setMsg((m) => (m.startsWith('Downloading') ? '' : m));
    }
  };
  const report = (r: { matched: number; skipped: string[] } | null) =>
    r && setMsg(`${r.matched} of 36 cards found${r.skipped.length ? ` · ${r.skipped.length} files not recognised` : ''}`);
  const askName = (then: (name: string) => void) => Alert.prompt('Deck name', undefined, (n) => n?.trim() && then(n.trim()), 'plain-text', '');

  return (
    <Page>
      <Stack.Screen options={{ title: 'Lenormand' }} />
      <Text style={ss.h2}>Decks</Text>
      <Text style={ss.p}>The default deck is used for every Lenormand card in the app. Lenormand cards are never reversed.</Text>
      <View style={[ss.card, { gap: 2 }]}>
        {decks.map((d) => (
          <Pressable
            key={d.id}
            style={ss.palette}
            onPress={() => setDefaultDeck(d.id)}
            onLongPress={() =>
              Alert.alert(d.name, `${d.cards.length} cards · ${d.source ?? ''}`, [
                { text: 'View cards', onPress: () => setBrowse(d.id) },
                ...(d.id === def
                  ? []
                  : [{ text: 'Make default', onPress: () => setDefaultDeck(d.id) }, { text: 'Delete deck', style: 'destructive' as const, onPress: () => deleteDeck(d.id) }]),
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          >
            <CardImage id="l16" width={26} deck={d.id} />
            <View style={{ flex: 1 }}>
              <Text style={[ss.paletteName, d.id === def && { color: c.gold, fontWeight: '700' }]}>{d.name}</Text>
              <Text style={ss.meta}>{d.cards.length} cards · hold for options</Text>
            </View>
            {d.id === def && <Ionicons name="checkmark" size={18} color={c.gold} />}
          </Pressable>
        ))}
        {!decks.length && <Text style={ss.meta}>No Lenormand deck yet. Cards show their names until you add one.</Text>}
        {!!msg && <Text style={ss.meta}>{msg}</Text>}
        <View style={[ss.row, { marginTop: 8 }]}>
          {!decks.some((d) => d.id === LENORMAND_DECK && d.cards.length === 36) && (
            <Btn label="Get Dondorf (1910)" primary onPress={() => run(() => downloadLenormand((n, t) => setMsg(`Downloading ${n}/${t}`)))} />
          )}
          <Btn label="Import from Files" onPress={() => askName((n) => run(async () => report(await importDeckFromFiles(n, 'lenormand'))))} />
          <Btn
            label="Download from link"
            onPress={() =>
              askName((n) =>
                Alert.prompt('Zip link', 'A direct link to a .zip of card images', (url) =>
                  url?.trim() && run(async () => (setMsg('Downloading…'), report(await importDeckFromUrl(n, url.trim(), 'lenormand')))),
                ),
              )
            }
          />
          {!!decks.length && <Btn label="View cards" onPress={() => setBrowse(def)} />}
        </View>
        <Text style={[ss.meta, { marginTop: 6 }]}>
          Dondorf Wahrsage-Karten, 1910. Scans by the Etteilla Foundation (etteilla.org), CC BY-NC 4.0. Custom decks: files are matched by number or name, like “01.jpg”, “rider.png” or “o-cavaleiro.jpg”.
        </Text>
      </View>

      <Text style={ss.h2}>Card names</Text>
      <View style={ss.card}>
        <View style={ss.row}>
          <Chip label="Português" on={prefs.names === 'pt'} onPress={() => setPref({ names: 'pt' })} />
          <Chip label="English" on={prefs.names === 'en'} onPress={() => setPref({ names: 'en' })} />
        </View>
        <Text style={ss.meta}>Brazilian names (O Cavaleiro, A Cigana) or English (Rider, Lady). Search finds both.</Text>
      </View>

      <Text style={ss.h2}>Significator</Text>
      <View style={ss.card}>
        <View style={ss.row}>
          <Chip label="29 · A Cigana" on={prefs.significator === 'l29'} onPress={() => setPref({ significator: 'l29' })} />
          <Chip label="28 · O Cigano" on={prefs.significator === 'l28'} onPress={() => setPref({ significator: 'l28' })} />
        </View>
        <Text style={ss.meta}>The card that stands for you in a Grand Tableau. Each reading can switch it.</Text>
      </View>
      <CardPicker visible={!!browse} system="lenormand" deck={browse ?? undefined} title="Cards" onClose={() => setBrowse(null)} />
    </Page>
  );
}
