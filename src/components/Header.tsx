import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[680px] items-center justify-between px-4">
        <span className="text-[15px] font-extrabold tracking-tight">Uccle Climate</span>
        <ThemeToggle />
      </div>
    </header>
  )
}
