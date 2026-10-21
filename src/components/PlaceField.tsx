import { t as tr } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { c, themed } from '../theme';

export type Place = { label: string; lat: number; lon: number; timezone?: string };
type Hit = { id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string };

export function PlaceField({ value, onPick, language = 'en' }: { value: string; onPick: (p: Place) => void; language?: string }) {
  const [q, setQ] = useState(value);
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!open || q.trim().length < 2) return;
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=8&language=${language}&format=json`;
        const r = await fetch(url);
        const j = (await r.json()) as { results?: Hit[] };
        setHits(j.results ?? []);
      } catch {
        setHits([]);
      } finally {
        setBusy(false);
      }
    }, 350);
  }, [q, open, language]);

  const label = (h: Hit) => [h.name, h.admin1, h.country].filter(Boolean).join(', ');

  return (
    <View style={{ gap: 6 }}>
      <View style={s.box}>
        <Ionicons name="location-outline" size={18} color={c.dim} />
        <TextInput
          style={s.input}
          value={q}
          onChangeText={(t) => (setQ(t), setOpen(true))}
          placeholder={tr("City")}
          placeholderTextColor={c.dim}
          autoCorrect={false}
        />
        {busy && <ActivityIndicator color={c.gold} />}
      </View>
      {open && hits.length > 0 && (
        <View style={s.list}>
          {hits.map((h) => (
            <Pressable
              key={h.id}
              style={s.hit}
              onPress={() => {
                const l = label(h);
                setQ(l);
                setOpen(false);
                setHits([]);
                onPick({ label: l, lat: h.latitude, lon: h.longitude, timezone: h.timezone });
              }}
            >
              <Text style={s.hitName}>{h.name}</Text>
              <Text style={s.hitDim}>{[h.admin1, h.country].filter(Boolean).join(', ')}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const s = themed(() => ({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.panel, borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, color: c.text, fontSize: 17, paddingVertical: 14 },
  list: { backgroundColor: c.panel, borderRadius: 12, overflow: 'hidden' },
  hit: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  hitName: { color: c.text, fontSize: 15, fontWeight: '600' },
  hitDim: { color: c.dim, fontSize: 12, marginTop: 2 },
}));
