import { t as tr } from '../../../i18n';
import { usePad } from '../../../playback';
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router, Stack, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { daysBetween, load, Tracker } from "../../../tracker";
import { Chip, Cover } from "../../../components/ui";
import { c, F, read, themed, write } from "../../../theme";
import ProfileHeader from "../../../components/ProfileHeader";
import { ThemeSheet } from "../../../components/ThemeSheet";
import { FamiliarArt } from "../../../components/Familiar";
import { loadFamiliars, withYou } from "../../../familiar";

type Metric = "books" | "pages" | "hours";
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export default function Profile({ mode }: { mode?: 'stats' }) {
  const statsMode = mode === 'stats';
  const pad = usePad();
  const [t, setT] = useState<Tracker>({ books: [], logs: [] });
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [metric, setMetric] = useState<Metric>("books");
  const [theming, setTheming] = useState(false);
  const [top4, setTop4] = useState(() => read("top4.txt") !== "0");
  const { width } = useWindowDimensions();
  useFocusEffect(useCallback(() => setT(load()), []));

  const byId = new Map(t.books.map((b) => [b.id, b]));
  const listened = Object.entries(t.listened ?? {});
  const years = [
    ...new Set([
      String(new Date().getFullYear()),
      ...t.logs.map((l) => l.date.slice(0, 4)),
      ...listened.map(([d]) => d.slice(0, 4)),
    ]),
  ].sort((a, b) => b.localeCompare(a));
  const all = year === "all";
  const inScope = (d: string) => all || d.startsWith(year);

  const logs = t.logs.filter((l) => inScope(l.date));
  const days = listened.filter(([d]) => inScope(d));
  const pagesOf = (id: string) => byId.get(id)?.pages ?? 0;
  const daySecs = (m: Record<string, number>) =>
    Object.values(m).reduce((a, b) => a + b, 0);
  const secs = days.reduce((s, [, m]) => s + daySecs(m), 0);
  const rated = logs.filter((l) => l.rating);
  const avg = rated.length
    ? rated.reduce((s, l) => s + (l.rating ?? 0), 0) / rated.length
    : 0;

  const buckets = all
    ? [...years].reverse()
    : MONTHS.map((_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const keyOf = (d: string) => (all ? d.slice(0, 4) : d.slice(0, 7));
  const series = buckets.map((k) => {
    if (metric === "hours")
      return (
        days
          .filter(([d]) => keyOf(d) === k)
          .reduce((s, [, m]) => s + daySecs(m), 0) / 3600
      );
    const ls = logs.filter((l) => keyOf(l.date) === k);
    return metric === "books"
      ? ls.length
      : ls.reduce((s, l) => s + pagesOf(l.bookId), 0);
  });
  const labels = all ? buckets.map((y) => `'${y.slice(2)}`) : MONTHS;

  const genres = count(logs.flatMap((l) => byId.get(l.bookId)?.genres ?? [])).slice(0, 6);
  const authors = count(
    logs.flatMap((l) => byId.get(l.bookId)?.authors ?? []),
  ).slice(0, 5);
  const perBook = new Map<string, number>();
  for (const [, m] of days)
    for (const [f, n] of Object.entries(m))
      perBook.set(f, (perBook.get(f) ?? 0) + n);
  const topAudio = [...perBook.entries()]
    .map(([f, n]) => ({ b: t.books.find((x) => x.audio === f), n }))
    .filter((x) => x.b)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);
  const dist = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(
    (r) => rated.filter((l) => l.rating === r).length,
  );
  const longest = logs
    .map((l) => byId.get(l.bookId))
    .filter((b) => b?.pages)
    .sort((a, b) => b!.pages! - a!.pages!)[0];
  const favW = (width - 32 - 30) / 4;
  const open = (id: string) =>
    router.push({ pathname: "/title/[id]", params: { id } });

  const paced = logs.filter((l) => l.started);
  const pace = paced.length
    ? paced.reduce((n, l) => n + daysBetween(l.started!, l.date), 0) /
      paced.length
    : 0;
  const favs = (t.favorites ?? []).map((id) => byId.get(id)).filter((b) => !!b);

  const tiles = [
    ["Books read", logs.length],
    ["Pages", logs.reduce((s, l) => s + pagesOf(l.bookId), 0).toLocaleString()],
    ["Hours listened", (secs / 3600).toFixed(1)],
    ["Avg rating", rated.length ? avg.toFixed(2) : "–"],
    ["Avg days to finish", paced.length ? pace.toFixed(1) : "–"],
    ["Rereads", logs.filter((l) => l.reread).length],
    ["In library", t.books.length],
  ] as const;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 + pad }}>
      {!statsMode && (
        <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable hitSlop={10} onPress={() => setTheming(true)} accessibilityLabel={tr("Theme")}>
              <Ionicons name="color-palette-outline" size={24} color={c.gold} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable hitSlop={10} onPress={() => router.push("/settings")} accessibilityLabel={tr("Settings")}>
              <Ionicons name="settings-outline" size={24} color={c.gold} />
            </Pressable>
          ),
        }}
      />
      <ThemeSheet visible={theming} onClose={() => setTheming(false)} />
      <ProfileHeader />
      <Pressable style={s.familiar} onPress={() => router.push("/familiars")}>
        <FamiliarArt familiar={withYou()} size={56} vial />
        <View style={{ flex: 1 }}>
          <Text style={s.famTitle}>{tr("Your familiars")}</Text>
          <Text style={s.famDim}>
            {withYou().name}{' '}{tr("is with you ·")}{' '}{loadFamiliars().list.length}{' '}{tr("in all")}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={c.dim} />
      </Pressable>
      <Pressable style={s.foldHead} onPress={() => (write('top4.txt', top4 ? '0' : '1'), setTop4(!top4))} accessibilityState={{ expanded: top4 }}>
        <Text style={[s.h2, { marginTop: 0, marginBottom: 0 }]}>{tr("Top 4")}</Text>
        <Ionicons name={top4 ? 'chevron-up' : 'chevron-down'} size={18} color={c.dim} />
      </Pressable>
      {top4 && (
        <>
        <View style={s.favs}>
          {[0, 1, 2, 3].map((i) =>
            favs[i] ? (
              <Pressable key={i} onPress={() => open(favs[i]!.id)}>
                <Cover book={favs[i]!} width={favW} />
              </Pressable>
            ) : (
              <View
                key={i}
                style={[s.favEmpty, { width: favW, height: favW * 1.5 }]}
              >
                <Ionicons name="add" size={22} color={c.line} />
              </View>
            ),
          )}
        </View>
        {favs.length < 4 && (
          <Text style={s.note}>
            {tr("Add favorites from the menu on a book’s page (top right).")}
          </Text>
        )}
        </>
      )}

      <Pressable style={s.link} onPress={() => router.push("/stats")}>
        <Ionicons name="stats-chart-outline" size={18} color={c.gold} />
        <Text style={s.linkText}>{tr("Stats ·")}{' '}{t.logs.length}{' '}{tr("books logged")}</Text>
        <Ionicons name="chevron-forward" size={16} color={c.dim} />
      </Pressable>
      <Pressable style={s.link} onPress={() => router.push("/lists")}>
        <Ionicons name="list" size={18} color={c.gold} />
        <Text style={s.linkText}>{tr("Lists (")}{t.lists?.length ?? 0})</Text>
        <Ionicons name="chevron-forward" size={16} color={c.dim} />
      </Pressable>
        </>
      )}
      {statsMode && (
        <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
      >
        {years.map((y) => (
          <Chip key={y} label={y} on={year === y} onPress={() => setYear(y)} />
        ))}
        <Chip label={tr("All time")} on={all} onPress={() => setYear("all")} />
      </ScrollView>

      <View style={s.tiles}>
        {tiles.map(([label, n]) => (
          <View key={label} style={s.tile}>
            <Text style={s.tileNum}>{n}</Text>
            <Text style={s.tileLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={s.headRow}>
        <Text style={[s.h2, { margin: 0 }]}>
          {all ? tr("By year") : tr("By month")}
        </Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {(["books", "pages", "hours"] as Metric[]).map((m) => (
            <Chip
              key={m}
              label={m}
              on={metric === m}
              onPress={() => setMetric(m)}
            />
          ))}
        </View>
      </View>
      <Bars
        values={series}
        labels={labels}
        fmt={(v) => (metric === "hours" ? v.toFixed(1) : String(Math.round(v)))}
      />
      {metric === "pages" && logs.some((l) => !pagesOf(l.bookId)) && (
        <Text style={s.note}>
          {tr("Some books have no page count. Use “Find details on Open Library” on their page.")}
        </Text>
      )}

      {genres.length > 0 && (
        <>
          <Text style={s.h2}>{tr("Genres")}</Text>
          <View style={[s.card, { gap: 10 }]}>
            {genres.map(([g, n]) => (
              <View key={g} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: c.text, width: 120, fontSize: 13 }} numberOfLines={1}>
                  {g}
                </Text>
                <View style={{ flex: 1, height: 8, backgroundColor: c.line, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${(n / genres[0][1]) * 100}%`, height: 8, backgroundColor: c.gold }} />
                </View>
                <Text style={[s.dim, { width: 28, textAlign: 'right' }]}>{n}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={s.h2}>{tr("Top authors")}</Text>
      {authors.length ? (
        <View style={s.card}>
          {authors.map(([a, n]) => (
            <View key={a} style={s.line}>
              <Text style={s.lineText} numberOfLines={1}>
                {a}
              </Text>
              <Text style={s.dim}>
                {n} {n === 1 ? "book" : "books"}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={s.dim}>{tr("Log books with authors to see this.")}</Text>
      )}

      {topAudio.length > 0 && (
        <>
          <Text style={s.h2}>{tr("Most listened")}</Text>
          {topAudio.map(({ b, n }) => (
            <Pressable key={b!.id} style={s.row} onPress={() => open(b!.id)}>
              <Cover book={b!} width={36} />
              <Text style={s.lineText} numberOfLines={1}>
                {b!.title}
              </Text>
              <Text style={s.dim}>{(n / 3600).toFixed(1)} h</Text>
            </Pressable>
          ))}
        </>
      )}

      {longest && (
        <>
          <Text style={s.h2}>{tr("Longest read")}</Text>
          <Pressable style={s.row} onPress={() => open(longest.id)}>
            <Cover book={longest} width={36} />
            <Text style={s.lineText} numberOfLines={1}>
              {longest.title}
            </Text>
            <Text style={s.dim}>{longest.pages} pages</Text>
          </Pressable>
        </>
      )}

      {!all && (
        <Pressable
          style={s.link}
          onPress={() =>
            router.push({ pathname: "/review/[year]", params: { year } })
          }
        >
          <Ionicons name="sparkles-outline" size={18} color={c.gold} />
          <Text style={s.linkText}>{year}{' '}{tr("in review")}</Text>
          <Ionicons name="chevron-forward" size={16} color={c.dim} />
        </Pressable>
      )}

      <Text style={s.h2}>{tr("Ratings")}</Text>
      <Bars
        values={dist}
        labels={["½", "1", "", "2", "", "3", "", "4", "", "5"]}
        fmt={String}
      />

        </>
      )}
    </ScrollView>
  );
}

function Bars({
  values,
  labels,
  fmt,
}: {
  values: number[];
  labels: string[];
  fmt: (v: number) => string;
}) {
  const max = Math.max(...values, 0);
  return (
    <View style={s.card}>
      <View style={s.hist}>
        {values.map((v, i) => (
          <View key={i} style={s.col}>
            <Text style={s.val}>{v ? fmt(v) : ""}</Text>
            <View
              style={[s.colFill, { height: max ? `${(v / max) * 80}%` : 0 }]}
            />
          </View>
        ))}
      </View>
      <View style={s.axis}>
        {labels.map((l, i) => (
          <Text key={i} style={s.axisText}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const count = (xs: string[]) =>
  [
    ...xs.reduce(
      (m, x) => m.set(x, (m.get(x) ?? 0) + 1),
      new Map<string, number>(),
    ),
  ].sort((a, b) => b[1] - a[1]);

const s = themed(() => ({
  familiar: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.panel, borderRadius: 14, padding: 10, marginTop: 12 },
  famTitle: { color: c.text, fontSize: 15, fontWeight: "600" },
  famDim: { color: c.dim, fontSize: 12, marginTop: 2 },
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  chips: { gap: 8, paddingVertical: 12 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "31%",
    flexGrow: 1,
    backgroundColor: c.panel,
    borderRadius: 12,
    padding: 12,
  },
  tileNum: { color: c.gold, fontSize: 22, fontWeight: "800" },
  tileLabel: { color: c.dim, fontSize: 12, marginTop: 2 },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 10,
  },
  h2: {
    color: c.text,
    fontSize: 19,
    marginTop: 24,
    marginBottom: 10, fontFamily: F.heading },
  card: { backgroundColor: c.panel, borderRadius: 12, padding: 14 },
  hist: { flexDirection: "row", alignItems: "flex-end", height: 110, gap: 4 },
  col: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  colFill: {
    alignSelf: "stretch",
    backgroundColor: c.gold,
    borderRadius: 3,
    minHeight: 2,
  },
  val: { color: c.dim, fontSize: 9, marginBottom: 2 },
  axis: { flexDirection: "row", gap: 4, marginTop: 6 },
  axisText: { flex: 1, color: c.dim, fontSize: 11, textAlign: "center" },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    gap: 10,
  },
  lineText: { color: c.text, fontSize: 15, flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  dim: { color: c.dim },
  note: { color: c.dim, fontSize: 12, marginTop: 6 },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: c.panel,
    borderRadius: 12,
    padding: 14,
    marginTop: 28,
  },
  linkText: { color: c.text, flex: 1, fontSize: 16 },
  favs: { flexDirection: "row", gap: 10 },
  foldHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 6 },
  favEmpty: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.line,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
}));
