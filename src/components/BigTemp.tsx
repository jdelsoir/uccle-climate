// Large hero temperature: big number + smaller trailing °C (matches the mockup).
export default function BigTemp({ v, className = '' }: { v: number; className?: string }) {
  return (
    <span className={`font-extrabold leading-none ${className}`}>
      {v.toFixed(1)}<span className="ml-0.5 align-baseline text-[0.5em]">°C</span>
    </span>
  )
}
