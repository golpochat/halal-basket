/** UI / money number formatting with language-aware digit systems. */

export type MoneyFormatOpts = {
  currencyCode?: string;
  symbol?: string;
  exchangeRate?: number | string;
  /** UI language — drives digit script (bn → Bengali digits, etc.). */
  languageCode?: string;
};

type NumberingSystem = 'latn' | 'beng' | 'deva' | 'arab' | 'arabext';

function numberingSystemFor(languageCode?: string): NumberingSystem {
  switch (languageCode) {
    case 'bn':
      return 'beng';
    case 'hi':
      return 'deva';
    case 'ur':
      return 'arabext';
    case 'ar':
      return 'arab';
    default:
      return 'latn';
  }
}

/**
 * Format a plain number for UI (counts, qty) using the active language’s digits.
 */
export function formatUiNumber(
  value: number,
  languageCode = 'en',
  opts: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {},
): string {
  const n = Number.isFinite(value) ? value : 0;
  const numberingSystem = numberingSystemFor(languageCode);
  try {
    return new Intl.NumberFormat(uiLocaleFor(languageCode), {
      numberingSystem,
      maximumFractionDigits: opts.maximumFractionDigits ?? 0,
      minimumFractionDigits: opts.minimumFractionDigits ?? 0,
    }).format(n);
  } catch {
    return String(n);
  }
}

/**
 * Money display: currency symbol position from currency locale (e.g. €28.24),
 * digits from UI language when provided.
 */
export function formatPlatformMoney(
  amountInDefaultCurrency: number,
  opts: MoneyFormatOpts = {},
): string {
  const code = opts.currencyCode ?? 'EUR';
  const symbol = opts.symbol ?? '€';
  const rate = Number(opts.exchangeRate ?? 1);
  const converted = amountInDefaultCurrency * (Number.isFinite(rate) ? rate : 1);
  const numberingSystem = numberingSystemFor(opts.languageCode);
  try {
    return new Intl.NumberFormat(moneyLocaleFor(code), {
      style: 'currency',
      currency: code,
      numberingSystem,
    }).format(converted);
  } catch {
    const amount = formatUiNumber(converted, opts.languageCode ?? 'en', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${symbol}${amount}`;
  }
}

function moneyLocaleFor(currencyCode: string): string {
  switch (currencyCode) {
    case 'GBP':
      return 'en-GB';
    case 'USD':
      return 'en-US';
    case 'EUR':
    default:
      return 'en-IE';
  }
}

function uiLocaleFor(languageCode: string): string {
  switch (languageCode) {
    case 'bn':
      return 'bn-BD';
    case 'hi':
      return 'hi-IN';
    case 'ur':
      return 'ur-PK';
    case 'ar':
      return 'ar';
    default:
      return 'en';
  }
}
