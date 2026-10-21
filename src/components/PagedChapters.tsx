import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Block, Chapter, imageUri } from '../reader';
import { highlightBg, HighlightColour } from '../marks';
import { bodyText, TextStyle, useTextStyle } from '../textStyle';
import { t as tr } from '../i18n';
import { c, F, themed } from '../theme';

export type Look = { hl: Map<string, HighlightColour | undefined>; bm: Set<string> };
export const markKey = (ci: number, bi: number, b: Block) => (b.at ? `s${b.at[0]}:${b.at[1]}` : `c${ci}:${bi}`);

type Line = { text: string; h: number };
type Slice = { bi: number; from: number; to: number; h?: number };
type PageT = { ci: number; n: number; of: number; slices: Slice[] };
type Pos = { ci: number; bi: number };

const PAD_TOP = 16;
const PAD_BOTTOM = 56;
const HEAD_TOP = 14;
const HEAD_BOTTOM = 10;
const IMG_GAP = 8;

const headStyle = (ts: TextStyle) => ({ color: c.text, fontFamily: F.heading, fontSize: ts.size + 4 });
const imgHeight = (b: Block, W: number, H: number) => Math.min(H - IMG_GAP, W / (b.ratio ?? 1.5));

function paginate(ch: Chapter, lines: Line[][], W: number, H: number, ts: TextStyle): Slice[][] {
  const pages: Slice[][] = [];
  let cur: Slice[] = [];
  let y = 0;
  const flush = () => {
    if (cur.length) pages.push(cur);
    cur = [];
    y = 0;
  };
  ch.blocks.forEach((b, bi) => {
    if (b.t === 'img') {
      const h = imgHeight(b, W, H) + IMG_GAP;
      if (y && y + h > H) flush();
      cur.push({ bi, from: 0, to: 0, h });
      y += h;
      return;
    }
    const ls = lines[bi] ?? [];
    const total = ls.reduce((n, l) => n + l.h, 0);
    if (b.t === 'h') {
      const next = lines[bi + 1]?.[0]?.h ?? 0;
      if (y && y + HEAD_TOP + total + HEAD_BOTTOM + next > H) flush();
      if (y) y += HEAD_TOP;
    }
    let from = 0;
    ls.forEach((l, li) => {
      if (y + l.h > H && (li > from || y > 0)) {
        if (li > from) cur.push({ bi, from, to: li });
        flush();
        from = li;
      }
      y += l.h;
    });
    cur.push({ bi, from, to: ls.length });
    y += b.t === 'h' ? HEAD_BOTTOM : ts.gap;
  });
  flush();
  return pages.length ? pages : [[]];
}

function Measure({ ch, width, ts, onDone }: { ch: Chapter; width: number; ts: TextStyle; onDone: (lines: Line[][]) => void }) {
  const got = useRef<Line[][]>([]);
  const left = useRef(ch.blocks.filter((b) => b.t !== 'img').length);
  useEffect(() => {
    if (!ch.blocks.some((b) => b.t !== 'img')) onDone([]);
  }, [ch, onDone]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, opacity: 0 }}>
      {ch.blocks.map((b, bi) =>
        b.t === 'img' ? null : (
          <Text
            key={bi}
            style={b.t === 'h' ? headStyle(ts) : bodyText(ts, true)}
            onTextLayout={(e) => {
              if (got.current[bi]) return;
              got.current[bi] = e.nativeEvent.lines.map((l) => ({ text: l.text, h: l.height }));
              if (--left.current === 0) onDone(got.current);
            }}
          >
            {b.text}
          </Text>
        ),
      )}
    </View>
  );
}

