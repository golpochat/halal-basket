type Props = {
  className?: string;
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

const sizes = {
  sm: { mark: 28, text: 'text-lg' },
  md: { mark: 36, text: 'text-xl' },
  lg: { mark: 52, text: 'text-3xl' },
};

export function BrandLogo({
  className = '',
  showWordmark = true,
  size = 'md',
}: Props) {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden
      >
        <rect width="64" height="64" rx="14" fill="#1a5c3a" />
        <path
          d="M14 38c0-2 1.5-4 4-5.5C22 30 28 28 32 28s10 2 14 4.5c2.5 1.5 4 3.5 4 5.5v2c0 4-6 8-18 8s-18-4-18-8v-2z"
          fill="#f4f7f2"
        />
        <path
          d="M18 36.5c3.5-2 9-3.5 14-3.5s10.5 1.5 14 3.5"
          stroke="#c9a227"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M22 28c0-6 4-11 10-12 1.5 4 4 7 8 9-5 1-10 2-14 5-2-1-3.5-1.5-4-2z"
          fill="#2f8f5b"
        />
      </svg>
      {showWordmark && (
        <span className={`font-display font-semibold tracking-tight ${s.text}`}>
          Halal Basket
        </span>
      )}
    </span>
  );
}
