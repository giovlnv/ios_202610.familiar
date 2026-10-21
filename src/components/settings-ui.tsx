import { t as tr } from '../i18n';
import { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Href, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePad } from '../playback';
import { c, F, themed } from '../theme';

export const when = (t?: number) => (t ? new Date(t).toLocaleString() : 'never');

export const confirmRestore = (go: () => void) =>
  Alert.alert(tr("Restore?"), tr("Notes, consults and progress in the backup replace the ones on this iPhone."), [
    { text: tr("Cancel"), style: 'cancel' },
    { text: tr("Restore"), style: 'destructive', onPress: go },
  ]);

export const Btn = ({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) => (
  <Pressable style={[ss.btn, primary && ss.btnPrimary]} onPress={onPress}>
    <Text style={[ss.btnText, primary && ss.btnTextPrimary]}>{label}</Text>
  </Pressable>
);

export function Page({ children }: { children: ReactNode }) {
  const pad = usePad();
  return (
    <ScrollView
      style={ss.wrap}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 + pad }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {children}
    </ScrollView>
  );
}

export function MenuRow({ icon, title, sub, to }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; to: Href }) {
  return (
    <Pressable style={ss.menuRow} onPress={() => router.push(to)}>
      <View style={ss.menuIcon}>
        <Ionicons name={icon} size={19} color={c.gold} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={ss.menuTitle}>{title}</Text>
        {!!sub && <Text style={ss.meta}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.dim} />
    </Pressable>
  );
}

export const ss = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg },
  h2: { color: c.text, fontSize: 18, marginTop: 12, marginBottom: 6, fontFamily: F.heading },
  p: { color: c.dim, lineHeight: 20, marginBottom: 10 },
  card: { backgroundColor: c.panel, borderRadius: 12, padding: 14, gap: 10, marginBottom: 12 },
  meta: { color: c.dim, fontSize: 14 },
  label: { color: c.dim, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  input: { backgroundColor: c.bg, color: c.text, borderRadius: 10, padding: 12, fontSize: 15 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modes: { flexDirection: 'row', backgroundColor: c.panel, borderRadius: 10, padding: 3, marginBottom: 10 },
  mode: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8 },
  modeOn: { backgroundColor: c.gold },
  modeText: { color: c.dim, fontWeight: '600', fontSize: 13 },
  palette: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  swatch: { flexDirection: 'row', gap: 4, padding: 6, borderRadius: 8, borderWidth: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  paletteName: { color: c.text, fontSize: 15, flex: 1 },
  btn: { backgroundColor: c.raised, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10 },
  btnPrimary: { backgroundColor: c.gold },
  btnText: { color: c.text },
  btnTextPrimary: { color: c.bg, fontWeight: '700' },
  menu: { backgroundColor: c.panel, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line + '66' },
  menuIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.gold + '1f', alignItems: 'center', justifyContent: 'center' },
  menuTitle: { color: c.text, fontSize: 16, fontWeight: '600' },
}));
