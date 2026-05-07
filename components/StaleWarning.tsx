export function StaleWarning() {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span className="font-semibold">⚠ Snapshot is stale.</span>{' '}
      The last data refresh failed. Numbers below reflect the previous successful run.
    </div>
  );
}
