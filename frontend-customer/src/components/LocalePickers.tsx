import { MenuSelect } from '@halal-basket/web';
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
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {showCurrencyPicker && (
        <MenuSelect
          label="Currency"
          value={currencyCode}
          options={currencies.map((c) => ({
            value: c.code,
            label: `${c.symbol} ${c.code}`,
          }))}
          onChange={setCurrencyCode}
        />
      )}
      {showLanguagePicker && (
        <MenuSelect
          label="Language"
          value={languageCode}
          options={languages.map((l) => ({
            value: l.code,
            label: l.nativeName,
          }))}
          onChange={setLanguageCode}
        />
      )}
    </div>
  );
}
