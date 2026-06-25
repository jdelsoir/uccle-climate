import { useEffect, useState } from 'react'
import { loadMonth } from './loader'
import type { MonthData } from '../types'

export function useMonth(mm: string) {
  const [data, setData] = useState<MonthData | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let a = true; setLoading(true)
    loadMonth(mm).then(d => a && setData(d)).catch(e => a && setError(e)).finally(() => a && setLoading(false))
    return () => { a = false } }, [mm])
  return { data, error, loading }
}
