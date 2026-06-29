export default function CalendarTile({ header, body, footer, onClick, ariaLabel }: {
  header: string; body: string | number; footer?: string; onClick?: () => void; ariaLabel?: string
}) {
  const inner = (
    <span className="block overflow-hidden border border-border shadow-md">
        <span className="block bg-cal-header py-1 text-center text-[11px] font-bold leading-none tracking-wide text-white">{header}</span>
        <span className="block bg-surface px-2 pt-2 pb-2">
          <span className="block text-center text-3xl font-extrabold leading-none text-fg">{body}</span>
          {footer && <span className="mt-1 block text-center text-[10px] font-semibold uppercase tracking-wide text-muted">{footer}</span>}
        </span>
    </span>
  )
  if (onClick) return (
    <button type="button" aria-label={ariaLabel} aria-haspopup="dialog" onClick={onClick}
      className="block w-20 shrink-0 transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5">{inner}</button>
  )
  return <div className="w-20 shrink-0">{inner}</div>
}
