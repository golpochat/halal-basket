export function Flash({ error, msg }: { error?: string; msg?: string }) {
  return (
    <>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {msg && <p className="mb-3 rounded-lg bg-[var(--hb-mist)] px-3 py-2 text-sm text-[var(--hb-green)]">{msg}</p>}
    </>
  );
}
