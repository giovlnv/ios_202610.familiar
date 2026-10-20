import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePlayback } from '../playback';
import { c, themed } from '../theme';
import { explainStart, explanationsOn, useExplanations } from '../explanations';

export default function MiniPlayer() {
  const { item, sec, t, status, toggle, skip, stop, setMiniH, preparing } = usePlayback();
  const section = item?.book.sections[sec];
  useExplanations();
  const endT = (item && !explanationsOn(item.folder) && explainStart(section)) || status.duration || 0;
  const para = useMemo(() => {
    const ps = section?.paras ?? [];
    let i = 0;
    while (i + 1 < ps.length && ps[i + 1].start <= t + 0.05) i++;
    return ps[i];
  }, [section, t]);
  if (!item || !section) return null;
  const explain = para?.kind.startsWith('explain');
  const open = () => router.push({ pathname: '/player/[id]', params: { id: item.folder } });
  return (
    <View style={s.card} onLayout={(e) => setMiniH(e.nativeEvent.layout.height + 16)}>
      <View style={s.bar}>
        <View style={[s.fill, { width: `${endT ? Math.min(1, t / endT) * 100 : 0}%` }]} />
      </View>
      <View style={s.row}>
        <Pressable style={{ flex: 1 }} onPress={open}>
          <Text style={s.title} numberOfLines={1}>
            {section.title}
          </Text>
          <Text style={s.kind}>{explain ? 'Explanation' : 'Reading'}</Text>
        </Pressable>
        <Pressable onPress={() => skip(-15)} hitSlop={8}>
          <Ionicons name="arrow-undo" size={22} color={c.text} />
        </Pressable>
        <Pressable onPress={toggle} hitSlop={8}>
          {preparing ? <ActivityIndicator color={c.gold} /> : <Ionicons name={status.playing ? 'pause' : 'play'} size={28} color={c.gold} />}
        </Pressable>
        <Pressable onPress={stop} hitSlop={8}>
          <Ionicons name="close" size={22} color={c.dim} />
        </Pressable>
      </View>
    </View>
  );
}

const s = themed(() => ({
  card: {
    marginHorizontal: 8,
    marginBottom: 8,
    backgroundColor: c.panel,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  bar: { height: 2, backgroundColor: c.line },
  fill: { height: 2, backgroundColor: c.gold },
  row: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 14, paddingTop: 10 },
  title: { color: c.text, fontSize: 15, fontWeight: '600' },
  kind: { color: c.gold, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  text: { color: c.text, fontSize: 15, lineHeight: 21, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12 },
}));
