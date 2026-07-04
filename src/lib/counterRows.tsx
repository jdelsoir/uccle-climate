import { Sun, Flame, MoonStar, Snowflake, ThermometerSnowflake } from 'lucide-react'

export type CounterKey = 'SU' | 'hot30' | 'TR' | 'FD' | 'ID'

export const COUNTER_ROWS: { key: CounterKey; label: string; Icon: typeof Sun }[] = [
  { key: 'SU', label: 'summer days', Icon: Sun },
  { key: 'hot30', label: 'hot days', Icon: Flame },
  { key: 'TR', label: 'tropical nights', Icon: MoonStar },
  { key: 'FD', label: 'frost days', Icon: Snowflake },
  { key: 'ID', label: 'ice days', Icon: ThermometerSnowflake },
]
