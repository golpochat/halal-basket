import { useState } from 'react';

/** Product photo or Halal Basket branded placeholder when missing/broken. */
export function ProductImage({
  src,
  alt = '',
  size = 'md',
  className = '',
}: {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(src?.trim()) && !failed;

  if (showImg) {
    return (
      <img
        src={src!}
        alt={alt}
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  const mark =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';
  const label =
    size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-1.5 bg-[linear-gradient(145deg,var(--hb-mist)_0%,rgba(26,92,58,0.14)_100%)] ${className}`}
      role="img"
      aria-label={alt || 'Halal Basket'}
    >
      <img
        src="/brand-mark.png"
        alt=""
        aria-hidden
        className={`${mark} rounded-[22%] shadow-sm`}
      />
      <span
        className={`font-display font-semibold tracking-tight text-[var(--hb-green)]/75 ${label}`}
      >
        Halal Basket
      </span>
    </div>
  );
}
