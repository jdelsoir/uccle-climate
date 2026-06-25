import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { applyTheme, getStoredTheme, resolve, type ThemePref } from '../lib/theme'

export default function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>(() => getStoredTheme())
  const isDark = resolve(pref) === 'dark'
  useEffect(() => {
    applyTheme(pref)
    if (pref !== 'system' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [pref])
  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setPref(isDark ? 'light' : 'dark')}
      className="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-accent-soft hover:text-accent"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
