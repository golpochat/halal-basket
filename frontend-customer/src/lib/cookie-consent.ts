/** Local preference for cookie / similar storage consent (customer app). */

export const COOKIE_CONSENT_KEY = 'hb-cookie-consent';
export const COOKIE_CONSENT_VERSION = 1 as const;
export const COOKIE_PREFS_EVENT = 'hb-cookie-prefs';

export type CookieConsentChoice = 'all' | 'essential';

export type CookieConsentRecord = {
  choice: CookieConsentChoice;
  version: typeof COOKIE_CONSENT_VERSION;
  at: string;
};

export function readCookieConsent(): CookieConsentRecord | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentRecord>;
    if (
      parsed.version !== COOKIE_CONSENT_VERSION ||
      (parsed.choice !== 'all' && parsed.choice !== 'essential') ||
      typeof parsed.at !== 'string'
    ) {
      return null;
    }
    return parsed as CookieConsentRecord;
  } catch {
    return null;
  }
}

export function writeCookieConsent(choice: CookieConsentChoice): CookieConsentRecord {
  const record: CookieConsentRecord = {
    choice,
    version: COOKIE_CONSENT_VERSION,
    at: new Date().toISOString(),
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
  return record;
}

/** True only when the shopper accepted non-essential (analytics/ads) cookies. */
export function hasAnalyticsConsent(): boolean {
  return readCookieConsent()?.choice === 'all';
}

/** Re-open the banner from footer / settings without clearing the prior choice until they pick again. */
export function openCookiePreferences(): void {
  window.dispatchEvent(new Event(COOKIE_PREFS_EVENT));
}
