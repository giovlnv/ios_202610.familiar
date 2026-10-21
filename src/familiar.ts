import { listSystems } from './systems';
import { File, Paths } from 'expo-file-system';
import { ART, CRESCENT } from './familiar-art';
import { paletteId } from './theme';

export type Species = 'cat' | 'bat' | 'crow' | 'spider';
export type Build = 'round' | 'slim';
export type Coat = 'solid' | 'socks' | 'tabby' | 'tuxedo' | 'calico' | 'colourpoint';
export type Mark = 'crescent' | 'star' | 'sun' | 'eye' | 'none';
export type Pose = 'idle' | 'reading' | 'sleeping' | 'walking';

export type Familiar = {
  id: string;
  name: string;
  species: Species;
  build: Build;
  coat: Coat;
  color: string;
  light?: string;
  eyes: string;
  mark: Mark;
  markColor?: string;
  stripe?: string;
  paths: string[];
  created: number;
};

export const SPECIES: { id: Species; name: string; desc: string }[] = [
  { id: 'cat', name: 'Cat', desc: 'Build, coat, eyes, mark' },
  { id: 'bat', name: 'Bat', desc: 'Colour, eyes' },
  { id: 'crow', name: 'Crow', desc: 'Colour, eyes' },
  { id: 'spider', name: 'Spider', desc: 'Colour, eyes' },
];

export const COATS: { id: Coat; name: string }[] = [
  { id: 'solid', name: 'Solid' },
  { id: 'socks', name: 'Socks' },
  { id: 'tabby', name: 'Tabby' },
  { id: 'tuxedo', name: 'Tuxedo' },
  { id: 'calico', name: 'Calico' },
  { id: 'colourpoint', name: 'Point' },
];

export const COLORS: Record<Species, { hex: string; name: string }[]> = {
  cat: [
    { hex: '#1E1B24', name: 'Black' },
    { hex: '#30263F', name: 'Plum' },
    { hex: '#1E2A3F', name: 'Marine' },
    { hex: '#22302A', name: 'Forest' },
    { hex: '#2B2B30', name: 'Charcoal' },
    { hex: '#5C4233', name: 'Brown' },
    { hex: '#E9E3DA', name: 'White' },
  ],
  bat: [
    { hex: '#1E1B24', name: 'Black' },
    { hex: '#4A3B2E', name: 'Brown' },
    { hex: '#55515C', name: 'Grey' },
  ],
  crow: [
    { hex: '#1E1B24', name: 'Black' },
    { hex: '#1B2433', name: 'Blue-black' },
  ],
  spider: [
    { hex: '#1E1B24', name: 'Black' },
    { hex: '#3B2A4A', name: 'Purple' },
    { hex: '#4A3B2E', name: 'Brown' },
  ],
};

export const LIGHTS = ['#CDBFD3', '#C4CAD6', '#C9D1C6', '#D6D0C4'];

export const EYES = [
  { hex: '#F2C94C', name: 'Yellow' },
  { hex: '#8FD18C', name: 'Green' },
  { hex: '#8FB8DE', name: 'Blue' },
  { hex: '#E39A4C', name: 'Amber' },
];

export const MARK_COLORS = [
  { hex: '#E8C767', name: 'Gold' },
  { hex: '#D9D6E2', name: 'Silver' },
  { hex: '#D49A9E', name: 'Rose' },
  { hex: '#8FB8DE', name: 'Moon blue' },
  { hex: '#F3ECDF', name: 'Pearl' },
  { hex: '#7FC48A', name: 'Green' },
  { hex: '#B48CD9', name: 'Purple' },
];

export const STRIPES = [
  { hex: '', name: 'Auto' },
  { hex: '#2A2430', name: 'Dark' },
  { hex: '#6E6A75', name: 'Grey' },
  { hex: '#C98B5B', name: 'Ginger' },
  { hex: '#DED5C9', name: 'Cream' },
];

