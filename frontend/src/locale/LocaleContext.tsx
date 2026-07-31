import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
    setData(locale);

    const storedCurrency = localStorage.getItem(STORAGE_CURRENCY);
    const storedLanguage = localStorage.getItem(STORAGE_LANGUAGE);
    const nextCurrency =
      (storedCurrency &&
        locale.currencies.find((c) => c.code === storedCurrency)?.code) ||
      locale.defaultCurrencyCode;
    const nextLanguage =
      (storedLanguage &&
        locale.languages.find((l) => l.code === storedLanguage)?.code) ||
      locale.defaultLanguageCode;

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
    (amountInDefaultCurrency: number) => {
      const rate = Number(currency?.exchangeRate ?? 1);
      const converted = amountInDefaultCurrency * rate;
      const symbol = currency?.symbol ?? '€';
      try {
        return new Intl.NumberFormat(language?.code ?? 'en', {
          style: 'currency',
          currency: currency?.code ?? 'EUR',
        }).format(converted);
      } catch {
        return `${symbol}${converted.toFixed(2)}`;
      }
    },
    [currency, language],
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
