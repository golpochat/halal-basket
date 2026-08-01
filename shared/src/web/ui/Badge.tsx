import type { ReactNode } from 'react';
import { BadgeHalalIcon, BadgePartnerIcon, ICON_SIZES } from '../../../icons';

export function InfoCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`hb-surface p-5 shadow-[var(--hb-shadow-sm)] ${className}`}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'green',
  icon,
}: {
  children: ReactNode;
  tone?: 'green' | 'gold' | 'muted' | 'danger' | 'warning';
  /** Optional leading brand icon */
  icon?: ReactNode;
}) {
  const tones = {
    green: 'bg-[var(--hb-mist)] text-[var(--hb-green)]',
    gold: 'bg-[var(--hb-warning-bg)] text-[#8a6d12]',
    muted: 'bg-white/80 text-[var(--hb-ink)]/60',
    danger: 'bg-[var(--hb-error-bg)] text-[var(--hb-error)]',
    warning: 'bg-[var(--hb-warning-bg)] text-[var(--hb-warning)]',
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function HalalBadge() {
  return (
    <Badge tone="gold" icon={<BadgeHalalIcon size={ICON_SIZES.badge} />}>
      Halal
    </Badge>
  );
}

export function PartnerBadge() {
  return (
    <Badge tone="green" icon={<BadgePartnerIcon size={ICON_SIZES.badge} />}>
      Partner
    </Badge>
  );
}
