import { t as tr } from '../i18n';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COATS, COLORS, Element, EYES, Familiar, familiarXml, Mark, LIGHTS, MARK_COLORS, MARKS, Pose, SPECIES, STRIPES, sunSign } from '../familiar';
import { getProfile } from '../tracker';
import { c, F, themed } from '../theme';

const ELEMENTS: Record<Element, { color: string; up: boolean; bar: boolean; name: string }> = {
  fire: { color: '#E0765A', up: true, bar: false, name: 'Fire' },
  air: { color: '#93BCD8', up: true, bar: true, name: 'Air' },
  water: { color: '#5E9BD6', up: false, bar: false, name: 'Water' },
  earth: { color: '#7FA36B', up: false, bar: true, name: 'Earth' },
};

const vialXml = (el: Element) => {
  const e = ELEMENTS[el];
  const tri = e.up ? 'M20 31 L26.5 42 L13.5 42 Z' : 'M13.5 33 L26.5 33 L20 44 Z';
  const bar = e.bar ? (e.up ? '<path d="M15.5 38.5 H24.5"/>' : '<path d="M15.5 36.5 H24.5"/>') : '';
  return `<svg viewBox="0 0 40 60"><rect x="14" y="5" width="12" height="7" rx="2" fill="#A07A55"/><rect x="15.5" y="11" width="9" height="15" fill="#FFFFFF" fill-opacity="0.1" stroke="#ECE6F5" stroke-opacity="0.7" stroke-width="1.2"/><circle cx="20" cy="38" r="14" fill="#FFFFFF" fill-opacity="0.1"/><path d="M8.7 34 Q14.5 31.5 20 34 T31.3 34 A12 12 0 1 1 8.7 34 Z" fill="${e.color}" fill-opacity="0.92"/><circle cx="20" cy="38" r="14" fill="none" stroke="#ECE6F5" stroke-opacity="0.7" stroke-width="1.2"/><path d="M12 31 Q13.5 27.5 17 26" fill="none" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="1.6" stroke-linecap="round"/><g fill="none" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="${tri}"/>${bar}</g></svg>`;
};

export const myElement = () => sunSign(getProfile().dob);

export function Vial({ element, size }: { element: Element; size: number }) {
  return (
    <View accessible accessibilityLabel={`${ELEMENTS[element].name} vial`}>
      <SvgXml xml={vialXml(element)} width={size} height={size * 1.5} />
    </View>
  );
}

const SWISH = [1.5, 3, 4, 3, 1.5, 0, -1, 0];

/** Blinks every few seconds; cats also swish their tail. Off with Reduce Motion. */
function useAlive(on: boolean, cat: boolean) {
  const [blink, setBlink] = useState(false);
  const [tail, setTail] = useState(0);
  useEffect(() => {
    if (!on) return;
    let live = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(() => live && fn(), ms));
    const blinkLoop = () =>
      later(() => {
        setBlink(true);
        later(() => setBlink(false), 140);
        blinkLoop();
      }, 2800 + Math.random() * 3500);
    const tailLoop = () =>
      later(() => {
        SWISH.forEach((a, i) => later(() => setTail(a), i * 70));
        tailLoop();
      }, 4500 + Math.random() * 5000);
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || !live) return;
      blinkLoop();
      if (cat) tailLoop();
    });
    return () => {
      live = false;
      timers.forEach(clearTimeout);
    };
  }, [on, cat]);
  return on ? { blink, tail } : { blink: false, tail: 0 };
}

export function FamiliarArt({
  familiar,
  pose = 'idle',
  size,
  vial,
  closed,
  alive,
}: {
  familiar: Familiar;
  pose?: Pose;
  size: number;
  vial?: boolean;
  closed?: boolean;
  alive?: boolean;
}) {
  const { blink, tail } = useAlive(!!alive && pose !== 'sleeping', familiar.species === 'cat');
  const xml = useMemo(() => familiarXml(familiar, pose, closed || blink, tail), [familiar, pose, closed, blink, tail]);
  const el = vial ? myElement()?.element : undefined;
  if (!el) return <SvgXml xml={xml} width={size} height={size} />;
  return (
    <View style={{ width: size, height: size }}>
      <SvgXml xml={xml} width={size} height={size} />
      <View style={{ position: 'absolute', right: size * 0.02, bottom: size * 0.04 }}>
        <Vial element={el} size={size * 0.2} />
      </View>
    </View>
  );
}

