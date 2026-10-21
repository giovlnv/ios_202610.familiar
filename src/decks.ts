import { t as tr, uiLang } from './i18n';
import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { unzipSync } from 'fflate';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { isLenormand, LENORMAND, lname, matchLenormand } from './lenormand';
import {
  addSystem,
  cardIdOf,
  customCard,
  CustomSystem,
  getSystem,
  isCustomCard,
  listSystems,
  nameFromFile,
  nextKey,
  patchSystem,
  removeSystem,
  SYSTEM_COLORS,
  systemIdOf,
} from './systems';

export type System = string;
export const systemOf = (cardId: string): System => (isCustomCard(cardId) ? systemIdOf(cardId) : isLenormand(cardId) ? 'lenormand' : 'tarot');
export const baseOf = (system: System): 'tarot' | 'lenormand' | undefined =>
  system === 'tarot' || system === 'lenormand' ? system : getSystem(system)?.base;
export const reversible = (system: System) => (system === 'tarot' ? true : system === 'lenormand' ? false : !!getSystem(system)?.reversals);
export const systemName = (system: System) => (system === 'tarot' ? tr('Tarot') : system === 'lenormand' ? 'Lenormand' : (getSystem(system)?.name ?? tr('Deleted system')));

const MAJOR = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor', 'The Hierophant', 'The Lovers', 'The Chariot',
  'Strength', 'The Hermit', 'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance', 'The Devil', 'The Tower',
  'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World',
];
const PT_MAJOR = [
  'O Louco', 'O Mago', 'A Sacerdotisa', 'A Imperatriz', 'O Imperador', 'O Hierofante', 'Os Enamorados', 'O Carro', 'A Força', 'O Eremita',
  'A Roda da Fortuna', 'A Justiça', 'O Enforcado', 'A Morte', 'A Temperança', 'O Diabo', 'A Torre', 'A Estrela', 'A Lua', 'O Sol', 'O Julgamento', 'O Mundo',
];
const PT_RANKS = ['Ás', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove', 'Dez', 'Valete', 'Cavaleiro', 'Rainha', 'Rei'];
const PT_SUITS: Record<string, string> = { Wands: 'Paus', Cups: 'Copas', Swords: 'Espadas', Pentacles: 'Ouros' };
function tarotName(name: string) {
  if (uiLang() !== 'pt') return name;
  const [num, major] = name.split(' · ');
  if (major) return `${num} · ${PT_MAJOR[MAJOR.indexOf(major)] ?? major}`;
  const m = name.match(/^(\w+) of (\w+)$/);
  return m ? `${PT_RANKS[RANKS.indexOf(m[1])] ?? m[1]} de ${PT_SUITS[m[2]] ?? m[2]}` : name;
}
const RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
export const SUITS = [
  { id: 'wands', name: 'Wands', alias: ['wands', 'wand', 'rods', 'rod', 'staves', 'staffs', 'batons', 'clubs'] },
  { id: 'cups', name: 'Cups', alias: ['cups', 'cup', 'chalices', 'hearts'] },
  { id: 'swords', name: 'Swords', alias: ['swords', 'sword', 'spades'] },
  { id: 'pents', name: 'Pentacles', alias: ['pentacles', 'pentacle', 'pents', 'coins', 'coin', 'disks', 'discs', 'diamonds'] },
];

export type Card = { id: string; name: string; group: string };

export const CARDS: Card[] = [
  ...MAJOR.map((name, i) => ({ id: `m${String(i).padStart(2, '0')}`, name: `${toRoman(i)} · ${name}`, group: 'Major Arcana' })),
  ...SUITS.flatMap((s) => RANKS.map((r, i) => ({ id: `${s.id}${String(i + 1).padStart(2, '0')}`, name: `${r} of ${s.name}`, group: s.name }))),
];
export const cardName = (id: string): string =>
  isCustomCard(id) ? (customCard(id)?.card.name ?? 'Deleted card') : isLenormand(id) ? lname(id) : tarotName(CARDS.find((x) => x.id === id)?.name ?? id);
export const baseCards = (base: 'tarot' | 'lenormand'): Card[] =>
  base === 'lenormand' ? LENORMAND.map((x) => ({ id: x.id, name: lname(x.id), group: 'Lenormand' })) : CARDS;
export const cardsOf = (system: System): Card[] => {
  if (system === 'tarot' || system === 'lenormand') return baseCards(system);
  const sys = getSystem(system);
  return (sys?.cards ?? []).map((c) => ({ id: cardIdOf(sys!.id, c.key), name: c.name, group: c.group }));
};

function toRoman(n: number) {
  if (!n) return '0';
  const m: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, r] of m)
    while (n >= v) {
      out += r;
      n -= v;
    }
  return out;
}

