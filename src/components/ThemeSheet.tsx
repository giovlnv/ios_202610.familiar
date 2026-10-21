import { t as tr } from '../i18n';
import { useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { getAppIconName, setAlternateAppIcon } from 'expo-alternate-app-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { c, F, Mode, mode, PALETTES, paletteId, scheme, setMode, setPalette, themed } from '../theme';

const MODES: [Mode, string, keyof typeof Ionicons.glyphMap][] = [
  ['dark', 'Dark', 'moon-outline'],
  ['light', 'Light', 'sunny-outline'],
  ['system', 'Auto', 'phone-portrait-outline'],
];

const ICONS: [string | null, string, number][] = [
  [null, 'Classic', require('../../assets/icons/classic.png')],
  ['Plum', 'Plum', require('../../assets/icons/plum.png')],
  ['Water', 'Water', require('../../assets/icons/water.png')],
  ['Fire', 'Fire', require('../../assets/icons/fire.png')],
  ['Earth', 'Earth', require('../../assets/icons/earth.png')],
  ['Air', 'Air', require('../../assets/icons/air.png')],
];

const currentIcon = () => {
  try {
    return getAppIconName();
  } catch {
    return null;
  }
};

export function IconPicker({ heading = true }: { heading?: boolean }) {
  const [icon, setIcon] = useState(currentIcon);
  if (Platform.OS !== 'ios') return null;
  const pick = (name: string | null) =>
    setAlternateAppIcon(name as never).then(
      () => setIcon(name as never),
      (e: Error) => Alert.alert(tr("Couldn’t change the icon"), e?.message ?? String(e)),
    );
  return (
    <>
      {heading && <Text style={s.sub}>{tr("App icon")}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.icons}>
        {ICONS.map(([name, label, img]) => {
          const on = icon === name;
          return (
            <Pressable key={label} onPress={() => pick(name)} style={s.iconCell} accessibilityLabel={`${label} icon`} accessibilityState={{ selected: on }}>
              <Image source={img} style={[s.icon, on && s.iconOn]} />
              <Text style={[s.iconLabel, on && { color: c.gold }]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}

export function ThemeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.dim} onPress={onClose} accessibilityLabel={tr("Close")} />
      <View style={s.sheet}>
        <Text style={s.h2}>{tr("Theme")}</Text>
        <View style={s.modes}>
          {MODES.map(([m, label, icon]) => (
            <Pressable key={m} style={[s.mode, mode === m && s.modeOn]} onPress={() => (onClose(), setMode(m))}>
              <Ionicons name={icon} size={15} color={mode === m ? c.bg : c.dim} />
              <Text style={[s.modeText, mode === m && { color: c.bg }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {PALETTES.map((p) => {
          const pc = scheme === 'light' ? p.light : p.c;
          const on = p.id === paletteId;
          return (
            <Pressable key={p.id} style={s.row} onPress={() => (onClose(), setPalette(p.id))} accessibilityState={{ selected: on }}>
              <View style={[s.swatch, { backgroundColor: pc.bg, borderColor: pc.line }]}>
                <View style={[s.dot, { backgroundColor: pc.panel }]} />
                <View style={[s.dot, { backgroundColor: pc.gold }]} />
                <View style={[s.dot, { backgroundColor: pc.text }]} />
              </View>
              <Text style={[s.name, on && { color: c.gold }]}>{p.name}</Text>
              {on && <Ionicons name="checkmark" size={18} color={c.gold} />}
            </Pressable>
          );
        })}
        <IconPicker />
      </View>
    </Modal>
  );
}

const s = themed(() => ({
  dim: { flex: 1, backgroundColor: '#0008' },
  sheet: { backgroundColor: c.panel, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 40, gap: 6 },
  h2: { color: c.text, fontSize: 22, fontFamily: F.heading, marginBottom: 6 },
  modes: { flexDirection: 'row', gap: 6, backgroundColor: c.bg, borderRadius: 12, padding: 4, marginBottom: 8 },
  mode: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 9 },
  modeOn: { backgroundColor: c.gold },
  modeText: { color: c.dim, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  swatch: { flexDirection: 'row', gap: 4, padding: 6, borderRadius: 10, borderWidth: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { flex: 1, color: c.text, fontSize: 15 },
  sub: { color: c.dim, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 12 },
  icons: { gap: 12, paddingVertical: 8 },
  iconCell: { alignItems: 'center', gap: 6 },
  icon: { width: 58, height: 58, borderRadius: 13, borderWidth: 2, borderColor: 'transparent' },
  iconOn: { borderColor: c.gold },
  iconLabel: { color: c.dim, fontSize: 12 },
}));
