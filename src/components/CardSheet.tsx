import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CardImage } from './Cards';
import { baseCards, cardName, systemName, systemOf } from '../decks';
import { customCard } from '../systems';
import { lcard, lname, lother } from '../lenormand';
import { bookPaths, cardSections, pairsFor } from '../journal';
import { allSources, loadSources, saveSources, Sources, usesBook } from '../sectionCards';
import { getOnboarding, allPaths } from '../familiar';
import { getBook } from '../storage';
import { explanationsOn } from '../explanations';
import { c, themed } from '../theme';
import { cardNumber } from '../numerology';
import { cardAstro } from '../astrology';

const excerpt = (paras: { kind: string; text: string }[], kind: string, max: number) =>
  paras.filter((p) => p.kind === kind).slice(0, max).map((p) => p.text);

export default function CardSheet({
  id,
  role,
  here,
  near,
  onClose,
}: {
  id: string | null;
  role?: string;
  here?: string;
  near?: string[];
  onClose: () => void;
}) {
  const [sources, setSources] = useState<Sources>(loadSources);
  const [menu, setMenu] = useState(false);
  const [openBooks, setOpenBooks] = useState<string[]>([]);
  const [shownId, setShownId] = useState(id);
  const myPaths = getOnboarding().paths ?? [];
  const len = !!id && systemOf(id) === 'lenormand';
  const num = id && !len && myPaths.includes('numerology') ? cardNumber(id) : undefined;
  const astro = id && !len && myPaths.includes('astrology') ? cardAstro(id) : undefined;
  const lc = len ? lcard(id!) : undefined;
  const cc = id ? customCard(id) : undefined;
  const sysName = id ? systemName(systemOf(id)) : '';
  const based = cc?.card.base && cc.sys.base ? baseCards(cc.sys.base).find((x) => x.id === cc.card.base)?.name : undefined;
  if (shownId !== id) {
    setShownId(id);
    if (id) setSources(loadSources());
    setMenu(false);
    setOpenBooks([]);
  }

  const found = useMemo(() => (id ? cardSections(id, null).map((f) => ({ ...f, paths: bookPaths(f.folder) })) : []), [id]);
  const shown = found.filter((f) => usesBook(sources, f.folder, f.paths));
  const pairs = useMemo(() => (id && len ? pairsFor(id, sources) : []), [id, len, sources]);
  const nearPairs = near?.length ? pairs.filter((p) => near.includes(p.other)) : [];
  const otherPairs = pairs.filter((p) => !nearPairs.includes(p));
  const paths = allPaths().filter((p) => found.some((f) => f.paths.includes(p.id)));

  const update = (next: Sources) => (setSources(next), saveSources(next));
  const flip = (list: string[], x: string) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  const label = allSources(sources)
    ? 'All books'
    : [
        ...sources.paths.map((p) => allPaths().find((x) => x.id === p)?.name ?? p),
        ...sources.books.map((b) => found.find((f) => f.folder === b)?.book ?? getBook(b)?.book.title ?? b),
      ].join(', ');

  return (
    <Modal visible={!!id} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.wrap} edges={['bottom']}>
        <View style={s.top}>
          <View />
          <Pressable hitSlop={10} onPress={onClose}>
            <Text style={s.link}>Done</Text>
          </Pressable>
        </View>
        {id && (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={s.head}>
              <CardImage id={id} width={120} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={s.name}>{cardName(id)}</Text>
                {cc && <Text style={s.role}>{[sysName, cc.card.group].join(' · ')}</Text>}
                {based && based !== cc?.card.name && <Text style={s.role}>Based on {based}</Text>}
                {lc && <Text style={s.role}>{lother(id)}</Text>}
                {lc && <Text style={s.role}>Playing card {lc.inset} · {lc.keywords}</Text>}
                {lc && <Text style={s.role}>Its house is position {lc.n} in a Grand Tableau.</Text>}
                {!!role && <Text style={s.role}>{role}</Text>}
                {num && <Text style={s.role}>Numerology: {num}</Text>}
                {astro && <Text style={s.role}>Astrology: {astro}</Text>}
              </View>
            </View>

            {!found.length ? (
              <Text style={s.dim}>
                {cc
                  ? `None of your audiobooks has a section for this card yet. Tag a book with the ${sysName} path and its sections about this card show up here.`
                  : `None of your audiobooks has a section for this card yet. Add a ${len ? 'Lenormand' : 'tarot'} book${len ? ' (tag it with the Lenormand path)' : ''} and it will show up here.`}
              </Text>
            ) : (
              <>
                <Pressable style={s.drop} onPress={() => setMenu(!menu)} accessibilityState={{ expanded: menu }}>
                  <Text style={s.dropLabel}>From</Text>
                  <Text style={s.dropValue} numberOfLines={1}>
                    {label}
                  </Text>
                  <Ionicons name={menu ? 'chevron-up' : 'chevron-down'} size={16} color={c.dim} />
                </Pressable>
                {menu && (
                  <View style={s.menu}>
                    <Option label="All books" on={allSources(sources)} onPress={() => update({ paths: [], books: [] })} />
                    {!!paths.length && <Text style={s.menuHead}>Paths</Text>}
                    {paths.map((p) => (
                      <Option
                        key={p.id}
                        label={p.name}
                        dot={p.color}
                        on={sources.paths.includes(p.id)}
                        onPress={() => update({ ...sources, paths: flip(sources.paths, p.id) })}
                      />
                    ))}
                    <Text style={s.menuHead}>Books</Text>
                    {found.map((f) => (
                      <Option
                        key={f.folder}
                        label={f.book}
                        on={sources.books.includes(f.folder)}
                        onPress={() => update({ ...sources, books: flip(sources.books, f.folder) })}
                      />
                    ))}
                  </View>
                )}
                <Text style={s.count}>
                  {shown.length} of {found.length} {found.length === 1 ? 'book' : 'books'}
                </Text>
              </>
            )}

            {!!pairs.length && (
              <View style={s.card}>
                <Text style={s.book}>Combinations</Text>
                {[...nearPairs, ...otherPairs].map((p) => (
                  <Pressable
                    key={`${p.folder}${p.index}`}
                    style={s.pair}
                    onPress={() => (onClose(), router.push({ pathname: '/player/[id]', params: { id: p.folder, section: String(p.index) } }))}
                  >
                    <CardImage id={p.other} width={26} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.text, nearPairs.includes(p) && { color: c.gold, fontWeight: '700' }]} numberOfLines={1}>
                        {lname(p.other)}
                        {nearPairs.includes(p) ? ' · in this reading' : ''}
                      </Text>
                      <Text style={s.dim} numberOfLines={1}>
                        {p.book} · {p.title}
                      </Text>
                    </View>
                    <Ionicons name="headset-outline" size={16} color={c.dim} />
                  </Pressable>
                ))}
              </View>
            )}
            {shown.map((f) => {
              const sec = getBook(f.folder)?.book.sections[f.index];
              if (!sec) return null;
              const open = openBooks.includes(f.folder);
              const book = excerpt(sec.paras, 'book', 3);
              const explain = explanationsOn(f.folder) ? (sec.explain?.slice(0, 2) ?? excerpt(sec.paras, 'explain', 2)) : [];
              return (
                <View key={f.folder} style={s.card}>
                  <Pressable style={s.cardHead} onPress={() => setOpenBooks(flip(openBooks, f.folder))} accessibilityState={{ expanded: open }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.book} numberOfLines={1}>
                        {f.book}
                      </Text>
                      <Text style={s.section} numberOfLines={open ? undefined : 1}>
                        {sec.title}
                      </Text>
                    </View>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.dim} />
                  </Pressable>
                  {open && (
                    <View style={{ gap: 6 }}>
                      {!!sec.summary && <Text style={s.summary}>{sec.summary}</Text>}
                      {!!book.length && <Text style={s.label}>From the book</Text>}
                      {book.map((t, i) => (
                        <Text key={i} style={s.text}>
                          {t}
                        </Text>
                      ))}
                      {!!explain.length && <Text style={s.label}>Interpretation</Text>}
                      {explain.map((t, i) => (
                        <Text key={i} style={[s.text, { color: c.explain }]}>
                          {t}
                        </Text>
                      ))}
                      {f.folder !== here && (
                        <Pressable
                          style={s.listen}
                          onPress={() => {
                            onClose();
                            router.push({ pathname: '/player/[id]', params: { id: f.folder, section: String(f.index) } });
                          }}
                        >
                          <Ionicons name="headset" size={16} color={c.bg} />
                          <Text style={s.listenText}>Listen to this section</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Option({ label, on, dot, onPress }: { label: string; on: boolean; dot?: string; onPress: () => void }) {
  return (
    <Pressable style={s.option} onPress={onPress} accessibilityState={{ checked: on }}>
      {dot && <View style={[s.dot, { backgroundColor: dot }]} />}
      <Text style={[s.optionText, on && { color: c.gold, fontWeight: '700' }]} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={on ? c.gold : c.dim} />
    </Pressable>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  link: { color: c.gold, fontSize: 16, fontWeight: '600' },
  head: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  name: { color: c.text, fontSize: 22, fontWeight: '700' },
  role: { color: c.dim, lineHeight: 20 },
  dim: { color: c.dim, lineHeight: 20 },
  drop: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.panel, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  dropLabel: { color: c.dim, fontSize: 14 },
  dropValue: { flex: 1, color: c.text, fontSize: 15, fontWeight: '600' },
  menu: { backgroundColor: c.raised, borderRadius: 12, paddingVertical: 4, marginTop: 6, borderWidth: 1, borderColor: c.line },
  menuHead: { color: c.dim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  optionText: { flex: 1, color: c.text, fontSize: 15 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  count: { color: c.dim, fontSize: 13, marginTop: 10, marginBottom: 8 },
  card: { backgroundColor: c.panel, borderRadius: 12, padding: 14, marginBottom: 10, gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  book: { color: c.gold, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  section: { color: c.text, fontSize: 17, fontWeight: '700' },
  summary: { color: c.text, fontStyle: 'italic', lineHeight: 20 },
  label: { color: c.dim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  text: { color: c.text, fontSize: 15, lineHeight: 22 },
  listen: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: c.gold, borderRadius: 10, padding: 11, marginTop: 10 },
  listenText: { color: c.bg, fontWeight: '700' },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
}));
