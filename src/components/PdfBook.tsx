import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { File } from 'expo-file-system';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PdfReader } from '../../modules/audio-encoder';
import { getPos, PdfLinks, pdfLinks, setPos } from '../reader';
import { Book } from '../types';
import { t as tr } from '../i18n';
import { c, themed } from '../theme';

export default function PdfBook({ id, book, src, now }: { id: string; book: Book; src: File; now?: [number, number] }) {
  const [page, setPage] = useState(() => getPos(id).chapter);
  const [of, setOf] = useState(0);
  const [links, setLinks] = useState<PdfLinks | null>(null);

  useEffect(() => {
    let live = true;
    pdfLinks(src, book)
      .then((l) => live && setLinks(l))
      .catch(() => live && setLinks({ at: {}, first: [] }));
    return () => {
      live = false;
    };
  }, [src, book]);

  const playing = now && links ? links.at[`${now[0]}:${now[1]}`] : undefined;
  const here = links?.first.slice(0, page + 1).findLast(Boolean);

  const go = (p: number) => {
    setPage(p);
    setPos(id, p, 0);
  };

  return (
    <View style={s.wrap}>
      <Stack.Screen
        options={{
          title: book.title,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 18 }}>
              {playing !== undefined && (
                <Pressable hitSlop={10} onPress={() => go(playing)} accessibilityLabel={tr('Go to what is playing')}>
                  <Ionicons name="headset-outline" size={21} color={c.gold} />
                </Pressable>
              )}
              <Pressable hitSlop={10} onPress={() => import('expo-sharing').then((m) => m.shareAsync(src.uri))} accessibilityLabel={tr('Open in another app')}>
                <Ionicons name="share-outline" size={21} color={c.gold} />
              </Pressable>
            </View>
          ),
        }}
      />
      <PdfReader
        style={{ flex: 1 }}
        uri={src.uri}
        page={page}
        onPageChange={(e) => {
          setOf(e.nativeEvent.of);
          if (e.nativeEvent.page !== page) go(e.nativeEvent.page);
        }}
      />
      <View style={s.bar}>
        {of > 0 && <Text style={s.pager}>{tr('Page {0} of {1}', { 0: page + 1, 1: of })}</Text>}
        {playing === page && <Ionicons name="volume-medium-outline" size={16} color={c.gold} />}
        {here && (
          <Pressable style={s.listen} onPress={() => router.push({ pathname: '/player/[id]', params: { id, section: String(here[0]), para: String(here[1]) } })}>
            <Ionicons name="play" size={14} color={c.bg} />
            <Text style={s.listenText}>{tr('Listen from here')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 10, paddingBottom: 28, backgroundColor: c.panel, borderTopWidth: 1, borderTopColor: c.line },
  pager: { color: c.dim, fontSize: 13 },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.gold, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 14 },
  listenText: { color: c.bg, fontSize: 14, fontWeight: '600' },
}));
