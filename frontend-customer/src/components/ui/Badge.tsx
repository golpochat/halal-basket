export function Badge({
  children,
  tone = 'green',
}: {
  children: React.ReactNode;
  tone?: 'green' | 'gold' | 'muted' | 'danger';
}) {
  const tones = {
    green: 'bg-[var(--hb-mist)] text-[var(--hb-green)]',
    gold: 'bg-[rgba(201,162,39,0.18)] text-[#8a6d12]',
    muted: 'bg-white/80 text-[var(--hb-ink)]/60',
    danger: 'bg-red-50 text-red-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
