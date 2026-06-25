import { useEffect, useState } from 'react'
import { loadDayNorm } from './loader'
import type { DayNorm, Baseline } from '../types'
export function useDayNorm() {
  const [data, setData] = useState<Record<Baseline, DayNorm[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => { let a = true
    loadDayNorm().then(d => a && setData(d)).catch(e => a && setError(e)).finally(() => a && setLoading(false))
    return () => { a = false } }, [])
  return { data, loading, error }
}
