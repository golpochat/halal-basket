import type { ReactNode } from 'react';
import { SiteHeader } from '../layout/SiteHeader';
import { SiteFooter } from '../layout/SiteFooter';
import { LocalePickers } from '../LocalePickers';

/** Shared chrome for public info pages (FAQ, delivery areas, fees). */
export function InfoPageShell({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Wider content column for tables / two-up layouts */
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader variant="site" homeTo="/" actions={<LocalePickers />} />
      <main
        className={`mx-auto w-full flex-1 px-4 py-10 sm:px-6 ${wide ? 'max-w-4xl' : 'max-w-3xl'}`}
      >
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--hb-ink)]/65">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-10">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
