import {
  isBlockedByMetaCommercePolicy,
  isMetaCommerceAllowedProduct,
} from './meta-catalog-eligibility';

describe('meta-catalog-eligibility', () => {
  it('blocks Meat & Poultry category', () => {
    expect(
      isBlockedByMetaCommercePolicy({
        name: 'Paneer 250g',
        categorySlug: 'meat-poultry',
        categoryName: 'Meat & Poultry',
      }),
    ).toBe(true);
  });

  it('blocks eggs by name without blocking eggplant', () => {
    expect(
      isBlockedByMetaCommercePolicy({
        name: 'Free Range Eggs (12)',
        categorySlug: 'dairy-eggs',
        categoryName: 'Dairy & Eggs',
      }),
    ).toBe(true);
    expect(
      isMetaCommerceAllowedProduct({
        name: 'Eggplant 1kg',
        slug: 'eggplant-1kg',
        categorySlug: 'produce',
        categoryName: 'Produce',
        tags: ['produce'],
      }),
    ).toBe(true);
  });

  it('allows dairy staples', () => {
    expect(
      isMetaCommerceAllowedProduct({
        name: 'Natural Yoghurt 1kg',
        categorySlug: 'dairy-eggs',
        categoryName: 'Dairy & Eggs',
        tags: ['dairy'],
      }),
    ).toBe(true);
  });

  it('blocks chicken / fish by name', () => {
    expect(
      isBlockedByMetaCommercePolicy({
        name: 'Chicken Breast 1kg',
        categorySlug: 'meat-poultry',
      }),
    ).toBe(true);
    expect(
      isBlockedByMetaCommercePolicy({
        name: 'Hilsa (Ilish) Steaks 500g',
        categoryName: 'Meat & Poultry',
      }),
    ).toBe(true);
  });
});
