type Props = {
  className?: string;
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

const sizes = {
  sm: { mark: 28, text: 'text-lg' },
  md: { mark: 36, text: 'text-xl' },
  lg: { mark: 56, text: 'text-3xl' },
};

export function BrandLogo({
  className = '',
  showWordmark = true,
  size = 'md',
}: Props) {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/brand-mark.png"
        width={s.mark}
        height={s.mark}
        alt=""
        aria-hidden
        className="rounded-[22%] shadow-sm"
      />
      {showWordmark && (
        <span className={`font-display font-semibold tracking-tight ${s.text}`}>
          Halal Basket
        </span>
      )}
    </span>
  );
}
