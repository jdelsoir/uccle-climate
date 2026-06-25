import { useEffect, useState } from 'react'
import { loadThisDay } from './loader'
import type { ThisDay } from '../types'
export function useThisDay(mmdd: string) {
  const [data, setData] = useState<ThisDay | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let a = true; setLoading(true)
    loadThisDay(mmdd).then(d => a && setData(d)).catch(e => a && setError(e)).finally(() => a && setLoading(false))
    return () => { a = false } }, [mmdd])
  return { data, error, loading }
}
