import { File, Paths } from 'expo-file-system';
import { PT } from './i18n-pt';

const read = () => {
  try {
    return (JSON.parse(new File(Paths.document, 'languages.json').textSync()) as { ui?: string }).ui ?? 'en';
  } catch {
    return 'en';
  }
};

const lang = read();
export const uiLang = () => lang;
export const loc = () => (lang === 'pt' ? 'pt-BR' : undefined);

export function t(s: string, vars?: Record<string, unknown>) {
  let out = lang === 'pt' ? (PT[s] ?? s) : s;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}
