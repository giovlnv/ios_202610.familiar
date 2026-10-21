import { t as tr } from './i18n';
import * as A from 'astronomy-engine';
import { getProfile } from './tracker';
import { getOnboarding, HouseSystem } from './familiar';

const T = '︎';

export const SIGNS = [
  { name: 'Aries', glyph: '♈', element: 'Fire', mode: 'Cardinal' },
  { name: 'Taurus', glyph: '♉', element: 'Earth', mode: 'Fixed' },
  { name: 'Gemini', glyph: '♊', element: 'Air', mode: 'Mutable' },
  { name: 'Cancer', glyph: '♋', element: 'Water', mode: 'Cardinal' },
  { name: 'Leo', glyph: '♌', element: 'Fire', mode: 'Fixed' },
  { name: 'Virgo', glyph: '♍', element: 'Earth', mode: 'Mutable' },
  { name: 'Libra', glyph: '♎', element: 'Air', mode: 'Cardinal' },
  { name: 'Scorpio', glyph: '♏', element: 'Water', mode: 'Fixed' },
  { name: 'Sagittarius', glyph: '♐', element: 'Fire', mode: 'Mutable' },
  { name: 'Capricorn', glyph: '♑', element: 'Earth', mode: 'Cardinal' },
  { name: 'Aquarius', glyph: '♒', element: 'Air', mode: 'Fixed' },
  { name: 'Pisces', glyph: '♓', element: 'Water', mode: 'Mutable' },
].map((s) => ({ ...s, glyph: s.glyph + T }));

export const PLANETS = [
  ['Sun', '☉'], ['Moon', '☽'], ['Mercury', '☿'], ['Venus', '♀'], ['Mars', '♂'],
  ['Jupiter', '♃'], ['Saturn', '♄'], ['Uranus', '♅'], ['Neptune', '♆'], ['Pluto', '♇'],
].map(([name, glyph]) => ({ name, glyph: glyph + T }));

export const glyph = (name: string) => [...SIGNS, ...PLANETS].find((x) => x.name === name)?.glyph ?? '';

const MAJOR: Record<string, string[]> = {
  m00: ['Air', 'Uranus'], m01: ['Mercury'], m02: ['Moon'], m03: ['Venus'], m04: ['Aries'], m05: ['Taurus'],
  m06: ['Gemini'], m07: ['Cancer'], m08: ['Leo'], m09: ['Virgo'], m10: ['Jupiter'], m11: ['Libra'],
  m12: ['Water', 'Neptune'], m13: ['Scorpio'], m14: ['Sagittarius'], m15: ['Capricorn'], m16: ['Mars'],
  m17: ['Aquarius'], m18: ['Pisces'], m19: ['Sun'], m20: ['Fire', 'Pluto'], m21: ['Saturn', 'Earth'],
};

const SUIT = {
  wands: { element: 'Fire', signs: ['Aries', 'Leo', 'Sagittarius'], rulers: ['Mars', 'Sun', 'Venus', 'Saturn', 'Jupiter', 'Mars', 'Mercury', 'Moon', 'Saturn'] },
  cups: { element: 'Water', signs: ['Cancer', 'Scorpio', 'Pisces'], rulers: ['Venus', 'Mercury', 'Moon', 'Mars', 'Sun', 'Venus', 'Saturn', 'Jupiter', 'Mars'] },
  swords: { element: 'Air', signs: ['Libra', 'Aquarius', 'Gemini'], rulers: ['Moon', 'Saturn', 'Jupiter', 'Venus', 'Mercury', 'Moon', 'Jupiter', 'Mars', 'Sun'] },
  pents: { element: 'Earth', signs: ['Capricorn', 'Taurus', 'Virgo'], rulers: ['Jupiter', 'Mars', 'Sun', 'Mercury', 'Moon', 'Saturn', 'Sun', 'Venus', 'Mercury'] },
};
type Suit = keyof typeof SUIT;

