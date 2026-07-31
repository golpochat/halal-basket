export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(26,92,58,0.2)] bg-white/50 px-6 py-14 text-center">
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
      className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center"
      role="alert"
    >
      <p className="font-semibold text-red-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          className="hb-btn hb-btn-ghost mt-4 px-4 py-2 text-sm"
          onClick={onRetry}
        >
          Try again
        </button>
      )}
    </div>
  );
}
