// node --test scripts/remap.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remapAll } from '../src/remap.ts';

const P = (text, start, end, kind = 'book') => ({ kind, text, start, end });
// GitHub split: two big sections, paragraph paras, an explanation
const old = {
  title: 'x',
  sections: [
    { id: '001', title: 'One', audio: '001.m4a', duration: 30, paras: [P('Chapter one', 0, 2, 'title'), P('The Fool walks toward the edge of the cliff. He does not look down.', 2, 12), P('The Magician holds his wand up to the sky above.', 12, 30)] },
    { id: '002', title: 'Two', audio: '002.m4a', duration: 40, paras: [P('The High Priestess sits between two pillars of the temple.', 0, 20), P('Explanation here, never spoken by calliope at all.', 20, 30, 'explain'), P('The Empress rests in a field of ripe wheat.', 30, 40)] },
  ],
};
// Kokoro split: sentences, three sections
const neu = {
  title: 'x',
  sections: [
    { id: '001', title: 'One', audio: '001.m4a', duration: 10, paras: [P('Chapter One', 0, 1, 'title'), P('The Fool walks toward the edge of the cliff.', 1, 6), P('He does not look down.', 6, 9)] },
    { id: '002', title: 'One b', audio: '002.m4a', duration: 8, paras: [P('The Magician holds his wand up to the sky above.', 0, 8)] },
    { id: '003', title: 'Two', audio: '003.m4a', duration: 20, paras: [P('The High Priestess sits between two pillars of the temple.', 0, 9), P('The Empress rests in a field of ripe wheat.', 9, 20)] },
  ],
};

test('progress follows the passage and done sections carry over', () => {
  const r = remapAll(old, neu);
  assert.deepEqual(r.progress({ section: 1, time: 35, done: ['001'] }), { section: 2, time: 9, done: ['001', '002'] });
  assert.deepEqual(r.progress({ section: 0, time: 13 }), { section: 1, time: 0, done: [] });
});

test('notes keep their passage: section id, para and time', () => {
  const r = remapAll(old, neu);
  const n = { id: 'n', section: '002', time: 5, para: 0, quote: 'q', text: 't', created: 1 };
  assert.deepEqual(r.notes([n])[0], { ...n, section: '003', para: 0, time: 0 });
  const m = r.spot({ section: '001', para: 2 });
  assert.deepEqual(m, { section: '002', para: 0 });
});

test('an explanation falls back to the passage before it', () => {
  const r = remapAll(old, neu);
  assert.deepEqual(r.spot({ section: '002', para: 1 }), { section: '003', para: 0 });
});

test('unknown text lands at the same share of the book', () => {
  const r = remapAll(old, { ...neu, sections: neu.sections.map((s) => ({ ...s, paras: s.paras.map((p) => ({ ...p, text: 'zz' + p.text.split('').reverse().join('') })) })) });
  assert.equal(r.spot({ section: '002', para: 2 }).section, '003');
  assert.equal(r.spot({ section: '001', para: 0 }).section, '001');
});

test('card links move and unknown sections stay', () => {
  const r = remapAll(old, neu);
  assert.deepEqual(r.links({ '002': { card: 'm02' }, '009': { card: 'm01' } }), { '003': { card: 'm02' }, '009': { card: 'm01' } });
});

test('a numbered item matches without its number; unmatched text follows the last match', () => {
  const a = { title: 'a', sections: [{ id: '001', title: 'A', audio: '001.m4a', duration: 9, paras: [P('Class I. The Trumps Major, otherwise Greater Arcana', 0, 3), P('1. The Magus, Magician, or juggler, the caster of the dice', 3, 6), P('Some sentence that the new edition rewrote entirely.', 6, 9)] }] };
  const b = { title: 'b', sections: [{ id: '001', title: 'A', audio: '001.m4a', duration: 9, paras: [P('Class I. The Trumps Major, otherwise Greater Arcana', 0, 3), P('The Magus, Magician, or juggler, the caster of the dice', 3, 6), P('A different sentence here, never seen before at all.', 6, 9)] }] };
  const r = remapAll(a, b);
  assert.deepEqual(r.spot({ section: '001', para: 1 }), { section: '001', para: 1 });
  assert.deepEqual(r.spot({ section: '001', para: 2 }), { section: '001', para: 2 });
});

test('phone-voiced books without timings resolve to the section start', () => {
  const a = { title: 'a', sections: [{ id: '001', title: 'A', audio: '001.m4a', duration: 0, paras: [{ kind: 'book', text: 'The Fool walks toward the edge of the cliff.', start: 1e9, end: 1e9 }, { kind: 'book', text: 'He does not look down.' }] }] };
  assert.deepEqual(remapAll(a, neu).progress({ section: 0, time: 0 }), { section: 0, time: 1, done: [] });
});
