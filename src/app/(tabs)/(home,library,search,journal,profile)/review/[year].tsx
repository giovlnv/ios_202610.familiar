import { usePad } from '../../../../playback';
import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { daysBetween, load, TBook } from "../../../../tracker";
import { Cover, Stars } from "../../../../components/ui";
import { c, F, themed } from "../../../../theme";
import EmptyState from '../../../../components/EmptyState';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ShareFrame, useShareCard } from '../../../../components/ShareCard';
import { streaks } from '../../../../streaks';
import { loadJournal } from '../../../../journal';

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function Review() {
  const pad = usePad();
  const { year } = useLocalSearchParams<{ year: string }>();
  const { width } = useWindowDimensions();
  const t = useMemo(() => load(), []);
  const byId = new Map(t.books.map((b) => [b.id, b]));
  const logs = t.logs
    .filter((l) => l.date.startsWith(year))
    .sort((a, b) => a.date.localeCompare(b.date));
  const read = logs
    .map((l) => ({ l, b: byId.get(l.bookId) }))
    .filter((x): x is { l: (typeof logs)[0]; b: TBook } => !!x.b);
  const pages = read.reduce((n, x) => n + (x.b.pages ?? 0), 0);
  const secs = Object.entries(t.listened ?? {})
    .filter(([d]) => d.startsWith(year))
    .reduce((n, [, m]) => n + Object.values(m).reduce((a, z) => a + z, 0), 0);
  const rated = read.filter((x) => x.l.rating);
  const best = [...rated].sort((a, z) => z.l.rating! - a.l.rating!).slice(0, 3);
  const withPages = read
    .filter((x) => x.b.pages)
    .sort((a, z) => z.b.pages! - a.b.pages!);
  const perMonth = MONTHS.map(
    (_, i) => read.filter((x) => Number(x.l.date.slice(5, 7)) === i + 1).length,
  );
  const busiest = perMonth.indexOf(Math.max(...perMonth));
  const authors = new Map<string, number>();
  for (const x of read)
    for (const a of x.b.authors) authors.set(a, (authors.get(a) ?? 0) + 1);
  const topAuthor = [...authors].sort((a, z) => z[1] - a[1])[0];
  const fastest = read
    .filter((x) => x.l.started)
    .sort(
      (a, z) =>
        daysBetween(a.l.started!, a.l.date) -
        daysBetween(z.l.started!, z.l.date),
    )[0];
  const w = (width - 32 - 3 * 8) / 4;
  const open = (id: string) =>
    router.push({ pathname: "/title/[id]", params: { id } });

  const st = streaks(year);
  const readings = loadJournal().readings.filter((r) => r.at.startsWith(year)).length;
  const facts: [string, string][] = [
    ["Books", String(read.length)],
    ["Pages", pages.toLocaleString()],
    ["Hours listened", (secs / 3600).toFixed(1)],
    ["Rereads", String(read.filter((x) => x.l.reread).length)],
    ["Readings", String(readings)],
    ["Longest streak", `${st.longest} ${st.longest === 1 ? "day" : "days"}`],
  ];
  const card = useShareCard();
  const share = () =>
    card.share(
      <ShareFrame>
        <Text style={s.shareYear}>{year} in review</Text>
        <View style={[s.facts, { width: 312 }]}>
          {facts.map(([k, v]) => (
            <View key={k} style={[s.fact, { width: 150 }]}>
              <Text style={s.factNum}>{v}</Text>
              <Text style={s.dim}>{k}</Text>
            </View>
          ))}
        </View>
        {best[0] && (
          <View style={{ alignItems: "center", gap: 6 }}>
            <Text style={s.dim}>Highest rated</Text>
            <Cover book={best[0].b} width={70} />
            <Text style={[s.rowText, { textAlign: "center", flex: 0 }]}>{best[0].b.title}</Text>
          </View>
        )}
      </ShareFrame>,
      `${year} in review: ${facts.map(([k, v]) => `${k} ${v}`).join(" · ")}`,
    );

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 50 + pad }}>
      <Stack.Screen
        options={{
          title: `${year} in review`,
          headerRight: () => (
            <Pressable hitSlop={10} onPress={share} accessibilityLabel="Share">
              <Ionicons name="share-outline" size={22} color={c.gold} />
            </Pressable>
          ),
        }}
      />
      <View style={s.facts}>
        {facts.map(([k, v]) => (
          <View key={k} style={s.fact}>
            <Text style={s.factNum}>{v}</Text>
            <Text style={s.dim}>{k}</Text>
          </View>
        ))}
      </View>

      {!read.length && <EmptyState pose="sleeping" text={`Nothing logged in ${year} yet.`} />}

      {best.length > 0 && (
        <>
          <Text style={s.h2}>Highest rated</Text>
          {best.map((x) => (
            <Pressable key={x.l.id} style={s.row} onPress={() => open(x.b.id)}>
              <Cover book={x.b} width={44} />
              <Text style={s.rowText} numberOfLines={2}>
                {x.b.title}
              </Text>
              <Stars value={x.l.rating} size={13} />
            </Pressable>
          ))}
        </>
      )}

      {read.length > 0 && (
        <View style={s.card}>
          {perMonth[busiest] > 0 && (
            <Line
              k="Busiest month"
              v={`${MONTHS[busiest]} · ${perMonth[busiest]} books`}
            />
          )}
          {topAuthor && (
            <Line
              k="Most read author"
              v={`${topAuthor[0]} · ${topAuthor[1]}`}
            />
          )}
          {withPages[0] && (
            <Line
              k="Longest"
              v={`${withPages[0].b.title} · ${withPages[0].b.pages} p`}
            />
          )}
          {withPages.length > 1 && (
            <Line
              k="Shortest"
              v={`${withPages.at(-1)!.b.title} · ${withPages.at(-1)!.b.pages} p`}
            />
          )}
          {fastest && (
            <Line
              k="Fastest read"
              v={`${fastest.b.title} · ${daysBetween(fastest.l.started!, fastest.l.date)} days`}
            />
          )}
          {rated.length > 0 && (
            <Line
              k="Average rating"
              v={(
                rated.reduce((n, x) => n + x.l.rating!, 0) / rated.length
              ).toFixed(2)}
            />
          )}
        </View>
      )}

      {read.length > 0 && <Text style={s.h2}>Every book, in order</Text>}
      <View style={s.grid}>
        {read.map((x) => (
          <Pressable key={x.l.id} onPress={() => open(x.b.id)}>
            <Cover book={x.b} width={w} />
          </Pressable>
        ))}
      </View>
      {card.host}
    </ScrollView>
  );
}

const Line = ({ k, v }: { k: string; v: string }) => (
  <View style={s.line}>
    <Text style={s.dim}>{k}</Text>
    <Text style={s.lineV} numberOfLines={2}>
      {v}
    </Text>
  </View>
);

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  fact: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: c.panel,
    borderRadius: 12,
    padding: 14,
  },
  factNum: { color: c.gold, fontSize: 30, fontWeight: "800" },
  dim: { color: c.dim },
  p: { color: c.dim, marginTop: 20, fontSize: 16 },
  h2: {
    color: c.text,
    fontSize: 19,
    marginTop: 24,
    marginBottom: 10, fontFamily: F.heading },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  rowText: { color: c.text, flex: 1, fontSize: 15 },
  card: {
    backgroundColor: c.panel,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    gap: 10,
  },
  line: { gap: 2 },
  lineV: { color: c.text, fontSize: 15 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  shareYear: { color: c.text, fontFamily: F.heading, fontSize: 22 },
}));
