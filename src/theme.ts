import { Appearance, StyleSheet } from 'react-native';
import { File, Paths } from 'expo-file-system';

export type Palette = {
  bg: string;
  panel: string;
  raised: string;
  text: string;
  dim: string;
  gold: string;
  explain: string;
  line: string;
  claude: string;
};

export const PALETTES: { id: string; name: string; c: Palette; light: Palette }[] = [
  { id: 'plum', name: 'Plum and gold', c: { bg: '#14111c', panel: '#1f1a2b', raised: '#2a2339', text: '#ece6f5', dim: '#9a90ad', gold: '#d9b45b', explain: '#8fb8de', line: '#3a3150', claude: '#e0896a' }, light: { bg: '#f6f2f8', panel: '#ffffff', raised: '#ebe4f0', text: '#221a2e', dim: '#62577a', gold: '#84621a', explain: '#2f6a9e', line: '#d9cfe2', claude: '#9e4632' } },
  { id: 'water', name: 'Water · marine and silver', c: { bg: '#0d1626', panel: '#15233a', raised: '#1d2e4a', text: '#e8eef7', dim: '#8fa0b8', gold: '#c9d1de', explain: '#7fc4c9', line: '#2a3d5c', claude: '#e0896a' }, light: { bg: '#f1f5fa', panel: '#ffffff', raised: '#e1e9f3', text: '#142033', dim: '#55657c', gold: '#4f5f78', explain: '#1a6e74', line: '#cfdbe8', claude: '#9e4632' } },
  { id: 'fire', name: 'Fire · maroon and gold', c: { bg: '#1a0d10', panel: '#2a1519', raised: '#381d23', text: '#f3e7e9', dim: '#b0959a', gold: '#d9b45b', explain: '#9fb8d6', line: '#4a2a31', claude: '#e88c78' }, light: { bg: '#faf3f1', panel: '#ffffff', raised: '#f0e1e1', text: '#2e1418', dim: '#765a5e', gold: '#7d5a14', explain: '#37638f', line: '#e3cfd2', claude: '#a24236' } },
  { id: 'earth', name: 'Earth · forest and brown', c: { bg: '#0e1813', panel: '#17251d', raised: '#203227', text: '#edebe3', dim: '#9aa89c', gold: '#c29468', explain: '#a9c7e0', line: '#2c4234', claude: '#e0896a' }, light: { bg: '#f3f5f0', panel: '#ffffff', raised: '#e4eadf', text: '#1a2419', dim: '#586758', gold: '#7a5230', explain: '#33658a', line: '#d3ddd0', claude: '#9e4632' } },
  { id: 'air', name: 'Air · night blue and white', c: { bg: '#0f1730', panel: '#18223f', raised: '#212d50', text: '#dce3f2', dim: '#9ca8c4', gold: '#ffffff', explain: '#9fc3ee', line: '#2c3962', claude: '#f0a07e' }, light: { bg: '#f4f7fd', panel: '#ffffff', raised: '#e5ebf7', text: '#142045', dim: '#5b6890', gold: '#1e3a8a', explain: '#2f6a9e', line: '#d2dbee', claude: '#9e4632' } },
];

const RENAMED: Record<string, string> = { marine: 'water', maroon: 'fire', forest: 'earth', teal: 'water', silver: 'plum', oxblood: 'fire' };

export type Mode = 'dark' | 'light' | 'system';

const file = (name: string) => new File(Paths.document, name);
export const read = (name: string) => {
  try {
    return file(name).exists ? file(name).textSync().trim() : '';
  } catch {
    return '';
  }
};
export const write = (name: string, v: string) => {
  const f = file(name);
  if (!f.exists) f.create();
  f.write(v);
};

const savedPalette = read('palette.txt');
export let paletteId = RENAMED[savedPalette] ?? (PALETTES.some((p) => p.id === savedPalette) ? savedPalette : PALETTES[0].id);
export let mode = (read('mode.txt') || 'dark') as Mode;
const resolve = (m: Mode): 'dark' | 'light' => (m === 'system' ? (Appearance.getColorScheme() === 'light' ? 'light' : 'dark') : m);
export let scheme: 'dark' | 'light' = resolve(mode);

const paletteFor = (id: string, sch: 'dark' | 'light') => {
  const p = PALETTES.find((x) => x.id === id) ?? PALETTES[0];
  return sch === 'light' ? p.light : p.c;
};
export const c: Palette = { ...paletteFor(paletteId, scheme) };

let version = 0;
const listeners = new Set<() => void>();
export const onThemeChange = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** Apply a palette and/or mode live: colours update in place and every themed style sheet rebuilds on next read. */
export function applyTheme(next: { palette?: string; mode?: Mode } = {}) {
  if (next.palette) {
    paletteId = next.palette;
    write('palette.txt', next.palette);
  }
  if (next.mode) {
    mode = next.mode;
    write('mode.txt', next.mode);
  }
  const sch = resolve(mode);
  const pal = paletteFor(paletteId, sch);
  if (sch === scheme && Object.keys(pal).every((k) => c[k as keyof Palette] === pal[k as keyof Palette])) return;
  scheme = sch;
  Object.assign(c, pal);
  version++;
  listeners.forEach((fn) => fn());
}

/** Like StyleSheet.create, but rebuilt from the current theme colours after applyTheme. */
export function themed<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(make: () => T & StyleSheet.NamedStyles<any>): T {
  let built = -1;
  let cache = {} as T;
  return new Proxy({} as T, {
    get(_, key) {
      if (built !== version) {
        cache = make();
        built = version;
      }
      return cache[key as keyof T];
    },
  });
}

export const setPalette = (id: string) => applyTheme({ palette: id });
export const setMode = (m: Mode) => applyTheme({ mode: m });

export const F = { heading: 'PlayfairDisplay_500Medium', headingItalic: 'PlayfairDisplay_500Medium_Italic' };
