import { useLocale } from '../locale/LocaleContext';

/** Renders currency/language selects only when admin published 2+ options. */
export function LocalePickers({ className = '' }: { className?: string }) {
  const {
    showCurrencyPicker,
    showLanguagePicker,
    currencies,
    languages,
    currencyCode,
    languageCode,
    setCurrencyCode,
    setLanguageCode,
  } = useLocale();

  if (!showCurrencyPicker && !showLanguagePicker) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showCurrencyPicker && (
        <label className="sr-only" htmlFor="hb-currency">
          Currency
        </label>
      )}
      {showCurrencyPicker && (
        <select
          id="hb-currency"
          className="hb-input w-auto py-1.5 text-sm"
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value)}
          aria-label="Currency"
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.code}
            </option>
          ))}
        </select>
      )}
      {showLanguagePicker && (
        <label className="sr-only" htmlFor="hb-language">
          Language
        </label>
      )}
      {showLanguagePicker && (
        <select
          id="hb-language"
          className="hb-input w-auto py-1.5 text-sm"
          value={languageCode}
          onChange={(e) => setLanguageCode(e.target.value)}
          aria-label="Language"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.nativeName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
