import { File, Paths } from 'expo-file-system';
import { PT } from './i18n-pt';

const json = <T,>(name: string, fallback: T): T => {
  try {
    return JSON.parse(new File(Paths.document, name).textSync()) as T;
  } catch {
    return fallback;
  }
};

const lang = json<{ ui?: string }>('languages.json', {}).ui ?? 'en';
export const uiLang = () => lang;
export const loc = () => (lang === 'pt' ? 'pt-BR' : undefined);

export const PRONOUNS = ['she', 'he', 'they'];
const OLD: Record<string, string> = { 'she/her': 'she', 'ela/dela': 'she', 'he/him': 'he', 'ele/dele': 'he', 'they/them': 'they', 'elu/delu': 'they' };
export const pronounKey = (p?: string) => (p ? (OLD[p] ?? (PRONOUNS.includes(p) ? p : undefined)) : undefined);
export const pronounLabel = (p?: string) => {
  const k = pronounKey(p);
  if (!k) return undefined;
  const i = PRONOUNS.indexOf(k);
  return (lang === 'pt' ? ['ela/dela', 'ele/dele', 'elu/delu'] : ['she/her', 'he/him', 'they/them'])[i];
};
let gender = Math.max(0, PRONOUNS.indexOf(pronounKey(json<{ profile?: { pronouns?: string } }>('tracker.json', {}).profile?.pronouns) ?? 'she'));
export const setPronouns = (p?: string) => (gender = Math.max(0, PRONOUNS.indexOf(pronounKey(p) ?? 'she')));

export function t(s: string, vars?: Record<string, unknown>) {
  let out = lang === 'pt' ? (PT[s] ?? s) : s;
  out = out.replace(/\{(\w*)\|(\w*)\|(\w*)\}/g, (_, a: string, b: string, c: string) => [a, b, c][gender]);
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}
