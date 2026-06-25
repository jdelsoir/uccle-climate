import { useEffect, useState } from 'react'

const URL =
  'https://api.open-meteo.com/v1/forecast?latitude=50.8&longitude=4.36' +
  '&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min' +
  '&past_days=92&timezone=Europe/Brussels'

export interface TodayTemp {
  temp: number
  tmax: number
  tmin: number
  isLive: boolean
}

export async function fetchTodayTemp(): Promise<TodayTemp> {
  const res = await fetch(URL)
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  const j = await res.json()
  return {
    temp: j.current.temperature_2m,
    tmax: j.daily.temperature_2m_max[j.daily.temperature_2m_max.length - 1],
    tmin: j.daily.temperature_2m_min[j.daily.temperature_2m_min.length - 1],
    isLive: true,
  }
}

export function useTodayTemp() {
  const [data, setData] = useState<TodayTemp | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchTodayTemp()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  return { data, error, loading }
}
