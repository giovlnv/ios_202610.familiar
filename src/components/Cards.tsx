import { useEffect, useMemo, useReducer, useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cardName, cardsOf, cardUri, onDecksChange, reversible, System } from '../decks';
import { onSystemsChange } from '../systems';
import { lother } from '../lenormand';
import { Chip } from './ui';
import { c, F, themed } from '../theme';

export function useDecks() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const a = onDecksChange(bump);
    const b = onSystemsChange(bump);
    return () => (a(), b());
  }, []);
}

export function CardImage({ id, reversed, width, deck }: { id: string; reversed?: boolean; width: number; deck?: string }) {
  useDecks();
  const uri = cardUri(id, deck);
  const box = { width, height: width * 1.72, borderRadius: width * 0.06 };
  const turn = reversed ? { transform: [{ rotate: '180deg' }] } : null;
  if (uri) return <Image source={{ uri }} style={[box, turn, { borderWidth: reversed ? 2 : 0, borderColor: c.claude }]} resizeMode="cover" />;
  return (
    <View style={[box, s.blank, turn, reversed && { borderColor: c.claude }]}>
      <Text style={[s.blankText, { fontSize: Math.max(9, width / 9) }]} numberOfLines={4}>
        {cardName(id)}
      </Text>
    </View>
  );
}

export function CardPicker({
  visible,
  onClose,
  onPick,
  deck,
  title = 'Choose a card',
  system = 'tarot',
  taken,
  stayOpen,
}: {
  visible: boolean;
  onClose: () => void;
  onPick?: (id: string, reversed: boolean) => void;
  deck?: string;
  title?: string;
  system?: System;
  taken?: string[];
  stayOpen?: boolean;
}) {
  useDecks();
  const all = cardsOf(system);
  const groups = [...new Set(all.map((x) => x.group))];
  const [picked, setGroup] = useState('');
  const group = groups.includes(picked) ? picked : groups[0];
  const [q, setQ] = useState('');
  const [reversed, setReversed] = useState(false);
  const canFlip = reversible(system);
  const list = useMemo(() => {
    const plain = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const query = plain(q.trim());
    if (query) return all.filter((x) => plain(`${x.name} ${system === 'lenormand' ? lother(x.id) : ''}`).includes(query));
    return groups.length > 1 ? all.filter((x) => x.group === group) : all;
  }, [q, group, system, all, groups.length]);
  const w = 100;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.wrap} edges={['bottom']}>
        <View style={s.top}>
          <Text style={s.h2}>{title}</Text>
          <Pressable hitSlop={10} onPress={onClose}>
            <Text style={s.link}>Done</Text>
          </Pressable>
        </View>
        <TextInput style={s.input} placeholder="Search cards" placeholderTextColor={c.dim} value={q} onChangeText={setQ} autoCorrect={false} />
        {groups.length > 1 && !q.trim() && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
              {groups.map((g) => (
                <Chip key={g} label={g} on={g === group} onPress={() => setGroup(g)} />
              ))}
            </ScrollView>
          </View>
        )}
        {onPick && canFlip && (
          <View style={s.switchRow}>
            <Text style={s.text}>Reversed</Text>
            <Switch value={reversed} onValueChange={setReversed} trackColor={{ true: c.claude }} />
          </View>
        )}
        <FlatList
          data={list}
          key="grid"
          numColumns={3}
          keyExtractor={(x) => x.id}
          columnWrapperStyle={{ gap: 10, justifyContent: 'flex-start' }}
          contentContainerStyle={{ gap: 14, paddingBottom: 30 }}
          renderItem={({ item }) => (
            <Pressable
              style={{ width: w, opacity: taken?.includes(item.id) ? 0.3 : 1 }}
              disabled={!onPick || taken?.includes(item.id)}
              onPress={() => (onPick?.(item.id, canFlip && reversed), !stayOpen && onClose())}
            >
              <CardImage id={item.id} width={w} deck={deck} reversed={!!onPick && canFlip && reversed} />
              <Text style={s.name} numberOfLines={2}>
                {item.name}
              </Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  h2: { color: c.text, fontSize: 20, fontFamily: F.heading },
  link: { color: c.gold, fontSize: 16, fontWeight: '600' },
  input: { backgroundColor: c.panel, color: c.text, borderRadius: 12, padding: 12, fontSize: 15 },
  chips: { gap: 8, paddingVertical: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, marginBottom: 6 },
  text: { color: c.text, fontSize: 15 },
  name: { color: c.dim, fontSize: 12, marginTop: 4 },
  blank: { backgroundColor: c.raised, borderWidth: 1, borderColor: c.gold, alignItems: 'center', justifyContent: 'center', padding: 4 },
  blankText: { color: c.gold, textAlign: 'center' },
}));