const COURT: Record<Suit, Record<number, [string, string]>> = {
  wands: { 12: ['Scorpio', 'Sagittarius'], 13: ['Pisces', 'Aries'], 14: ['Cancer', 'Leo'] },
  cups: { 12: ['Aquarius', 'Pisces'], 13: ['Gemini', 'Cancer'], 14: ['Libra', 'Scorpio'] },
  swords: { 12: ['Taurus', 'Gemini'], 13: ['Virgo', 'Libra'], 14: ['Capricorn', 'Aquarius'] },
  pents: { 12: ['Leo', 'Virgo'], 13: ['Sagittarius', 'Capricorn'], 14: ['Aries', 'Taurus'] },
};

const parse = (id: string) => {
  const suit = (Object.keys(SUIT) as Suit[]).find((s) => id.startsWith(s));
  return suit ? { suit, rank: Number(id.slice(suit.length)) } : null;
};

export function cardAstro(id: string) {
  if (MAJOR[id]) {
    const [main, modern] = MAJOR[id];
    return id === 'm21' ? 'Saturn · also Earth' : modern ? `${main} · modern: ${modern}` : main;
  }
  const p = parse(id);
  if (!p) return undefined;
  const s = SUIT[p.suit];
  if (p.rank === 1) return `Root of ${s.element}`;
  if (p.rank <= 10) {
    const d = (p.rank - 2) % 3;
    return `${s.rulers[p.rank - 2]} in ${s.signs[Math.floor((p.rank - 2) / 3)]} (${d * 10}–${d * 10 + 10}°)`;
  }
  if (p.rank === 11) return `Earth of ${s.element}`;
  const [a, b] = COURT[p.suit][p.rank];
  return `20° ${a} – 20° ${b}`;
}

export function astroCards(name: string) {
  const majors = Object.keys(MAJOR).filter((id) => MAJOR[id].includes(name));
  const minors = (Object.keys(SUIT) as Suit[]).flatMap((suit) => {
    const s = SUIT[suit];
    const ids: string[] = [];
    for (let r = 2; r <= 10; r++) if (s.signs[Math.floor((r - 2) / 3)] === name || s.rulers[r - 2] === name) ids.push(`${suit}${String(r).padStart(2, '0')}`);
    for (const r of [12, 13, 14]) if (COURT[suit][r].includes(name)) ids.push(`${suit}${r}`);
    return ids;
  });
  return [...majors, ...minors];
}

const rad = Math.PI / 180;
const norm = (x: number) => ((x % 360) + 360) % 360;

export const signOf = (lon: number) => SIGNS[Math.floor(norm(lon) / 30)];
export const fmtDeg = (lon: number) => {
  const d = norm(lon) % 30;
  const m = Math.floor((d % 1) * 60);
  return `${Math.floor(d)}°${String(m).padStart(2, '0')}′`;
};

function tzOffset(t: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(t));
  const v = (k: string) => Number(parts.find((x) => x.type === k)?.value);
  return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute')) - Math.floor(t / 60000) * 60000;
}

export function birthUtc(date: string, time: string | undefined, tz: string | undefined) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = (time && /^\d{2}:\d{2}$/.test(time) ? time : '12:00').split(':').map(Number);
  const local = Date.UTC(y, m - 1, d, h, mi);
  if (!tz) return new Date(y, m - 1, d, h, mi);
  try {
    let utc = local - tzOffset(local, tz);
    utc = local - tzOffset(utc, tz);
    return new Date(utc);
  } catch {
    return new Date(y, m - 1, d, h, mi);
  }
}

const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const;

export function longitude(body: string, date: Date) {
  if (body === 'Sun') return A.SunPosition(date).elon;
  if (body === 'Moon') return A.EclipticGeoMoon(date).lon;
  return A.Ecliptic(A.GeoVector(body as A.Body, date, true)).elon;
}

const retro = (body: string, date: Date) => {
  if (body === 'Sun' || body === 'Moon') return false;
  const a = longitude(body, date);
  const b = longitude(body, new Date(date.getTime() + 86400000));
  return norm(b - a) > 180;
};

export const HOUSES = [
  { id: 'placidus', name: 'Placidus' },
  { id: 'whole', name: 'Whole sign' },
  { id: 'equal', name: 'Equal' },
] as const;

