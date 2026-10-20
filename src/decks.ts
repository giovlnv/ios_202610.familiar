import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { unzipSync } from 'fflate';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAJOR = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor', 'The Hierophant', 'The Lovers', 'The Chariot',
  'Strength', 'The Hermit', 'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance', 'The Devil', 'The Tower',
  'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World',
];
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
export const cardName = (id: string) => CARDS.find((x) => x.id === id)?.name ?? id;

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

export type Deck = { id: string; name: string; source?: string; cards: string[] };

const root = () => {
  const d = new Directory(Paths.document, 'decks');
  d.create({ idempotent: true, intermediates: true });
  return d;
};
const defaultFile = () => new File(root(), 'default.txt');
const RWS_URL = 'https://github.com/giovlnv/ios_202610.familiar/releases/download/deck-rws';

let cache: { decks: Deck[]; def: string } | null = null;
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
  const saved = defaultFile().exists ? defaultFile().textSync().trim() : '';
  cache = { decks, def: decks.some((d) => d.id === saved) ? saved : (decks[0]?.id ?? '') };
  return cache;
}

export const listDecks = () => read().decks;
export const defaultDeck = () => read().def;

export function setDefaultDeck(id: string) {
  const f = defaultFile();
  if (!f.exists) f.create();
  f.write(id);
  changed();
}

export function cardUri(cardId: string, deckId = defaultDeck()) {
  const deck = read().decks.find((d) => d.id === deckId);
  return deck?.cards.includes(cardId) ? new File(root(), deckId, `${cardId}.jpg`).uri : undefined;
}

export function deleteDeck(id: string) {
  if (id === defaultDeck()) throw new Error('This is your default deck. Choose another default first.');
  const d = new Directory(root(), id);
  if (d.exists) d.delete();
  changed();
}

function save(id: string, deck: Omit<Deck, 'id'>) {
  const f = new File(root(), id, 'deck.json');
  if (!f.exists) f.create();
  f.write(JSON.stringify(deck));
  if (!defaultFile().exists) setDefaultDeck(id);
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

async function storeImages(name: string, items: { name: string; write: (dest: File) => void }[], source: string) {
  const id = slug(name);
  const dir = new Directory(root(), id);
  dir.create({ idempotent: true });
  const cards = new Set<string>();
  const skipped: string[] = [];
  for (const it of items) {
    const cid = matchCard(it.name);
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
    throw new Error('No card names recognised in the file names (e.g. “the-fool.jpg”, “cups01.jpg”, “queen of swords.png”).');
  }
  save(id, { name, source, cards: [...cards] });
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

function fromZip(name: string, bytes: Uint8Array, source: string) {
  const files = unzipSync(bytes, { filter: (f) => isImage(f.name) });
  return storeImages(
    name,
    Object.entries(files).map(([n, data]) => ({ name: n, write: (dest) => (dest.create(), dest.write(data)) })),
    source,
  );
}

export async function importDeckFromFiles(name: string) {
  const r = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: ['image/*', 'application/zip'] });
  if (r.canceled) return null;
  const zip = r.assets.find((a) => /\.zip$/i.test(a.name));
  if (zip) return fromZip(name, await new File(zip.uri).bytes(), 'Imported zip');
  return storeImages(
    name,
    r.assets.filter((a) => isImage(a.name)).map((a) => ({ name: a.name, write: (dest) => new File(a.uri).copySync(dest) })),
    'Imported images',
  );
}

export async function importDeckFromUrl(name: string, url: string) {
  const tmp = new File(Paths.cache, 'deck-download.zip');
  if (tmp.exists) tmp.delete();
  await File.downloadFileAsync(url, tmp);
  try {
    return await fromZip(name, await tmp.bytes(), url);
  } finally {
    tmp.delete();
  }
}
