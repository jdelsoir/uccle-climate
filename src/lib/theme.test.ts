import { applyTheme, getStoredTheme, resolve } from './theme'

beforeEach(() => { localStorage.clear(); document.documentElement.classList.remove('dark') })

test('applyTheme("dark") adds .dark and persists', () => {
  applyTheme('dark')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(localStorage.getItem('uccle.theme')).toBe('dark')
})
test('applyTheme("light") removes .dark', () => {
  document.documentElement.classList.add('dark')
  applyTheme('light')
  expect(document.documentElement.classList.contains('dark')).toBe(false)
})
test('getStoredTheme defaults to system', () => {
  expect(getStoredTheme()).toBe('system')
})
test('resolve("system") returns light when matchMedia is false', () => {
  expect(resolve('system')).toBe('light')
})
