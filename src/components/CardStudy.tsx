import { Image, Text, View } from 'react-native';
import { FamiliarArt } from './Familiar';
import { withYou } from '../familiar';
import { Crop, intro, IntroPage, lx, RWS_RATIO, rwsUri, Study, TINTS } from '../cardStudy';
import { c, F, themed } from '../theme';

export function SymbolDot({ id, crop, size }: { id: string; crop: Crop; size: number }) {
  const w = size / (2 * crop.r);
  return (
    <View style={[s.dot, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        source={{ uri: rwsUri(id) }}
        style={{ position: 'absolute', width: w, height: w * RWS_RATIO, left: -(crop.x - crop.r) * w, top: -(crop.y * RWS_RATIO - crop.r) * w }}
      />
    </View>
  );
}

const Bullets = ({ items }: { items: string[] }) =>
  items.length ? (
    <View style={{ gap: 2 }}>
      {items.map((t) => (
        <Text key={t} style={s.li}>
          <Text style={s.star}>✦ </Text>
          {t}
        </Text>
      ))}
    </View>
  ) : (
    <Text style={s.none}>–</Text>
  );

export function CardStudyView({ d }: { d: Study }) {
  return (
    <View style={{ gap: 14 }}>
      <View style={s.head}>
        <Image source={{ uri: rwsUri(d.id) }} style={s.card} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.name}>{lx(d.name).toUpperCase()}</Text>
          <Text style={s.sub}>{lx(d.subtitle)}</Text>
          <Text style={s.text}>{lx(d.intro)}</Text>
        </View>
      </View>

      <Text style={s.h3}>{lx({ pt: 'Símbolos', en: 'Symbols' })}</Text>
      {d.symbols.map((x) => (
        <View key={x.key} style={s.row}>
          <SymbolDot id={d.id} crop={x.crop} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={s.h4}>{lx(x.title)}</Text>
            <Bullets items={lx(x.keywords)} />
          </View>
        </View>
      ))}

      <Text style={s.h3}>{lx({ pt: 'Cores', en: 'Colours' })}</Text>
      <View style={s.grid}>
        {d.colours.map((x) => (
          <View key={x.hex} style={[s.row, s.half]}>
            <View style={[s.sw, { backgroundColor: x.hex }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.h4}>{lx(x.name)}</Text>
              <Bullets items={lx(x.keywords)} />
            </View>
          </View>
        ))}
      </View>

      <Text style={s.h3}>{lx({ pt: 'Na leitura', en: 'In a reading' })}</Text>
      <View style={s.sum}>
        {lx(d.summary).map((t) => (
          <Text key={t} style={[s.text, { textAlign: 'center' }]}>
            {t}
          </Text>
        ))}
      </View>
      {d.planes.map((p) => {
        const items = lx(p.bullets);
        const dark = p.id === 'challenge';
        return (
          <View key={p.id} style={[s.plane, { borderLeftColor: TINTS[p.id] ?? c.gold }, dark && s.challenge]}>
            <Text style={[s.h4, dark && { color: c.gold }]}>{lx(p.title)}</Text>
            <Bullets items={items} />
            {!!items.length && <Text style={s.q}>{lx(p.line)}</Text>}
          </View>
        );
      })}
    </View>
  );
}

export function IntroView({ page }: { page: IntroPage }) {
  if (page === 'how-to') {
    const h = intro.howTo;
    return (
      <View style={{ gap: 14 }}>
        <Text style={s.title}>{lx(h.title)}</Text>
        <Text style={s.lead}>{lx(h.lead)}</Text>
        {h.parts.map((p) => (
          <View key={p.title.en} style={s.part}>
            <Text style={s.h4}>{lx(p.title)}</Text>
            <Text style={s.text}>{lx(p.text)}</Text>
          </View>
        ))}
        <Text style={s.q}>– {lx(h.dash)}</Text>
      </View>
    );
  }
  if (page === 'colours') {
    const k = intro.colours;
    return (
      <View style={{ gap: 14 }}>
        <Text style={s.title}>{lx(k.title)}</Text>
        <Text style={s.lead}>{lx(k.lead)}</Text>
        {k.list.map((x) => (
          <View key={x.hex} style={s.row}>
            <View style={[s.sw, { width: 34, height: 34, borderRadius: 17, backgroundColor: x.hex }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.h4}>{lx(x.name)}</Text>
              <Text style={s.text}>{lx(x.keywords)}</Text>
            </View>
          </View>
        ))}
        <Text style={s.q}>{lx(k.sky)}</Text>
      </View>
    );
  }
  const p = intro.planes;
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.title}>{lx(p.title)}</Text>
      <Text style={s.lead}>{lx(p.lead)}</Text>
      {p.list.map((x) => (
        <View key={x.id} style={[s.plane, { borderLeftColor: TINTS[x.id] ?? c.gold }, x.id === 'challenge' && s.challenge]}>
          <Text style={[s.h4, x.id === 'challenge' && { color: c.gold }]}>{lx(x.name)}</Text>
          <Text style={s.text}>{lx(x.text)}</Text>
        </View>
      ))}
    </View>
  );
}

/** Cover B: the familiar with you in front of a golden moon. */
export function BookletCover({ size }: { size: number }) {
  return (
    <View style={[s.cover, { height: size * 1.05 }]}>
      <View style={[s.glow, { width: size * 0.82, height: size * 0.82, borderRadius: size, top: size * 0.08 }]} />
      <View style={[s.moon, { width: size * 0.7, height: size * 0.7, borderRadius: size, top: size * 0.14 }]} />
      <View style={{ position: 'absolute', top: size * 0.22 }}>
        <FamiliarArt familiar={withYou()} size={size * 0.72} alive />
      </View>
    </View>
  );
}

const s = themed(() => ({
  dot: { overflow: 'hidden', borderWidth: 1.5, borderColor: c.gold, backgroundColor: c.panel },
  head: { flexDirection: 'row', gap: 14 },
  card: { width: 110, height: 110 * RWS_RATIO, borderRadius: 6, borderWidth: 1.5, borderColor: c.gold },
  name: { color: c.text, fontFamily: F.heading, fontSize: 28, letterSpacing: 1.5 },
  sub: { color: c.gold, fontFamily: F.headingItalic, fontSize: 15 },
  title: { color: c.text, fontFamily: F.heading, fontSize: 28, textAlign: 'center' },
  lead: { color: c.text, fontSize: 17, lineHeight: 25, textAlign: 'center' },
  text: { color: c.text, fontSize: 17, lineHeight: 25 },
  h3: { color: c.gold, fontFamily: F.heading, fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', borderTopWidth: 1, borderTopColor: c.gold, paddingTop: 10, marginTop: 6 },
  h4: { color: c.text, fontFamily: F.heading, fontSize: 17, marginBottom: 3 },
  li: { color: c.text, fontSize: 17, lineHeight: 25 },
  star: { color: c.gold, fontSize: 11 },
  none: { color: c.dim, fontSize: 17 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  half: { width: '50%', paddingRight: 8 },
  sw: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: c.line },
  sum: { gap: 2, paddingVertical: 4 },
  plane: { backgroundColor: c.panel, borderRadius: 12, padding: 14, borderLeftWidth: 4, gap: 2 },
  challenge: { backgroundColor: c.raised, borderLeftColor: c.gold },
  q: { color: c.dim, fontFamily: F.headingItalic, fontSize: 15, lineHeight: 21, marginTop: 6 },
  part: { borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10 },
  cover: { alignItems: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', backgroundColor: c.gold, opacity: 0.12 },
  moon: { position: 'absolute', backgroundColor: c.gold },
}));
