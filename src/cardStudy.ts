import { uiLang } from './i18n';
import { CARDS as TAROT, listDecks, cardUri } from './decks';
import { CARDS, INTRO } from './card-study';

export type L<T = string> = { pt: T; en: T };
export type Crop = { x: number; y: number; r: number };
export type Study = {
  id: string;
  number: string;
  name: L;
  subtitle: L;
  intro: L;
  symbols: { key: string; crop: Crop; title: L; keywords: L<string[]> }[];
  colours: { hex: string; name: L; keywords: L<string[]> }[];
  summary: L<string[]>;
  planes: { id: string; title: L; bullets: L<string[]>; line: L }[];
};
export type Intro = {
  title: L;
  tagline: L;
  howTo: { title: L; lead: L; parts: { title: L; text: L }[]; dash: L };
  colours: { title: L; lead: L; list: { hex: string; name: L; keywords: L }[]; sky: L };
  planes: { title: L; lead: L; list: { id: string; name: L; text: L }[] };
};

export const PAGES = ['how-to', 'colours', 'planes'] as const;
export type IntroPage = (typeof PAGES)[number];

export const lx = <T>(o: L<T>): T => (uiLang() === 'pt' ? o.pt : o.en);
export const intro = INTRO as Intro;
export const study = (id: string) => CARDS[id] as Study | undefined;
export const hasStudy = (id: string) => id in CARDS;
export const studied = () => TAROT.filter((c) => hasStudy(c.id));
export const studyCount = () => Object.keys(CARDS).length;

/** Booklet order: intro pages, then every tarot card that has a study. */
export const order = (): string[] => [...PAGES, ...studied().map((c) => c.id)];

const RWS_URL = 'https://github.com/giovlnv/ios_202610.familiar/releases/download/deck-rws';
/** Crops are drawn on the 1909 Rider-Waite-Smith art, so the study always uses that deck. */
export const rwsUri = (id: string) => (listDecks().some((d) => d.id === 'rws') && cardUri(id, 'rws')) || `${RWS_URL}/${id}.jpg`;
export const RWS_RATIO = 839 / 500;

export const TINTS: Record<string, string> = {
  spiritual: '#8FB8DE',
  material: '#D9B45B',
  mental: '#B48CD9',
  physical: '#7FC4C9',
  emotional: '#D49A9E',
  timing: '#B9B6C3',
  relational: '#C29468',
  advice: '#E8C767',
};
