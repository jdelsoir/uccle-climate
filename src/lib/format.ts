export const mmddOf = (d: Date): string =>
  `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

export const todayMMDD = (): string => mmddOf(new Date())

export const fmtTemp = (t: number | null | undefined): string =>
  t == null ? '—' : `${t.toFixed(1)} °C`
