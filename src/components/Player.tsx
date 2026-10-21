import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  exportConsultsFile,
  exportNotesFile,
  loadConsults,
  LibraryItem,
  loadNotes,
  saveConsults,
  saveNotes,
} from "../storage";
import { Consult, Note, Para } from "../types";
import {
  AskDraft,
  AskSheet,
  buildPrompt,
  ConsultList,
  shareToClaude,
} from "./Consults";
import { c, F, read, themed, write } from "../theme";
import { CardImage, CardPicker } from "./Cards";
import CardSheet from "./CardSheet";
import { cardName } from "../decks";
import TextStyleSheet from "./TextStyleSheet";
import ExplainSheet, { ExplainTarget } from "./ExplainSheet";
import { toast } from "./Toast";
import { loadExplained, markExplainedNoted, saveExplained } from "../explain";
import {
  allExplanationsOn,
  bookOverride,
  explainStart,
  explanationsOn,
  isExplain,
  setAllExplanations,
  setBookExplanations,
  useExplanations,
} from "../explanations";
import { bodyText, lineHeight, TextStyle, useTextStyle } from "../textStyle";
import { Link, loadLinks, sectionCard, setLink } from "../sectionCards";
import { bookSystem } from "../journal";
import { SleepKind, usePlayback } from "../playback";
import { FamiliarArt } from "./Familiar";
import { familiarFor } from "../familiar";
import { load as loadTracker } from "../tracker";
import { isRtl } from "../languages";

const fmt = (t: number) => {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(Math.floor(t % 60)).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};
const RATES = [1, 1.3, 1.5, 2];
const fmtRate = (r: number) =>
  `${r.toFixed(r * 10 === Math.round(r * 10) ? 1 : 2)}x`;

type Draft = {
  id?: string;
  para: number;
  time: number;
  quote: string;
  text: string;
};

