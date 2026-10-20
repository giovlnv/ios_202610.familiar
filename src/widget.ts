import { ExtensionStorage } from '@bacons/apple-targets';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { longitude, signOf } from './astrology';
import { cardName, cardUri } from './decks';
import { getOnboarding } from './familiar';
import { moonPhase } from './guide';
import { cardOfTheDay } from './journal';
import { personal } from './numerology';
import { getBook, loadProgress } from './storage';
import { c, read, write } from './theme';
import { getProfile, load } from './tracker';

export const APP_GROUP = 'group.com.giovlnv.tarotreader';
const store = new ExtensionStorage(APP_GROUP);

export type WidgetColors = { theme: boolean; bg: string; text: string; accent: string };
export const BG = ['#14111C', '#0D1626', '#1A0D10', '#0E1813', '#0F1730', '#F6F2F8', '#FFFFFF'];
export const TEXT = ['#ECE6F5', '#FFFFFF', '#DCE3F2', '#221A2E', '#142033'];
export const ACCENT = ['#D9B45B', '#C9D1DE', '#C29468', '#D49A9E', '#8FB8DE', '#7FC4C9', '#FFFFFF', '#9A7420'];

export function getWidgetColors(): WidgetColors {
  try {
    return { theme: true, bg: BG[0], text: TEXT[0], accent: ACCENT[0], ...JSON.parse(read('widget-colors.json') || '{}') };
  } catch {
    return { theme: true, bg: BG[0], text: TEXT[0], accent: ACCENT[0] };
  }
}

export function setWidgetColors(p: Partial<WidgetColors>) {
  write('widget-colors.json', JSON.stringify({ ...getWidgetColors(), ...p }));
  syncWidget().catch(() => {});
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function smallImage(uri: string, width: number) {
  const out = await (await ImageManipulator.manipulate(uri).resize({ width }).renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  return out.base64 ?? '';
}

function listening() {
  const last = read('last-book.txt');
  const folders = [last, ...load().books.map((b) => b.audio)].filter((x): x is string => !!x);
  for (const folder of folders) {
    const item = getBook(folder);
    const p = loadProgress(folder);
    if (!item || !(p.time > 0 || p.section > 0)) continue;
    return { folder, title: item.book.title, section: item.book.sections[p.section]?.title ?? '', progress: (p.section + 0.5) / (item.book.sections.length || 1) };
  }
  return null;
}

/** Writes the next 7 days, the current book and the colours for the home-screen widget. */
export async function syncWidget(familiarPng?: string) {
  const dob = getProfile().dob;
  const paths = getOnboarding().paths ?? [];
  const days = [];
  const images: Record<string, string> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(12, 0, 0, 0);
    const card = cardOfTheDay(d);
    const m = moonPhase(d);
    days.push({
      date: ymd(d),
      card,
      cardName: cardName(card),
      moon: m.name,
      lit: m.lit,
      waxing: m.frac < 0.5,
      moonSign: `${signOf(longitude('Moon', d)).glyph} ${signOf(longitude('Moon', d)).name}`,
      day: dob && paths.includes('numerology') ? personal(dob, d).day : null,
    });
    if (!images[card]) {
      const uri = cardUri(card);
      if (uri) images[card] = await smallImage(uri, 220).catch(() => '');
    }
  }
  const col = getWidgetColors();
  const colors = col.theme ? { bg: c.bg, text: c.text, accent: c.gold } : col;
  store.set('data', JSON.stringify({ days, listening: listening(), colors: { bg: colors.bg, text: colors.text, accent: colors.accent } }));
  for (const [id, b64] of Object.entries(images)) if (b64) store.set(`card-${id}`, b64);
  if (familiarPng) store.set('familiar', familiarPng);
  ExtensionStorage.reloadWidget();
}
