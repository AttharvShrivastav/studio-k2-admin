export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="page-state" aria-live="polite">
      <span className="status-dot" />
      <p>{label}…</p>
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return (
    <div className="page-state page-state-error" role="alert">
      <p>{message}</p>
    </div>
  );
}
