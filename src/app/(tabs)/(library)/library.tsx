import { t as tr } from '../../../i18n';
import { usePad } from '../../../playback';
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { installSampleOnce } from "../../../storage";
import {
  latestRating,
  removeShelf,
  renameShelf,
  Status,
  STATUS_LABEL,
  syncAudioBooks,
  TBook,
  Tracker,
} from "../../../tracker";
import { lastBackup } from "../../../sync";
import { Chip, Cover, Stars } from "../../../components/ui";
import { allPaths } from "../../../familiar";
import { c, themed } from "../../../theme";
import DiaryList from "../../../components/DiaryList";
import EmptyState from '../../../components/EmptyState';

type Filter = "all" | Status | `shelf:${string}` | `path:${string}`;
const FILTERS: Filter[] = ["all", "reading", "want", "read", "dnf"];

export default function Library() {
  const pad = usePad();
  const [t, setT] = useState<Tracker>({ books: [], logs: [] });
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<"books" | "diary">("books");
  const [stale, setStale] = useState(false);
  const { width } = useWindowDimensions();
  const cols = 3;
  const w = (width - 32 - (cols - 1) * 14) / cols;

  const refresh = useCallback(() => {
    setT(syncAudioBooks());
    setStale(Date.now() - lastBackup() > 7 * 86400000);
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    installSampleOnce()
      .then((added) => added && refresh())
      .catch(() => {});
  }, [refresh]);

  const shelf = filter.startsWith("shelf:")
    ? t.shelves?.find((x) => `shelf:${x.id}` === filter)
    : undefined;
  const books = shelf
    ? shelf.books
        .map((id) => t.books.find((b) => b.id === id))
        .filter((b): b is TBook => !!b)
    : t.books.filter((b) => match(b, filter)).sort((a, b) => b.added - a.added);
  const shelfMenu = (id: string, name: string) =>
    Alert.alert(name, undefined, [
      {
        text: tr("Rename"),
        onPress: () =>
          Alert.prompt(
            tr("Rename shelf"),
            undefined,
            (v) => v?.trim() && (renameShelf(id, v), refresh()),
            "plain-text",
            name,
          ),
      },
      {
        text: tr("Delete shelf"),
        style: "destructive",
        onPress: () => (removeShelf(id), setFilter("all"), refresh()),
      },
      { text: tr("Cancel"), style: "cancel" },
    ]);

  const views = (
    <View style={s.views}>
      {(["books", "diary"] as const).map((v) => (
        <Pressable key={v} style={[s.view, view === v && s.viewOn]} onPress={() => setView(v)}>
          <Ionicons name={v === "books" ? "grid-outline" : "calendar-outline"} size={15} color={view === v ? c.bg : c.dim} />
          <Text style={[s.viewText, view === v && { color: c.bg }]}>{v === "books" ? tr("Books") : tr("Diary")}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (view === "diary")
    return (
      <View style={s.wrap}>
        <DiaryList header={views} />
      </View>
    );

  return (
    <View style={s.wrap}>
      {views}
      {stale && (
        <Pressable style={s.banner} onPress={() => router.push("/settings/backups")}>
          <Text style={s.bannerText}>
            {lastBackup() ? tr("Last backup over 7 days ago") : tr("No backup yet")}{' '}{tr("· tap to back up")}
          </Text>
        </Pressable>
      )}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filters}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f}
              on={filter === f}
              onPress={() => setFilter(f)}
              label={`${f === "all" ? tr("All") : STATUS_LABEL[f as Status]} ${t.books.filter((b) => match(b, f)).length}`}
            />
          ))}
          {allPaths().filter((p) => t.books.some((b) => b.paths?.includes(p.id))).map((p) => (
            <Chip
              key={p.id}
              on={filter === `path:${p.id}`}
              onPress={() => setFilter(`path:${p.id}`)}
              label={`${p.name} ${t.books.filter((b) => b.paths?.includes(p.id)).length}`}
            />
          ))}
          {(t.shelves ?? []).map((sh) => (
            <Chip
              key={sh.id}
              on={filter === `shelf:${sh.id}`}
              onPress={() => setFilter(`shelf:${sh.id}`)}
              onLongPress={() => shelfMenu(sh.id, sh.name)}
              label={`${sh.name} ${sh.books.length}`}
            />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={books}
        key={cols}
        numColumns={cols}
        keyExtractor={(b) => b.id}
        columnWrapperStyle={{ gap: 14 }}
        contentContainerStyle={{ gap: 18, paddingBottom: 30 + pad }}
        ListEmptyComponent={
          <EmptyState
            pose={shelf ? 'idle' : 'reading'}
            text={shelf ? tr("This shelf is empty. Add books from their page.") : tr("No audiobooks yet. Add a book below to turn it into one.")}
          />
        }
        ListFooterComponent={
          <View style={{ gap: 10, marginTop: 10 }}>
            <Pressable style={s.import} onPress={() => router.push('/add')}>
              <Ionicons name="cloud-upload-outline" size={16} color={c.gold} />
              <Text style={s.importText}>{tr("Add a book (EPUB or PDF)")}</Text>
            </Pressable>
            <Pressable style={s.import} onPress={() => router.push('/jobs')}>
              <Ionicons name="timer-outline" size={16} color={c.gold} />
              <Text style={s.importText}>{tr("Books in progress")}</Text>
            </Pressable>
            <Pressable style={s.import} onPress={() => router.push('/import')}>
              <Ionicons name="headset" size={16} color={c.gold} />
              <Text style={s.importText}>{tr("Import a book or audiobook")}</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item: b }) => (
          <Pressable
            style={{ width: w }}
            onPress={() =>
              router.push({ pathname: "/title/[id]", params: { id: b.id } })
            }
          >
            <Cover book={b} width={w} />
            <Text style={s.title} numberOfLines={2}>
              {b.title}
            </Text>
            <Stars value={latestRating(t, b.id)} size={11} />
          </Pressable>
        )}
      />
    </View>
  );
}

const match = (b: TBook, f: Filter) =>
  f === "all" || b.status === f || (f.startsWith("path:") && !!b.paths?.includes(f.slice(5)));

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  banner: {
    backgroundColor: c.raised,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  bannerText: { color: c.gold, textAlign: "center" },
  filters: { gap: 8, paddingVertical: 12 },
  views: { flexDirection: "row", backgroundColor: c.panel, borderRadius: 10, padding: 3, marginTop: 10 },
  view: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: 7, borderRadius: 8 },
  viewOn: { backgroundColor: c.gold },
  viewText: { color: c.dim, fontWeight: "600" },
  empty: { color: c.dim, fontSize: 16, lineHeight: 22, marginTop: 20 },
  title: { color: c.text, fontSize: 13, marginTop: 6, marginBottom: 3 },
  import: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.line,
  },
  importText: { color: c.gold, fontWeight: "600" },
}));