type StepProps = { f: Familiar; set: (patch: Partial<Familiar>) => void };

export function Label({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>;
}

function Card({ on, onPress, children, style }: { on?: boolean; onPress: () => void; children: React.ReactNode; style?: object }) {
  return (
    <Pressable onPress={onPress} style={[s.card, on && s.cardOn, style]} accessibilityState={{ selected: !!on }}>
      {children}
    </Pressable>
  );
}

export function Preview({ f, pose = 'idle', size = 210 }: { f: Familiar; pose?: Pose; size?: number }) {
  return (
    <View style={s.preview}>
      <FamiliarArt familiar={f} pose={pose} size={size} vial />
    </View>
  );
}

export function SpeciesStep({ f, set }: StepProps) {
  return (
    <View style={s.grid}>
      {SPECIES.map((sp) => {
        const sample = { ...f, species: sp.id, color: COLORS[sp.id][0].hex, coat: 'solid' as const };
        return (
          <Card
            key={sp.id}
            on={f.species === sp.id}
            style={s.half}
            onPress={() =>
              set({ species: sp.id, color: COLORS[sp.id].some((x) => x.hex === f.color) ? f.color : COLORS[sp.id][0].hex })
            }
          >
            <FamiliarArt familiar={sample} size={96} />
            <Text style={s.title}>{sp.name}</Text>
            <Text style={s.dim}>{sp.desc}</Text>
          </Card>
        );
      })}
      <View style={[s.card, s.locked]}>
        <Ionicons name="lock-closed" size={16} color={c.dim} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{tr("Owl, toad, snake")}</Text>
          <Text style={s.dim}>{tr("Coming later")}</Text>
        </View>
      </View>
    </View>
  );
}

export function ShapeCoatStep({ f, set }: StepProps) {
  const cat = f.species === 'cat';
  return (
    <View style={{ gap: 14 }}>
      <Preview f={f} />
      {cat && (
        <View style={s.seg}>
          {(['round', 'slim'] as const).map((b) => (
            <Pressable key={b} style={[s.segItem, f.build === b && s.segOn]} onPress={() => set({ build: b })}>
              <Text style={[s.segText, f.build === b && s.segTextOn]}>{b === 'round' ? tr("Round") : tr("Slim")}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {cat && (
        <>
          <Label>{tr("COAT")}</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {COATS.map((co) => (
              <Card key={co.id} on={f.coat === co.id} style={s.coat} onPress={() => set({ coat: co.id })}>
                <FamiliarArt familiar={{ ...f, coat: co.id }} size={56} />
                <Text style={[s.small, f.coat === co.id && { color: c.gold }]}>{co.name}</Text>
              </Card>
            ))}
          </ScrollView>
        </>
      )}
      <Label>{cat && f.coat === 'colourpoint' ? tr("POINTS COLOUR") : tr("COLOUR")}</Label>
      <Swatches list={COLORS[f.species]} value={f.color} onPick={(hex) => set({ color: hex })} />
      {cat && f.coat === 'tabby' && (
        <>
          <Label>{tr("STRIPES")}</Label>
          <View style={s.swatches}>
            {STRIPES.map((x) => (
              <Pressable key={x.name} onPress={() => set({ stripe: x.hex || undefined })} style={{ alignItems: 'center', gap: 4 }} accessibilityLabel={`${x.name} stripes`}>
                <View style={[s.swatch, { backgroundColor: x.hex || f.color }, (f.stripe ?? '') === x.hex && s.swatchOn]}>
                  {!x.hex && <Text style={s.auto}>A</Text>}
                </View>
                <Text style={s.small}>{x.name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {cat && f.coat === 'colourpoint' && (
        <>
          <Label>{tr("BODY COLOUR")}</Label>
          <Swatches list={LIGHTS.map((hex) => ({ hex, name: hex }))} value={f.light ?? LIGHTS[0]} onPick={(hex) => set({ light: hex })} />
        </>
      )}
    </View>
  );
}

function Swatches({ list, value, onPick }: { list: { hex: string; name: string }[]; value: string; onPick: (hex: string) => void }) {
  return (
    <View style={s.swatches}>
      {list.map((x) => (
        <Pressable
          key={x.hex}
          accessibilityLabel={x.name}
          onPress={() => onPick(x.hex)}
          style={[s.swatch, { backgroundColor: x.hex }, value === x.hex && s.swatchOn]}
        />
      ))}
    </View>
  );
}

const GLYPH: Record<Mark, string> = { crescent: '☾', star: '✦', sun: '☀︎', eye: '◉', none: '—' };

export function EyesMarkStep({ f, set }: StepProps) {
  return (
    <View style={{ gap: 14 }}>
      <Preview f={f} />
      <Label>{tr("EYES")}</Label>
      <View style={s.swatches}>
        {EYES.map((e) => (
          <Pressable key={e.hex} onPress={() => set({ eyes: e.hex })} style={{ alignItems: 'center', gap: 4 }}>
            <View style={[s.swatch, { backgroundColor: e.hex }, f.eyes === e.hex && s.swatchOn]} />
            <Text style={[s.small, f.eyes === e.hex && { color: c.text }]}>{e.name}</Text>
          </Pressable>
        ))}
      </View>
      <Label>{tr("MARK")}</Label>
      <View style={s.row}>
        {MARKS.map((m) => (
          <Card key={m.id} on={f.mark === m.id} style={{ flex: 1, paddingVertical: 10 }} onPress={() => set({ mark: m.id })}>
            <Text style={{ color: f.markColor ?? '#E8C767', fontSize: 20 }}>{GLYPH[m.id]}</Text>
            <Text style={s.small}>{m.name}</Text>
          </Card>
        ))}
      </View>
      {f.mark !== 'none' && (
        <>
          <Label>{tr("MARK COLOUR")}</Label>
          <View style={s.swatches}>
            {MARK_COLORS.map((m) => (
              <Pressable key={m.hex} onPress={() => set({ markColor: m.hex })} style={{ alignItems: 'center', gap: 4 }} accessibilityLabel={m.name}>
                <View style={[s.swatch, { backgroundColor: m.hex }, (f.markColor ?? MARK_COLORS[0].hex) === m.hex && s.swatchOn]} />
                <Text style={s.small}>{m.name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const SUGGEST = ['Shadow', 'Luna', 'Salem', 'Ink', 'Clover', 'Nyx'];

export function NameStep({ f, set }: StepProps) {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: 'center' }}>
        <FamiliarArt familiar={f} size={190} vial />
      </View>
      <Label>{tr("NAME")}</Label>
      <TextInput
        style={s.input}
        value={f.name}
        onChangeText={(name) => set({ name })}
        placeholder={tr("Shadow")}
        placeholderTextColor={c.dim}
        autoCapitalize="words"
        maxLength={24}
      />
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        {SUGGEST.map((n) => (
          <Pressable key={n} style={s.pill} onPress={() => set({ name: n })}>
            <Text style={s.pillText}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.quote}>{tr("“Tea ready?")}{' '}{f.name || tr("Shadow")}{' '}{tr("saved your place in chapter 4.”")}</Text>
    </View>
  );
}

export const s = themed(() => ({
  label: { color: c.dim, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  card: { backgroundColor: c.panel, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, borderWidth: 2, borderColor: 'transparent' },
  cardOn: { borderColor: c.gold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  half: { width: '48%', flexGrow: 1 },
  locked: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.7 },
  title: { color: c.text, fontSize: 15, fontWeight: '600' },
  dim: { color: c.dim, fontSize: 12 },
  small: { color: c.dim, fontSize: 11, fontWeight: '500' },
  preview: { backgroundColor: c.panel, borderRadius: 20, alignItems: 'center', paddingVertical: 6 },
  seg: { flexDirection: 'row', backgroundColor: c.panel, borderRadius: 12, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segOn: { backgroundColor: c.gold },
  segText: { color: c.text, fontWeight: '600' },
  segTextOn: { color: c.bg },
  coat: { width: 76, paddingVertical: 6 },
  swatches: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.line },
  swatchOn: { borderWidth: 3, borderColor: c.gold },
  auto: { color: c.text, fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
  row: { flexDirection: 'row', gap: 8 },
  input: { backgroundColor: c.panel, color: c.text, borderRadius: 12, padding: 14, fontSize: 17 },
  pill: { backgroundColor: c.raised, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { color: c.text, fontSize: 13 },
  quote: { color: c.dim, fontFamily: F.headingItalic, fontSize: 15, marginTop: 6 },
}));
