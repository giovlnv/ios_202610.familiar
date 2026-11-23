/**
 * Turns a thrown error into a sentence a person can act on: what happened and what to do.
 * Network failures and bare HTTP codes become plain words; the app's own messages pass through.
 * Returns an English string with {0}/{1} slots, to be translated with i18n's `t`.
 */
export type ErrorText = { text: string; vars?: Record<string, string | number> };

const OFFLINE = /network request failed|failed to fetch|network ?error|internet connection|timed? ?out|offline|could not connect/i;
const HTTP = /^(GitHub|ares|Open Library)?:?\s*(\d{3})\b/;

export function describeError(e: unknown): ErrorText {
  const err = (typeof e === 'object' && e ? e : {}) as { name?: string; message?: unknown };
  const msg = String(err.message ?? (typeof e === 'object' ? '' : (e ?? ''))).trim();
  if (err.name === 'AbortError' || OFFLINE.test(msg))
    return { text: 'Couldn’t connect. Check the internet connection and try again.' };
  const http = msg.match(HTTP);
  if (http) {
    const code = Number(http[2]);
    const who = http[1];
    if (code === 401 || code === 403)
      return who
        ? { text: '{0} didn’t accept the key (error {1}). Check it in Settings → Keys.', vars: { 0: who, 1: code } }
        : { text: 'The service didn’t accept the key (error {0}). Check it in Settings.', vars: { 0: code } };
    if (code === 404)
      return who
        ? { text: '{0} couldn’t find it (error {1}).', vars: { 0: who, 1: code } }
        : { text: 'The service couldn’t find it (error {0}).', vars: { 0: code } };
    if (code === 429 || code >= 500)
      return who
        ? { text: '{0} isn’t answering right now (error {1}). Try again in a few minutes.', vars: { 0: who, 1: code } }
        : { text: 'The service isn’t answering right now (error {0}). Try again in a few minutes.', vars: { 0: code } };
    return who
      ? { text: '{0} turned the request down (error {1}). Try again in a moment.', vars: { 0: who, 1: code } }
      : { text: 'The service turned the request down (error {0}). Try again in a moment.', vars: { 0: code } };
  }
  if (!msg) return { text: 'Something went wrong. Try again in a moment.' };
  return { text: msg };
}
