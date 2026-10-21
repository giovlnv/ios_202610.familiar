import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { EYES, Familiar, loadFamiliars, newFamiliar, allPaths, removeFamiliar, saveFamiliar } from '../../../../familiar';
import { EyesMarkStep, Label, NameStep, ShapeCoatStep, SpeciesStep } from '../../../../components/Familiar';
import { usePad } from '../../../../playback';
import { c, themed } from '../../../../theme';

const TABS = ['Species', 'Shape', 'Eyes', 'Name', 'Paths'] as const;

export default function FamiliarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pad = usePad();
  const existing = loadFamiliars().list.find((f) => f.id === id);
  const [f, setF] = useState<Familiar>(existing ?? newFamiliar());
  const [tab, setTab] = useState<(typeof TABS)[number]>(existing ? 'Name' : 'Species');
  const set = (patch: Partial<Familiar>) => setF((x) => ({ ...x, ...patch }));
  const cat = f.species === 'cat';

  const save = () => {
    const named = { ...f, name: f.name.trim() || 'Familiar' };
    saveFamiliar(named);
    router.back();
  };
  const remove = () =>
    Alert.alert(`Let ${f.name || 'this familiar'} go?`, 'Its look and name are removed. Your books and notes stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => (removeFamiliar(f.id), router.back()) },
    ]);

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 + pad }} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: existing ? f.name || 'Familiar' : 'New familiar',
          headerRight: () => (
            <Pressable hitSlop={10} onPress={save}>
              <Text style={s.save}>Save</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {TABS.filter((t) => cat || t !== 'Shape').map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]}>
            <Text style={[s.tabText, tab === t && { color: c.bg }]}>{!cat && t === 'Eyes' ? 'Colour & eyes' : t}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {tab === 'Species' && <SpeciesStep f={f} set={set} />}
      {tab === 'Shape' && cat && <ShapeCoatStep f={f} set={set} />}
      {tab === 'Eyes' && (cat ? <EyesMarkStep f={f} set={set} /> : <BasicEyes f={f} set={set} />)}
      {tab === 'Name' && <NameStep f={f} set={set} />}
      {tab === 'Paths' && (
        <View style={{ gap: 10 }}>
          <Text style={s.p}>Books of a linked path show this familiar. A path can have one familiar.</Text>
          {allPaths().map((p) => {
            const on = f.paths.includes(p.id);
            const other = loadFamiliars().list.find((x) => x.id !== f.id && x.paths.includes(p.id));
            return (
              <Pressable
                key={p.id}
                style={s.row}
                onPress={() => set({ paths: on ? f.paths.filter((x) => x !== p.id) : [...f.paths, p.id] })}
              >
                <View style={[s.dot, { backgroundColor: p.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{p.name}</Text>
                  {!!other && !on && <Text style={s.dim}>Now with {other.name}</Text>}
                </View>
                <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? c.gold : c.line} />
              </Pressable>
            );
          })}
        </View>
      )}
      {existing && loadFamiliars().list.length > 1 && (
        <Pressable onPress={remove} style={{ alignSelf: 'center', padding: 10 }}>
          <Text style={{ color: c.claude, fontWeight: '600' }}>Remove familiar</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function BasicEyes({ f, set }: { f: Familiar; set: (p: Partial<Familiar>) => void }) {
  return (
    <View style={{ gap: 14 }}>
      <ShapeCoatStep f={f} set={set} />
      <Label>EYES</Label>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {EYES.map((e) => (
          <Pressable
            key={e.hex}
            accessibilityLabel={e.name}
            onPress={() => set({ eyes: e.hex })}
            style={[s.swatch, { backgroundColor: e.hex }, f.eyes === e.hex && { borderWidth: 3, borderColor: c.gold }]}
          />
        ))}
      </View>
    </View>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg },
  save: { color: c.gold, fontSize: 17, fontWeight: '600' },
  tab: { backgroundColor: c.panel, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  tabOn: { backgroundColor: c.gold },
  tabText: { color: c.text, fontWeight: '600' },
  p: { color: c.dim, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel, borderRadius: 14, padding: 14 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  title: { color: c.text, fontSize: 15, fontWeight: '600' },
  dim: { color: c.dim, fontSize: 12 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.line },
}));
