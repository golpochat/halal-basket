import { MenuSelect } from '@halal-basket/web';
import { useLocale } from '../locale/LocaleContext';

/** Renders the published currency select; language selection is not available yet. */
export function LocalePickers({ className = '' }: { className?: string }) {
  const {
    showCurrencyPicker,
    currencies,
    currencyCode,
    setCurrencyCode,
  } = useLocale();

  if (!showCurrencyPicker) return null;

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
    </div>
  );
}
