import { useEffect, useState } from 'react'
import { loadDaily } from './loader'
import type { DailyYear } from '../types'

export function useDaily(year: number) {
  const [data, setData] = useState<DailyYear | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let a = true; setLoading(true); setError(null)
    loadDaily(year).then(d => a && setData(d)).catch(e => a && setError(e)).finally(() => a && setLoading(false))
    return () => { a = false } }, [year])
  return { data, error, loading }
}
