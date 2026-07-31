import type { ReactNode } from 'react';
import {
  SiteHeader,
  type SiteNavItem,
} from '../layout/SiteHeader';
import { SiteFooter } from '../layout/SiteFooter';

export type NavItem = SiteNavItem;

export function AppShell({
  title,
  nav,
  children,
  homeTo = '/',
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
  homeTo?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader variant="app" homeTo={homeTo} nav={nav} showAuth />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight hb-fade-up">
          {title}
        </h1>
        <div className="mt-6 hb-fade-up-delay">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
