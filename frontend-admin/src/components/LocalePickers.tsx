import { MenuSelect } from '@halal-basket/web';
import { useLocale } from '../locale/LocaleContext';

/**
 * Admin ops UI stays English — currency picker only when 2+ currencies published.
 */
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
      <MenuSelect
        label="Currency"
        value={currencyCode}
        options={currencies.map((c) => ({
          value: c.code,
          label: `${c.symbol} ${c.code}`,
        }))}
        onChange={setCurrencyCode}
      />
    </div>
  );
}
