import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Stepper({ label, onPrev, onNext, prevDisabled, nextDisabled }: {
  label: string; onPrev: () => void; onNext: () => void; prevDisabled?: boolean; nextDisabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button type="button" aria-label="Previous" onClick={onPrev} disabled={prevDisabled}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-fg disabled:opacity-40">
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-semibold">{label}</span>
      <button type="button" aria-label="Next" onClick={onNext} disabled={nextDisabled}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-fg disabled:opacity-40">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
