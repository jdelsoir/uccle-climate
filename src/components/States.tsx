export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="flex items-center justify-center py-16 text-sm text-muted animate-pulse">{label}</div>
}

export function ErrorState({ label = 'Something went wrong.' }: { label?: string }) {
  return <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">{label}</div>
}
