export type ThemePref = 'light' | 'dark' | 'system'
const KEY = 'uccle.theme'

export function getStoredTheme(): ThemePref {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolve(pref: ThemePref): 'light' | 'dark' {
  return pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref
}

export function applyTheme(pref: ThemePref): void {
  localStorage.setItem(KEY, pref)
  document.documentElement.classList.toggle('dark', resolve(pref) === 'dark')
}
