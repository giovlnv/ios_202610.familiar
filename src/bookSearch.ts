import { listBooks, loadConsults, loadNotes } from './storage';
import { loadMarks } from './marks';

export type Hit = { folder: string; book: string; section: number; para?: number; kind: 'text' | 'note' | 'highlight' | 'bookmark' | 'consult'; text: string; at: number };

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function snippet(text: string, at: number, len: number) {
  const a = Math.max(0, at - 50);
  return `${a > 0 ? '…' : ''}${text.slice(a, at + len + 70).trim()}${at + len + 70 < text.length ? '…' : ''}`;
}

export function searchBooks(q: string, folder?: string, limit = 200): Hit[] {
  const needle = fold(q.trim());
  if (needle.length < 2) return [];
  const out: Hit[] = [];
  for (const { folder: f, book } of listBooks()) {
    if (folder && f !== folder) continue;
    const idx = new Map(book.sections.map((s, i) => [s.id, i]));
    const find = (text: string) => fold(text).indexOf(needle);
    for (const n of loadNotes(f)) {
      const at = find(n.text + ' ' + n.quote);
      if (at >= 0) out.push({ folder: f, book: book.title, section: idx.get(n.section) ?? 0, para: n.para, kind: 'note', text: n.text || n.quote, at: 0 });
    }
    for (const c of loadConsults(f)) {
      const t = `${c.question} ${c.answer ?? ''}`;
      if (find(t) >= 0) out.push({ folder: f, book: book.title, section: idx.get(c.section) ?? 0, para: c.para, kind: 'consult', text: c.question, at: 0 });
    }
    for (const m of loadMarks(f)) {
      if (m.section && find(m.quote) >= 0)
        out.push({ folder: f, book: book.title, section: idx.get(m.section) ?? 0, para: m.para, kind: m.kind, text: m.quote, at: 0 });
    }
    book.sections.forEach((s, si) =>
      s.paras.forEach((p, pi) => {
        if (out.length >= limit) return;
        const at = find(p.text);
        if (at >= 0) out.push({ folder: f, book: book.title, section: si, para: pi, kind: 'text', text: snippet(p.text, at, needle.length), at });
      }),
    );
    if (out.length >= limit) break;
  }
  return out;
}
