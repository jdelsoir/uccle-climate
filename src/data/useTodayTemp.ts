import { useEffect, useState } from 'react'

const URL =
  'https://api.open-meteo.com/v1/forecast?latitude=50.8&longitude=4.36' +
  '&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min' +
  '&timezone=Europe/Brussels'

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
  // Select TODAY's daily row by matching the current observation's date.
  // The daily array can contain past/forecast days, so the last element is
  // NOT necessarily today — index by date, falling back to the first row.
  const today = String(j.current?.time ?? '').slice(0, 10)
  const days: string[] = j.daily?.time ?? []
  const found = days.indexOf(today)
  const i = found >= 0 ? found : 0
  return {
    temp: j.current.temperature_2m,
    tmax: j.daily.temperature_2m_max[i],
    tmin: j.daily.temperature_2m_min[i],
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
