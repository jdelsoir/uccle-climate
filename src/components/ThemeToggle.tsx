import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { applyTheme, getStoredTheme, resolve, type ThemePref } from '../lib/theme'

export default function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>(() => getStoredTheme())
  useEffect(() => { applyTheme(pref) }, [pref])
  const isDark = resolve(pref) === 'dark'
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
