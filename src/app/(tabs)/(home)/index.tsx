import { loc, t as tr } from '../../../i18n';
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
import { cardName, cardsOf, systemName } from '../../../decks';
import { isCustomSystem } from '../../../systems';
import { isSubject } from '../../../study';
import { StudyDay } from '../../../components/StudyJournal';
import { CardImage, CardPicker } from '../../../components/Cards';
import CardSheet from '../../../components/CardSheet';
import { Cover, fmtDate, Stars } from '../../../components/ui';
import { fmtTime } from '../../../format';
import { c, F, read, themed, write } from '../../../theme';
import { FamiliarArt } from '../../../components/Familiar';
import { getOnboarding, nightNow, allPaths } from '../../../familiar';
import { personal } from '../../../numerology';
import { dailyMessage } from '../../../daily';
import { sky } from '../../../astrology';
import { currentGuide, moonPhase } from '../../../guide';
import MoonIcon from '../../../components/MoonIcon';
import { ShareFrame, useShareCard } from '../../../components/ShareCard';
import { streaks } from '../../../streaks';

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
  const [sysPick, setSysPick] = useState<string | null>(null);
  const lenOn = (getOnboarding().paths ?? []).includes('lenormand');
  const dayOf = (sys: string) => {
    const entry = todaysCotd(sys);
    return { daily: dailyCard(sys), entry, mine: entry?.cards[1]?.card ? entry.cards[1] : undefined };
  };
  const openSys = (sys: string) =>
    router.push({ pathname: '/reading/[id]', params: { id: todaysCotd(sys)?.id ?? 'draft', system: sys } });
  const logSys = (sys: string, card: string, rev: boolean) =>
    setTimeout(() => {
      const entry = todaysCotd(sys);
      if (entry) {
        patchReading(entry.id, (x) => (x.cards[1] = { card, reversed: rev }));
        router.push({ pathname: '/reading/[id]', params: { id: entry.id } });
      } else router.push({ pathname: '/reading/[id]', params: { id: 'draft', card, reversed: rev ? '1' : '0', system: sys } });
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
  const card = useShareCard();
  const streak = streaks().current;
  const shareDay = (label: string, daily: string, mine?: { card?: string; reversed?: boolean }) => {
    const date = new Date().toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' });
    const show = mine?.card ?? daily;
    const name = `${cardName(show)}${mine?.card && mine.reversed ? ' (reversed)' : ''}`;
    card.share(
      <ShareFrame>
        <Text style={s.shareDate}>{date}</Text>
        <Text style={s.tag}>{label} · {mine?.card ? tr("my card of the day") : tr("card of the day")}</Text>
        <CardImage id={show} reversed={!!mine?.card && mine.reversed} width={170} />
        <Text style={s.shareName}>{name}</Text>
        {streak > 1 && <Text style={s.streak}>{streak}{tr("-day streak")}</Text>}
      </ShareFrame>,
      `${date} · ${label} card of the day: ${name}`,
    );
  };
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
  const pages = allPaths().filter(
    (p) =>
      (p.id === 'tarot' && (!myPaths.length || myPaths.includes('tarot'))) ||
      (p.id === 'lenormand' && lenOn) ||
      (p.id === 'numerology' && !!pn) ||
      (p.id === 'astrology' && !!skyLine) ||
      (isCustomSystem(p.id) && myPaths.includes(p.id) && !!dailyCard(p.id)) ||
      (isSubject(p.id) && myPaths.includes(p.id)),
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
            <Text style={s.midDay}>{new Date().toLocaleDateString(loc(), { weekday: 'long' })}</Text>
            <Text style={s.tDate}>{new Date().toLocaleDateString(loc(), { day: 'numeric', month: 'long' })}</Text>
            {streak > 0 && <Text style={s.streak}>{streak}{tr("-day streak")}</Text>}
          </View>
          <View style={s.tMoon}>
            <MoonIcon frac={moon.frac} size={22} />
            <View>
              <Text style={s.moonName}>{moon.name}</Text>
              <Text style={s.midDay}>{moon.lit}{tr("% lit")}</Text>
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
                      label={tr("Tarot")}
                      daily={daily}
                      mine={mine && mineCard?.card ? mineCard : undefined}
                      cw={cw}
                      onAbout={() => setAbout(daily)}
                      onLog={() => setPicking(true)}
                      onOpen={() => (mine ? router.push({ pathname: '/reading/[id]', params: { id: mine.id } }) : openCotd())}
                      onWrite={openCotd}
                      onShare={() => shareDay('Tarot', daily, mine && mineCard?.card ? mineCard : undefined)}
                    />
                  )}
                  {isSubject(pg.id) && <StudyDay id={pg.id} />}
                  {pg.id !== 'tarot' && pg.id !== 'numerology' && pg.id !== 'astrology' && !isSubject(pg.id) && (() => {
                    const d = dayOf(pg.id);
                    return (
                      <DayCard
                        label={pg.name}
                        daily={d.daily}
                        mine={d.mine}
                        cw={cw}
                        onAbout={() => setAbout(d.daily)}
                        onLog={() => setSysPick(pg.id)}
                        onOpen={() => openSys(pg.id)}
                        onWrite={() => openSys(pg.id)}
                        onShare={() => shareDay(pg.name, d.daily, d.mine)}
                      />
                    );
                  })()}
                  {pg.id === 'numerology' && pn && (
                    <Pressable style={s.page} onPress={() => router.push('/numerology')}>
                      <Text style={s.tag}>{tr("Numerology")}</Text>
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
                      <Text style={s.more}>{tr("All numbers ›")}</Text>
                    </Pressable>
                  )}
                  {pg.id === 'astrology' && (
                    <Pressable style={s.page} onPress={() => router.push('/astrology')}>
                      <Text style={s.tag}>{tr("Astrology · today’s sky")}</Text>
                      <Text style={[s.tName, { lineHeight: 22 }]}>{skyLine}</Text>
                      <Text style={s.more}>{tr("Your chart ›")}</Text>
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
        {!!pages[page] && pages[page].id !== 'numerology' && pages[page].id !== 'astrology' && (
          <Pressable onPress={() => setHow(!how)} style={{ alignSelf: 'center', marginTop: 4 }}>
            <Text style={s.how}>{how ? tr("Hide") : tr("How is the calculated card chosen?")}</Text>
          </Pressable>
        )}
        {how && !!pages[page] && pages[page].id !== 'numerology' && pages[page].id !== 'astrology' && (
          <Text style={s.howText}>
            {tr("Today’s date (")}{new Date().toLocaleDateString()}{tr(") is turned into a number with a simple hash, and that number picks one of the")}{' '}{pages[page].id === 'lenormand' ? tr("36 Lenormand") : pages[page].id === 'tarot' ? tr("78 tarot") : `${cardsOf(pages[page].id).length} ${pages[page].name}`}{' '}{tr("cards. The same date always gives the same card, so it stays all day and changes at midnight. It doesn’t use your birth date, readings or anything about you, and it is never reversed.")}
          </Text>
        )}
      </View>
      <CardSheet id={about} onClose={() => setAbout(null)} />
      <CardPicker
        visible={picking}
        title={tr("The card you drew today")}
        onClose={() => setPicking(false)}
        onPick={(id, rev) => logDrawn(id, rev)}
      />
      <CardPicker
        visible={!!sysPick}
        system={sysPick ?? 'lenormand'}
        title={tr("The {0} card you drew today", { 0: sysPick ? systemName(sysPick) : '' })}
        onClose={() => setSysPick(null)}
        onPick={(id, rev) => sysPick && logSys(sysPick, id, rev)}
      />

      {listening.length > 0 && (
        <>
          <Text style={s.h2}>{tr("Continue listening")}</Text>
          {listening.map(({ b, audio, p }) => (
            <Pressable
              key={b.id}
              style={s.listen}
              onPress={() => router.push({ pathname: '/player/[id]', params: { id: b.audio! } })}
              onLongPress={() =>
                Alert.alert(b.title, tr("It comes back here when you play it again."), [
                  { text: tr("Remove from Continue listening"), onPress: () => hide(b.audio!, p) },
                  { text: tr("Stop listening (Did not finish)"), style: 'destructive', onPress: () => (patchBook(b.id, { status: 'dnf' }), hide(b.audio!, p), refresh()) },
                  { text: tr("Cancel"), style: 'cancel' },
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

      <Text style={s.h2}>{tr("Currently reading")}</Text>
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
        <Text style={s.dim}>{tr("Mark a book as “Reading” to see it here.")}</Text>
      )}

      <Text style={s.h2}>{tr("Recently logged")}</Text>
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
                  {l.reread ? tr(" · reread") : ''}
                </Text>
              </View>
              <Stars value={l.rating} size={12} />
            </Pressable>
          );
        })
      ) : (
        <Text style={s.dim}>{tr("Finished books you log will appear here.")}</Text>
      )}
      {card.host}
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
  onShare,
}: {
  label: string;
  daily: string;
  mine?: { card?: string; reversed?: boolean };
  cw: number;
  onAbout: () => void;
  onLog: () => void;
  onOpen: () => void;
  onWrite: () => void;
  onShare: () => void;
}) {
  const short = (id: string) => cardName(id).split(' · ').pop();
  return (
    <View style={s.tCards}>
      <Pressable onPress={onAbout} accessibilityLabel={tr("About {0}", { 0: cardName(daily) })}>
        <CardImage id={daily} width={cw} />
      </Pressable>
      {mine?.card ? (
        <Pressable onPress={onOpen} accessibilityLabel={tr("Your {0} card of the day", { 0: label })}>
          <CardImage id={mine.card} reversed={mine.reversed} width={cw} />
        </Pressable>
      ) : (
        <Pressable style={[s.blank, { width: cw, height: cw * 1.72, borderRadius: cw * 0.06 }]} onPress={onLog} accessibilityLabel={tr("Log the {0} card you drew", { 0: label })}>
          <Ionicons name="add" size={22} color={c.gold} />
        </Pressable>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.tag}>{label}{' '}{tr("· calculated")}</Text>
        <Text style={s.tName} numberOfLines={1}>{short(daily)}</Text>
        <Text style={[s.tag, { marginTop: 6 }]}>{tr("Yours")}</Text>
        <Text style={s.tName} numberOfLines={1}>
          {mine?.card ? `${short(mine.card)}${mine.reversed ? tr(" (rev.)") : ''}` : tr("Not drawn yet")}
        </Text>
        <View style={s.tBtns}>
          {mine?.card ? (
            <Pressable style={[s.logBtn, s.logBtnAlt]} onPress={onOpen}>
              <Ionicons name="book-outline" size={14} color={c.gold} />
              <Text style={[s.logBtnText, { color: c.gold }]}>{tr("Open entry")}</Text>
            </Pressable>
          ) : (
            <Pressable style={[s.logBtn, s.logBtnAlt]} onPress={onLog}>
              <Ionicons name="add" size={14} color={c.gold} />
              <Text style={[s.logBtnText, { color: c.gold }]}>{tr("Log yours")}</Text>
            </Pressable>
          )}
          <Pressable style={s.logBtn} onPress={onWrite}>
            <Ionicons name="create-outline" size={14} color={c.bg} />
            <Text style={s.logBtnText}>{tr("Write")}</Text>
          </Pressable>
          <Pressable style={s.shareBtn} onPress={onShare} hitSlop={8} accessibilityLabel={tr("Share card of the day")}>
            <Ionicons name="share-outline" size={18} color={c.gold} />
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
  tBtns: { flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' },
  shareBtn: { marginTop: 6, paddingHorizontal: 4 },
  streak: { color: c.gold, fontSize: 12, fontWeight: '600', marginTop: 2 },
  shareDate: { color: c.text, fontFamily: F.heading, fontSize: 17 },
  shareName: { color: c.text, fontFamily: F.heading, fontSize: 18, textAlign: 'center' },
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
