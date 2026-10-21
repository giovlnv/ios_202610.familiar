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

export const PRONOUNS = ['she/her', 'he/him', 'they/them', 'ela/dela', 'ele/dele', 'elu/delu'];
const GENDER: Record<string, number> = { 'she/her': 0, 'ela/dela': 0, 'he/him': 1, 'ele/dele': 1, 'they/them': 2, 'elu/delu': 2 };
let gender = GENDER[json<{ profile?: { pronouns?: string } }>('tracker.json', {}).profile?.pronouns ?? ''] ?? 0;
export const setPronouns = (p?: string) => (gender = GENDER[p ?? ''] ?? 0);

export function t(s: string, vars?: Record<string, unknown>) {
  let out = lang === 'pt' ? (PT[s] ?? s) : s;
  out = out.replace(/\{(\w*)\|(\w*)\|(\w*)\}/g, (_, a: string, b: string, c: string) => [a, b, c][gender]);
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}
