import { useEffect, useState } from 'react'
import { loadSummary } from './loader'
import type { Summary } from '../types'
export function useSummary() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let a = true
    loadSummary().then(s => a && setSummary(s)).catch(e => a && setError(e)).finally(() => a && setLoading(false))
    return () => { a = false } }, [])
  return { summary, error, loading }
}
