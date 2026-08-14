import { Sun, Flame, MoonStar, Snowflake, ThermometerSnowflake } from 'lucide-react'

export type CounterKey = 'SU' | 'hot30' | 'TR' | 'FD' | 'ID'

export const COUNTER_ROWS: { key: CounterKey; label: string; Icon: typeof Sun; title: string; blurb: string }[] = [
  {
    key: 'SU', label: 'summer days', Icon: Sun,
    title: 'What is a summer day?',
    blurb: 'A day whose highest temperature reaches 25 °C or more. It is the standard climate marker for properly warm summer weather.',
  },
  {
    key: 'hot30', label: 'hot days', Icon: Flame,
    title: 'What is a hot day?',
    blurb: 'A day whose highest temperature reaches 30 °C or more. Hot days are the ones that build heatwaves.',
  },
  {
    key: 'TR', label: 'tropical nights', Icon: MoonStar,
    title: 'What is a tropical night?',
    blurb: 'A night when the temperature never drops below 20 °C, so the lowest reading of the day stays at or above 20 °C. Without that night-time cooling, homes and bodies stay warm and sleep suffers.',
  },
  {
    key: 'FD', label: 'frost days', Icon: Snowflake,
    title: 'What is a frost day?',
    blurb: 'A day whose lowest temperature falls below 0 °C, usually overnight or around dawn. The day itself can still turn mild.',
  },
  {
    key: 'ID', label: 'ice days', Icon: ThermometerSnowflake,
    title: 'What is an ice day?',
    blurb: 'A day that stays below freezing from start to finish, so even the highest temperature is under 0 °C.',
  },
]
