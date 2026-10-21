import { t as tr } from '../../../../i18n';
import { useCallback, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { describe, Familiar, loadFamiliars, setWithYou, withYou, nightNow } from '../../../../familiar';
import { FamiliarArt, myElement } from '../../../../components/Familiar';
import { usePad } from '../../../../playback';
import { c, F, themed } from '../../../../theme';

const ART = 280;
const SOUNDS: Record<Familiar['species'], string[]> = {
  cat: ['prrr', 'prrr', 'prr…'],
  bat: ['♪', 'eek!', '♪'],
  crow: ['caw!', 'caw!'],
  spider: [],
};
const BUZZ: Record<Familiar['species'], number[]> = {
  cat: [0, 90, 180, 270, 360, 450, 540],
  bat: [0, 160],
  crow: [0, 260],
  spider: [0, 320, 740, 980],
};
const buzz = (sp: Familiar['species'], asleep: boolean) =>
  (asleep ? [0] : BUZZ[sp]).forEach((t) =>
    setTimeout(() => Haptics.impactAsync(sp === 'cat' || asleep ? Haptics.ImpactFeedbackStyle.Soft : Haptics.ImpactFeedbackStyle.Light), t),
  );

type Bubble = { id: number; text: string; x: number; y: Animated.Value; o: Animated.Value };


export default function Den() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pad = usePad();
  const [f, setF] = useState<Familiar | undefined>(() => loadFamiliars().list.find((x) => x.id === id));
  const [isWithYou, setIsWithYou] = useState(() => withYou().id === id);
  const [asleep, setAsleep] = useState(nightNow);
  const [closed, setClosed] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [drop] = useState(() => new Animated.Value(0));
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useFocusEffect(
    useCallback(() => {
      setF(loadFamiliars().list.find((x) => x.id === id));
      setIsWithYou(withYou().id === id);
    }, [id]),
  );
  if (!f) return <Text style={s.dim}>{tr("Familiar not found.")}</Text>;
  const el = myElement();

  const float = (texts: string[]) => {
    const made = texts.map((text, i) => {
      const b: Bubble = { id: ++seq.current, text, x: ART * 0.55 + i * 18 - 10, y: new Animated.Value(0), o: new Animated.Value(0) };
      Animated.sequence([
        Animated.delay(i * 260),
        Animated.parallel([
          Animated.timing(b.y, { toValue: -80, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(b.o, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(b.o, { toValue: 0, duration: 1100, delay: 100, useNativeDriver: true }),
          ]),
        ]),
      ]).start(() => setBubbles((all) => all.filter((x) => x.id !== b.id)));
      return b;
    });
    setBubbles((all) => [...all, ...made]);
  };

  const pet = () => {
    buzz(f.species, asleep);
    if (asleep) return float(['z', 'z', 'Z']);
    setClosed(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setClosed(false), 1800);
    if (f.species === 'spider') {
      Animated.sequence([
        Animated.timing(drop, { toValue: 70, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(drop, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(drop, { toValue: 30, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(drop, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]).start();
    } else float(SOUNDS[f.species]);
  };

  const spider = f.species === 'spider';
  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 + pad }}>
      <Stack.Screen
        options={{
          title: f.name,
          headerRight: () => (
            <Pressable hitSlop={10} onPress={() => router.push({ pathname: '/familiar/[id]', params: { id: f.id } })}>
              <Text style={s.edit}>{tr("Edit")}</Text>
            </Pressable>
          ),
        }}
      />
      <Pressable onPress={pet} style={s.stage} accessibilityLabel={asleep ? tr("{0} is asleep", { 0: f.name }) : tr("Pet {0}", { 0: f.name })} accessibilityRole="button">
        {spider && !asleep && <Animated.View style={[s.thread, { height: Animated.add(drop, 30 + ART * 0.46) }]} />}
        <Animated.View style={{ transform: [{ translateY: spider ? drop : 0 }] }}>
          <FamiliarArt familiar={f} pose={asleep ? 'sleeping' : 'idle'} size={ART} closed={closed} vial alive />
        </Animated.View>
        {bubbles.map((b) => (
          <Animated.Text key={b.id} style={[s.bubble, { left: b.x, opacity: b.o, transform: [{ translateY: b.y }] }]}>
            {b.text}
          </Animated.Text>
        ))}
      </Pressable>
      <Text style={s.hint}>{asleep ? tr("{0} is asleep. Pet gently.", { 0: f.name }) : tr("Tap to pet {0}.", { 0: f.name })}</Text>
      <View style={s.card}>
        <Text style={s.name}>{f.name}</Text>
        <Text style={s.dim}>{describe(f)}</Text>
        {el && (
          <Text style={s.dim}>
            {el.element[0].toUpperCase() + el.element.slice(1)}{' '}{tr("vial ·")}{' '}{el.sign}
          </Text>
        )}
      </View>
      <View style={s.row}>
        <Pressable style={[s.btn, isWithYou && s.btnOn]} onPress={() => (setWithYou(f.id), setIsWithYou(true))} disabled={isWithYou}>
          <Ionicons name={isWithYou ? 'checkmark' : 'walk-outline'} size={18} color={isWithYou ? c.bg : c.text} />
          <Text style={[s.btnText, isWithYou && { color: c.bg }]}>{isWithYou ? tr("With you") : tr("Walk with {0}", { 0: f.name })}</Text>
        </Pressable>
        <Pressable style={s.btn} onPress={() => (setAsleep(!asleep), setClosed(false))}>
          <Ionicons name={asleep ? 'sunny-outline' : 'moon-outline'} size={18} color={c.text} />
          <Text style={s.btnText}>{asleep ? tr("Wake up") : tr("Tuck in")}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg },
  edit: { color: c.gold, fontSize: 17, fontWeight: '600' },
  stage: { backgroundColor: c.panel, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingVertical: 24, overflow: 'hidden', minHeight: ART + 60 },
  thread: { position: 'absolute', top: 0, left: '50%', width: 1, marginLeft: -0.5, backgroundColor: c.dim },
  bubble: { position: 'absolute', top: ART * 0.3, color: c.gold, fontSize: 22, fontFamily: F.headingItalic },
  hint: { color: c.dim, textAlign: 'center', fontSize: 14 },
  card: { backgroundColor: c.panel, borderRadius: 14, padding: 14, gap: 4 },
  name: { color: c.text, fontSize: 22, fontFamily: F.heading },
  dim: { color: c.dim, fontSize: 13 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingVertical: 13 },
  btnOn: { backgroundColor: c.gold, borderColor: c.gold },
  btnText: { color: c.text, fontSize: 15, fontWeight: '600' },
}));
