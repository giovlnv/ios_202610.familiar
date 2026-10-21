import { t as tr } from '../../../../i18n';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { defaultDeck, deleteDeck, downloadRws, importDeckFromFiles, importDeckFromUrl, listDecks, setDefaultDeck } from '../../../../decks';
import { CardImage, CardPicker, useDecks } from '../../../../components/Cards';
import { c } from '../../../../theme';
import { Btn, Page, ss } from '../../../../components/settings-ui';

export default function Configuration() {
  useDecks();
  const decks = listDecks();
  const [deckMsg, setDeckMsg] = useState('');
  const [browse, setBrowse] = useState<string | null>(null);
  const deckRun = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      Alert.alert(tr("Deck"), String((e as Error).message ?? e));
    } finally {
      setDeckMsg((m) => (m.startsWith('Downloading') ? '' : m));
    }
  };
  const report = (r: { matched: number; skipped: string[] } | null) =>
    r && setDeckMsg(`${r.matched} of 78 cards found${r.skipped.length ? ` · ${r.skipped.length} files not recognised` : ''}`);
  const askName = (then: (name: string) => void) => Alert.prompt(tr("Deck name"), undefined, (n) => n?.trim() && then(n.trim()), 'plain-text', '');

  return (
    <Page>
      <Text style={ss.p}>{tr("The default deck is used for every card in the app. Changing it updates all your readings. The default deck is always kept: to remove it, choose another default first.")}</Text>
      <View style={[ss.card, { gap: 2 }]}>
        {decks.map((d) => (
          <Pressable
            key={d.id}
            style={ss.palette}
            onPress={() => setDefaultDeck(d.id)}
            onLongPress={() =>
              Alert.alert(d.name, tr("{0} cards · {1}", { 0: d.cards.length, 1: d.source ?? '' }), [
                { text: tr("View cards"), onPress: () => setBrowse(d.id) },
                ...(d.id === defaultDeck()
                  ? []
                  : [{ text: tr("Make default"), onPress: () => setDefaultDeck(d.id) }, { text: tr("Delete deck"), style: 'destructive' as const, onPress: () => deleteDeck(d.id) }]),
                { text: tr("Cancel"), style: 'cancel' },
              ])
            }
          >
            <CardImage id="m17" width={26} deck={d.id} />
            <View style={{ flex: 1 }}>
              <Text style={[ss.paletteName, d.id === defaultDeck() && { color: c.gold, fontWeight: '700' }]}>{d.name}</Text>
              <Text style={ss.meta}>{d.cards.length}{' '}{tr("cards · hold for options")}</Text>
            </View>
            {d.id === defaultDeck() && <Ionicons name="checkmark" size={18} color={c.gold} />}
          </Pressable>
        ))}
        {!!deckMsg && <Text style={ss.meta}>{deckMsg}</Text>}
        <View style={[ss.row, { marginTop: 8 }]}>
          {!decks.some((d) => d.id === 'rws' && d.cards.length === 78) && (
            <Btn label={tr("Get Rider-Waite-Smith")} primary onPress={() => deckRun(() => downloadRws((n, t) => setDeckMsg(`Downloading ${n}/${t}`)))} />
          )}
          <Btn label={tr("Import from Files")} onPress={() => askName((n) => deckRun(async () => report(await importDeckFromFiles(n))))} />
          <Btn
            label={tr("Download from link")}
            onPress={() =>
              askName((n) =>
                Alert.prompt(tr("Zip link"), tr("A direct link to a .zip of card images"), (url) =>
                  url?.trim() && deckRun(async () => (setDeckMsg('Downloading…'), report(await importDeckFromUrl(n, url.trim())))),
                ),
              )
            }
          />
          {!!decks.length && <Btn label={tr("View cards")} onPress={() => setBrowse(defaultDeck())} />}
        </View>
        <Text style={[ss.meta, { marginTop: 6 }]}>
          {tr("Custom decks: pick the card images (or one .zip). Files are matched by name, like “the-fool.jpg”, “cups01.png” or “queen of swords.jpg”.")}
        </Text>
      </View>
      <CardPicker visible={!!browse} deck={browse ?? undefined} title={tr("Cards")} onClose={() => setBrowse(null)} />
    </Page>
  );
}
