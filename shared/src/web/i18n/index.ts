import { ar } from './packs/ar';
import { bn } from './packs/bn';
import { en } from './packs/en';
import { hi } from './packs/hi';
import { ur } from './packs/ur';
import {
  customerFlowEn,
  type CustomerFlowKey,
} from './packs/customer-flow-en';
import { customerFlowBn } from './packs/customer-flow-bn';
import { customerFlowHi } from './packs/customer-flow-hi';
import { customerFlowUr } from './packs/customer-flow-ur';
import { customerFlowAr } from './packs/customer-flow-ar';
import { formatUiNumber } from '../money';

export type MessageKey = keyof typeof en | CustomerFlowKey;
export type MessageDict = Record<MessageKey, string>;
export type { CustomerFlowKey };
export type UiLangCode = 'en' | 'bn' | 'hi' | 'ur' | 'ar';

/** Language codes that have a UI string pack (seeded catalogue). */
export const UI_PACK_CODES: readonly UiLangCode[] = [
  'en',
  'bn',
  'hi',
  'ur',
  'ar',
] as const;

/** Chrome / taxonomy packs (always present). */
const BASE: Record<UiLangCode, Record<string, string>> = {
  en,
  bn,
  hi,
  ur,
  ar,
};

/**
 * Cart / checkout / account packs — looked up separately so a circular
 * import during module init cannot drop these keys (which would leave the
 * cart stuck in English while the catalogue chrome translates).
 */
const FLOW: Record<UiLangCode, Record<string, string>> = {
  en: customerFlowEn,
  bn: customerFlowBn,
  hi: customerFlowHi,
  ur: customerFlowUr,
  ar: customerFlowAr,
};

export function hasUiPack(code: string): code is UiLangCode {
  return (UI_PACK_CODES as readonly string[]).includes(code);
}

export type TVars = Record<string, string | number>;

function lookup(key: string, lang: UiLangCode): string | undefined {
  return FLOW[lang][key] ?? BASE[lang][key];
}

function formatVar(value: string | number, lang: UiLangCode): string {
  if (typeof value === 'number') {
    return formatUiNumber(value, lang, {
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    });
  }
  return value;
}

/**
 * Resolve a UI string for `lang`, falling back to English then the key.
 * Supports `{name}` interpolation via `vars`. Numeric vars use native digits.
 */
export function t(
  key: MessageKey | string,
  lang = 'en',
  vars?: TVars,
): string {
  const code = hasUiPack(lang) ? lang : 'en';
  const raw =
    lookup(String(key), code) ?? lookup(String(key), 'en') ?? String(key);
  if (!vars) return raw;
  return Object.entries(vars).reduce(
    (out, [name, value]) =>
      out.replaceAll(`{${name}}`, formatVar(value, code)),
    raw,
  );
}

/** Plural helper for `*.*_one` / `*.*_other` keys. */
export function tCount(
  baseKey: string,
  count: number,
  lang = 'en',
  vars?: TVars,
): string {
  const suffix = count === 1 ? '_one' : '_other';
  return t(`${baseKey}${suffix}`, lang, { ...vars, count });
}

/** Published languages that also have a UI pack — used for pickers. */
export function filterLanguagesWithPacks<T extends { code: string }>(
  languages: T[],
): T[] {
  return languages.filter((l) => hasUiPack(l.code));
}
