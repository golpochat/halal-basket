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
  formatPlatformMoney,
  formatUiNumber,
  t as translate,
  type MessageKey,
  type TVars,
} from '@halal-basket/web';
import { api } from '../lib/api';

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
  formatNumber: (value: number) => string;
  t: (key: MessageKey | string, vars?: TVars) => string;
  refresh: () => Promise<void>;
};

const STORAGE_CURRENCY = 'hb_currency';
const STORAGE_LANGUAGE = 'hb_language';

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<PublicLocale | null>(null);
  const [currencyCode, setCurrencyCodeState] = useState('EUR');
  const [languageCode, setLanguageCodeState] = useState('en');

  const refresh = useCallback(async () => {
    const locale = await api<PublicLocale>('/platform/locale');
    const languages = filterLanguagesWithPacks(locale.languages);
    const packLocale: PublicLocale = {
      ...locale,
      languages,
      showLanguagePicker: languages.length > 1,
      defaultLanguageCode: hasUiPackCode(
        locale.defaultLanguageCode,
        languages,
      )
        ? locale.defaultLanguageCode
        : (languages.find((l) => l.isDefault)?.code ??
          languages[0]?.code ??
          'en'),
    };
    setData(packLocale);

    const storedCurrency = localStorage.getItem(STORAGE_CURRENCY);
    const storedLanguage = localStorage.getItem(STORAGE_LANGUAGE);
    const nextCurrency =
      (storedCurrency &&
        packLocale.currencies.find((c) => c.code === storedCurrency)?.code) ||
      packLocale.defaultCurrencyCode;
    const nextLanguage =
      (storedLanguage &&
        packLocale.languages.find((l) => l.code === storedLanguage)?.code) ||
      packLocale.defaultLanguageCode;

    setCurrencyCodeState(nextCurrency);
    setLanguageCodeState(nextLanguage);
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
        defaultLanguageCode: 'en',
      });
      setReady(true);
    });
  }, [refresh]);

  const currency =
    data?.currencies.find((c) => c.code === currencyCode) ??
    data?.currencies.find((c) => c.isDefault) ??
    null;
  const language =
    data?.languages.find((l) => l.code === languageCode) ??
    data?.languages.find((l) => l.isDefault) ??
    null;

  useEffect(() => {
    if (!language) return;
    document.documentElement.lang = language.code;
    document.documentElement.dir = language.isRtl ? 'rtl' : 'ltr';
  }, [language]);

  const setCurrencyCode = useCallback(
    (code: string) => {
      if (!data?.currencies.some((c) => c.code === code)) return;
      setCurrencyCodeState(code);
      localStorage.setItem(STORAGE_CURRENCY, code);
    },
    [data],
  );

  const setLanguageCode = useCallback(
    (code: string) => {
      if (!data?.languages.some((l) => l.code === code)) return;
      setLanguageCodeState(code);
      localStorage.setItem(STORAGE_LANGUAGE, code);
    },
    [data],
  );

  const formatMoney = useCallback(
    (amountInDefaultCurrency: number) =>
      formatPlatformMoney(amountInDefaultCurrency, {
        currencyCode: currency?.code ?? 'EUR',
        symbol: currency?.symbol ?? '€',
        exchangeRate: currency?.exchangeRate ?? 1,
        languageCode,
      }),
    [currency, languageCode],
  );

  const formatNumber = useCallback(
    (value: number) => formatUiNumber(value, languageCode),
    [languageCode],
  );

  const t = useCallback(
    (key: MessageKey | string, vars?: TVars) =>
      translate(key, languageCode, vars),
    [languageCode],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      ready,
      currencies: data?.currencies ?? [],
      languages: data?.languages ?? [],
      showCurrencyPicker: data?.showCurrencyPicker ?? false,
      showLanguagePicker: data?.showLanguagePicker ?? false,
      currencyCode,
      languageCode,
      currency,
      language,
      setCurrencyCode,
      setLanguageCode,
      formatMoney,
      formatNumber,
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
      formatNumber,
      t,
      refresh,
    ],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

function hasUiPackCode(
  code: string,
  languages: PlatformLanguage[],
): boolean {
  return languages.some((l) => l.code === code);
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
