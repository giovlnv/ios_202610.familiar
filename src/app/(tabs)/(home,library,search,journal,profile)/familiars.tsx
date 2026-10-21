import { t as tr } from '../../../i18n';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { describe, loadFamiliars, allPaths } from '../../../familiar';
import { FamiliarArt } from '../../../components/Familiar';
import { usePad } from '../../../playback';
import { c, themed } from '../../../theme';

export default function Familiars() {
  const pad = usePad();
  const [st, setSt] = useState(loadFamiliars);
  useFocusEffect(useCallback(() => setSt(loadFamiliars()), []));

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 + pad }}>
      <Text style={s.p}>{tr("Tap a familiar to visit, pet it or walk with it. Link a familiar to a path and it appears with that path’s books.")}</Text>
      {st.list.map((f) => {
        const on = f.id === st.withYou;
        return (
          <View key={f.id} style={[s.card, on && s.cardOn]}>
            <Pressable style={s.main} onPress={() => router.push({ pathname: '/den/[id]', params: { id: f.id } })} accessibilityLabel={tr("Open {0}", { 0: f.name })}>
              <View style={s.art}>
                <FamiliarArt familiar={f} size={64} vial />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={s.titleRow}>
                  <Text style={s.title}>{f.name}</Text>
                  {on && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{tr("WITH YOU")}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.dim}>{describe(f)}</Text>
                {!!f.paths.length && (
                  <View style={s.tags}>
                    {f.paths.map((p) => {
                      const path = allPaths().find((x) => x.id === p);
                      return path ? (
                        <View key={p} style={[s.tag, { backgroundColor: path.color + '29' }]}>
                          <Text style={[s.tagText, { color: path.color }]}>{path.name}</Text>
                        </View>
                      ) : null;
                    })}
                  </View>
                )}
              </View>
            </Pressable>
            <Pressable hitSlop={10} onPress={() => router.push({ pathname: '/familiar/[id]', params: { id: f.id } })} accessibilityLabel={tr("Edit {0}", { 0: f.name })}>
              <Ionicons name="create-outline" size={20} color={c.dim} />
            </Pressable>
          </View>
        );
      })}
      <Pressable style={s.add} onPress={() => router.push({ pathname: '/familiar/[id]', params: { id: 'new' } })}>
        <Ionicons name="add" size={22} color={c.gold} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{tr("Add a familiar")}</Text>
          <Text style={s.dim}>{tr("As many as you like")}</Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg },
  p: { color: c.dim, fontSize: 14, lineHeight: 20, marginBottom: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.panel, borderRadius: 14, padding: 12, borderWidth: 2, borderColor: 'transparent' },
  cardOn: { borderColor: c.gold },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  art: { width: 64, height: 64, borderRadius: 12, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: c.text, fontSize: 16, fontWeight: '600' },
  dim: { color: c.dim, fontSize: 12 },
  badge: { backgroundColor: c.gold + '29', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: c.gold, fontSize: 10, fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '600' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.line, borderStyle: 'dashed' },
}));
