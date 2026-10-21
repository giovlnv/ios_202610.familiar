import { File, Paths } from 'expo-file-system';

export type SysCard = { key: string; name: string; group: string; base?: string };
export type CustomSystem = {
  id: string;
  name: string;
  color: string;
  base?: 'tarot' | 'lenormand';
  reversals: boolean;
  cards: SysCard[];
  created: number;
};

export const SYSTEM_COLORS = ['#B9B6C3', '#C9A0DC', '#9CC9A0', '#E0A877', '#8FB8DE', '#E8C767'];

const file = () => new File(Paths.document, 'systems.json');
let cache: CustomSystem[] | null = null;
const listeners = new Set<() => void>();
export const onSystemsChange = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));

export function listSystems(): CustomSystem[] {
  if (cache) return cache;
  try {
    cache = file().exists ? (JSON.parse(file().textSync()).systems ?? []) : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function store(list: CustomSystem[]) {
  const f = file();
  if (!f.exists) f.create();
  f.write(JSON.stringify({ systems: list }));
  cache = list;
  listeners.forEach((fn) => fn());
}

export const isCustomCard = (id: string) => /^cs[a-z0-9]+_/.test(id);
export const isCustomSystem = (id?: string) => !!id && /^cs[a-z0-9]+$/.test(id);
export const systemIdOf = (cardId: string) => cardId.split('_')[0];
export const cardIdOf = (sys: string, key: string) => `${sys}_${key}`;
export const getSystem = (id?: string) => listSystems().find((s) => s.id === id);

export function customCard(id: string) {
  const sys = getSystem(systemIdOf(id));
  const key = id.slice(id.indexOf('_') + 1);
  const card = sys?.cards.find((c) => c.key === key);
  return sys && card ? { sys, card } : undefined;
}

export function addSystem(x: Omit<CustomSystem, 'id' | 'created'>) {
  const id = `cs${Date.now().toString(36)}`;
  const sys: CustomSystem = { ...x, id, created: Date.now() };
  store([...listSystems(), sys]);
  return sys;
}

export function patchSystem(id: string, fn: (s: CustomSystem) => void) {
  const list = listSystems().map((s) => {
    if (s.id !== id) return s;
    const copy: CustomSystem = { ...s, cards: s.cards.map((c) => ({ ...c })) };
    fn(copy);
    return copy;
  });
  store(list);
}

export const removeSystem = (id: string) => store(listSystems().filter((s) => s.id !== id));

export function nextKey(sys: CustomSystem) {
  const n = sys.cards.reduce((m, c) => Math.max(m, Number(c.key) || 0), 0) + 1;
  return String(n).padStart(3, '0');
}

export function nameFromFile(name: string) {
  const base = name.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '');
  const clean = base.replace(/^[\d\s._-]+/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return clean ? clean[0].toUpperCase() + clean.slice(1) : '';
}