export default function Player({
  item,
  start,
  onClose,
}: {
  item: LibraryItem;
  start?: number;
  onClose: () => void;
}) {
  const { book, folder } = item;
  const rtl = isRtl((book as { lang?: string }).lang);
  const familiar = useMemo(() => familiarFor(loadTracker().books.find((b) => b.audio === folder)?.paths), [folder]);
  const pb = usePlayback();
  const { player, status, t, rate, goTo, skip, toggle, sleep, sleepLeft, setSleep, preparing } = pb;
  const [sleepOpen, setSleepOpen] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => pb.open(item, start), [item.folder, start]);
  const sec = pb.item?.folder === folder ? pb.sec : 0;
  const [follow, setFollow] = useState(true);
  const [showText, setShowText] = useState(() => read("player-text.txt") !== "0");
  const toggleText = () => {
    write("player-text.txt", showText ? "0" : "1");
    setShowText(!showText);
    setFollow(true);
  };
  const [links, setLinks] = useState(() => loadLinks(folder));
  const [explained, setExplained] = useState(() => loadExplained(folder));
  const [explain, setExplain] = useState<ExplainTarget | null>(null);
  const [picking, setPicking] = useState(false);
  const [cardInfo, setCardInfo] = useState<string | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const ts = useTextStyle();
  useExplanations();
  const expOn = explanationsOn(folder);
  const [styling, setStyling] = useState(false);
  const lineH = lineHeight(ts);
  const lines = Math.max(2, Math.min(3, Math.floor((stage.h * 0.3 - 20) / lineH)));
  const passageH = lineH * lines + 20;
  const [panel, setPanel] = useState<
    "none" | "chapters" | "notes" | "consults"
  >("none");
  const [consults, setConsults] = useState<Consult[]>(() =>
    loadConsults(folder),
  );
  const [ask, setAsk] = useState<AskDraft | null>(null);
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(folder));
  const [draft, setDraft] = useState<Draft | null>(null);
  const list = useRef<FlatList<Para>>(null);
  const section = book.sections[sec];
  const endT = (!expOn && explainStart(section)) || status.duration || 0;
  const shownDuration = (x: typeof section) => (!expOn && explainStart(x)) || x.duration;
  const explainMenu = () =>
    fromMenu(() =>
      Alert.alert(
        "Explanations",
        bookOverride(folder) === undefined
          ? `${allExplanationsOn() ? "On" : "Off"} for all books.`
          : `${expOn ? "On" : "Off"} for this book (all books: ${allExplanationsOn() ? "on" : "off"}).`,
        [
          { text: allExplanationsOn() ? "Turn off for all books" : "Turn on for all books", onPress: () => setAllExplanations(!allExplanationsOn()) },
          { text: expOn ? "Turn off for this book only" : "Turn on for this book only", onPress: () => setBookExplanations(folder, !expOn) },
          ...(bookOverride(folder) !== undefined
            ? [{ text: "This book follows all books", onPress: () => setBookExplanations(folder, undefined) }]
            : []),
          { text: "Cancel", style: "cancel" as const },
        ],
      ),
    );
  const sys = useMemo(() => bookSystem(folder), [folder]);
  const card = sectionCard(links, section, sys);
  const link = (l: Link | undefined) => setLinks(setLink(folder, section.id, l));
  const cardActions = () =>
    card
      ? Alert.alert(cardName(card.card), card.auto ? "Found in the section title" : undefined, [
          { text: "About this card", onPress: () => setCardInfo(card.card) },
          { text: "Change card", onPress: () => setPicking(true) },
          ...(sys === "tarot"
            ? [{ text: card.reversed ? "Show upright" : "Show reversed", onPress: () => link({ card: card.card, reversed: !card.reversed }) }]
            : []),
          { text: "Remove from this section", style: "destructive", onPress: () => link({ card: null }) },
          { text: "Cancel", style: "cancel" },
        ])
      : setPicking(true);

  const current = useMemo(() => {
    const ps = section.paras;
    let i = 0;
    while (i + 1 < ps.length && ps[i + 1].start <= t + 0.05) i++;
    return i;
  }, [t, section]);

  useEffect(() => {
    if (follow && showText && panel === "none")
      list.current?.scrollToIndex({
        index: current,
        viewPosition: 0.3,
        animated: true,
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, follow, showText]);

  const [more, setMore] = useState(false);
  const fromMenu = (fn: () => void) => (setMore(false), setTimeout(fn, 450));
  const customRate = () =>
    fromMenu(() =>
      Alert.prompt(
        "Custom speed",
        "Between 0.1 and 2.0",
        (v) => {
          const r = Number(v.replace(",", "."));
          if (r >= 0.1 && r <= 2) pb.setRate(Math.round(r * 100) / 100);
          else Alert.alert("Speed must be between 0.1 and 2.0");
        },
        "plain-text",
        String(rate),
        "decimal-pad",
      ),
    );

  const newNote = (para: number, time: number) => {
    const p = section.paras[para];
    setDraft({
      para,
      time,
      quote: p.text.slice(0, 140) + (p.text.length > 140 ? "…" : ""),
      text: "",
    });
  };
  const commit = () => {
    if (!draft) return;
    const rest = notes.filter((n) => n.id !== draft.id);
    const next = draft.text.trim()
      ? [
          ...rest,
          {
            id: draft.id ?? String(Date.now()),
            section: section.id,
            time: draft.time,
            para: draft.para,
            quote: draft.quote,
            text: draft.text.trim(),
            created: Date.now(),
          },
        ]
      : rest;
    setNotes(next);
    saveNotes(folder, next);
    setDraft(null);
  };
  const share = async () => {
    const uri = exportNotesFile(folder, book, notes);
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(uri, { UTI: "public.plain-text" });
  };

  const quoteOf = (para: number) => {
    const p = section.paras[para];
    return p.text.slice(0, 280) + (p.text.length > 280 ? "…" : "");
  };
  const storeConsults = (next: Consult[]) => (
    setConsults(next),
    saveConsults(folder, next)
  );
  const startAsk = (para: number, time: number) =>
    setAsk({ section: section.id, para, time, quote: quoteOf(para) });
  const sendAsk = async (question: string) => {
    if (!ask) return;
    const cst: Consult = {
      id: consults.reduce((m, x) => Math.max(m, x.id), 0) + 1,
      section: ask.section,
      para: ask.para,
      time: ask.time,
      quote: ask.quote,
      question,
      parent: ask.parent?.id,
      status: "asked",
      created: Date.now(),
    };
    storeConsults([...consults, cst]);
    setAsk(null);
    player.pause();
    await shareToClaude(buildPrompt(book, cst, notes, ask.parent));
  };
  const answerConsult = (cst: Consult, answer: string) =>
    storeConsults(
      consults.map((x) =>
        x.id === cst.id
          ? { ...x, answer, status: "answered", answered: Date.now() }
          : x,
      ),
    );
  const exportConsults = async () => {
    const uri = exportConsultsFile(folder, book, consults);
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(uri, { UTI: "public.plain-text" });
  };
  const explainPassage = (index: number) =>
    setExplain({
      kind: "passage",
      section,
      para: index,
      text: section.paras[index]?.text,
      card: card?.card,
      saved: explained[section.id]?.passages?.filter((x) => x.para === index).pop(),
    });
  const explainSection = () =>
    setExplain({ kind: "section", section, card: card?.card, saved: explained[section.id]?.section, builtIn: section.explain });
  const paraActions = (index: number, time: number) =>
    Alert.alert("This passage", undefined, [
      { text: "Explain this passage", onPress: () => explainPassage(index) },
      { text: "Add note", onPress: () => newNote(index, time) },
      { text: "Ask Claude", onPress: () => startAsk(index, time) },
      { text: "Cancel", style: "cancel" },
    ]);

  const asked = useMemo(
    () =>
      new Set(
        consults.filter((x) => x.section === section.id).map((x) => x.para),
      ),
    [consults, section],
  );

  const lit = useMemo(() => new Set((explained[section.id]?.passages ?? []).map((x) => x.para)), [explained, section]);

  const noted = useMemo(
    () =>
      new Set(notes.filter((n) => n.section === section.id).map((n) => n.para)),
    [notes, section],
  );

  if (pb.item?.folder !== folder) return <SafeAreaView style={s.wrap} />;

  return (
    <SafeAreaView style={s.wrap} edges={["top", "bottom"]}>
      <View style={s.top}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="chevron-down" size={26} color={c.gold} />
        </Pressable>
        <View style={s.topRight}>
          <Pressable
            onPress={toggleText}
            hitSlop={8}
            accessibilityLabel="Follow-along text"
            accessibilityState={{ selected: showText }}
          >
            <View style={[s.textBtn, showText && s.textBtnOn]}>
              <Ionicons name="text" size={16} color={showText ? c.bg : c.dim} />
            </View>
          </Pressable>
          <Pressable onPress={() => setPanel("consults")} hitSlop={8}>
            <View style={s.iconLink}>
              <Ionicons name="sparkles-outline" size={17} color={c.claude} />
              <Text style={[s.link, { color: c.claude }]}>
                {consults.length}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setPanel("notes")} hitSlop={8}>
            <View style={s.iconLink}>
              <Ionicons name="create-outline" size={17} color={c.gold} />
              <Text style={s.link}>{notes.length}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={() => setPanel("chapters")} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <FamiliarArt familiar={familiar} pose={status.playing ? "reading" : "idle"} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={s.book}>{book.title}</Text>
          <Text style={s.sec}>
            {section.title}{" "}
            <Ionicons name="chevron-down" size={16} color={c.dim} />
          </Text>
        </View>
        {showText && card && (
          <Pressable onPress={toggleText} accessibilityLabel={`Show ${cardName(card.card)}`}>
            <CardImage id={card.card} reversed={card.reversed} width={30} />
          </Pressable>
        )}
      </Pressable>

      {!showText ? (
        <View
          style={s.stage}
          onLayout={(e) => setStage({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          {card ? (
            <View style={{ alignItems: "center", gap: 10, alignSelf: "stretch" }}>
              <Pressable onPress={toggleText} onLongPress={cardActions} accessibilityHint="Tap for the text, hold for card options" style={{ alignItems: "center", gap: 8 }}>
                <CardImage
                  id={card.card}
                  reversed={card.reversed}
                  width={Math.max(70, Math.min(stage.w - 48, (stage.h - 50 - passageH - 10) / 1.72))}
                />
                <Text style={s.cardName}>
                  {cardName(card.card)}
                  {card.reversed ? " · reversed" : ""}
                </Text>
              </Pressable>
              <Passage para={!expOn && isExplain(section.paras[current]?.kind ?? "") ? undefined : section.paras[current]} t={t} ts={ts} height={passageH} rtl={rtl} />
            </View>
          ) : (
            <View style={{ alignItems: "center", gap: 14 }}>
              <FamiliarArt familiar={familiar} pose={status.playing ? "reading" : "idle"} size={160} />
              <Pressable style={s.linkBtn} onPress={() => setPicking(true)}>
                <Ionicons name="add-circle-outline" size={18} color={c.gold} />
                <Text style={s.link}>Link a card to this section</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : (
      <View style={{ flex: 1 }}>
        <FlatList
          ref={list}
          data={section.paras}
          keyExtractor={(_, i) => String(i)}
          onScrollBeginDrag={() => setFollow(false)}
          onScrollToIndexFailed={(e) =>
            setTimeout(
              () =>
                list.current?.scrollToIndex({
                  index: e.index,
                  viewPosition: 0.3,
                }),
              200,
            )
          }
          contentContainerStyle={{ paddingBottom: 200 }}
          renderItem={({ item: p, index }) => !expOn && isExplain(p.kind) ? null : (
            <Pressable
              onPress={() => goTo(sec, p.start + 0.01)}
              onLongPress={() => paraActions(index, p.start)}
              style={[s.para, { marginBottom: ts.gap }, index === current && s.paraOn]}
            >
              <Text
                style={[bodyText(ts, index === current), styleFor(p, ts), rtl && s.rtl]}
              >
                {asked.has(index) && (
                  <Ionicons
                    name="sparkles-outline"
                    size={15}
                    color={c.claude}
                  />
                )}
                {noted.has(index) && (
                  <Ionicons name="create-outline" size={15} color={c.gold} />
                )}
                {lit.has(index) && <Ionicons name="bulb-outline" size={15} color={c.explain} />}
                {(asked.has(index) || noted.has(index) || lit.has(index)) && " "}
                {p.text}
              </Text>
            </Pressable>
          )}
        />
        {!follow && (
          <Pressable style={s.follow} onPress={() => setFollow(true)}>
            <Text style={s.followText}>Follow along</Text>
          </Pressable>
        )}
      </View>
      )}

      <View style={s.controls}>
        <View style={s.bar}>
          <View
            style={[
              s.barFill,
              {
                width: `${endT ? Math.min(1, t / endT) * 100 : 0}%`,
              },
            ]}
          />
        </View>
        <View style={s.times}>
          <Text style={s.time}>{fmt(t)}</Text>
          <Text style={s.time}>
            {sec + 1}/{book.sections.length}
          </Text>
          <Text style={s.time}>
            -{fmt(Math.max(0, endT - t))}
          </Text>
        </View>
        <View style={s.row}>
          <Btn
            icon="play-skip-back"
            onPress={() => (t > 5 ? goTo(sec, 0) : sec > 0 && goTo(sec - 1, 0))}
          />
          <Btn icon="arrow-undo" label="15" onPress={() => skip(-15)} />
          <Pressable style={s.play} onPress={toggle}>
            {preparing ? (
              <ActivityIndicator color={c.bg} />
            ) : (
              <Ionicons
                name={status.playing ? "pause" : "play"}
                size={30}
                color={c.bg}
                style={!status.playing && { marginLeft: 4 }}
              />
            )}
          </Pressable>
          <Btn icon="arrow-redo" label="15" onPress={() => skip(15)} />
          <Btn
            icon="play-skip-forward"
            onPress={() => sec < book.sections.length - 1 && goTo(sec + 1, 0)}
          />
        </View>
        <Pressable style={s.more} onPress={() => setMore(true)} accessibilityLabel="More options">
          <Ionicons name="ellipsis-horizontal" size={20} color={c.text} />
          {rate !== 1 && <Text style={s.moreTag}>{fmtRate(rate)}</Text>}
          {!!sleep && (
            <View style={s.iconLink}>
              <Ionicons name="moon" size={13} color={c.gold} />
              {sleepLeft !== null && <Text style={[s.moreTag, { color: c.gold }]}>{fmtLeft(sleepLeft)}</Text>}
            </View>
          )}
        </Pressable>
      </View>

      <Modal visible={sleepOpen} transparent animationType="slide" onRequestClose={() => setSleepOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "#0008" }} onPress={() => setSleepOpen(false)} accessibilityLabel="Close" />
        <View style={s.sleepSheet}>
          <Text style={s.h2}>Sleep timer</Text>
          {(
            [
              ["off", "Off"],
              [5, "5 minutes"],
              [15, "15 minutes"],
              [30, "30 minutes"],
              [45, "45 minutes"],
              [60, "1 hour"],
              ["section", "End of this section"],
              ["explain", "End of the explanation"],
            ] as [SleepKind, string][]
          ).filter(([k]) => expOn || k !== "explain").map(([k, label]) => {
            const on =
              (k === "off" && !sleep) ||
              (k === "section" && sleep?.kind === "section") ||
              (k === "explain" && sleep?.kind === "explain");
            return (
              <Pressable key={String(k)} style={s.sleepRow} onPress={() => (setSleep(k), setSleepOpen(false))}>
                <Text style={[s.menuText, on && { color: c.gold, fontWeight: "700" }]}>{label}</Text>
                {on && <Ionicons name="checkmark" size={18} color={c.gold} />}
              </Pressable>
            );
          })}
          <Text style={s.sleepNote}>
            {sleep?.kind === "min" ? `Fades out over the last 10 seconds · ${fmtLeft(sleepLeft ?? 0)} left` : "Timed options fade out over the last 10 seconds."}
          </Text>
        </View>
      </Modal>

      <Modal visible={more} transparent animationType="slide" onRequestClose={() => setMore(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "#0008" }} onPress={() => setMore(false)} accessibilityLabel="Close" />
        <View style={s.sleepSheet}>
          <Text style={s.moreHead}>Speed</Text>
          <View style={s.rates}>
            {RATES.map((r) => (
              <Pressable key={r} style={[s.rate, r === rate && s.rateOn]} onPress={() => pb.setRate(r)}>
                <Text style={[s.rateText, r === rate && s.rateTextOn]}>{fmtRate(r)}</Text>
              </Pressable>
            ))}
            <Pressable style={[s.rate, !RATES.includes(rate) && s.rateOn]} onPress={customRate}>
              <Text style={[s.rateText, !RATES.includes(rate) && s.rateTextOn]}>
                {RATES.includes(rate) ? "Custom" : fmtRate(rate)}
              </Text>
            </Pressable>
          </View>
          <MenuRow
            icon={sleep ? "moon" : "moon-outline"}
            label="Sleep timer"
            value={sleep ? (sleepLeft !== null ? fmtLeft(sleepLeft) : sleep.kind === "section" ? "End of section" : "End of explanation") : "Off"}
            onPress={() => fromMenu(() => setSleepOpen(true))}
          />
          <MenuRow
            icon="bulb-outline"
            label="Explanations"
            value={`${expOn ? "On" : "Off"}${bookOverride(folder) !== undefined ? " · this book" : ""}`}
            onPress={explainMenu}
          />
          <MenuRow
            icon="bulb-outline"
            label="Explain this section"
            value={explained[section.id]?.section || section.explain?.length ? "Saved" : undefined}
            onPress={() => fromMenu(explainSection)}
          />
          <MenuRow icon="text-outline" label="Text size and style" onPress={() => fromMenu(() => setStyling(true))} />
          <MenuRow icon="create-outline" label="Add a note here" onPress={() => fromMenu(() => newNote(current, t))} />
          <MenuRow icon="sparkles-outline" label="Ask Claude about this" color={c.claude} onPress={() => fromMenu(() => startAsk(current, t))} />
        </View>
      </Modal>

      <Modal
        visible={panel === "chapters"}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPanel("none")}
      >
        <SafeAreaView style={s.wrap} edges={["bottom"]}>
          <Header title="Sections" onClose={() => setPanel("none")} />
          <FlatList
            data={book.sections}
            keyExtractor={(x) => x.id}
            initialScrollIndex={sec}
            getItemLayout={(_, i) => ({ length: 52, offset: 52 * i, index: i })}
            renderItem={({ item: x, index }) => (
              <Pressable
                style={[s.row2, index === sec && s.paraOn]}
                onPress={() => (goTo(index, 0), setPanel("none"))}
              >
                <Text style={[s.pText, { flex: 1 }]} numberOfLines={1}>
                  {x.title}
                </Text>
                {(() => {
                  const k = sectionCard(links, x, sys);
                  return k ? <CardImage id={k.card} reversed={k.reversed} width={22} /> : null;
                })()}
                <Text style={s.time}>{fmt(shownDuration(x))}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={panel === "notes"}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPanel("none")}
      >
        <SafeAreaView style={s.wrap} edges={["bottom"]}>
          <Header
            title="Notes"
            onClose={() => setPanel("none")}
            action={notes.length ? ["Export", share] : undefined}
          />
          <FlatList
            data={[...notes].sort(
              (a, b) =>
                book.sections.findIndex((x) => x.id === a.section) -
                  book.sections.findIndex((x) => x.id === b.section) ||
                a.time - b.time,
            )}
            keyExtractor={(n) => n.id}
            ListEmptyComponent={
              <Text style={s.empty}>
                Tap “Note here” while listening, or long-press any paragraph, to
                add a note.
              </Text>
            }
            renderItem={({ item: n }) => {
              const i = book.sections.findIndex((x) => x.id === n.section);
              return (
                <Pressable
                  style={s.note}
                  onPress={() => (goTo(i, n.time), setPanel("none"))}
                  onLongPress={() => {
                    setPanel("none");
                    setDraft({
                      id: n.id,
                      para: n.para,
                      time: n.time,
                      quote: n.quote,
                      text: n.text,
                    });
                  }}
                >
                  <Text style={s.noteMeta}>
                    {book.sections[i]?.title} · {fmt(n.time)}
                  </Text>
                  <Text style={s.quote}>“{n.quote}”</Text>
                  <Text style={s.pText}>{n.text}</Text>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={!!draft}
        transparent
        animationType="fade"
        onRequestClose={() => setDraft(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.dim}
        >
          <View style={s.sheet}>
            <Text style={s.noteMeta}>
              {section.title} · {fmt(draft?.time ?? 0)}
            </Text>
            <Text style={s.quote} numberOfLines={3}>
              “{draft?.quote}”
            </Text>
            <TextInput
              autoFocus
              multiline
              placeholder="Your note…"
              placeholderTextColor={c.dim}
              style={s.input}
              value={draft?.text}
              onChangeText={(text) => setDraft((d) => (d ? { ...d, text } : d))}
            />
            <View style={s.row}>
              <Btn label="Cancel" onPress={() => setDraft(null)} />
              {draft?.id && (
                <Btn
                  label="Delete"
                  onPress={() => setDraft((d) => (d ? { ...d, text: "" } : d))}
                />
              )}
              <Btn label="Save" onPress={commit} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <CardPicker
        visible={picking}
        title="Card for this section"
        system={sys}
        onClose={() => setPicking(false)}
        onPick={(id, reversed) => link({ card: id, reversed })}
      />
      <ExplainSheet
        target={explain}
        book={book}
        onClose={() => setExplain(null)}
        onSave={(tg, text, quote) => setExplained(saveExplained(folder, tg.section.id, { para: tg.para, quote, text, at: Date.now() }, tg.kind))}
      />
      <TextStyleSheet visible={styling} sample={section.paras[current]?.text} onClose={() => setStyling(false)} />
      <CardSheet id={cardInfo} here={folder} onClose={() => setCardInfo(null)} />
      <AskSheet draft={ask} onCancel={() => setAsk(null)} onSend={sendAsk} />
      <ConsultList
        visible={panel === "consults"}
        book={book}
        consults={consults}
        onClose={() => setPanel("none")}
        onJump={(x) => (
          goTo(
            book.sections.findIndex((y) => y.id === x.section),
            x.time,
          ),
          setPanel("none")
        )}
        onAnswer={answerConsult}
        onResend={(x) =>
          shareToClaude(
            buildPrompt(
              book,
              x,
              notes,
              consults.find((y) => y.id === x.parent),
            ),
          )
        }
        onFollowUp={(x) => {
          setPanel("none");
          setTimeout(
            () =>
              setAsk({
                section: x.section,
                para: x.para,
                time: x.time,
                quote: x.quote,
                parent: x,
              }),
            450,
          );
        }}
        onDelete={(x) => storeConsults(consults.filter((y) => y.id !== x.id))}
        onSaveNote={(x, keep) => {
          const next = [
            ...notes,
            {
              id: String(Date.now()),
              section: x.section,
              time: x.time,
              para: x.para,
              quote: x.quote,
              text: `Q: ${x.question}\n\nClaude: ${x.answer}`,
              created: Date.now(),
            },
          ];
          setNotes(next);
          saveNotes(folder, next);
          storeConsults(
            keep
              ? consults.map((y) => (y.id === x.id ? { ...y, noted: true } : y))
              : consults.filter((y) => y.id !== x.id),
          );
        }}
        onExport={exportConsults}
        explained={explained}
        onJumpExplained={(id, x) => {
          const i = book.sections.findIndex((y) => y.id === id);
          goTo(i, x.para !== undefined ? (book.sections[i]?.paras[x.para]?.start ?? 0) : 0);
          setPanel("none");
        }}
        onSaveExplainedNote={(id, x) => {
          const sec = book.sections.find((y) => y.id === id);
          const next = [
            ...notes,
            {
              id: String(Date.now()),
              section: id,
              time: x.para !== undefined ? (sec?.paras[x.para]?.start ?? 0) : 0,
              para: x.para ?? 0,
              quote: x.quote ?? sec?.title ?? "",
              text: `Explanation: ${x.text}`,
              created: Date.now(),
            },
          ];
          setNotes(next);
          saveNotes(folder, next);
          setExplained(markExplainedNoted(folder, id, x.at));
          toast("Saved as note");
        }}
      />
    </SafeAreaView>
  );
}

const styleFor = (p: Para, t: TextStyle) => {
  const at = (size: number) => ({ fontSize: size, lineHeight: lineHeight(t, size) });
  return p.kind === "title"
    ? [s.kTitle, at(t.size + 5)]
    : p.kind === "head"
      ? [s.kHead, at(t.size - 2)]
      : p.kind === "explainhead"
        ? [s.kExplainHead, at(t.size - 2)]
        : p.kind === "explain"
          ? s.kExplain
          : null;
};

function Passage({ para, t, ts, height, rtl }: { para?: Para; t: number; ts: TextStyle; height: number; rtl: boolean }) {
  const LINE = lineHeight(ts);
  const ref = useRef<ScrollView>(null);
  const [contentH, setContentH] = useState(0);
  const last = useRef(0);
  const frac = para && para.end > para.start ? Math.min(1, Math.max(0, (t - para.start) / (para.end - para.start))) : 0;
  const room = Math.max(0, contentH - (height - 20));
  const target = frac > 0.9 ? room : Math.min(room, Math.floor((room * frac) / LINE) * LINE);
  useEffect(() => {
    if (target === last.current) return;
    last.current = target;
    ref.current?.scrollTo({ y: target, animated: true });
  }, [target]);
  useEffect(() => {
    last.current = 0;
    ref.current?.scrollTo({ y: 0, animated: false });
  }, [para]);
  return (
    <View style={[s.passage, { height }]}>
      <ScrollView ref={ref} scrollEnabled={false} showsVerticalScrollIndicator={false} onContentSizeChange={(_, h) => setContentH(h)}>
        <Text style={[bodyText(ts, true), para && styleFor(para, ts), rtl && s.rtl]}>{para?.text}</Text>
      </ScrollView>
    </View>
  );
}

type IconName = keyof typeof Ionicons.glyphMap;
const fmtLeft = (secs: number) => (secs >= 60 ? `${Math.ceil(secs / 60)}m` : `${secs}s`);

const Btn = ({
  icon,
  label,
  trail,
  color = c.text,
  onPress,
  wide,
}: {
  icon?: IconName;
  label?: string;
  trail?: IconName;
  color?: string;
  onPress: () => void;
  wide?: boolean;
}) => (
  <Pressable style={[s.btn, wide && { flex: 1 }]} onPress={onPress} hitSlop={6}>
    {icon && <Ionicons name={icon} size={20} color={color} />}
    {label && <Text style={[s.btnText, { color }]}>{label}</Text>}
    {trail && <Ionicons name={trail} size={14} color={c.dim} />}
  </Pressable>
);

const MenuRow = ({ icon, label, value, color = c.text, onPress }: { icon: IconName; label: string; value?: string; color?: string; onPress: () => void }) => (
  <Pressable style={s.sleepRow} onPress={onPress}>
    <View style={[s.iconLink, { gap: 12 }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[s.menuText, { color }]}>{label}</Text>
    </View>
    <View style={s.iconLink}>
      {!!value && <Text style={s.time}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={c.dim} />
    </View>
  </Pressable>
);

const Header = ({
  title,
  onClose,
  action,
}: {
  title: string;
  onClose: () => void;
  action?: [string, () => void];
}) => (
  <View style={s.top}>
    <Text style={s.h2}>{title}</Text>
    <View style={s.topRight}>
      {action && (
        <Pressable onPress={action[1]} hitSlop={8}>
          <Text style={s.link}>{action[0]}</Text>
        </Pressable>
      )}
      <Pressable onPress={onClose} hitSlop={8}>
        <Text style={s.link}>Done</Text>
      </Pressable>
    </View>
  </View>
);

const s = themed(() => ({
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  passage: { alignSelf: "stretch", backgroundColor: c.panel, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, overflow: "hidden" },
  more: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.panel, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 22 },
  moreTag: { color: c.dim, fontSize: 13, fontVariant: ["tabular-nums"] },
  moreHead: { color: c.dim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 },
  rates: { flexDirection: "row", gap: 8, marginBottom: 10 },
  rate: { flex: 1, alignItems: "center", backgroundColor: c.raised, borderRadius: 10, paddingVertical: 10 },
  rateOn: { backgroundColor: c.gold },
  rateText: { color: c.text, fontSize: 15, fontVariant: ["tabular-nums"] },
  rateTextOn: { color: c.bg, fontWeight: "700" },
  cardName: { color: c.text, fontSize: 18, fontFamily: F.heading, textAlign: "center" },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.panel, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  textBtn: { width: 28, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.dim },
  textBtnOn: { backgroundColor: c.gold, borderColor: c.gold },
  sleepSheet: { backgroundColor: c.panel, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 40, gap: 2 },
  sleepRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  sleepNote: { color: c.dim, fontSize: 12, marginTop: 8 },
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  topRight: { flexDirection: "row", gap: 18 },
  link: { color: c.gold, fontSize: 16 },
  h2: { color: c.text, fontSize: 22, fontFamily: F.heading },
  book: { color: c.dim, fontSize: 13, marginTop: 4 },
  sec: { color: c.text, fontSize: 20, fontWeight: "700", marginBottom: 10 },
  para: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 2,
  },
  paraOn: { backgroundColor: c.raised },
  pText: { color: c.dim, fontSize: 17, lineHeight: 26 },
  pTextOn: { color: c.text },
  kTitle: { fontSize: 22, fontWeight: "700", color: c.gold },
  rtl: { writingDirection: "rtl", textAlign: "right" },
  kHead: {
    fontSize: 15,
    fontWeight: "700",
    color: c.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  kExplainHead: {
    fontSize: 15,
    fontWeight: "700",
    color: c.explain,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  kExplain: { color: c.explain },
  follow: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    backgroundColor: c.gold,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  followText: { color: c.bg, fontWeight: "700" },
  controls: {
    borderTopWidth: 1,
    borderColor: c.line,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 10,
  },
  bar: {
    height: 4,
    backgroundColor: c.line,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: { height: 4, backgroundColor: c.gold },
  times: { flexDirection: "row", justifyContent: "space-between" },
  time: { color: c.dim, fontSize: 13, fontVariant: ["tabular-nums"] },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  row2: {
    height: 52,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  btn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: c.panel,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  menuText: { color: c.text, fontSize: 16, fontVariant: ["tabular-nums"] },
  btnText: { color: c.text, fontSize: 16 },
  play: {
    backgroundColor: c.gold,
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { color: c.dim, fontSize: 16, lineHeight: 22, marginTop: 20 },
  note: {
    backgroundColor: c.panel,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  noteMeta: { color: c.gold, fontSize: 13, marginBottom: 6 },
  quote: { color: c.dim, fontStyle: "italic", marginBottom: 8 },
  dim: { flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: c.panel,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 8,
  },
  input: {
    minHeight: 110,
    color: c.text,
    fontSize: 17,
    backgroundColor: c.bg,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: "top",
  },
}));
