import { t as tr } from '../../../../i18n';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { c, Mode, mode, PALETTES, paletteId, scheme, setMode, setPalette } from '../../../../theme';
import { IconPicker } from '../../../../components/ThemeSheet';
import { Page, ss } from '../../../../components/settings-ui';

const MODES = [
  ['dark', 'Dark', 'moon-outline'],
  ['light', 'Light', 'sunny-outline'],
  ['system', 'Phone setting', 'phone-portrait-outline'],
] as const;

export default function Appearance() {
  return (
    <Page>
      <Text style={ss.h2}>{tr("Mode")}</Text>
      <View style={ss.modes}>
        {MODES.map(([m, label, icon]) => (
          <Pressable key={m} style={[ss.mode, mode === m && ss.modeOn]} onPress={() => m !== mode && setMode(m as Mode)}>
            <Ionicons name={icon} size={15} color={mode === m ? c.bg : c.dim} />
            <Text style={[ss.modeText, mode === m && { color: c.bg }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={ss.h2}>{tr("Colors")}</Text>
      <View style={[ss.card, { gap: 2 }]}>
        {PALETTES.map((p) => {
          const pc = scheme === 'light' ? p.light : p.c;
          const on = p.id === paletteId;
          return (
            <Pressable key={p.id} style={ss.palette} onPress={() => !on && setPalette(p.id)}>
              <View style={[ss.swatch, { backgroundColor: pc.bg, borderColor: pc.line }]}>
                <View style={[ss.dot, { backgroundColor: pc.gold }]} />
                <View style={[ss.dot, { backgroundColor: pc.explain }]} />
                <View style={[ss.dot, { backgroundColor: pc.claude }]} />
              </View>
              <Text style={[ss.paletteName, on && { color: c.gold, fontWeight: '700' }]}>{p.name}</Text>
              {on && <Ionicons name="checkmark" size={18} color={c.gold} />}
            </Pressable>
          );
        })}
      </View>
      <Text style={ss.h2}>{tr("App icon")}</Text>
      <IconPicker heading={false} />
    </Page>
  );
}