export type Deck = { id: string; name: string; source?: string; cards: string[]; system?: System };
const deckSystem = (d: Deck): System => d.system ?? 'tarot';

const root = () => {
  const d = new Directory(Paths.document, 'decks');
  d.create({ idempotent: true, intermediates: true });
  return d;
};
const defaultFile = (system: System = 'tarot') => new File(root(), system === 'tarot' ? 'default.txt' : `default-${system}.txt`);
const RWS_URL = 'https://github.com/giovlnv/ios_202610.familiar/releases/download/deck-rws';
const LENORMAND_URL = 'https://github.com/giovlnv/ios_202610.familiar/releases/download/deck-lenormand';

let cache: { decks: Deck[]; def: Map<System, string> } | null = null;
const listeners = new Set<() => void>();
export const onDecksChange = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));
const changed = () => ((cache = null), listeners.forEach((fn) => fn()));

function read() {
  if (cache) return cache;
  const decks = root()
    .list()
    .filter((x): x is Directory => x instanceof Directory)
    .map((d) => {
      try {
        return { id: d.name, ...JSON.parse(new File(d, 'deck.json').textSync()) } as Deck;
      } catch {
        return null;
      }
    })
    .filter((d): d is Deck => !!d && d.cards.length > 0);
  cache = { decks, def: new Map() };
  return cache;
}

export const listDecks = (system: System = 'tarot') => read().decks.filter((d) => deckSystem(d) === system);
export function defaultDeck(system: System = 'tarot') {
  const r = read();
  if (!r.def.has(system)) {
    const own = listDecks(system);
    const f = system === 'tarot' || system === 'lenormand' ? defaultFile(system) : null;
    const saved = f?.exists ? f.textSync().trim() : '';
    r.def.set(system, own.some((d) => d.id === saved) ? saved : (own[0]?.id ?? ''));
  }
  return r.def.get(system)!;
}

export function setDefaultDeck(id: string) {
  const d = read().decks.find((x) => x.id === id);
  const f = defaultFile(d ? deckSystem(d) : 'tarot');
  if (!f.exists) f.create();
  f.write(id);
  changed();
}

export function cardUri(cardId: string, deckId?: string) {
  const own = read().decks.find((d) => d.id === deckId);
  const deck = own && deckSystem(own) === systemOf(cardId) ? own : read().decks.find((d) => d.id === defaultDeck(systemOf(cardId)));
  return deck?.cards.includes(cardId) ? new File(root(), deck.id, `${cardId}.jpg`).uri : undefined;
}

export function deleteDeck(id: string) {
  const d0 = read().decks.find((x) => x.id === id);
  if (d0 && defaultDeck(deckSystem(d0)) === id) throw new Error('This is your default deck. Choose another default first.');
  const d = new Directory(root(), id);
  if (d.exists) d.delete();
  changed();
}

