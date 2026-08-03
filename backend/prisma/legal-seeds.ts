/** Seeded legal policy templates (Ireland / EU grocery marketplace pilot). */

export const SEEDED_LEGAL_SLUGS = [
  'privacy',
  'terms',
  'cookies',
  'refunds',
] as const;

export type SeededLegalSlug = (typeof SEEDED_LEGAL_SLUGS)[number];

export type LegalSeedRow = {
  slug: SeededLegalSlug;
  title: string;
  subtitle: string;
  sortOrder: number;
  bodyMarkdown: string;
};

export const LEGAL_DOCUMENT_SEEDS: LegalSeedRow[] = [
  {
    slug: 'privacy',
    title: 'Privacy policy',
    subtitle:
      'How Halal Basket collects, uses, and protects personal data for the Dublin pilot.',
    sortOrder: 0,
    bodyMarkdown: `## Who we are

Halal Basket operates a grocery marketplace connecting customers with local partner shops and delivery partners in Ireland (Dublin pilot). For GDPR purposes, Halal Basket is the **data controller** for customer accounts, orders, and related support records.

**Contact:** Use the support email associated with your Halal Basket account, or contact details published on the storefront.

## What we collect

- **Account:** name, email, phone (if provided), password (stored hashed), and profile preferences.
- **Orders & delivery:** delivery addresses, selected delivery area, order contents, fulfilment status, and communications about your order.
- **Payments:** payment status and references. Card details are processed by our payment provider (e.g. Stripe); we do **not** store full card numbers on Halal Basket servers.
- **Technical:** device/browser basics, request identifiers, and security logs needed to run and protect the service.
- **Driver feedback (optional):** ratings/tags that may be linked to an order for trust and quality.

## How we use data

We use personal data to:

- create and manage your account;
- take and fulfil orders (including sharing necessary details with partner shops and drivers);
- process payments and handle refunds;
- communicate about deliveries, pickups, and service changes;
- detect fraud, abuse, and security incidents;
- improve the pilot service and meet legal obligations.

## Who receives data

- **Partner shops** receive details needed to prepare and fulfil your order (items, delivery/pickup instructions, customer contact as required).
- **Drivers** receive delivery location and contact details needed to complete assigned jobs.
- **Payment processors** receive payment-related data to charge or refund you.
- **Hosting and infrastructure providers** process data on our behalf under contract.

We do not sell your personal data.

## Retention

We keep account and order records for as long as needed to operate the service, handle disputes, and meet accounting/tax and legal requirements. Operational guidance for the pilot typically retains order and event records for an operational period plus up to **12 months**, unless a longer legal hold applies. When you request erasure, we anonymise personal identifiers where we can while retaining non-personal or legally required financial records.

## Your rights (EEA / UK / Ireland)

Subject to applicable law, you may request **access**, **correction**, **erasure**, **restriction**, **portability**, and **objection** to certain processing. You may also lodge a complaint with the Irish Data Protection Commission (or your local supervisory authority).

To exercise rights, contact support from your registered email. Staff with privacy permissions can also run export/erasure tools in the admin console.

## Updates

We may update this policy as the platform develops. Material changes will be reflected by the “Last updated” date on this page. Continued use after changes means you accept the updated policy.`,
  },
  {
    slug: 'terms',
    title: 'Terms of service',
    subtitle: 'Terms for using Halal Basket during the Dublin pilot.',
    sortOrder: 1,
    bodyMarkdown: `## Agreement

By creating an account or placing an order on Halal Basket you agree to these Terms of service and our Privacy policy. If you do not agree, do not use the service.

## The service

Halal Basket is a **marketplace**. Partner shops sell products; Halal Basket provides the platform, routing, and related tools. Unless stated otherwise, the selling shop (or shops) on an order are responsible for product quality, preparation, and shop-side fulfilment. Delivery may be performed by Halal Basket drivers or as otherwise shown at checkout.

## Eligibility & accounts

You must provide accurate registration details and keep them up to date. You are responsible for activity under your account. We may suspend or terminate accounts that abuse the service, attempt fraud, or breach these terms.

## Orders, pricing & availability

- Prices, stock, and fees shown at checkout are estimates subject to confirmation.
- Split fulfilment across shops may apply.
- Delivery areas and days are limited during the pilot; see Delivery locations.
- We may cancel or refuse orders for operational, safety, or legal reasons (with a refund where payment was taken and fulfilment cannot proceed).

## Payments

Payment is collected through our payment provider. By ordering you authorise the charge for goods, delivery fees, and applicable discounts. Failed payments may delay or cancel fulfilment.

## Conduct

You must not misuse the platform (e.g. harassment of drivers/shops, false addresses, payment fraud, scraping, or attempts to disrupt systems).

## Liability

To the fullest extent permitted by Irish and EU consumer law:

- nothing in these terms excludes liability that cannot be excluded by law;
- for the pilot, Halal Basket’s aggregate liability arising from a single order is limited to the amounts you paid for that order through the platform, except where mandatory consumer rights provide otherwise.

## Changes

We may update these terms as Halal Basket develops. Continued use after changes means you accept the updated terms.

## Governing law

These terms are governed by the laws of Ireland. Courts in Ireland have jurisdiction, without prejudice to mandatory consumer protections that apply where you live.`,
  },
  {
    slug: 'cookies',
    title: 'Cookie policy',
    subtitle: 'How Halal Basket uses cookies and similar technologies.',
    sortOrder: 2,
    bodyMarkdown: `## What are cookies?

Cookies are small files stored on your device. Similar technologies (local storage, session storage) may be used for the same purposes.

## How we use them

### Essential

Required for the site to work, including:

- keeping you signed in;
- remembering your selected delivery area and basket;
- security and fraud prevention;
- load balancing and basic diagnostics.

These are necessary for the service you request and are not used for third-party advertising.

### Preferences (where offered)

May remember language or currency choices when those features are enabled.

### Analytics

If we enable analytics in future, we will update this policy and seek consent before non-essential cookies are set. On the website you can choose **Accept all** or **Essential only** via the cookie banner (and reopen it from **Cookie preferences** in the footer).

## Managing cookies

You can control cookies through your browser settings. Blocking essential cookies may prevent login, checkout, or area selection from working correctly.

## Updates

We may update this policy when our use of cookies changes. Check the “Last updated” date on this page.`,
  },
  {
    slug: 'refunds',
    title: 'Refunds & cancellations',
    subtitle:
      'How cancellations, missing items, and refunds work for the Dublin pilot.',
    sortOrder: 3,
    bodyMarkdown: `## Cancelling an order

- You may request cancellation before the order is being prepared or out for delivery, via support or in-app order tools where available.
- Once a shop has started preparing, or a driver is en route, cancellation may not be possible. We will still help with missing/wrong items where appropriate.

## Missing, damaged, or incorrect items

Contact support promptly with your order reference and a short description (and photos if helpful). We may:

- refund affected line items;
- arrange a replacement where operationally possible; or
- credit your account where offered.

## Delivery issues

If delivery fails for reasons outside your control (e.g. driver unable to complete after reasonable attempts), we will work with you on redelivery or refund of undelivered goods according to what was fulfilled.

If failure is due to an incorrect/inaccessible address or nobody available to receive (where required), additional fees or limited refund options may apply.

## Payment refunds

Approved refunds are returned to the original payment method via our payment provider. Timing depends on your bank or card issuer (often several business days).

## Perishable goods

Grocery and perishable items may have limited return rights under applicable consumer rules once delivered in good condition. We still address quality issues raised in good faith for the pilot.

## How to contact us

Use your registered email and order ID when contacting support so we can locate the order quickly.`,
  },
];
