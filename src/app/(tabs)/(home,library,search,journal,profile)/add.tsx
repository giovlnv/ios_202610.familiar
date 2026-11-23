/** Add book: the GitHub pipeline is gone; tarot books now come from calliope on ares, so this screen says how a book gets there. */
import { t as tr } from '../../../i18n';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../../components/ui';
import { usePad } from '../../../playback';
import { c, themed } from '../../../theme';

export default function AddBook() {
  const pad = usePad();
  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ gap: 14, paddingBottom: pad + 24 }}>
      <View style={s.box}>
        <Ionicons name="library-outline" size={28} color={c.gold} />
        <Text accessibilityRole="header" style={s.title}>{tr("Books now come from calliope")}</Text>
        <Text style={s.p}>
          {tr("Adding a book from here is paused. Put the EPUB in calibre on ares with the type nonfiction.tarot: Kokoro voices it at night, and it shows up in your library by itself.")}
        </Text>
        <Text style={s.p}>{tr("To listen to a file of your own right now, import it instead: it is voiced on this iPhone.")}</Text>
      </View>
      <Button label={tr("Import a book or audiobook")} icon="headset" primary onPress={() => router.replace('/import')} />
    </ScrollView>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, padding: 16 },
  box: { alignItems: 'center', gap: 10, padding: 20, borderRadius: 14, backgroundColor: c.panel },
  title: { color: c.text, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  p: { color: c.dim, fontSize: 14, lineHeight: 20, textAlign: 'center' },
}));
