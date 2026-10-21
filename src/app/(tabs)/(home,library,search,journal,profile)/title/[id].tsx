import { exportAudio, exportBookZip } from '../../../../ownBooks';
import { t as tr } from '../../../../i18n';
import { usePad } from '../../../../playback';
import { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { bookSizes, canStream, deleteBook, downloadAudio, estimateAudio, freeSpace, getBook, loadConsults, loadNotes, loadProgress, mb, refreshStreamingBooks, removeAudio } from "../../../../storage";
import {
  addLog,
  patchList,
  addShelf,
  daysBetween,
  latestRating,
  load,
  logsFor,
  patchBook,
  removeBook,
  removeLog,
  Status,
  STATUS_LABEL,
  syncAudioBooks,
  TBook,
  today,
  toggleFavorite,
  toggleShelf,
  Tracker,
} from "../../../../tracker";
import {
  Button,
  Chip,
  Cover,
  DateStepper,
  fmtDate,
  Stars,
} from "../../../../components/ui";
import { c, F, themed } from "../../../../theme";
import { GenreSheet } from "../../../../components/GenreSheet";
import { newList } from "../lists";
import { FamiliarArt } from "../../../../components/Familiar";
import { familiarFor, allPaths } from "../../../../familiar";
import { useStudy } from "../../../../study";
import { isPublic } from "../../../../variant";

const STATUSES: Status[] = ["want", "reading", "read", "dnf"];

export default function Title() {
  const pad = usePad();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [t, setT] = useState<Tracker>(() => load());
  const [logging, setLogging] = useState(false);
  const [shelving, setShelving] = useState(false);
  const [editStart, setEditStart] = useState(false);
  const [genring, setGenring] = useState(false);
  const study = useStudy();
  const refresh = useCallback(() => setT(syncAudioBooks()), []);
  useFocusEffect(refresh);

  const b = t.books.find((x) => x.id === id);
  if (!b) return <Text style={s.dim}>{tr("Book not found.")}</Text>;
  const logs = logsFor(t, b.id);
  const notes = b.audio ? loadNotes(b.audio).length : 0;
  const consults = b.audio ? loadConsults(b.audio).length : 0;
  const cards = b.audio ? study.cards.filter((x) => x.book === b.audio).length : 0;
  const fav = !!t.favorites?.includes(b.id);
  const myShelves = (t.shelves ?? []).filter((sh) => sh.books.includes(b.id));

  const set = (patch: Partial<TBook>) => {
    patchBook(b.id, patch);
    refresh();
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 50 + pad }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              hitSlop={10}
              onPress={() =>
                Alert.alert(b.title, undefined, [
                  {
                    text: tr("Add to a list"),
                    onPress: () => {
                      const lists = t.lists ?? [];
                      const add = (id: string) => {
                        patchList(id, (l) => {
                          if (!l.items.some((x) => x.bookId === b.id)) l.items.push({ bookId: b.id });
                        });
                        refresh();
                      };
                      Alert.alert(tr("Add to a list"), undefined, [
                        ...lists.map((l) => ({ text: l.name, onPress: () => add(l.id) })),
                        { text: tr("New list…"), onPress: () => newList(add) },
                        { text: tr("Cancel"), style: "cancel" as const },
                      ]);
                    },
                  },
                  {
                    text: fav
                      ? tr("Remove from top 4 favorites")
                      : tr("Add to top 4 favorites"),
                    onPress: () => {
                      if (!fav && (t.favorites?.length ?? 0) >= 4)
                        return Alert.alert(
                          tr("Top 4 is full"),
                          tr("Remove a favorite on its book page first."),
                        );
                      toggleFavorite(b.id);
                      refresh();
                    },
                  },
                  ...(b.audio && getBook(b.audio)
                    ? (() => {
                        const folder = b.audio!;
                        const item = getBook(folder)!;
                        const size = bookSizes(folder).audio;
                        return size > 0
                          ? [
                              {
                                text: tr("Export audio"),
                                onPress: () => {
                                  const s = item.book.sections[loadProgress(folder).section] ?? item.book.sections[0];
                                  Alert.alert(tr("Export audio"), tr("For your own use. Choose what to export."), [
                                    { text: tr("This section: {0}", { 0: s.title }), onPress: () => void exportAudio(folder, s) },
                                    { text: tr("Whole book (.zip)"), onPress: () => void exportBookZip(folder, item.book).catch((e) => Alert.alert(tr("Export failed"), String(e?.message ?? e))) },
                                    { text: tr("Cancel"), style: "cancel" },
                                  ]);
                                },
                              },
                              {
                                text: tr("Remove downloaded audio ({0})", { 0: mb(size) }),
                                onPress: async () => {
                                  if (!(await canStream(folder, item.book)))
                                    return Alert.alert(tr("Can't stream this book yet"), tr("Its audio isn't on GitHub, so removing it would lose it. Keep it for now."));
                                  Alert.alert(tr("Free {0}?", { 0: mb(size) }), tr("Notes, progress and card links stay. The book plays by streaming from your library on GitHub (needs internet)."), [
                                    { text: tr("Cancel"), style: "cancel" },
                                    { text: tr("Remove audio"), style: "destructive", onPress: () => (removeAudio(folder), refreshStreamingBooks().catch(() => {}), setT(load())) },
                                  ]);
                                },
                              },
                            ]
                          : [
                              {
                                text: tr("Download audio for offline (~{0})", { 0: mb(estimateAudio(item.book)) }),
                                onPress: () => {
                                  const need = estimateAudio(item.book);
                                  const free = freeSpace();
                                  const go = () =>
                                    downloadAudio(folder, item.book, () => {})
                                      .then(() => Alert.alert(tr("Downloaded"), tr("{0} on this iPhone.", { 0: mb(bookSizes(folder).audio) })))
                                      .catch((e) => Alert.alert(tr("Download failed"), String(e?.message ?? e)));
                                  if (free && need > free * 0.8)
                                    return Alert.alert(tr("Not much space left"), tr("This needs about {0} and your iPhone has {1} free.", { 0: mb(need), 1: mb(free) }), [
                                      { text: tr("Cancel"), style: "cancel" },
                                      { text: tr("Download anyway"), onPress: go },
                                    ]);
                                  Alert.alert(tr("Download ~{0}?", { 0: mb(need) }), tr("{0} free on your iPhone.", { 0: mb(free) }), [
                                    { text: tr("Cancel"), style: "cancel" },
                                    { text: tr("Download"), onPress: go },
                                  ]);
                                },
                              },
                            ];
                      })()
                    : []),
                  {
                    text: tr("Find details on Open Library"),
                    onPress: () =>
                      router.push({ pathname: "/find", params: { id: b.id } }),
                  },
                  {
                    text: tr("Delete audiobook"),
                    style: "destructive" as const,
                    onPress: () =>
                      Alert.alert(
                        tr("Delete this audiobook?"),
                        tr("Audio, notes, consults, progress and its diary entries are removed from this iPhone."),
                        [
                          { text: tr("Cancel"), style: "cancel" },
                          {
                            text: tr("Delete"),
                            style: "destructive",
                            onPress: () => {
                              if (b.audio) deleteBook(b.audio);
                              removeBook(b.id);
                              router.back();
                            },
                          },
                        ],
                      ),
                  },
                  { text: tr("Cancel"), style: "cancel" as const },
                ])
              }
            >
              <Ionicons
                name="ellipsis-horizontal-circle"
                size={24}
                color={c.gold}
              />
            </Pressable>
          ),
        }}
      />
      <View style={s.head}>
        <Cover book={b} width={120} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.title}>{b.title}</Text>
          {!!b.authors.length && (
            <Text style={s.author}>{b.authors.join(", ")}</Text>
          )}
          <Text style={s.dim}>
            {[b.year, b.pages && `${b.pages} pages`]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <View
            style={{
              marginTop: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Stars value={latestRating(t, b.id)} size={20} />
            {fav && <Ionicons name="heart" size={18} color={c.claude} />}
          </View>
        </View>
      </View>

      <View style={s.chips}>
        {STATUSES.map((st) => (
          <Chip
            key={st}
            label={STATUS_LABEL[st]}
            on={b.status === st}
            onPress={() => set({ status: b.status === st ? "none" : st })}
          />
        ))}
      </View>

      {(b.status === "reading" || b.started) && (
        <Pressable style={s.row} onPress={() => setEditStart(true)}>
          <Ionicons name="calendar-outline" size={18} color={c.gold} />
          <Text style={s.rowText}>
            {b.started
              ? tr("Started {0} · day {1}", { 0: fmtDate(b.started), 1: daysBetween(b.started, today()) })
              : tr("Add start date")}
          </Text>
          <Ionicons name="create-outline" size={16} color={c.dim} />
        </Pressable>
      )}

      <Pressable style={s.row} onPress={() => setShelving(true)}>
        <Ionicons name="albums-outline" size={18} color={c.gold} />
        <Text style={s.rowText} numberOfLines={2}>
          {myShelves.length
            ? myShelves.map((sh) => sh.name).join(" · ")
            : tr("Add to shelf")}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={c.dim} />
      </Pressable>

      <View style={s.row}>
        <FamiliarArt familiar={familiarFor(b.paths)} size={30} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {allPaths().map((p) => {
            const on = !!b.paths?.includes(p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() => set({ paths: on ? b.paths!.filter((x) => x !== p.id) : [...(b.paths ?? []), p.id] })}
                style={[s.pathChip, { borderColor: p.color }, on && { backgroundColor: p.color + '33' }]}
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.pathText, { color: on ? p.color : c.dim }]}>{p.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Pressable style={s.row} onPress={() => setGenring(true)}>
        <Ionicons name="pricetags-outline" size={18} color={c.gold} />
        <Text style={s.rowText} numberOfLines={2}>
          {b.genres?.length ? b.genres.join(" · ") : tr("Find genres")}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={c.dim} />
      </Pressable>
      <GenreSheet book={b} visible={genring} onClose={() => (setGenring(false), refresh())} />

      <View style={s.actions}>
        <View style={{ flex: 1 }}>
          <Button
            label={logs.length ? tr("Log again") : tr("Log")}
            icon="checkmark-circle"
            primary
            onPress={() => setLogging(true)}
          />
        </View>
        {b.audio && (
          <View style={{ flex: 1 }}>
            <Button
              label={tr("Listen")}
              icon="headset"
              onPress={() =>
                router.push({
                  pathname: "/player/[id]",
                  params: { id: b.audio! },
                })
              }
            />
          </View>
        )}
      </View>

      {b.audio &&
        (
          [
            ["list", tr("Sections"), getBook(b.audio)?.book.sections.length, () => router.push({ pathname: "/book/[id]", params: { id: b.audio! } })],
            ["create-outline", tr("Notes"), notes, () => router.push({ pathname: "/book-items/[id]", params: { id: b.audio!, kind: "notes" } })],
            ["layers-outline", tr("Flashcards"), cards, () => router.push({ pathname: "/book-items/[id]", params: { id: b.audio!, kind: "cards" } })],
          ] as const
        )
          .flatMap((row, i) =>
            i === 2 && !isPublic ? [["sparkles-outline", tr("Consults"), consults, () => router.push({ pathname: "/book-items/[id]", params: { id: b.audio!, kind: "consults" } })] as const, row] : [row],
          )
          .map(([icon, label, count, go]) => (
          <Pressable key={label} style={s.row} onPress={go}>
            <Ionicons name={icon} size={18} color={c.gold} />
            <Text style={s.rowText}>{label}</Text>
            {!!count && <Text style={{ color: c.dim, fontVariant: ["tabular-nums"] }}>{count}</Text>}
            <Ionicons name="chevron-forward" size={16} color={c.dim} />
          </Pressable>
        ))}

      <Text style={s.h2}>{tr("Reading history")}</Text>
      {logs.length ? (
        logs.map((l) => (
          <Pressable
            key={l.id}
            style={s.log}
            onLongPress={() =>
              Alert.alert(tr("Delete this entry?"), fmtDate(l.date), [
                { text: tr("Cancel"), style: "cancel" },
                {
                  text: tr("Delete"),
                  style: "destructive",
                  onPress: () => (removeLog(l.id), refresh()),
                },
              ])
            }
          >
            <Text style={s.logDate}>{fmtDate(l.date)}</Text>
            {l.reread && <Ionicons name="repeat" size={14} color={c.dim} />}
            {l.started && (
              <Text style={s.dim}>{daysBetween(l.started, l.date)} days</Text>
            )}
            <View style={{ flex: 1 }} />
            <Stars value={l.rating} size={14} />
          </Pressable>
        ))
      ) : (
        <Text style={s.dim}>{tr("Not logged yet. Tap “Log” when you finish it.")}</Text>
      )}

      <LogSheet
        visible={logging}
        isReread={logs.length > 0}
        started={b.started}
        onClose={() => setLogging(false)}
        onSave={(date, rating, reread, started) => {
          addLog(b.id, date, rating, reread, started);
          setLogging(false);
          refresh();
          const folder = b.audio;
          const item = folder ? getBook(folder) : null;
          const size = folder ? bookSizes(folder).audio : 0;
          if (folder && item && size > 0)
            setTimeout(async () => {
              if (!(await canStream(folder, item.book))) return;
              Alert.alert(tr("Finished! Free {0}?", { 0: mb(size) }), tr("Remove this book’s audio from your iPhone. Notes and progress stay, and it streams from GitHub if you listen again."), [
                { text: tr("Keep"), style: "cancel" },
                { text: tr("Remove audio"), style: "destructive", onPress: () => (removeAudio(folder), refreshStreamingBooks().catch(() => {}), refresh()) },
              ]);
            }, 500);
        }}
      />

      <Modal
        visible={editStart}
        transparent
        animationType="slide"
        onRequestClose={() => setEditStart(false)}
      >
        <Pressable style={s.dimBg} onPress={() => setEditStart(false)} />
        <View style={s.sheet}>
          <Text style={s.h2}>{tr("Started reading")}</Text>
          <DateStepper
            value={b.started ?? today()}
            max={today()}
            onChange={(d) => set({ started: d })}
          />
          <View style={s.quick}>
            <Chip label={tr("Today")} onPress={() => set({ started: today() })} />
            {b.started && (
              <Chip
                label={tr("Clear")}
                onPress={() => (
                  set({ started: undefined }),
                  setEditStart(false)
                )}
              />
            )}
          </View>
          <Button
            label={tr("Done")}
            primary
            onPress={() => (
              b.started || set({ started: today() }),
              setEditStart(false)
            )}
          />
        </View>
      </Modal>

      <Modal
        visible={shelving}
        transparent
        animationType="slide"
        onRequestClose={() => setShelving(false)}
      >
        <Pressable style={s.dimBg} onPress={() => setShelving(false)} />
        <View style={[s.sheet, { maxHeight: "75%" }]}>
          <Text style={s.h2}>{tr("Shelves")}</Text>
          <ScrollView contentContainerStyle={{ gap: 2 }}>
            {(t.shelves ?? []).map((sh) => {
              const on = sh.books.includes(b.id);
              return (
                <Pressable
                  key={sh.id}
                  style={s.shelfRow}
                  onPress={() => (toggleShelf(sh.id, b.id), refresh())}
                >
                  <Ionicons
                    name={on ? "checkbox" : "square-outline"}
                    size={20}
                    color={on ? c.gold : c.dim}
                  />
                  <Text style={s.rowText}>{sh.name}</Text>
                  <Text style={s.dim}>{sh.books.length}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Button
            label={tr("New shelf")}
            icon="add"
            onPress={() =>
              Alert.prompt(tr("New shelf"), undefined, (name) => {
                if (!name?.trim()) return;
                toggleShelf(addShelf(name).id, b.id);
                refresh();
              })
            }
          />
          <Button label={tr("Done")} primary onPress={() => setShelving(false)} />
        </View>
      </Modal>
    </ScrollView>
  );
}

function LogSheet({
  visible,
  isReread,
  started: initialStart,
  onClose,
  onSave,
}: {
  visible: boolean;
  isReread: boolean;
  started?: string;
  onClose: () => void;
  onSave: (
    date: string,
    rating: number | undefined,
    reread: boolean,
    started?: string,
  ) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [started, setStarted] = useState<string | undefined>(initialStart);
  const [rating, setRating] = useState<number | undefined>();
  const [reread, setReread] = useState(isReread);
  const date = today(offset);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => (
        setOffset(0),
        setRating(undefined),
        setReread(isReread),
        setStarted(initialStart)
      )}
    >
      <Pressable style={s.dimBg} onPress={onClose} />
      <View style={s.sheet}>
        <Text style={s.h2}>{tr("Log")}</Text>
        <Text style={s.label}>{tr("Finished on")}</Text>
        <View style={s.dateRow}>
          <Pressable onPress={() => setOffset(offset - 1)} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={c.gold} />
          </Pressable>
          <Text style={s.date}>
            {offset === 0
              ? tr("Today")
              : offset === -1
                ? tr("Yesterday")
                : fmtDate(date)}
          </Text>
          <Pressable
            onPress={() => offset < 0 && setOffset(offset + 1)}
            hitSlop={10}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={offset < 0 ? c.gold : c.line}
            />
          </Pressable>
        </View>
        <View style={s.quick}>
          <Chip label={tr("Today")} on={offset === 0} onPress={() => setOffset(0)} />
          <Chip
            label={tr("Yesterday")}
            on={offset === -1}
            onPress={() => setOffset(-1)}
          />
          <Chip label={tr("−7 days")} onPress={() => setOffset(offset - 7)} />
          <Chip label={tr("−30 days")} onPress={() => setOffset(offset - 30)} />
        </View>
        <View style={s.switchRow}>
          <Text style={s.label}>{tr("Started on")}</Text>
          <View style={{ flex: 1 }} />
          <Switch
            value={!!started}
            onValueChange={(on) =>
              setStarted(on ? (initialStart ?? date) : undefined)
            }
            trackColor={{ true: c.gold }}
          />
        </View>
        {started && (
          <>
            <DateStepper value={started} max={date} onChange={setStarted} />
            <Text style={[s.dim, { textAlign: "center" }]}>
              {daysBetween(started, date)} days
            </Text>
          </>
        )}
        <Text style={s.label}>{tr("Rating")}</Text>
        <View style={{ alignItems: "center", paddingVertical: 6 }}>
          <Stars value={rating} size={34} onChange={setRating} />
          <Text style={[s.dim, { marginTop: 6 }]}>
            {rating ? `${rating} / 5` : tr("Tap left or right half of a star")}
          </Text>
        </View>
        <View style={s.switchRow}>
          <Text style={s.rowText}>{tr("I’ve read this before")}</Text>
          <Switch
            value={reread}
            onValueChange={setReread}
            trackColor={{ true: c.gold }}
          />
        </View>
        <Button
          label={tr("Save")}
          primary
          onPress={() =>
            onSave(
              date,
              rating,
              reread,
              started && started <= date ? started : undefined,
            )
          }
        />
      </View>
    </Modal>
  );
}

const s = themed(() => ({
  pathChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pathText: { fontSize: 12, fontWeight: '600' },
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  head: { flexDirection: "row", gap: 16, marginTop: 8 },
  title: { color: c.text, fontSize: 22, fontWeight: "700" },
  author: { color: c.gold, fontSize: 15 },
  dim: { color: c.dim },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: c.panel,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  rowText: { color: c.text, flex: 1, fontSize: 15 },
  h2: {
    color: c.text,
    fontSize: 19,
    marginTop: 24,
    marginBottom: 10, fontFamily: F.heading },
  log: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
  },
  logDate: { color: c.text, fontSize: 15 },
  dimBg: { flex: 1, backgroundColor: "#000a" },
  sheet: {
    backgroundColor: c.panel,
    padding: 16,
    paddingBottom: 36,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 10,
  },
  label: {
    color: c.dim,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 6,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  date: { color: c.text, fontSize: 18, fontWeight: "600" },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  switchRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  shelfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
}));
