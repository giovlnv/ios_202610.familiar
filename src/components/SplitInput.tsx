import { t as tr } from '../i18n';
import { useRef } from 'react';
import { StyleProp, Text, TextInput, TextStyle, View } from 'react-native';
import { c } from '../theme';

type Part = { len: number; placeholder: string };

function Split({ value, onChange, parts, sep, style }: { value: string; onChange: (v: string) => void; parts: Part[]; sep: string; style?: StyleProp<TextStyle> }) {
  const refs = useRef<(TextInput | null)[]>([]);
  const vals = value ? value.split(sep) : [];
  const set = (i: number, t: string) => {
    const d = t.replace(/\D/g, '').slice(0, parts[i].len);
    const next = parts.map((_, k) => (k === i ? d : (vals[k] ?? '')));
    onChange(next.some(Boolean) ? next.join(sep) : '');
    if (d.length === parts[i].len && i < parts.length - 1) refs.current[i + 1]?.focus();
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {parts.map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: p.len }}>
          {i > 0 && <Text style={{ color: c.dim, fontSize: 18 }}>{sep}</Text>}
          <TextInput
            ref={(r) => {
              refs.current[i] = r;
            }}
            style={[style, { flex: 1, textAlign: 'center' }]}
            value={vals[i] ?? ''}
            onChangeText={(t) => set(i, t)}
            onKeyPress={(e) => e.nativeEvent.key === 'Backspace' && !(vals[i] ?? '') && i > 0 && refs.current[i - 1]?.focus()}
            placeholder={p.placeholder}
            placeholderTextColor={c.dim}
            keyboardType="number-pad"
            maxLength={p.len}
            selectTextOnFocus
          />
        </View>
      ))}
    </View>
  );
}

export const DateInput = (p: { value: string; onChange: (v: string) => void; style?: StyleProp<TextStyle> }) => (
  <Split {...p} sep="/" parts={[{ len: 2, placeholder: tr("DD") }, { len: 2, placeholder: tr("MM") }, { len: 4, placeholder: tr("YYYY") }]} />
);

export const TimeInput = (p: { value: string; onChange: (v: string) => void; style?: StyleProp<TextStyle> }) => (
  <Split {...p} sep=":" parts={[{ len: 2, placeholder: tr("HH") }, { len: 2, placeholder: tr("MM") }]} />
);
