import { usePad, usePlayback } from '../../../playback';
import { useCallback, useEffect, useRef, useState } from 'react';
import { captureRef } from 'react-native-view-shot';
import { trySyncWidget } from '../../../widget';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getBook as getAudio, installSampleOnce, loadProgress } from '../../../storage';
import { getProfile, patchBook, syncAudioBooks, Tracker } from '../../../tracker';
import { cardOfTheDay, dailyCard, patchReading, todaysCotd, todaysDraw } from '../../../journal';
import { cardName } from '../../../decks';
import { CardImage, CardPicker } from '../../../components/Cards';
import CardSheet from '../../../components/CardSheet';
import { Cover, fmtDate, Stars } from '../../../components/ui';
import { fmtTime } from '../../../format';
import { c, F, read, themed, write } from '../../../theme';
import { FamiliarArt } from '../../../components/Familiar';
import { getOnboarding, nightNow, PATHS } from '../../../familiar';
import { personal } from '../../../numerology';
import { dailyMessage } from '../../../daily';
import { sky } from '../../../astrology';
import { currentGuide, moonPhase } from '../../../guide';
import MoonIcon from '../../../components/MoonIcon';

export default function Home() {
  const pad = usePad();
  const playing = usePlayback().status.playing;
  const [t, setT] = useState<Tracker>({ books: [], logs: [] });
  const refresh = useCallback(() => setT(syncAudioBooks()), []);
  useFocusEffect(refresh);
  useEffect(() => {
    installSampleOnce().then((added) => added && refresh()).catch(() => {});
  }, [refresh]);

  const [hidden, setHidden] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(read('hidden-listening.json') || '{}');
    } catch {
      return {};
    }
  });
  const [about, setAbout] = useState<string | null>(null);
  const daily = cardOfTheDay();
  const [picking, setPicking] = useState(false);
  const [lPicking, setLPicking] = useState(false);
  const lenOn = (getOnboarding().paths ?? []).includes('lenormand');
  const lDaily = dailyCard('lenormand');
  const lEntry = lenOn ? todaysCotd('lenormand') : undefined;
  const lMine = lEntry?.cards[1]?.card;
  const openL = () => router.push({ pathname: '/reading/[id]', params: { id: lEntry?.id ?? 'draft', system: 'lenormand' } });
  const logL = (card: string) =>
    setTimeout(() => {
      if (lEntry) {
        patchReading(lEntry.id, (x) => (x.cards[1] = { card }));
        router.push({ pathname: '/reading/[id]', params: { id: lEntry.id } });
      } else router.push({ pathname: '/reading/[id]', params: { id: 'draft', card, system: 'lenormand' } });
    }, 450);
  const [, tick] = useState(0);
  useFocusEffect(useCallback(() => tick((n) => n + 1), []));
  const art = useRef<View>(null);
  useFocusEffect(
    useCallback(() => {
      const id = setTimeout(
        () =>
          captureRef(art, { format: 'png', result: 'base64', width: 256, height: 256 })
            .then((png) => trySyncWidget(png))
            .catch(() => trySyncWidget()),
        1200,
      );
      return () => clearTimeout(id);
    }, []),
  );
  const entry = todaysCotd();
  const legacy = todaysDraw();
  const mine = entry?.cards[1]?.card ? entry : legacy;
  const mineCard = entry?.cards[1]?.card ? entry.cards[1] : legacy?.cards[0];
  const openCotd = () => router.push({ pathname: '/reading/[id]', params: { id: entry?.id ?? 'draft' } });
  const logDrawn = (card: string, rev: boolean) =>
    setTimeout(() => {
      if (entry) {
        patchReading(entry.id, (x) => (x.cards[1] = { card, reversed: rev }));
        router.push({ pathname: '/reading/[id]', params: { id: entry.id } });
      } else router.push({ pathname: '/reading/[id]', params: { id: 'draft', card, reversed: rev ? '1' : '0' } });
    }, 450);
  const { width: W } = useWindowDimensions();
  const cw = Math.min(64, (W - 32) / 6);
  const [how, setHow] = useState(false);
  const [pageW, setPageW] = useState(0);
  const [page, setPage] = useState(0);
  const pager = useRef<ScrollView>(null);
  const myPaths = getOnboarding().paths ?? [];
  const mark = (p: { section: number; time: number }) => `${p.section}:${Math.floor(p.time)}`;
  const hide = (folder: string, p: { section: number; time: number }) => {
    const next = { ...hidden, [folder]: mark(p) };
    setHidden(next);
    write('hidden-listening.json', JSON.stringify(next));
  };
  const reading = t.books.filter((b) => b.status === 'reading');
  const listening = t.books
    .filter((b) => b.audio)
    .map((b) => {
      const audio = getAudio(b.audio!);
      const p = loadProgress(b.audio!);
      return { b, audio, p };
    })
    .filter((x) => x.audio && (x.p.time > 0 || x.p.section > 0) && hidden[x.b.audio!] !== mark(x.p));
  const byId = new Map(t.books.map((b) => [b.id, b]));
  const guide = currentGuide();
  const moon = moonPhase();
  const msg = dailyMessage(daily);
  const dob = getProfile().dob;
  const pn = dob && (getOnboarding().paths ?? []).includes('numerology') ? personal(dob) : null;
  const skyLine = (getOnboarding().paths ?? []).includes('astrology') ? sky() : '';
  const pages = PATHS.filter(
    (p) =>
      (p.id === 'tarot' && (!myPaths.length || myPaths.includes('tarot'))) ||
      (p.id === 'lenormand' && lenOn) ||
      (p.id === 'numerology' && !!pn) ||
      (p.id === 'astrology' && !!skyLine),
  );
  const recent = [...t.logs].sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created).slice(0, 6);

  const openTitle = (id: string) => router.push({ pathname: '/title/[id]', params: { id } });

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 + pad }}>
      <Pressable style={s.familiar} onPress={() => router.push({ pathname: '/den/[id]', params: { id: guide.id } })}>
        <View ref={art} collapsable={false}>
          <FamiliarArt familiar={guide} pose={playing ? 'reading' : nightNow() ? 'sleeping' : 'idle'} size={92} vial alive />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.famName}>{msg.title}</Text>
          <Text style={s.greet}>{msg.text}</Text>
        </View>
      </Pressable>
      <View style={s.todayBox}>
        <View style={s.tHead}>
          <View>
            <Text style={s.midDay}>{new Date().toLocaleDateString(undefined, { weekday: 'long' })}</Text>
            <Text style={s.tDate}>{new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</Text>
          </View>
          <View style={s.tMoon}>
            <MoonIcon frac={moon.frac} size={22} />
            <View>
              <Text style={s.moonName}>{moon.name}</Text>
              <Text style={s.midDay}>{moon.lit}% lit</Text>
            </View>
          </View>
        </View>
        <View onLayout={(e) => setPageW(e.nativeEvent.layout.width)}>
          {pageW > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              ref={pager}
              onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / pageW))}
            >
              {pages.map((pg) => (
                <View key={pg.id} style={{ width: pageW }}>
                  {pg.id === 'tarot' && (
                    <DayCard
                      label="Tarot"
                      daily={daily}
                      mine={mine && mineCard?.card ? mineCard : undefined}
                      cw={cw}
                      onAbout={() => setAbout(daily)}
                      onLog={() => setPicking(true)}
                      onOpen={() => (mine ? router.push({ pathname: '/reading/[id]', params: { id: mine.id } }) : openCotd())}
                      onWrite={openCotd}
                    />
                  )}
                  {pg.id === 'lenormand' && (
                    <DayCard
                      label="Lenormand"
                      daily={lDaily}
                      mine={lMine ? { card: lMine } : undefined}
                      cw={cw}
                      onAbout={() => setAbout(lDaily)}
                      onLog={() => setLPicking(true)}
                      onOpen={openL}
                      onWrite={openL}
                    />
                  )}
                  {pg.id === 'numerology' && pn && (
                    <Pressable style={s.page} onPress={() => router.push('/numerology')}>
                      <Text style={s.tag}>Numerology</Text>
                      <View style={s.tiles}>
                        {(
                          [
                            ['Personal day', pn.day],
                            ['Month', pn.month],
                            ['Year', pn.year],
                          ] as const
                        ).map(([label, v]) => (
                          <View key={label} style={s.tile}>
                            <Text style={s.tileValue}>{v}</Text>
                            <Text style={s.tileLabel}>{label}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={s.more}>All numbers ›</Text>
                    </Pressable>
                  )}
                  {pg.id === 'astrology' && (
                    <Pressable style={s.page} onPress={() => router.push('/astrology')}>
                      <Text style={s.tag}>Astrology · today’s sky</Text>
                      <Text style={[s.tName, { lineHeight: 22 }]}>{skyLine}</Text>
                      <Text style={s.more}>Your chart ›</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
        {pages.length > 1 && (
          <View style={s.dots}>
            {pages.map((pg, i) => (
              <Pressable
                key={pg.id}
                hitSlop={6}
                onPress={() => (pager.current?.scrollTo({ x: i * pageW, animated: true }), setPage(i))}
                accessibilityLabel={pg.name}
                style={[s.dotChip, i === page && { borderColor: pg.color, backgroundColor: pg.color + '2e' }]}
              >
                <Text style={[s.dotText, { color: i === page ? pg.color : c.dim }]}>{pg.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {(pages[page]?.id === 'tarot' || pages[page]?.id === 'lenormand') && (
          <Pressable onPress={() => setHow(!how)} style={{ alignSelf: 'center', marginTop: 4 }}>
            <Text style={s.how}>{how ? 'Hide' : 'How is the calculated card chosen?'}</Text>
          </Pressable>
        )}
        {how && (pages[page]?.id === 'tarot' || pages[page]?.id === 'lenormand') && (
          <Text style={s.howText}>
            Today’s date ({new Date().toLocaleDateString()}) is turned into a number with a simple hash, and that number picks one of the {pages[page].id === 'lenormand' ? '36 Lenormand' : '78 tarot'} cards. The same date always gives the same card, so it stays all day and changes at midnight. It doesn’t use your birth date, readings or anything about you, and it is never reversed.
          </Text>
        )}
      </View>
      <CardSheet id={about} onClose={() => setAbout(null)} />
      <CardPicker
        visible={picking}
        title="The card you drew today"
        onClose={() => setPicking(false)}
        onPick={(id, rev) => logDrawn(id, rev)}
      />
      <CardPicker
        visible={lPicking}
        system="lenormand"
        title="The Lenormand card you drew today"
        onClose={() => setLPicking(false)}
        onPick={(id) => logL(id)}
      />

      {listening.length > 0 && (
        <>
          <Text style={s.h2}>Continue listening</Text>
          {listening.map(({ b, audio, p }) => (
            <Pressable
              key={b.id}
              style={s.listen}
              onPress={() => router.push({ pathname: '/player/[id]', params: { id: b.audio! } })}
              onLongPress={() =>
                Alert.alert(b.title, 'It comes back here when you play it again.', [
                  { text: 'Remove from Continue listening', onPress: () => hide(b.audio!, p) },
                  { text: 'Stop listening (Did not finish)', style: 'destructive', onPress: () => (patchBook(b.id, { status: 'dnf' }), hide(b.audio!, p), refresh()) },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
            >
              <Cover book={b} width={56} />
              <View style={{ flex: 1 }}>
                <Text style={s.title} numberOfLines={1}>
                  {b.title}
                </Text>
                <Text style={s.dim} numberOfLines={1}>
                  {audio!.book.sections[p.section]?.title} · {fmtTime(p.time)}
                </Text>
                <View style={s.bar}>
                  <View
                    style={[s.barFill, { width: `${((p.done?.length ?? 0) / audio!.book.sections.length) * 100}%` }]}
                  />
                </View>
              </View>
              <Ionicons name="play-circle" size={34} color={c.gold} />
            </Pressable>
          ))}
        </>
      )}

      <Text style={s.h2}>Currently reading</Text>
      {reading.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {reading.map((b) => (
            <Pressable key={b.id} onPress={() => openTitle(b.id)} style={{ width: 100 }}>
              <Cover book={b} width={100} />
              <Text style={s.small} numberOfLines={2}>
                {b.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text style={s.dim}>Mark a book as “Reading” to see it here.</Text>
      )}

      <Text style={s.h2}>Recently logged</Text>
      {recent.length ? (
        recent.map((l) => {
          const b = byId.get(l.bookId);
          if (!b) return null;
          return (
            <Pressable key={l.id} style={s.log} onPress={() => openTitle(b.id)}>
              <Cover book={b} width={36} />
              <View style={{ flex: 1 }}>
                <Text style={s.title} numberOfLines={1}>
                  {b.title}
                </Text>
                <Text style={s.dim}>
                  {fmtDate(l.date)}
                  {l.reread ? ' · reread' : ''}
                </Text>
              </View>
              <Stars value={l.rating} size={12} />
            </Pressable>
          );
        })
      ) : (
        <Text style={s.dim}>Finished books you log will appear here.</Text>
      )}
    </ScrollView>
  );
}

function DayCard({
  label,
  daily,
  mine,
  cw,
  onAbout,
  onLog,
  onOpen,
  onWrite,
}: {
  label: string;
  daily: string;
  mine?: { card?: string; reversed?: boolean };
  cw: number;
  onAbout: () => void;
  onLog: () => void;
  onOpen: () => void;
  onWrite: () => void;
}) {
  const short = (id: string) => cardName(id).split(' · ').pop();
  return (
    <View style={s.tCards}>
      <Pressable onPress={onAbout} accessibilityLabel={`About ${cardName(daily)}`}>
        <CardImage id={daily} width={cw} />
      </Pressable>
      {mine?.card ? (
        <Pressable onPress={onOpen} accessibilityLabel={`Your ${label} card of the day`}>
          <CardImage id={mine.card} reversed={mine.reversed} width={cw} />
        </Pressable>
      ) : (
        <Pressable style={[s.blank, { width: cw, height: cw * 1.72, borderRadius: cw * 0.06 }]} onPress={onLog} accessibilityLabel={`Log the ${label} card you drew`}>
          <Ionicons name="add" size={22} color={c.gold} />
        </Pressable>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.tag}>{label} · calculated</Text>
        <Text style={s.tName} numberOfLines={1}>{short(daily)}</Text>
        <Text style={[s.tag, { marginTop: 6 }]}>Yours</Text>
        <Text style={s.tName} numberOfLines={1}>
          {mine?.card ? `${short(mine.card)}${mine.reversed ? ' (rev.)' : ''}` : 'Not drawn yet'}
        </Text>
        <View style={s.tBtns}>
          {mine?.card ? (
            <Pressable style={[s.logBtn, s.logBtnAlt]} onPress={onOpen}>
              <Ionicons name="book-outline" size={14} color={c.gold} />
              <Text style={[s.logBtnText, { color: c.gold }]}>Open entry</Text>
            </Pressable>
          ) : (
            <Pressable style={[s.logBtn, s.logBtnAlt]} onPress={onLog}>
              <Ionicons name="add" size={14} color={c.gold} />
              <Text style={[s.logBtnText, { color: c.gold }]}>Log yours</Text>
            </Pressable>
          )}
          <Pressable style={s.logBtn} onPress={onWrite}>
            <Ionicons name="create-outline" size={14} color={c.bg} />
            <Text style={s.logBtnText}>Write</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = themed(() => ({
  familiar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10, marginTop: 12 },
  famName: { color: c.text, fontSize: 18, fontFamily: F.heading },
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  todayBox: { marginTop: 12, backgroundColor: c.panel, borderRadius: 14, padding: 14, gap: 6 },
  tHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  tDate: { color: c.text, fontSize: 22, fontFamily: F.heading },
  tMoon: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tCards: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  tName: { color: c.text, fontSize: 15, fontFamily: F.heading },
  tBtns: { flexDirection: 'row', gap: 8, marginTop: 6 },
  daily: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greet: { color: c.text, fontSize: 14, lineHeight: 20, marginTop: 4 },
  slot: { flex: 1, alignItems: 'center', gap: 5 },
  mid: { alignItems: 'center', gap: 1, paddingHorizontal: 4 },
  midDay: { color: c.dim, fontSize: 11 },
  today: { color: c.text, fontSize: 13 },
  midDate: { color: c.text, fontSize: 28, fontFamily: F.heading },
  moonName: { color: c.text, fontSize: 12, textAlign: 'center' },
  tag: { color: c.gold, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  cardName: { color: c.text, fontSize: 14, fontFamily: F.heading, textAlign: 'center' },
  blank: { borderWidth: 1, borderStyle: 'dashed', borderColor: c.gold, alignItems: 'center', justifyContent: 'center' },
  how: { color: c.dim, fontSize: 12, textDecorationLine: 'underline' },
  howText: { color: c.dim, fontSize: 13, lineHeight: 19, marginTop: 6 },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: c.gold, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginTop: 6 },
  logBtnText: { color: c.bg, fontWeight: '700', fontSize: 13 },
  logBtnAlt: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.gold },
  page: { gap: 8, paddingVertical: 6 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, backgroundColor: c.raised, borderRadius: 10, paddingVertical: 12, alignItems: 'center', gap: 2 },
  tileValue: { color: c.gold, fontSize: 22, fontFamily: F.heading },
  tileLabel: { color: c.dim, fontSize: 11 },
  more: { color: c.gold, fontWeight: '600', fontSize: 13, alignSelf: 'flex-end' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 6 },
  dotChip: { borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10, borderWidth: 1, borderColor: 'transparent' },
  dotText: { fontSize: 12, fontWeight: '600' },
  h2: { color: c.text, fontSize: 19, marginTop: 24, marginBottom: 10, fontFamily: F.heading },
  listen: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.panel, borderRadius: 12, padding: 10, marginBottom: 8 },
  title: { color: c.text, fontSize: 15, fontWeight: '600' },
  small: { color: c.text, fontSize: 12, marginTop: 5 },
  dim: { color: c.dim, marginTop: 2 },
  bar: { height: 3, backgroundColor: c.line, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: c.gold },
  log: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line },
}));
