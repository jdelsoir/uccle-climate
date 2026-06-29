export default function StatCard({ label, value, sub, valueClass = 'text-fg', onClick }: {
  label: string; value: string; sub?: string; valueClass?: string; onClick?: () => void
}) {
  const body = (
    <>
      <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </>
  )
  const cls = 'rounded-xl border border-border bg-surface p-4'
  if (onClick) return (
    <button type="button" onClick={onClick} className={`${cls} text-left transition-colors hover:border-warm`}>{body}</button>
  )
  return <div className={cls}>{body}</div>
}
