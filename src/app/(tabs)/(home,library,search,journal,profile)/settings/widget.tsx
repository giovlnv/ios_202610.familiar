import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Page, ss } from '../../../../components/settings-ui';
import { ACCENT, appGroup, appGroups, BG, getWidgetColors, setWidgetColors, TEXT, WidgetColors, widgetStatus } from '../../../../widget';
import { c, themed } from '../../../../theme';

const ROWS: [keyof Omit<WidgetColors, 'theme'>, string, string[]][] = [
  ['bg', 'Background', BG],
  ['text', 'Text', TEXT],
  ['accent', 'Accent', ACCENT],
];

export default function WidgetSettings() {
  const [col, setCol] = useState(getWidgetColors);
  const set = (p: Partial<WidgetColors>) => {
    setWidgetColors(p);
    setCol(getWidgetColors());
  };
  return (
    <Page>
      <Text style={ss.p}>
        Add the widget from the Home Screen: touch and hold, tap Edit → Add Widget, then pick Familiar in small, medium or large. Touch and hold
        the widget → Edit Widget to choose what it shows.
      </Text>
      <View style={[ss.card, s.between]}>
        <Text style={s.title}>Match the app theme</Text>
        <Switch value={col.theme} onValueChange={(v) => set({ theme: v })} trackColor={{ true: c.gold }} />
      </View>
      {!col.theme &&
        ROWS.map(([key, label, list]) => (
          <View key={key} style={{ gap: 8, marginBottom: 14 }}>
            <Text style={ss.label}>{label}</Text>
            <View style={s.swatches}>
              {list.map((hex) => (
                <Pressable
                  key={hex}
                  accessibilityLabel={`${label} ${hex}`}
                  onPress={() => set({ [key]: hex })}
                  style={[s.swatch, { backgroundColor: hex }, col[key] === hex && s.on]}
                />
              ))}
            </View>
          </View>
        ))}
      <Text style={[ss.label, { marginTop: 14 }]}>Status</Text>
      <View style={ss.card}>
        <Text style={ss.meta}>{widgetStatus()}</Text>
        <Text style={ss.meta}>Shared storage: {appGroup()}</Text>
        <Text style={ss.meta}>App groups in this install: {appGroups().join(', ') || 'none'}</Text>
      </View>
      <View style={[s.preview, { backgroundColor: col.theme ? c.bg : col.bg }]}>
        <Text style={{ color: col.theme ? c.gold : col.accent, fontSize: 22, fontWeight: '700' }}>7</Text>
        <Text style={{ color: col.theme ? c.text : col.text, fontSize: 14 }}>Preview · Personal day</Text>
      </View>
    </Page>
  );
}

const s = themed(() => ({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: c.text, fontSize: 16, fontWeight: '600' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.line },
  on: { borderWidth: 3, borderColor: c.gold },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 18, marginTop: 6, borderWidth: 1, borderColor: c.line },
}));
