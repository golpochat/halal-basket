import { t } from '../src/web/i18n/index.ts';

for (const lang of ['en', 'bn', 'hi', 'ur', 'ar'] as const) {
  console.log(
    [
      lang,
      t('cart.clear', lang),
      t('cart.checkout', lang),
      t('cart.subtotal', lang),
      t('cart.itemCount_other', lang, { count: 3 }),
    ].join(' | '),
  );
}
