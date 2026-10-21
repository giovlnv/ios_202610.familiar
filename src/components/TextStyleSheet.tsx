import { t as tr } from '../i18n';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { c, F, themed } from '../theme';
import {
  bodyText,
  COLOR_IDS,
  colorName,
  colorOf,
  DEFAULT_STYLE,
  FONTS,
  LIMITS,
  setTextStyle,
  TextStyle,
  useTextStyle,
} from '../textStyle';

type Num = 'size' | 'line' | 'gap';

export default function TextStyleSheet({ visible, sample, onClose }: { visible: boolean; sample?: string; onClose: () => void }) {
  const t = useTextStyle();
  const step = (k: Num, dir: 1 | -1) => {
    const [min, max, by] = LIMITS[k];
    const v = Math.round((t[k] + dir * by) * 10) / 10;
    if (v >= min && v <= max) setTextStyle({ [k]: v } as Partial<TextStyle>);
  };
  const show = (k: Num) => (k === 'size' ? `${t.size} pt` : k === 'line' ? `${t.line.toFixed(1)}×` : `${t.gap} pt`);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={tr("Close")} />
      <View style={s.sheet}>
        <View style={s.top}>
          <Text style={s.h2}>{tr("Text")}</Text>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <Pressable hitSlop={8} onPress={() => setTextStyle(DEFAULT_STYLE)}>
              <Text style={s.dimLink}>{tr("Reset")}</Text>
            </Pressable>
            <Pressable hitSlop={8} onPress={onClose}>
              <Text style={s.link}>{tr("Done")}</Text>
            </Pressable>
          </View>
        </View>
        <View style={s.preview}>
          <Text style={bodyText(t, true)} numberOfLines={3}>
            {sample || tr("The Fool steps off the cliff, trusting the path will appear beneath his feet.")}
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
          {(
            [
              ['size', 'Size', 'text-outline'],
              ['line', 'Line spacing', 'reorder-four-outline'],
              ['gap', 'Paragraph spacing', 'swap-vertical-outline'],
            ] as const
          ).map(([k, label, icon]) => (
            <View key={k} style={s.row}>
              <Ionicons name={icon} size={18} color={c.dim} />
              <Text style={s.label}>{label}</Text>
              <Pressable style={s.step} onPress={() => step(k, -1)} accessibilityLabel={tr("Less {0}", { 0: label })}>
                <Ionicons name="remove" size={18} color={c.text} />
              </Pressable>
              <Text style={s.value}>{show(k)}</Text>
              <Pressable style={s.step} onPress={() => step(k, 1)} accessibilityLabel={tr("More {0}", { 0: label })}>
                <Ionicons name="add" size={18} color={c.text} />
              </Pressable>
            </View>
          ))}
          <View style={s.chips}>
            {FONTS.map((f) => (
              <Pressable key={f.id} style={[s.chip, t.font === f.id && s.chipOn]} onPress={() => setTextStyle({ font: f.id })}>
                <Text style={[s.chipText, { fontFamily: f.family }, t.font === f.id && s.chipTextOn]}>{f.name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.chips}>
            {COLOR_IDS.map((id) => (
              <Pressable key={id} style={[s.swatchWrap, t.color === id && s.swatchOn]} onPress={() => setTextStyle({ color: id })} accessibilityLabel={colorName(id)}>
                <View style={[s.swatch, { backgroundColor: colorOf(id) }]} />
                <Text style={s.swatchText}>{colorName(id)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.chips}>
            {(['left', 'justify'] as const).map((a) => (
              <Pressable key={a} style={[s.chip, t.align === a && s.chipOn]} onPress={() => setTextStyle({ align: a })}>
                <Ionicons name={a === 'left' ? 'reorder-three-outline' : 'menu-outline'} size={16} color={t.align === a ? c.bg : c.text} />
                <Text style={[s.chipText, t.align === a && s.chipTextOn]}>{a === 'left' ? tr("Left") : tr("Justified")}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = themed(() => ({
  sheet: { backgroundColor: c.panel, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 34, maxHeight: '62%', gap: 12, borderTopWidth: 1, borderColor: c.line },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h2: { color: c.text, fontSize: 22, fontFamily: F.heading },
  link: { color: c.gold, fontSize: 16, fontWeight: '600' },
  dimLink: { color: c.dim, fontSize: 16 },
  preview: { backgroundColor: c.bg, borderRadius: 12, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { flex: 1, color: c.text, fontSize: 15 },
  step: { width: 38, height: 34, borderRadius: 10, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 52, textAlign: 'center', color: c.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.raised, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 14 },
  chipOn: { backgroundColor: c.gold },
  chipText: { color: c.text, fontSize: 15 },
  chipTextOn: { color: c.bg, fontWeight: '700' },
  swatchWrap: { alignItems: 'center', gap: 4, padding: 6, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: c.gold },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: c.line },
  swatchText: { color: c.dim, fontSize: 11 },
}));
