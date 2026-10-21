import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getBook } from '../../../../storage';
import { Block, buildReader, Chapter, fetchSource, getPos, imageUri, keepSource, loadReader, ReaderBook, setPos, sourceFile } from '../../../../reader';
import { HIGHLIGHTS, highlightBg, HighlightColour, loadMarks, Mark, setHighlight, toggleBookmark } from '../../../../marks';
import { bodyText, useTextStyle } from '../../../../textStyle';
import TextStyleSheet from '../../../../components/TextStyleSheet';
import { usePlayback } from '../../../../playback';
import { t as tr } from '../../../../i18n';
import { c, F, themed } from '../../../../theme';
import { Btn } from '../../../../components/settings-ui';

type Look = { hl: Map<string, HighlightColour | undefined>; bm: Set<string> };
const markKey = (ci: number, bi: number, b: Block) => (b.at ? `s${b.at[0]}:${b.at[1]}` : `c${ci}:${bi}`);

const Page = memo(function Page({
  ch,
  ci,
  width,
  look,
  now,
  target,
  folder,
  onHold,
  onScrollTo,
}: {
  ch: Chapter;
  ci: number;
  width: number;
  look: Look;
  now?: [number, number];
  target?: number;
  folder: string;
  onHold: (ci: number, bi: number) => void;
  onScrollTo: (ci: number, bi: number) => void;
}) {
  const ts = useTextStyle();
  const ys = useRef<number[]>([]);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (target === undefined) return;
    const id = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, (ys.current[target] ?? 0) - 80), animated: true }), 250);
    return () => clearTimeout(id);
  }, [target]);
  return (
    <ScrollView
      ref={scroll}
      style={{ width }}
      contentContainerStyle={s.page}
      scrollEventThrottle={200}
      onMomentumScrollEnd={(e) => {
        const y = e.nativeEvent.contentOffset.y;
        const bi = ys.current.findIndex((v) => v >= y);
        onScrollTo(ci, Math.max(0, bi));
      }}
    >
      {ch.blocks.map((b, bi) => {
        const k = markKey(ci, bi, b);
        const playing = !!now && !!b.at && b.at[0] === now[0] && b.at[1] === now[1];
        const bg = highlightBg(look.hl.get(k));
        return (
          <Pressable key={bi} onLayout={(e) => (ys.current[bi] = e.nativeEvent.layout.y)} onLongPress={() => onHold(ci, bi)} style={[s.block, bg && { backgroundColor: bg }, playing && s.playing]}>
            {b.t === 'img' ? (
              <Image source={{ uri: imageUri(folder, b.src!) }} style={{ width: width - 40, aspectRatio: b.ratio ?? 1.5 }} resizeMode="contain" />
            ) : (
              <Text style={b.t === 'h' ? [s.head, { fontSize: ts.size + 4 }] : [bodyText(ts, true), { marginBottom: ts.gap }]}>
                {look.bm.has(k) && <Ionicons name="bookmark" size={14} color={c.gold} />}
                {look.bm.has(k) && ' '}
                {b.text}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

export default function Reader() {
  const { id, chapter, block } = useLocalSearchParams<{ id: string; chapter?: string; block?: string }>();
  const item = useMemo(() => getBook(id), [id]);
  const { width } = useWindowDimensions();
  const [rb, setRb] = useState<ReaderBook | null>(() => loadReader(id));
  const [busy, setBusy] = useState<string | null>(null);
  const [src, setSrc] = useState(() => sourceFile(id));
  const start = useMemo(() => (chapter !== undefined ? { chapter: Number(chapter), block: Number(block ?? 0) } : getPos(id)), [id, chapter, block]);
  const [page, setPage] = useState(start.chapter);
  const [target, setTarget] = useState<{ ci: number; bi: number } | null>(start.block ? { ci: start.chapter, bi: start.block } : null);
  const [marks, setMarks] = useState<Mark[]>(() => loadMarks(id));
  const [toc, setToc] = useState(false);
  const [styling, setStyling] = useState(false);
  const list = useRef<FlatList<Chapter>>(null);
  const pb = usePlayback();

  const build = useCallback(async () => {
    if (!item) return;
    try {
      setBusy(tr('Preparing the book…'));
      setRb(await buildReader(id, item.book, (m) => setBusy(tr('Preparing pictures · {0}', { 0: m }))));
    } catch (e) {
      Alert.alert(tr('Could not open the book'), String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  }, [id, item]);

  useEffect(() => {
    if (rb || !src?.name.endsWith('.epub')) return;
    const t = setTimeout(build, 0);
    return () => clearTimeout(t);
  }, [src, rb, build]);

  const now = useMemo<[number, number] | undefined>(() => {
    if (pb.item?.folder !== id) return;
    const ps = item?.book.sections[pb.sec]?.paras ?? [];
    let i = 0;
    while (i + 1 < ps.length && ps[i + 1].start <= pb.t + 0.05) i++;
    return [pb.sec, i];
  }, [pb.item, pb.sec, pb.t, id, item]);

  const look = useMemo<Look>(() => {
    const hl = new Map<string, HighlightColour | undefined>();
    const bm = new Set<string>();
    const sec = new Map(item?.book.sections.map((x, i) => [x.id, i]));
    for (const m of marks) {
      const k = m.section !== undefined ? `s${sec.get(m.section)}:${m.para}` : `c${m.chapter}:${m.block}`;
      if (m.kind === 'highlight') hl.set(k, m.colour);
      else bm.add(k);
    }
    return { hl, bm };
  }, [marks, item]);

  if (!item) return <Text style={s.msg}>{tr('Book not found.')}</Text>;

  const attach = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled) return;
    keepSource(id, res.assets[0].uri, res.assets[0].name);
    setSrc(sourceFile(id));
  };
  const download = async () => {
    try {
      setBusy(tr('Downloading the book…'));
      await fetchSource(id);
      setSrc(sourceFile(id));
    } catch (e) {
      Alert.alert(tr('Download failed'), String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  };

  if (busy)
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: item.book.title }} />
        <ActivityIndicator color={c.gold} />
        <Text style={s.msg}>{busy}</Text>
      </View>
    );

  if (src?.name.endsWith('.pdf'))
    return (
      <View style={s.wrap}>
        <Stack.Screen
          options={{
            title: item.book.title,
            headerRight: () => (
              <Pressable hitSlop={10} onPress={() => import('expo-sharing').then((m) => m.shareAsync(src.uri))} accessibilityLabel={tr('Open in another app')}>
                <Ionicons name="share-outline" size={21} color={c.gold} />
              </Pressable>
            ),
          }}
        />
        <WebView source={{ uri: src.uri }} originWhitelist={['*']} allowFileAccess allowingReadAccessToURL={src.parentDirectory.uri} style={{ flex: 1, backgroundColor: c.bg }} />
      </View>
    );

  if (!src || !rb)
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: item.book.title }} />
        {src?.name.endsWith('.pdf') ? (
          <>
            <Text style={s.msg}>{tr('PDF reading comes with the next app install. The file is kept in the app.')}</Text>
            <Btn label={tr('Open in another app')} onPress={() => import('expo-sharing').then((m) => m.shareAsync(src.uri))} />
          </>
        ) : (
          <>
            <Text style={s.msg}>{tr('Keep the book file in the app to read it here.')}</Text>
            <Btn label={tr('Get it from my library on GitHub')} primary onPress={download} />
            <Btn label={tr('Choose the EPUB or PDF file')} onPress={attach} />
          </>
        )}
      </View>
    );

  const hold = (ci: number, bi: number) => {
    const b = rb.chapters[ci].blocks[bi];
    const at = b.at ? { section: item.book.sections[b.at[0]].id, para: b.at[1] } : { chapter: ci, block: bi };
    const quote = b.text ?? tr('Picture');
    const k = markKey(ci, bi, b);
    Alert.alert(tr('This passage'), undefined, [
      ...(b.at ? [{ text: tr('Listen from here'), onPress: () => router.push({ pathname: '/player/[id]', params: { id, section: String(b.at![0]), para: String(b.at![1]) } }) }] : []),
      {
        text: tr('Highlight…'),
        onPress: () =>
          Alert.alert(tr('Highlight'), undefined, [
            ...HIGHLIGHTS.map((h) => ({ text: tr(h.name), onPress: () => setMarks(setHighlight(id, { ...at, quote }, h.id)) })),
            ...(look.hl.has(k) ? [{ text: tr('Remove highlight'), style: 'destructive' as const, onPress: () => setMarks(setHighlight(id, { ...at, quote }, null)) }] : []),
            { text: tr('Cancel'), style: 'cancel' as const },
          ]),
      },
      { text: look.bm.has(k) ? tr('Remove bookmark') : tr('Bookmark here'), onPress: () => setMarks(toggleBookmark(id, { ...at, quote })) },
      { text: tr('Cancel'), style: 'cancel' },
    ]);
  };

  const goNow = () => {
    if (!now) return;
    const ci = rb.chapters.findIndex((ch) => ch.blocks.some((b) => b.at?.[0] === now[0] && b.at?.[1] === now[1]));
    if (ci < 0) return;
    const bi = rb.chapters[ci].blocks.findIndex((b) => b.at?.[0] === now[0] && b.at?.[1] === now[1]);
    list.current?.scrollToIndex({ index: ci, animated: false });
    setPage(ci);
    setTarget({ ci, bi });
  };

  return (
    <View style={s.wrap}>
      <Stack.Screen
        options={{
          title: rb.chapters[page]?.title ?? item.book.title,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 18 }}>
              {!!now && (
                <Pressable hitSlop={10} onPress={goNow} accessibilityLabel={tr('Go to what is playing')}>
                  <Ionicons name="headset-outline" size={21} color={c.gold} />
                </Pressable>
              )}
              <Pressable hitSlop={10} onPress={() => setStyling(true)} accessibilityLabel={tr('Text size and style')}>
                <Ionicons name="text-outline" size={21} color={c.gold} />
              </Pressable>
              <Pressable hitSlop={10} onPress={() => setToc(true)} accessibilityLabel={tr('Contents')}>
                <Ionicons name="list-outline" size={22} color={c.gold} />
              </Pressable>
            </View>
          ),
        }}
      />
      <FlatList
        ref={list}
        data={rb.chapters}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.min(start.chapter, rb.chapters.length - 1)}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(_, i) => String(i)}
        windowSize={3}
        onMomentumScrollEnd={(e) => {
          const ci = Math.round(e.nativeEvent.contentOffset.x / width);
          setPage(ci);
          setPos(id, ci, 0);
        }}
        renderItem={({ item: ch, index: ci }) => (
          <Page
            ch={ch}
            ci={ci}
            width={width}
            look={look}
            now={now}
            target={target?.ci === ci ? target.bi : undefined}
            folder={id}
            onHold={hold}
            onScrollTo={(c2, bi) => setPos(id, c2, bi)}
          />
        )}
      />
      <Text style={s.pager}>{tr('{0} of {1}', { 0: page + 1, 1: rb.chapters.length })}</Text>
      <Modal visible={toc} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setToc(false)}>
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>{tr('Contents')}</Text>
          <FlatList
            data={rb.chapters}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item: ch, index }) => (
              <Pressable
                style={s.tocRow}
                onPress={() => {
                  setToc(false);
                  list.current?.scrollToIndex({ index, animated: false });
                  setPage(index);
                  setPos(id, index, 0);
                }}
              >
                <Text style={[s.tocText, index === page && { color: c.gold }]}>{ch.title}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
      <TextStyleSheet visible={styling} onClose={() => setStyling(false)} />
    </View>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  msg: { color: c.dim, fontSize: 15, textAlign: 'center' },
  page: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  block: { borderRadius: 6, paddingHorizontal: 4, marginHorizontal: -4 },
  playing: { borderLeftWidth: 3, borderLeftColor: c.gold, paddingLeft: 8 },
  head: { color: c.text, fontFamily: F.heading, marginTop: 14, marginBottom: 10 },
  pager: { position: 'absolute', bottom: 24, alignSelf: 'center', color: c.dim, fontSize: 12, backgroundColor: c.panel, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  sheet: { flex: 1, backgroundColor: c.bg, padding: 16 },
  sheetTitle: { color: c.text, fontFamily: F.heading, fontSize: 22, marginBottom: 12 },
  tocRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line + '66' },
  tocText: { color: c.text, fontSize: 16 },
}));
