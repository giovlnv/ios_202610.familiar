export type ParaKind = 'title' | 'head' | 'book' | 'explainhead' | 'explain';

export type Para = { kind: ParaKind; text: string; start: number; end: number; page?: number };

export type Section = { id: string; title: string; summary?: string; audio: string; duration: number; paras: Para[]; explain?: string[] };

export type Book = { title: string; sections: Section[] };

export type Note = {
  id: string;
  section: string;
  time: number;
  para: number;
  quote: string;
  text: string;
  created: number;
};

export type Progress = { section: number; time: number; done?: string[] };

export type Consult = {
  id: number;
  section: string;
  time: number;
  para: number;
  quote: string;
  question: string;
  answer?: string;
  parent?: number;
  status: 'asked' | 'answered';
  noted?: boolean;
  created: number;
  answered?: number;
};
