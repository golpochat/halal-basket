import { MenuSelect } from '@halal-basket/web';
import { useLocale } from '../locale/LocaleContext';

/** Currency/language selects when admin published 2+ options (languages need a UI pack). */
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
    t,
  } = useLocale();

  if (!showCurrencyPicker && !showLanguagePicker) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {showCurrencyPicker && (
        <MenuSelect
          label={t('chrome.currency')}
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
          label={t('chrome.language')}
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
