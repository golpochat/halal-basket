import { BrandLogo } from '../brand/BrandLogo';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto w-full shrink-0 border-t border-[rgba(26,92,58,0.1)] bg-[rgba(247,250,246,0.75)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <BrandLogo size="sm" />
        <p className="text-xs text-[var(--hb-ink)]/45">© {year} Halal Basket · Shop portal</p>
      </div>
    </footer>
  );
}
