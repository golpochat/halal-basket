type TVars = Record<string, string | number>;

/** Stable reasons from `/platform/coupons/validate`. */
export type CouponReason =
  | 'enter_code'
  | 'not_recognised'
  | 'not_active'
  | 'expired'
  | 'limit_reached'
  | 'sign_in'
  | 'already_used'
  | 'applied';

const REASON_KEYS: Record<CouponReason, string> = {
  enter_code: 'cart.enterCode',
  not_recognised: 'cart.codeUnrecognized',
  not_active: 'cart.couponNotActive',
  expired: 'cart.couponExpired',
  limit_reached: 'cart.couponLimitReached',
  sign_in: 'cart.couponSignIn',
  already_used: 'cart.couponAlreadyUsed',
  applied: 'cart.couponAppliedOk',
};

/** Legacy English API messages → pack keys (pre-reason responses). */
const LEGACY_MESSAGE_KEYS: Record<string, string> = {
  'Enter a code': 'cart.enterCode',
  'Code not recognised': 'cart.codeUnrecognized',
  'Code is not active yet': 'cart.couponNotActive',
  'Code has expired': 'cart.couponExpired',
  'Code has reached its limit': 'cart.couponLimitReached',
  'Sign in to use this coupon': 'cart.couponSignIn',
  'You have already used this code': 'cart.couponAlreadyUsed',
};

type Translate = (key: string, vars?: TVars) => string;

export function localizeCouponMessage(
  t: Translate,
  opts: {
    reason?: string | null;
    message?: string | null;
    code?: string | null;
  },
): string {
  const reason = opts.reason as CouponReason | undefined;
  if (reason && reason in REASON_KEYS) {
    return t(REASON_KEYS[reason], opts.code ? { code: opts.code } : undefined);
  }
  const raw = (opts.message ?? '').trim();
  if (!raw) return t('cart.codeUnrecognized');
  const applied = /^Applied\s+(.+)$/i.exec(raw);
  if (applied) {
    return t('cart.couponAppliedOk', { code: applied[1].trim() });
  }
  const legacyKey = LEGACY_MESSAGE_KEYS[raw];
  if (legacyKey) return t(legacyKey);
  return raw;
}

/** Localize known system promo banners; leave custom CMS copy as-is. */
export function localizePromoBanner(
  t: Translate,
  message: string,
  formatMoney?: (n: number) => string,
): string {
  if (/reduced delivery/i.test(message)) {
    return t('cart.promoReducedDelivery');
  }
  const free = /free scheduled delivery on orders over\s*€?\s*([\d.,]+)/i.exec(
    message,
  );
  if (free) {
    const amountNum = Number(free[1].replace(/,/g, ''));
    const amount = formatMoney
      ? formatMoney(Number.isFinite(amountNum) ? amountNum : 0)
      : `€${free[1]}`;
    return t('cart.promoFreeDelivery', { amount });
  }
  return message;
}
