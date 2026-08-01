import { useState } from 'react';

type Props = {
  label?: string | null;
  /** Optional photo URL or data-URL; falls back to initials placeholder. */
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

function initials(label: string | null | undefined): string {
  if (!label) return '?';
  const part = label.includes('@') ? label.split('@')[0] : label;
  const bits = part.replace(/[._-]+/g, ' ').trim().split(/\s+/);
  if (bits.length >= 2) return (bits[0][0] + bits[1][0]).toUpperCase();
  return part.slice(0, 2).toUpperCase();
}

const sizes = {
  sm: 'hb-user-avatar hb-user-avatar--sm',
  md: 'hb-user-avatar',
  lg: 'hb-user-avatar hb-user-avatar--lg',
};

/** Shared avatar — photo when provided, otherwise initials placeholder. */
export function UserAvatar({
  label,
  src,
  size = 'md',
  className = '',
}: Props) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src) && !broken;

  return (
    <span
      className={`${sizes[size]} ${showImage ? 'hb-user-avatar--photo' : ''} ${className}`.trim()}
      aria-hidden
    >
      {showImage ? (
        <img
          src={src!}
          alt=""
          className="hb-user-avatar__img"
          onError={() => setBroken(true)}
        />
      ) : (
        initials(label)
      )}
    </span>
  );
}
