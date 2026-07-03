import { useEffect, useState } from 'react'
import { loadYear } from './loader'
import type { YearData } from '../types'

export function useYear(year: number) {
  const [data, setData] = useState<YearData | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let a = true; setLoading(true); setError(null)
    loadYear(year).then(d => a && setData(d)).catch(e => a && setError(e)).finally(() => a && setLoading(false))
    return () => { a = false } }, [year])
  return { data, error, loading }
}
