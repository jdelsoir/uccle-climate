import { RAMP } from './ramp'

// Map a temperature anomaly (°C) to the diverging ramp, clamped to ±span.
export function anomalyColor(v: number, span = 2.6): string {
  const t = Math.max(-1, Math.min(1, v / span))       // -1 (cool) .. 1 (warm)
  const idx = Math.round(((t + 1) / 2) * (RAMP.length - 1))
  return RAMP[idx]
}
