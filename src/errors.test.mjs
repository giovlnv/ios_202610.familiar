// Run with `npm test` (node's built-in runner; Node strips the TypeScript types).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeError } from './errors.ts';

test('network failures become a connection message', () => {
  const want = 'Couldn’t connect. Check the internet connection and try again.';
  assert.equal(describeError(new TypeError('Network request failed')).text, want);
  assert.equal(describeError(Object.assign(new Error('aborted'), { name: 'AbortError' })).text, want);
  assert.equal(describeError(new Error('The request timed out.')).text, want);
});

test('HTTP codes from a named service keep the service and the code, in words', () => {
  assert.deepEqual(describeError(new Error('GitHub 401: Bad credentials')), {
    text: '{0} didn’t accept the key (error {1}). Check it in Settings → Keys.',
    vars: { 0: 'GitHub', 1: 401 },
  });
  assert.deepEqual(describeError(new Error('ares 503')), {
    text: '{0} isn’t answering right now (error {1}). Try again in a few minutes.',
    vars: { 0: 'ares', 1: 503 },
  });
  assert.deepEqual(describeError(new Error('Open Library 404')).vars, { 0: 'Open Library', 1: 404 });
  assert.equal(describeError(new Error('GitHub 422: {"message":"x"}')).text, '{0} turned the request down (error {1}). Try again in a moment.');
});

test('a bare status code with a raw body hides the body', () => {
  const d = describeError(new Error('500 {"error":"internal"}'));
  assert.equal(d.text, 'The service isn’t answering right now (error {0}). Try again in a few minutes.');
  assert.deepEqual(d.vars, { 0: 500 });
});

test("the app's own messages pass through for translation", () => {
  assert.deepEqual(describeError(new Error('No backup on ares yet.')), { text: 'No backup on ares yet.' });
  assert.deepEqual(describeError('Choose an EPUB or PDF file.'), { text: 'Choose an EPUB or PDF file.' });
});

test('empty and odd values get a generic sentence, never "undefined"', () => {
  for (const e of [undefined, null, '', {}, new Error('')])
    assert.equal(describeError(e).text, 'Something went wrong. Try again in a moment.');
});
