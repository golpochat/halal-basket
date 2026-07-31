export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`hb-skeleton ${className}`} aria-hidden />;
}

export function ProductCardSkeleton() {
  return (
    <div className="hb-surface flex flex-col overflow-hidden p-0">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-2 h-8 w-full" />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div
      className="rounded-[var(--hb-radius-xl)] border border-dashed border-[rgba(26,92,58,0.2)] bg-white/50 px-6 py-14 text-center"
      role="status"
    >
      <p className="font-display text-xl font-semibold">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--hb-ink)]/55">
          {description}
        </p>
      )}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-[var(--hb-radius-xl)] border border-red-200 bg-[var(--hb-error-bg)] px-6 py-8 text-center"
      role="alert"
    >
      <p className="font-semibold text-[var(--hb-error)]">{message}</p>
      {onRetry && (
        <button
          type="button"
          className="mt-4 inline-flex rounded-[var(--hb-radius)] border border-[rgba(26,92,58,0.25)] px-4 py-2 text-sm font-semibold text-[var(--hb-green)] hover:bg-[var(--hb-mist)]"
          onClick={onRetry}
        >
          Try again
        </button>
      )}
    </div>
  );
}
