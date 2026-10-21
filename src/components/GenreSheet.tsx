import { t as tr } from '../i18n';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fetchGenres, setGenres } from '../genres';
import { TBook } from '../tracker';
import { Button } from './ui';
import { c, F, themed } from '../theme';

export function GenreSheet({ book, visible, onClose }: { book: TBook; visible: boolean; onClose: () => void }) {
  const [mine, setMine] = useState<string[]>(book.genres ?? []);
  const [found, setFound] = useState<string[]>([]);
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const find = async () => {
    setBusy(true);
    const r = await fetchGenres(book);
    setFound(r.top);
    if (!mine.length) setMine(r.top);
    setInfo(`Goodreads ${r.sources.goodreads} · Amazon ${r.sources.amazon} · Open Library ${r.sources.openLibrary}`);
    setBusy(false);
  };
  const toggle = (g: string) => setMine((m) => (m.includes(g) ? m.filter((x) => x !== g) : [...m, g]));
  const suggestions = found.filter((g) => !mine.includes(g));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => {
        setMine(book.genres ?? []);
        setFound([]);
        setInfo('');
        if (!book.genres?.length) find();
      }}
    >
      <Pressable style={s.dimBg} onPress={onClose} />
      <View style={s.sheet}>
        <Text style={s.h2}>{tr("Genres")}</Text>
        <Text style={s.dim}>{tr("Tap to remove. Top 5 are picked from Goodreads, Amazon and Open Library; your edits are kept.")}</Text>
        <View style={s.wrap}>
          {mine.map((g) => (
            <Pressable key={g} style={[s.chip, s.on]} onPress={() => toggle(g)}>
              <Text style={s.onText}>{g}</Text>
              <Ionicons name="close" size={13} color={c.bg} />
            </Pressable>
          ))}
          <Pressable
            style={s.chip}
            onPress={() => Alert.prompt(tr("Add a genre"), undefined, (g) => g?.trim() && setMine((m) => [...m, g.trim()]))}
          >
            <Ionicons name="add" size={14} color={c.gold} />
            <Text style={s.chipText}>{tr("Add")}</Text>
          </Pressable>
        </View>
        {busy && <ActivityIndicator color={c.gold} />}
        {!!suggestions.length && (
          <>
            <Text style={s.label}>{tr("Suggestions")}</Text>
            <View style={s.wrap}>
              {suggestions.map((g) => (
                <Pressable key={g} style={s.chip} onPress={() => toggle(g)}>
                  <Ionicons name="add" size={13} color={c.dim} />
                  <Text style={s.chipText}>{g}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {!!info && <Text style={s.dim}>{tr("Found:")}{' '}{info}</Text>}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label={tr("Fetch again")} onPress={busy ? () => {} : find} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={tr("Save")}
              primary
              onPress={() => {
                setGenres(book.id, mine, true);
                onClose();
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = themed(() => ({
  dimBg: { flex: 1, backgroundColor: '#000a' },
  sheet: { backgroundColor: c.panel, padding: 16, paddingBottom: 36, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 12 },
  h2: { color: c.text, fontSize: 19, fontFamily: F.heading },
  dim: { color: c.dim, fontSize: 13 },
  label: { color: c.dim, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.raised },
  chipText: { color: c.text, fontSize: 13 },
  on: { backgroundColor: c.gold },
  onText: { color: c.bg, fontSize: 13, fontWeight: '700' },
}));