function save(id: string, deck: Omit<Deck, 'id'>) {
  const f = new File(root(), id, 'deck.json');
  if (!f.exists) f.create();
  f.write(JSON.stringify(deck));
  changed();
  const sys = deck.system ?? 'tarot';
  if ((sys === 'tarot' || sys === 'lenormand') && !defaultFile(sys).exists) setDefaultDeck(id);
  changed();
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || `deck-${Date.now()}`;

export async function downloadRws(onProgress: (done: number, total: number) => void) {
  const id = 'rws';
  const dir = new Directory(root(), id);
  dir.create({ idempotent: true });
  const got: string[] = [];
  for (let i = 0; i < CARDS.length; i++) {
    const cid = CARDS[i].id;
    const dest = new File(dir, `${cid}.jpg`);
    if (!dest.exists) await File.downloadFileAsync(`${RWS_URL}/${cid}.jpg`, dest, { idempotent: true });
    got.push(cid);
    onProgress(i + 1, CARDS.length);
  }
  save(id, { name: 'Rider-Waite-Smith (1909)', source: 'Wikimedia Commons, public domain', cards: got });
}

export const LENORMAND_DECK = 'lenormand-dondorf';

export async function downloadLenormand(onProgress: (done: number, total: number) => void) {
  const dir = new Directory(root(), LENORMAND_DECK);
  dir.create({ idempotent: true });
  const got: string[] = [];
  for (let i = 0; i < LENORMAND.length; i++) {
    const cid = LENORMAND[i].id;
    const dest = new File(dir, `${cid}.jpg`);
    if (!dest.exists) await File.downloadFileAsync(`${LENORMAND_URL}/${cid}.jpg`, dest, { idempotent: true });
    got.push(cid);
    onProgress(i + 1, LENORMAND.length);
  }
  save(LENORMAND_DECK, {
    name: 'Dondorf Wahrsage-Karten (1910)',
    source: 'Scans by the Etteilla Foundation (etteilla.org), CC BY-NC 4.0',
    cards: got,
    system: 'lenormand',
  });
}

const WORDS: Record<string, number> = {
  ace: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  page: 11, princess: 11, knave: 11, jack: 11, knight: 12, prince: 12, queen: 13, king: 14,
};
const MAJOR_KEYS = MAJOR.map((n) => n.toLowerCase().replace(/^the /, '').replace('judgement', 'judg'));

export function matchCard(fileName: string): string | undefined {
  const n = fileName
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/[_\-./]+/g, ' ');
  const suit = SUITS.find((s) => s.alias.some((a) => new RegExp(`\\b${a}\\b`).test(n)));
  if (suit) {
    const word = Object.keys(WORDS).find((w) => new RegExp(`\\b${w}\\b`).test(n));
    const num = Number(n.match(/\b(\d{1,2})\b/)?.[1]);
    const rank = word ? WORDS[word] : num >= 1 && num <= 14 ? num : undefined;
    return rank ? `${suit.id}${String(rank).padStart(2, '0')}` : undefined;
  }
  const byName = MAJOR_KEYS.findIndex((k) => n.includes(k));
  if (byName >= 0) return `m${String(byName).padStart(2, '0')}`;
  const num = n.match(/\b(?:major|maj|ar|trump|m)?\s*(\d{1,2})\b/)?.[1];
  return num !== undefined && Number(num) <= 21 ? `m${num.padStart(2, '0')}` : undefined;
}

async function storeImages(name: string, items: { name: string; write: (dest: File) => void }[], source: string, system: System) {
  const match = system === 'lenormand' ? matchLenormand : matchCard;
  const id = slug(name);
  const dir = new Directory(root(), id);
  dir.create({ idempotent: true });
  const cards = new Set<string>();
  const skipped: string[] = [];
  for (const it of items) {
    const cid = match(system === 'lenormand' ? it.name.split('/').pop()! : it.name);
    if (!cid || cards.has(cid)) {
      skipped.push(it.name);
      continue;
    }
    const dest = new File(dir, `${cid}.jpg`);
    if (dest.exists) dest.delete();
    it.write(dest);
    await shrink(dest);
    cards.add(cid);
  }
  if (!cards.size) {
    dir.delete();
    throw new Error(
      system === 'lenormand'
        ? 'No card names recognised in the file names (e.g. “01.jpg”, “rider.jpg”, “o-cavaleiro.png”).'
        : 'No card names recognised in the file names (e.g. “the-fool.jpg”, “cups01.jpg”, “queen of swords.png”).',
    );
  }
  save(id, { name, source, cards: [...cards], ...(system === 'tarot' ? {} : { system }) });
  return { id, matched: cards.size, skipped };
}

const MAX_W = 1200;
async function shrink(f: File) {
  try {
    const img = await ImageManipulator.manipulate(f.uri).renderAsync();
    if (img.width <= MAX_W) return;
    const out = await ImageManipulator.manipulate(f.uri).resize({ width: MAX_W }).renderAsync();
    const saved = await out.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
    f.delete();
    new File(saved.uri).move(f);
  } catch {}
}

const isImage = (n: string) => /\.(jpe?g|png|webp|heic)$/i.test(n) && !n.split('/').pop()!.startsWith('.');

function fromZip(name: string, bytes: Uint8Array, source: string, system: System) {
  const files = unzipSync(bytes, { filter: (f) => isImage(f.name) });
  return storeImages(
    name,
    Object.entries(files).map(([n, data]) => ({ name: n, write: (dest) => (dest.create(), dest.write(data)) })),
    source,
    system,
  );
}

export async function importDeckFromFiles(name: string, system: System = 'tarot') {
  const r = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: ['image/*', 'application/zip'] });
  if (r.canceled) return null;
  const zip = r.assets.find((a) => /\.zip$/i.test(a.name));
  if (zip) return fromZip(name, await new File(zip.uri).bytes(), 'Imported zip', system);
  return storeImages(
    name,
    r.assets.filter((a) => isImage(a.name)).map((a) => ({ name: a.name, write: (dest) => new File(a.uri).copySync(dest) })),
    'Imported images',
    system,
  );
}

