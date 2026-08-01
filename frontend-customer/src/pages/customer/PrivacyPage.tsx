import { InfoPageShell } from '../../components/layout/InfoPageShell';

export function PrivacyPage() {
  return (
    <InfoPageShell
      title="Privacy policy"
      subtitle="How Halal Basket handles personal data for the Dublin pilot."
    >
      <div className="space-y-8 text-sm leading-relaxed text-[var(--hb-ink)]/75">
        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--hb-ink)]">
            What we collect
          </h2>
          <p className="mt-2">
            When you create an account or place an order we collect your name,
            email, delivery address, and order details. Payment is processed by
            our payment provider; we do not store full card numbers on Halal
            Basket servers.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--hb-ink)]">
            How we use it
          </h2>
          <p className="mt-2">
            We use your information to fulfil orders, communicate about delivery
            or pickup, improve the pilot service, and meet legal obligations.
            Shop partners only receive the details needed to prepare and fulfil
            your order.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--hb-ink)]">
            Retention & rights
          </h2>
          <p className="mt-2">
            We keep order records as required for operations and compliance. You
            may request access, correction, or deletion of your account data by
            contacting support with your registered email. This pilot policy may
            be updated as the platform expands.
          </p>
        </section>
      </div>
    </InfoPageShell>
  );
}
