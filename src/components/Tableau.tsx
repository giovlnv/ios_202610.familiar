import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CardImage } from './Cards';
import { Chip } from './ui';
import { cardName } from '../decks';
import { cellOf, GRID, Helper, HELPERS, lcard, related } from '../lenormand';
import { Placed } from '../journal';
import { c, themed } from '../theme';

const W = 50;
const GAP = 4;

export default function Tableau({
  layout,
  cards,
  significator,
  onTap,
  onHold,
}: {
  layout: 'gt49' | 'gt84';
  cards: Placed[];
  significator?: string;
  onTap: (i: number) => void;
  onHold: (i: number) => void;
}) {
  const sigAt = cards.findIndex((p) => p?.card && p.card === significator);
  const [focus, setFocus] = useState<number | null>(null);
  const [helper, setHelper] = useState<Helper>('near');
  const at = focus ?? (sigAt >= 0 ? sigAt : null);
  const lit = at !== null ? related(layout, at, helper) : [];
  const { cols, rows } = GRID[layout];
  const total = cols * rows + (layout === 'gt84' ? 4 : 0);
  const h = W * 1.72;
  const cur = at !== null ? cards[at]?.card : undefined;

  return (
    <View style={{ marginTop: 14, gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: cols * (W + GAP), height: (rows + (layout === 'gt84' ? 1 : 0)) * (h + GAP + 14) }}>
          {Array.from({ length: total }, (_, i) => {
            const { row, col } = cellOf(layout, i);
            const p = cards[i];
            const on = i === at;
            const near = lit.includes(i);
            return (
              <Pressable
                key={i}
                style={{ position: 'absolute', left: col * (W + GAP), top: row * (h + GAP + 14) + (row >= rows ? 8 : 0), width: W, alignItems: 'center' }}
                onPress={() => (p?.card ? setFocus(i) : onTap(i))}
                onLongPress={() => onHold(i)}
                accessibilityLabel={`Position ${i + 1}${p?.card ? `, ${cardName(p.card)}` : ', empty'}`}
              >
                <View style={[s.frame, on && s.focus, near && s.near]}>
                  {p?.card ? (
                    <CardImage id={p.card} width={W - 4} />
                  ) : (
                    <View style={[s.empty, { width: W - 4, height: (W - 4) * 1.72 }]}>
                      <Text style={s.emptyNum}>{i + 1}</Text>
                    </View>
                  )}
                </View>
                <Text style={[s.num, on && { color: c.gold }]}>
                  {i + 1}
                  {p?.card === significator ? ' ✦' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {cur && at !== null ? (
        <View style={s.info}>
          <Text style={s.infoHead}>
            Position {at + 1} · House of {lcard(`l${String(at + 1).padStart(2, '0')}`).en} ({lcard(`l${String(at + 1).padStart(2, '0')}`).pt})
          </Text>
          <Text style={s.infoText}>
            {cardName(cur)}
            {lit.length ? ` · ${HELPERS.find((x) => x.id === helper)!.name.toLowerCase()}: ${lit.filter((x) => cards[x]?.card).map((x) => cardName(cards[x].card!).split(' · ').pop()).join(', ') || 'none placed'}` : ''}
          </Text>
          <Pressable style={s.more} onPress={() => onHold(at)}>
            <Text style={s.moreText}>Card options</Text>
            <Ionicons name="chevron-forward" size={14} color={c.gold} />
          </Pressable>
        </View>
      ) : (
        <Text style={s.hint}>Tap an empty place to add a card. Tap a card to see how it links to the others; hold it for options.</Text>
      )}

      <View style={s.chips}>
        {HELPERS.map((x) => (
          <Chip key={x.id} label={x.name} on={helper === x.id} onPress={() => setHelper(x.id)} />
        ))}
      </View>
      <Text style={s.hint}>{HELPERS.find((x) => x.id === helper)!.name}: {HELPERS.find((x) => x.id === helper)!.hint}.</Text>
    </View>
  );
}

const s = themed(() => ({
  frame: { borderRadius: 5, borderWidth: 2, borderColor: 'transparent', padding: 0 },
  focus: { borderColor: c.gold },
  near: { borderColor: c.claude },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  emptyNum: { color: c.dim, fontSize: 11 },
  num: { color: c.dim, fontSize: 10, marginTop: 1 },
  info: { backgroundColor: c.panel, borderRadius: 12, padding: 12, gap: 4 },
  infoHead: { color: c.gold, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  infoText: { color: c.text, fontSize: 14, lineHeight: 20 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-end' },
  moreText: { color: c.gold, fontWeight: '600', fontSize: 13 },
  hint: { color: c.dim, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
}));