export async function importDeckFromUrl(name: string, url: string, system: System = 'tarot') {
  const tmp = new File(Paths.cache, 'deck-download.zip');
  if (tmp.exists) tmp.delete();
  await File.downloadFileAsync(url, tmp);
  try {
    return await fromZip(name, await tmp.bytes(), url, system);
  } finally {
    tmp.delete();
  }
}

export function createSystem(name: string, base?: 'tarot' | 'lenormand') {
  const cards = base ? baseCards(base).map((c) => ({ key: c.id, name: c.name, group: c.group, base: c.id })) : [];
  return addSystem({ name, base, reversals: base === 'tarot', color: SYSTEM_COLORS[listSystems().length % SYSTEM_COLORS.length], cards });
}

const sysDeck = (sys: CustomSystem) => {
  const dir = new Directory(root(), sys.id);
  dir.create({ idempotent: true });
  return dir;
};

function saveSysDeck(sys: CustomSystem, add: string[], drop: string[] = []) {
  const f = new File(sysDeck(sys), 'deck.json');
  let cards: string[] = [];
  try {
    cards = f.exists ? JSON.parse(f.textSync()).cards : [];
  } catch {}
  const next = [...new Set([...cards.filter((x) => !drop.includes(x)), ...add])];
  if (!f.exists) f.create();
  f.write(JSON.stringify({ name: sys.name, source: 'Your own images', cards: next, system: sys.id }));
  changed();
}

export async function setCardImage(sysId: string, cardId: string, uri: string) {
  const sys = getSystem(sysId);
  if (!sys) return;
  const dest = new File(sysDeck(sys), `${cardId}.jpg`);
  if (dest.exists) dest.delete();
  new File(uri).copySync(dest);
  await shrink(dest);
  saveSysDeck(sys, [cardId]);
}

export function removeCustomCard(sysId: string, key: string) {
  const sys = getSystem(sysId);
  if (!sys) return;
  const id = cardIdOf(sysId, key);
  const img = new File(sysDeck(sys), `${id}.jpg`);
  if (img.exists) img.delete();
  patchSystem(sysId, (s) => (s.cards = s.cards.filter((c) => c.key !== key)));
  saveSysDeck(sys, [], [id]);
}

export function deleteSystem(sysId: string) {
  const d = new Directory(root(), sysId);
  if (d.exists) d.delete();
  removeSystem(sysId);
  changed();
}

export async function importIntoSystem(sysId: string) {
  const sys = getSystem(sysId);
  if (!sys) return null;
  const r = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: ['image/*', 'application/zip'] });
  if (r.canceled) return null;
  type Item = { name: string; write: (dest: File) => void };
  let items: Item[];
  const zip = r.assets.find((a) => /\.zip$/i.test(a.name));
  if (zip) {
    const files = unzipSync(await new File(zip.uri).bytes(), { filter: (f) => isImage(f.name) });
    items = Object.entries(files).map(([n, data]) => ({ name: n, write: (dest) => (dest.create(), dest.write(data)) }));
  } else items = r.assets.filter((a) => isImage(a.name)).map((a) => ({ name: a.name, write: (dest) => new File(a.uri).copySync(dest) }));
  items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const dir = sysDeck(sys);
  const placed: string[] = [];
  const skipped: string[] = [];
  const added: { key: string; name: string; group: string }[] = [];
  let next = Number(nextKey(sys));
  for (const it of items) {
    let key: string | undefined;
    if (sys.base) {
      const base = sys.base === 'lenormand' ? matchLenormand(it.name.split('/').pop()!) : matchCard(it.name);
      key = base && sys.cards.some((c) => c.key === base) ? base : undefined;
    } else {
      const name = nameFromFile(it.name) || `Card ${next}`;
      key = sys.cards.find((c) => c.name.toLowerCase() === name.toLowerCase())?.key;
      if (!key) {
        key = String(next++).padStart(3, '0');
        const folder = it.name.includes('/') ? it.name.split('/').slice(-2, -1)[0] : '';
        added.push({ key, name, group: folder ? nameFromFile(folder) || 'Cards' : 'Cards' });
      }
    }
    const id = key && cardIdOf(sys.id, key);
    if (!id || placed.includes(id)) {
      skipped.push(it.name);
      continue;
    }
    const dest = new File(dir, `${id}.jpg`);
    if (dest.exists) dest.delete();
    it.write(dest);
    await shrink(dest);
    placed.push(id);
  }
  if (added.length) patchSystem(sys.id, (s) => s.cards.push(...added));
  if (!placed.length) throw new Error(sys.base ? 'No card names recognised in the file names.' : 'No images found.');
  saveSysDeck(getSystem(sys.id)!, placed);
  return { matched: placed.length, added: added.length, skipped };
}