const PageView = memo(function PageView({
  page,
  ch,
  lines,
  width,
  H,
  look,
  now,
  folder,
  onHold,
}: {
  page: PageT;
  ch: Chapter;
  lines: Line[][];
  width: number;
  H: number;
  look: Look;
  now?: [number, number];
  folder: string;
  onHold: (ci: number, bi: number) => void;
}) {
  const ts = useTextStyle();
  const W = width - 40;
  return (
    <View style={[s.page, { width }]}>
      {page.slices.map((sl, i) => {
        const b = ch.blocks[sl.bi];
        const k = markKey(page.ci, sl.bi, b);
        const bg = highlightBg(look.hl.get(k));
        const playing = !!now && !!b.at && b.at[0] === now[0] && b.at[1] === now[1];
        const ls = lines[sl.bi] ?? [];
        const text = sl.from === 0 && sl.to === ls.length ? b.text : ls.slice(sl.from, sl.to).map((l) => l.text).join('');
        return (
          <Pressable key={i} onLongPress={() => onHold(page.ci, sl.bi)} style={[s.block, bg && { backgroundColor: bg }]}>
            {playing && <View style={s.bar} />}
            {look.bm.has(k) && sl.from === 0 && <Ionicons name="bookmark" size={12} color={c.gold} style={s.bm} />}
            {b.t === 'img' ? (
              <Image source={{ uri: imageUri(folder, b.src!) }} style={{ width: W, height: imgHeight(b, W, H), marginBottom: IMG_GAP }} resizeMode="contain" />
            ) : b.t === 'h' ? (
              <Text style={[headStyle(ts), { marginTop: i ? HEAD_TOP : 0, marginBottom: HEAD_BOTTOM }]}>{text}</Text>
            ) : (
              <Text style={[bodyText(ts, true), { marginBottom: ts.gap }]}>{text}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
});

export default function PagedChapters({
  chapters,
  width,
  look,
  now,
  folder,
  jump,
  onHold,
  onPage,
}: {
  chapters: Chapter[];
  width: number;
  look: Look;
  now?: [number, number];
  folder: string;
  jump: Pos & { n: number };
  onHold: (ci: number, bi: number) => void;
  onPage: (ci: number, bi: number) => void;
}) {
  const ts = useTextStyle();
  const [area, setArea] = useState(0);
  const H = Math.max(0, area - PAD_TOP - PAD_BOTTOM - 2);
  const W = width - 40;
  const lkey = `${width}|${H}|${JSON.stringify(ts)}`;
  const [measured, setMeasured] = useState<{ key: string; by: Record<number, Line[][]> }>({ key: lkey, by: {} });
  const by = useMemo(() => (measured.key === lkey ? measured.by : {}), [measured, lkey]);
  const [cur, setCur] = useState(jump.ci);
  const [at, setAt] = useState<Pos>(jump);
  const [pending, setPending] = useState<Pos | null>(jump);
  const [session, setSession] = useState(0);
  const [seen, setSeen] = useState({ n: jump.n, lkey });
  if (seen.n !== jump.n) {
    setSeen({ n: jump.n, lkey });
    setCur(jump.ci);
    setAt(jump);
    setPending(jump);
    setSession(session + 1);
  } else if (seen.lkey !== lkey) {
    setSeen({ n: jump.n, lkey });
    setPending(at);
  }
  const list = useRef<FlatList<PageT>>(null);

  const pagesOf = useMemo(() => {
    const out: Record<number, Slice[][]> = {};
    if (!H) return out;
    for (const k of Object.keys(by)) out[+k] = paginate(chapters[+k], by[+k], W, H, ts);
    return out;
  }, [by, chapters, W, H, ts]);

  const data = useMemo(() => {
    if (!pagesOf[cur]) return [];
    let lo = cur;
    let hi = cur;
    while (pagesOf[lo - 1]) lo--;
    while (pagesOf[hi + 1]) hi++;
    const out: PageT[] = [];
    for (let ci = lo; ci <= hi; ci++) pagesOf[ci].forEach((slices, n) => out.push({ ci, n: n + 1, of: pagesOf[ci].length, slices }));
    return out;
  }, [pagesOf, cur]);

  const indexOf = (p: Pos | null) => {
    let best = -1;
    if (p)
      data.forEach((pg, i) => {
        const f = pg.slices[0];
        if (pg.ci === p.ci && (best < 0 || (f && (f.bi < p.bi || (f.bi === p.bi && f.from === 0))))) best = i;
      });
    return best;
  };
  const target = indexOf(pending);

  useEffect(() => {
    if (target >= 0) list.current?.scrollToIndex({ index: target, animated: false });
  }, [target]);

  const toMeasure = H ? [cur, cur + 1, cur - 1].find((ci) => ci >= 0 && ci < chapters.length && !by[ci]) : undefined;
  const shown = indexOf(at);
  const page = data[target >= 0 ? target : Math.max(0, shown)];

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setArea(Math.round(e.nativeEvent.layout.height))}>
      {toMeasure !== undefined && (
        <Measure
          key={`${toMeasure}|${lkey}`}
          ch={chapters[toMeasure]}
          width={W}
          ts={ts}
          onDone={(ls) => setMeasured((m) => ({ key: lkey, by: { ...(m.key === lkey ? m.by : {}), [toMeasure]: ls } }))}
        />
      )}
      {data.length > 0 && (
        <FlatList
          key={`${session}|${lkey}`}
          ref={list}
          data={data}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.max(0, target)}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(p) => `${p.ci}:${p.n}`}
          windowSize={5}
          onMomentumScrollEnd={(e) => {
            const p = data[Math.round(e.nativeEvent.contentOffset.x / width)];
            if (!p) return;
            const bi = p.slices[0]?.bi ?? 0;
            setPending(null);
            setCur(p.ci);
            setAt({ ci: p.ci, bi });
            onPage(p.ci, bi);
          }}
          renderItem={({ item: p }) => <PageView page={p} ch={chapters[p.ci]} lines={by[p.ci]} width={width} H={H} look={look} now={now} folder={folder} onHold={onHold} />}
        />
      )}
      {page && <Text style={s.pager}>{tr('Page {0} of {1}', { 0: page.n, 1: page.of })}</Text>}
    </View>
  );
}

const s = themed(() => ({
  page: { paddingHorizontal: 20, paddingTop: PAD_TOP, overflow: 'hidden' as const },
  block: { borderRadius: 6, paddingHorizontal: 4, marginHorizontal: -4 },
  bar: { position: 'absolute' as const, left: -6, top: 4, bottom: 4, width: 3, borderRadius: 2, backgroundColor: c.gold },
  bm: { position: 'absolute' as const, left: -16, top: 4 },
  pager: { position: 'absolute' as const, bottom: 24, alignSelf: 'center' as const, color: c.dim, fontSize: 12, backgroundColor: c.panel, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' as const },
}));