export const MARKS: { id: Mark; name: string }[] = [
  { id: 'crescent', name: 'Crescent' },
  { id: 'star', name: 'Star' },
  { id: 'sun', name: 'Sun' },
  { id: 'eye', name: 'Eye' },
  { id: 'none', name: 'None' },
];

export const PATHS = [
  { id: 'tarot', name: 'Tarot', color: '#D9B45B' },
  { id: 'lenormand', name: 'Lenormand', color: '#D49A9E' },
  { id: 'astrology', name: 'Astrology', color: '#8FB8DE' },
  { id: 'numerology', name: 'Numerology', color: '#7FC4C9' },
  { id: 'custom', name: 'Make your own', color: '#B9B6C3' },
];

export const allPaths = () => [...PATHS, ...listSystems().map((x) => ({ id: x.id, name: x.name, color: x.color }))];

export const SHADOW: Familiar = {
  id: 'shadow',
  name: 'Shadow',
  species: 'cat',
  build: 'round',
  coat: 'solid',
  color: '#1E1B24',
  eyes: '#F2C94C',
  mark: 'crescent',
  paths: [],
  created: 0,
};

const PROPS: Record<string, { accent: string; cover: string; cup: string }> = {
  plum: { accent: '#D9B45B', cover: '#5A3E6B', cup: '#14111C' },
  water: { accent: '#C9D1DE', cover: '#2E4A6E', cup: '#0D1626' },
  fire: { accent: '#D9B45B', cover: '#6B2A33', cup: '#1A0D10' },
  earth: { accent: '#C29468', cover: '#5C4233', cup: '#0E1813' },
  air: { accent: '#E8EEF8', cover: '#2B3F7A', cup: '#0F1730' },
};

const STAR = 'M256 136 Q258.5 147.5 270 150 Q258.5 152.5 256 164 Q253.5 152.5 242 150 Q253.5 147.5 256 136 Z';
const SUN =
  'M262 150 A6 6 0 1 1 250 150 A6 6 0 1 1 262 150 Z M264.4 151.7 L269.6 150 L264.4 148.3 Z M260.74 157.14 L265.62 159.62 L263.14 154.74 Z M254.3 158.4 L256 163.6 L257.7 158.4 Z M248.86 154.74 L246.38 159.62 L251.26 157.14 Z M247.6 148.3 L242.4 150 L247.6 151.7 Z M251.26 142.86 L246.38 140.38 L248.86 145.26 Z M257.7 141.6 L256 136.4 L254.3 141.6 Z M263.14 145.26 L265.62 140.38 L260.74 142.86 Z';
const EYE =
  'M242 150 Q256 136.5 270 150 Q256 163.5 242 150 Z M245.6 150 Q256 140.5 266.4 150 Q256 159.5 245.6 150 Z M260.2 150 A4.2 4.2 0 1 1 251.8 150 A4.2 4.2 0 1 1 260.2 150 Z';

const lum = (hex: string) => {
  const h = hex.replace('#', '');
  return (0.2126 * parseInt(h.slice(0, 2), 16) + 0.7152 * parseInt(h.slice(2, 4), 16) + 0.0722 * parseInt(h.slice(4, 6), 16)) / 255;
};

export function artKey(f: Familiar, pose: Pose) {
  if (f.species !== 'cat') return `${f.species}-${pose === 'walking' ? 'idle' : pose}`;
  return pose === 'idle' ? `cat-${f.build}-idle-${f.coat}` : `cat-${f.build}-${pose}`;
}

