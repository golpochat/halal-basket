import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  filterLanguagesWithPacks,
  t as translate,
  type MessageKey,
  type TVars,
} from '@halal-basket/web';
import { api } from '../lib/api';

/** Driver ops UI is always English. */
const OPS_UI_LANG = 'en';

export type PlatformCurrency = {
  id: string;
  code: string;
  symbol: string;
  name: string;
  exchangeRate: string | number;
  isDefault: boolean;
  isPublished: boolean;
  sortOrder: number;
};

export type PlatformLanguage = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isRtl: boolean;
  isDefault: boolean;
  isPublished: boolean;
  sortOrder: number;
};

type PublicLocale = {
  currencies: PlatformCurrency[];
  languages: PlatformLanguage[];
  showCurrencyPicker: boolean;
  showLanguagePicker: boolean;
  defaultCurrencyCode: string;
  defaultLanguageCode: string;
};

type LocaleContextValue = {
  ready: boolean;
  currencies: PlatformCurrency[];
  languages: PlatformLanguage[];
  showCurrencyPicker: boolean;
  showLanguagePicker: boolean;
  currencyCode: string;
  languageCode: string;
  currency: PlatformCurrency | null;
  language: PlatformLanguage | null;
  setCurrencyCode: (code: string) => void;
  setLanguageCode: (code: string) => void;
  formatMoney: (amountInDefaultCurrency: number) => string;
  t: (key: MessageKey | string, vars?: TVars) => string;
  refresh: () => Promise<void>;
};

const STORAGE_CURRENCY = 'hb_currency';

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<PublicLocale | null>(null);
  const [currencyCode, setCurrencyCodeState] = useState('EUR');
  const languageCode = OPS_UI_LANG;

  const refresh = useCallback(async () => {
    const locale = await api<PublicLocale>('/platform/locale');
    const languages = filterLanguagesWithPacks(locale.languages);
    const packLocale: PublicLocale = {
      ...locale,
      languages,
      showLanguagePicker: false,
      defaultLanguageCode: OPS_UI_LANG,
    };
    setData(packLocale);

    const storedCurrency = localStorage.getItem(STORAGE_CURRENCY);
    const nextCurrency =
      (storedCurrency &&
        packLocale.currencies.find((c) => c.code === storedCurrency)?.code) ||
      packLocale.defaultCurrencyCode;

    setCurrencyCodeState(nextCurrency);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setData({
        currencies: [],
        languages: [],
        showCurrencyPicker: false,
        showLanguagePicker: false,
        defaultCurrencyCode: 'EUR',
        defaultLanguageCode: OPS_UI_LANG,
      });
      setReady(true);
    });
  }, [refresh]);

  const currency =
    data?.currencies.find((c) => c.code === currencyCode) ??
    data?.currencies.find((c) => c.isDefault) ??
    null;
  const language =
    data?.languages.find((l) => l.code === OPS_UI_LANG) ??
    data?.languages.find((l) => l.isDefault) ??
    null;

  useEffect(() => {
    document.documentElement.lang = OPS_UI_LANG;
    document.documentElement.dir = 'ltr';
  }, []);

  const setCurrencyCode = useCallback(
    (code: string) => {
      if (!data?.currencies.some((c) => c.code === code)) return;
      setCurrencyCodeState(code);
      localStorage.setItem(STORAGE_CURRENCY, code);
    },
    [data],
  );

  const setLanguageCode = useCallback((_code: string) => {
    /* Driver UI is locked to English. */
  }, []);

  const formatMoney = useCallback(
    (amountInDefaultCurrency: number) => {
      const rate = Number(currency?.exchangeRate ?? 1);
      const converted = amountInDefaultCurrency * rate;
      const symbol = currency?.symbol ?? '€';
      try {
        return new Intl.NumberFormat(OPS_UI_LANG, {
          style: 'currency',
          currency: currency?.code ?? 'EUR',
        }).format(converted);
      } catch {
        return `${symbol}${converted.toFixed(2)}`;
      }
    },
    [currency],
  );

  const t = useCallback(
    (key: MessageKey | string, vars?: TVars) =>
      translate(key, OPS_UI_LANG, vars),
    [],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      ready,
      currencies: data?.currencies ?? [],
      languages: data?.languages ?? [],
      showCurrencyPicker: data?.showCurrencyPicker ?? false,
      showLanguagePicker: false,
      currencyCode,
      languageCode,
      currency,
      language,
      setCurrencyCode,
      setLanguageCode,
      formatMoney,
      t,
      refresh,
    }),
    [
      ready,
      data,
      currencyCode,
      languageCode,
      currency,
      language,
      setCurrencyCode,
      setLanguageCode,
      formatMoney,
      t,
      refresh,
    ],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
