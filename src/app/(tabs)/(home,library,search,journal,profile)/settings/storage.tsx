import { t as tr } from '../../../../i18n';
import { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { bookSizes, clearCache, freeSpace, listBooks, mb, storageBreakdown, totalSpace } from '../../../../storage';
import { removeUnusedVoices, unusedVoices } from '../../../../languages';
import { Btn, Page, ss } from '../../../../components/settings-ui';
import { c, read, themed, write } from '../../../../theme';

const gb = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : mb(b));

export default function Storage() {
  const [, tick] = useState(0);
  const [detail, setDetail] = useState(() => read('storage-detail.txt') === '1');
  const z = storageBreakdown();
  const pct = (n: number) => `${n && n < z.total / 100 ? '<1' : Math.round((n / (z.total || 1)) * 100)}%`;
  const parts = [
    { label: tr("Audio"), bytes: z.audio, color: c.gold },
    { label: tr("Books & notes"), bytes: z.books, color: c.explain },
    { label: tr("Decks"), bytes: z.decks, color: c.claude },
    { label: tr("Voices"), bytes: z.voices, color: c.text },
    { label: tr("Temporary"), bytes: z.temp, color: c.dim },
    { label: tr("Other app data"), bytes: z.other, color: c.line },
  ].filter((p) => p.bytes > 0);
  const total = totalSpace();
  const free = freeSpace();
  const phone = total
    ? [
        { label: tr("Familiar"), bytes: z.total, color: c.gold },
        { label: tr("Other apps and files"), bytes: Math.max(0, total - free - z.total), color: c.dim },
        { label: tr("Free"), bytes: free, color: c.raised },
      ]
    : [];
  const books = listBooks()
    .map((b) => ({ title: b.book.title, audio: bookSizes(b.folder).audio }))
    .filter((b) => b.audio > 0);
  return (
    <Page>
      {!!total && (
        <View style={s.card}>
          <Text style={s.used}>{tr("Your iPhone")}</Text>
          <View style={s.row}>
            <Text style={s.big}>{gb(z.total)}</Text>
            <Text style={s.free}>of {gb(total)}</Text>
          </View>
          <View style={s.bar}>
            {phone.map((p) => (
              <View key={p.label} style={{ flex: Math.max(p.bytes, total * 0.006), backgroundColor: p.color }} />
            ))}
          </View>
          <View style={s.legend}>
            {phone.map((p) => (
              <View key={p.label} style={s.item}>
                <View style={[s.dot, { backgroundColor: p.color, borderWidth: 1, borderColor: c.line }]} />
                <Text style={s.legendText}>
                  {p.label} · {gb(p.bytes)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View style={s.toggle}>
        <Text style={s.legendText}>{tr("Show Familiar breakdown")}</Text>
        <Switch value={detail} onValueChange={(v) => (write('storage-detail.txt', v ? '1' : '0'), setDetail(v))} trackColor={{ true: c.gold }} />
      </View>
      {detail && (
        <>
      <View style={s.card}>
        <Text style={s.used}>{tr("Used by Familiar · 100%")}</Text>
        <View style={s.row}>
          <Text style={s.big}>{gb(z.total)}</Text>
          <Text style={s.free}>{gb(freeSpace())} free</Text>
        </View>
        <View style={s.bar}>
          {parts.map((p) => (
            <View key={p.label} style={{ flex: p.bytes / (z.total || 1), minWidth: 3, backgroundColor: p.color }} />
          ))}
        </View>
        <View style={s.legend}>
          {parts.map((p) => (
            <View key={p.label} style={s.item}>
              <View style={[s.dot, { backgroundColor: p.color }]} />
              <Text style={s.legendText}>
                {p.label} · {mb(p.bytes)} · {pct(p.bytes)}
              </Text>
            </View>
          ))}
        </View>
      </View>
        </>
      )}
      {books.length ? (
        <>
          <Text style={ss.h2}>{tr("Audio on this iPhone")}</Text>
          {books.map((b) => (
            <Text key={b.title} style={ss.meta}>
              {b.title} · {mb(b.audio)}
            </Text>
          ))}
        </>
      ) : null}
      <Text style={ss.p}>{tr("To free space, open a book’s page → ⋯ → Remove downloaded audio; it then streams from GitHub.")}</Text>
      {(() => {
        const unused = unusedVoices().reduce((n, f) => n + (f.size ?? 0), 0);
        return unused > 0 ? (
          <Btn
            label={tr("Remove unused voices ({0})", { 0: mb(unused) })}
            onPress={() => (Alert.alert(tr("Removed"), tr("{0} freed. Voices for languages in your library are kept and download again if needed.", { 0: mb(removeUnusedVoices()) })), tick((n) => n + 1))}
          />
        ) : null;
      })()}
      <Btn
        label={tr("Clear temporary files ({0})", { 0: mb(z.temp) })}
        onPress={() => (clearCache(), tick((n) => n + 1), Alert.alert(tr("Cleared"), tr("Temporary files removed. Decks, books and notes are untouched.")))}
      />
    </Page>
  );
}

const s = themed(() => ({
  card: { backgroundColor: c.panel, borderRadius: 18, padding: 16, gap: 10, marginBottom: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  used: { color: c.dim, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  big: { color: c.text, fontSize: 38, fontWeight: '700' },
  free: { color: c.dim, fontSize: 16 },
  bar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', borderWidth: 1, borderColor: c.line, backgroundColor: c.raised, gap: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: c.text, fontSize: 13 },
}));
