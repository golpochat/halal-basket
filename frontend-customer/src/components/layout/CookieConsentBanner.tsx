import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import {
  COOKIE_PREFS_EVENT,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentChoice,
} from '../../lib/cookie-consent';

/**
 * Essential-only CMP for the customer storefront.
 * Does not load analytics today — stores preference so future tags can gate on `hasAnalyticsConsent()`.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readCookieConsent() === null);

    function onPrefs() {
      setVisible(true);
    }
    window.addEventListener(COOKIE_PREFS_EVENT, onPrefs);
    return () => window.removeEventListener(COOKIE_PREFS_EVENT, onPrefs);
  }, []);

  function choose(choice: CookieConsentChoice) {
    writeCookieConsent(choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="hb-cookie-banner fixed inset-x-0 bottom-0 z-[45] border-t border-[rgba(26,92,58,0.14)] bg-[rgba(247,250,246,0.98)] shadow-[0_-8px_32px_rgba(19,38,28,0.12)] backdrop-blur-md"
      role="dialog"
      aria-labelledby="hb-cookie-title"
      aria-describedby="hb-cookie-desc"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1">
          <p
            id="hb-cookie-title"
            className="font-display text-base font-semibold tracking-tight text-[var(--hb-ink)]"
          >
            Cookies on Halal Basket
          </p>
          <p
            id="hb-cookie-desc"
            className="mt-1 text-sm leading-relaxed text-[var(--hb-ink)]/65"
          >
            We use essential cookies and similar storage to keep you signed in,
            remember your delivery area, and run checkout. Optional analytics
            stay off unless you accept them.{' '}
            <Link
              to="/legal/cookies"
              className="font-medium text-[var(--hb-green)] underline-offset-2 hover:underline"
            >
              Cookie policy
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => choose('essential')}
          >
            Essential only
          </Button>
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            onClick={() => choose('all')}
          >
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
