import { useEffect, useReducer } from 'react';
import { File, Paths } from 'expo-file-system';
import { c, F, scheme } from './theme';

export type FontId = 'system' | 'georgia' | 'iowan' | 'playfair';
export type ColorId = 'theme' | 'warm' | 'sepia' | 'cool' | 'rose';

export type TextStyle = { size: number; line: number; gap: number; font: FontId; color: ColorId; align: 'left' | 'justify'; layout: 'pages' | 'scroll' };

export const DEFAULT_STYLE: TextStyle = { size: 17, line: 1.5, gap: 2, font: 'system', color: 'theme', align: 'left', layout: 'pages' };

export const FONTS: { id: FontId; name: string; family?: string }[] = [
  { id: 'system', name: 'System' },
  { id: 'georgia', name: 'Georgia', family: 'Georgia' },
  { id: 'iowan', name: 'Iowan', family: 'Iowan Old Style' },
  { id: 'playfair', name: 'Playfair', family: F.heading },
];

const COLORS: Record<ColorId, { name: string; dark?: string; light?: string }> = {
  theme: { name: 'Theme' },
  warm: { name: 'Warm', dark: '#f1e3c6', light: '#4a3a26' },
  sepia: { name: 'Sepia', dark: '#d8be96', light: '#6b4a2a' },
  cool: { name: 'Cool', dark: '#c9d6e8', light: '#2b405c' },
  rose: { name: 'Rose', dark: '#e8c4c8', light: '#73394a' },
};
export const COLOR_IDS = Object.keys(COLORS) as ColorId[];
export const colorName = (id: ColorId) => COLORS[id].name;
export const colorOf = (id: ColorId) => (scheme === 'light' ? COLORS[id].light : COLORS[id].dark) ?? c.text;

export const LIMITS = { size: [13, 30, 1], line: [1.2, 2.2, 0.1], gap: [0, 24, 2] } as const;

const file = () => new File(Paths.document, 'text-style.json');
let current: TextStyle = (() => {
  try {
    return file().exists ? { ...DEFAULT_STYLE, ...JSON.parse(file().textSync()) } : DEFAULT_STYLE;
  } catch {
    return DEFAULT_STYLE;
  }
})();

const listeners = new Set<() => void>();

export const getTextStyle = () => current;

export function setTextStyle(patch: Partial<TextStyle>) {
  current = { ...current, ...patch };
  const f = file();
  if (!f.exists) f.create();
  f.write(JSON.stringify(current));
  listeners.forEach((fn) => fn());
}

export function useTextStyle() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(bump);
    return () => void listeners.delete(bump);
  }, []);
  return current;
}

export const lineHeight = (t: TextStyle, size = t.size) => Math.round(size * t.line);

export function bodyText(t: TextStyle, on: boolean) {
  const family = FONTS.find((f) => f.id === t.font)?.family;
  const color = t.color === 'theme' ? (on ? c.text : c.dim) : colorOf(t.color);
  return {
    fontSize: t.size,
    lineHeight: lineHeight(t),
    fontFamily: family,
    textAlign: t.align,
    color,
    opacity: t.color !== 'theme' && !on ? 0.55 : 1,
  } as const;
}
