// Diverging blue→white→red, clamped to ±span °C anomaly.
export function anomalyColor(v: number, span = 2.6): string {
  const t = Math.max(-1, Math.min(1, v / span))
  if (t >= 0) {
    const g = Math.round(255 * (1 - t)), b = Math.round(255 * (1 - t))
    return `rgb(220,${g},${b})`
  }
  const r = Math.round(255 * (1 + t)), g = Math.round(255 * (1 + t))
  return `rgb(${r},${g},230)`
}
