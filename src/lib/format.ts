export const mmddOf = (d: Date): string =>
  `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

export const todayMMDD = (): string => mmddOf(new Date())

export const fmtTemp = (t: number | null | undefined): string =>
  t == null ? '—' : `${t.toFixed(1)} °C`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "1947-06-25" -> "25 Jun 1947" (TZ-safe; no Date parsing).
export const fmtDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
export const fmtMonth = (mm: string): string => MONTHS_FULL[Number(mm) - 1]
export const fmtDayLabel = (mmdd: string): string =>
  `${Number(mmdd.slice(2))} ${fmtMonth(mmdd.slice(0, 2))}`

// Local-time ISO date "YYYY-MM-DD" (matches todayMMDD's local-time basis).
export const todayISO = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const fmtWeekday = (d: Date): string => WEEKDAYS[d.getDay()]
export const ordinalDay = (n: number): string => ordinal(n)
export const isoOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