function angles(date: Date, lat: number, lon: number, sys: HouseSystem = 'placidus') {
  const t = A.MakeTime(date);
  const eps = A.e_tilt(t).tobl * rad;
  const ramc = norm(A.SiderealTime(date) * 15 + lon);
  const r = ramc * rad;
  const phi = lat * rad;
  const mc = norm(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(eps)) / rad);
  const asc = norm(Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / rad);
  const cusp = (f: number, below: boolean) => {
    let l = norm(mc + (below ? 180 : 0) + (below ? -1 : 1) * f * 90);
    for (let i = 0; i < 12; i++) {
      const dec = Math.asin(Math.sin(eps) * Math.sin(l * rad));
      const sda = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(dec)))) / rad;
      const ra = below ? ramc + 180 - f * (180 - sda) : ramc + f * sda;
      l = norm(Math.atan2(Math.sin(ra * rad), Math.cos(ra * rad) * Math.cos(eps)) / rad);
    }
    return l;
  };
  if (sys !== 'placidus') {
    const start = sys === 'whole' ? Math.floor(asc / 30) * 30 : asc;
    return { asc, mc, cusps: Array.from({ length: 12 }, (_, i) => norm(start + i * 30)) };
  }
  const c11 = cusp(1 / 3, false), c12 = cusp(2 / 3, false), c2 = cusp(2 / 3, true), c3 = cusp(1 / 3, true);
  const half = [asc, c2, c3, norm(mc + 180), norm(c11 + 180), norm(c12 + 180)];
  return { asc, mc, cusps: [...half, ...half.map((x) => norm(x + 180))] };
}

const houseOf = (lon: number, cusps: number[]) => {
  for (let i = 0; i < 12; i++) if (norm(lon - cusps[i]) < norm(cusps[(i + 1) % 12] - cusps[i])) return i + 1;
  return 1;
};

export type Placement = { name: string; glyph: string; lon: number; house?: number; retro?: boolean };

export function chart(date: string, time?: string, place?: { lat: number; lon: number; tz?: string }) {
  const when = birthUtc(date, time, place?.tz);
  const timed = !!time && /^\d{2}:\d{2}$/.test(time) && !!place;
  const ang = timed ? angles(when, place!.lat, place!.lon, getOnboarding().houses) : null;
  const T = (A.MakeTime(when).tt) / 36525;
  const node = norm(125.04452 - 1934.136261 * T);
  const list: Placement[] = BODIES.map((b) => {
    const lon = longitude(b, when);
    return { name: b, glyph: glyph(b), lon, retro: retro(b, when), house: ang ? houseOf(lon, ang.cusps) : undefined };
  });
  list.push({ name: 'North Node', glyph: '☊︎', lon: node, house: ang ? houseOf(node, ang.cusps) : undefined });
  if (ang) list.push({ name: 'Ascendant', glyph: 'AC', lon: ang.asc }, { name: 'Midheaven', glyph: 'MC', lon: ang.mc });
  const counted = list.filter((p) => BODIES.includes(p.name as (typeof BODIES)[number]) || p.name === 'Ascendant');
  const tally = (k: 'element' | 'mode') =>
    counted.reduce<Record<string, number>>((a, p) => ((a[signOf(p.lon)[k]] = (a[signOf(p.lon)[k]] ?? 0) + 1), a), {});
  return { list, timed, cusps: ang?.cusps, elements: tally('element'), modes: tally('mode') };
}

export function myChart() {
  const dob = getProfile().dob;
  if (!dob) return null;
  const ob = getOnboarding();
  const place = ob.birthPlace && ob.birthLat != null && ob.birthLon != null ? { lat: ob.birthLat, lon: ob.birthLon, tz: ob.birthTz } : undefined;
  return chart(dob, ob.birthTime, place);
}

export function sky(date = new Date()) {
  const moon = signOf(longitude('Moon', date)).name;
  const back = BODIES.filter((b) => retro(b, date));
  return tr('Moon in {0}', { 0: tr(moon) }) + (back.length ? ` · ℞\uFE0E ${back.map((b) => tr(b)).join(', ')}` : '');
}
