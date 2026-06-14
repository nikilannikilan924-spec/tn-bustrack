export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="text-5xl">📡</span>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">You&apos;re Offline</h1>
      <p className="max-w-md text-sm text-[var(--text-secondary)]">
        TN BusTrack needs an internet connection to show live bus positions, routes, and alerts.
        Please check your connection and try again.
      </p>
    </div>
  );
}