export function familiarXml(f: Familiar, pose: Pose = 'idle', closed = false, tail = 0) {
  const p = PROPS[paletteId] ?? PROPS.plum;
  const dark = lum(f.color) < 0.13;
  const light = f.light ?? LIGHTS[0];
  const on = (coat: Coat) => (f.coat === coat ? '1' : '0');
  const vals: Record<string, string> = {
    coat: f.color,
    body: f.coat === 'colourpoint' ? light : f.color,
    iris: f.eyes,
    light,
    stripe: f.stripe || (dark ? '#FFFFFF' : '#000000'),
    stripeOp: f.stripe ? '0.8' : dark ? '0.14' : '0.3',
    bellyFill: f.coat === 'solid' ? f.color : '#DED5C9',
    oSocks: on('socks'),
    oTabby: on('tabby'),
    oTuxedo: on('tuxedo'),
    oCalico: on('calico'),
    oPoint: on('colourpoint'),
    ...p,
  };
  let xml = (ART[artKey(f, pose)] ?? ART['cat-round-idle-solid']).replace(/\{\{(\w+)\}\}/g, (_, k) => vals[k] ?? '');
  if (f.mark === 'star') xml = xml.replace(CRESCENT, STAR);
  if (f.mark === 'sun') xml = xml.replace(CRESCENT, SUN);
  if (f.mark === 'eye') xml = xml.replace(`d="${CRESCENT}"`, `d="${EYE}" fill-rule="evenodd"`);
  if (f.mark === 'none') xml = xml.replace(/<g id="mark"[^>]*>.*?<\/g>/, '');
  else if (f.markColor) xml = xml.replace('<g id="mark" fill="#E8C767"', `<g id="mark" fill="${f.markColor}"`);
  if (lum(f.color) > 0.5) xml = xml.replace(/#F3E8B9/g, '#6E6478');
  if (tail) xml = swish(xml, pose, tail);
  return closed ? closeEyes(xml) : xml;
}

/** Tail around its root: the wrap-around tail (coat-front) in idle/reading, the raised tail in walking. */
const swish = (xml: string, pose: Pose, a: number) =>
  pose === 'walking'
    ? xml.replace(/<path d="(M150 318 C110|M104 210)/g, `<path transform="rotate(${-a * 2} 150 318)" d="$1`)
    : xml.replace('<g id="coat-front"', `<g id="coat-front" transform="rotate(${a} 352 440)"`);

const section = (xml: string, id: string, fn: (part: string) => string) => {
  const start = xml.indexOf(`<g id="${id}"`);
  if (start < 0) return xml;
  const next = xml.indexOf('<g id="', start + 6);
  const end = next < 0 ? xml.length : next;
  return xml.slice(0, start) + fn(xml.slice(start, end)) + xml.slice(end);
};

export function closeEyes(xml: string) {
  if (!xml.includes('id="eye-white"')) return xml;
  xml = section(xml, 'eye-white', (part) =>
    part.replace(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"><\/circle>/g, (_, x, y, r) => {
      const cx = +x, cy = +y, rr = +r;
      return `<path d="M${cx - rr * 0.75} ${cy + 2} Q${cx} ${cy + rr * 0.62} ${cx + rr * 0.75} ${cy + 2}" fill="none" stroke="#8E7FA6" stroke-width="${Math.max(2.5, rr * 0.2)}" stroke-linecap="round"></path>`;
    }),
  );
  xml = section(xml, 'eye-iris', (part) => part.replace(/<circle[^>]*><\/circle>/g, ''));
  xml = section(xml, 'eye-pupil', (part) => part.replace(/<(ellipse|circle)[^>]*><\/\1>/g, ''));
  xml = section(xml, 'detail', (part) => part.replace(/<circle[^>]*r="(?:[0-6](?:\.\d+)?|7)"[^>]*><\/circle>/g, ''));
  return xml;
}

const store = () => new File(Paths.document, 'familiars.json');
type Store = { list: Familiar[]; withYou: string };

export function loadFamiliars(): Store {
  try {
    const f = store();
    if (f.exists) {
      const s = JSON.parse(f.textSync()) as Store;
      if (s.list?.length) return s;
    }
  } catch {}
  return { list: [SHADOW], withYou: SHADOW.id };
}

function save(s: Store) {
  const f = store();
  if (!f.exists) f.create();
  f.write(JSON.stringify(s));
}

export const withYou = () => {
  const s = loadFamiliars();
  return s.list.find((x) => x.id === s.withYou) ?? s.list[0];
};

export function saveFamiliar(f: Familiar) {
  const s = loadFamiliars();
  for (const x of s.list) if (x.id !== f.id) x.paths = x.paths.filter((p) => !f.paths.includes(p));
  const i = s.list.findIndex((x) => x.id === f.id);
  if (i >= 0) s.list[i] = f;
  else s.list.push(f);
  save(s);
}

export function setWithYou(id: string) {
  save({ ...loadFamiliars(), withYou: id });
}

export function removeFamiliar(id: string) {
  const s = loadFamiliars();
  const list = s.list.filter((x) => x.id !== id);
  if (!list.length) return;
  save({ list, withYou: s.withYou === id ? list[0].id : s.withYou });
}

export function togglePath(id: string, path: string) {
  const s = loadFamiliars();
  for (const f of s.list) {
    if (f.id === id) f.paths = f.paths.includes(path) ? f.paths.filter((p) => p !== path) : [...f.paths, path];
    else f.paths = f.paths.filter((p) => p !== path);
  }
  save(s);
}

export const familiarFor = (paths?: string[]) => {
  const s = loadFamiliars();
  for (const p of paths ?? []) {
    const f = s.list.find((x) => x.paths.includes(p));
    if (f) return f;
  }
  return withYou();
};

export const newFamiliar = (): Familiar => ({ ...SHADOW, id: `f${Date.now().toString(36)}`, name: '', created: Date.now() });

export const describe = (f: Familiar) => {
  const color = COLORS[f.species].find((c) => c.hex === f.color)?.name ?? 'Custom';
  if (f.species !== 'cat') return `${SPECIES.find((s) => s.id === f.species)?.name} · ${color.toLowerCase()}`;
  return `Cat · ${f.build} · ${COATS.find((c) => c.id === f.coat)?.name.toLowerCase()} · ${color.toLowerCase()}`;
};

const onboardFile = () => new File(Paths.document, 'onboarding.json');
export type Onboarding = {
  done?: number;
  paths?: string[];
  language?: string;
  goals?: string[];
  birthTime?: string;
  birthPlace?: string;
  birthLat?: number;
  birthLon?: number;
  birthTz?: string;
  yVowel?: boolean;
  houses?: HouseSystem;
};
export type HouseSystem = 'placidus' | 'whole' | 'equal';
export function getOnboarding(): Onboarding {
  try {
    const f = onboardFile();
    return f.exists ? (JSON.parse(f.textSync()) as Onboarding) : {};
  } catch {
    return {};
  }
}
export function setOnboarding(patch: Onboarding) {
  const f = onboardFile();
  if (!f.exists) f.create();
  f.write(JSON.stringify({ ...getOnboarding(), ...patch }));
}

export type Element = 'fire' | 'earth' | 'air' | 'water';
const SIGNS: [string, Element, number, number][] = [
  ['Capricorn', 'earth', 1, 19], ['Aquarius', 'air', 2, 18], ['Pisces', 'water', 3, 20], ['Aries', 'fire', 4, 19],
  ['Taurus', 'earth', 5, 20], ['Gemini', 'air', 6, 20], ['Cancer', 'water', 7, 22], ['Leo', 'fire', 8, 22],
  ['Virgo', 'earth', 9, 22], ['Libra', 'air', 10, 22], ['Scorpio', 'water', 11, 21], ['Sagittarius', 'fire', 12, 21],
];
export function sunSign(iso?: string): { sign: string; element: Element } | undefined {
  const m = iso?.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return;
  const month = +m[1], day = +m[2];
  const i = SIGNS.findIndex(([, , mm, last]) => mm === month && day <= last);
  const [sign, element] = SIGNS[i >= 0 ? i : month % 12];
  return { sign, element };
}

export const nightNow = () => {
  const h = new Date().getHours();
  return h >= 23 || h < 7;
};
