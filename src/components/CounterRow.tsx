import { useEffect, useRef } from 'react'
import { X, type LucideIcon } from 'lucide-react'

/** One "by the numbers" row: icon button + count + label + normal, with a tap-to-open explanation popup. */
export default function CounterRow({ label, Icon, title, blurb, count, normal, open, onToggle }: {
  label: string; Icon: LucideIcon; title: string; blurb: string
  count: number; normal: number | null
  open: boolean; onToggle: () => void
}) {
  const box = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onToggle() }
    const onOutside = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) onToggle()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onOutside)
    }
  }, [open, onToggle])

  return (
    <li ref={box} className="relative flex items-center gap-3 py-2.5">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-label={title}
        className="-m-1 p-1 text-muted transition-colors hover:text-fg">
        <Icon size={16} aria-hidden />
      </button>
      <span className="text-lg font-bold text-fg">{count}</span>
      <span className="flex-1 text-sm">{label}</span>
      {normal != null && <span className="text-xs text-muted">normal {normal.toFixed(1)}</span>}
      {open && (
        <div role="note"
          className="absolute left-0 right-0 top-full z-20 border border-border bg-surface-2 p-3 shadow-lg">
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm font-semibold text-fg">{title}</p>
            <button type="button" onClick={onToggle} aria-label="Close explanation"
              className="-m-1 p-1 text-muted transition-colors hover:text-fg">
              <X size={14} aria-hidden />
            </button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">{blurb}</p>
        </div>
      )}
    </li>
  )
}
