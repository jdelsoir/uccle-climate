import { LineChart, Line, ResponsiveContainer, XAxis } from 'recharts'
import type { CounterPoint } from '../types'

export default function Sparkline({ data }: { data: CounterPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={72}>
      <LineChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        <XAxis dataKey="year" hide />
        <Line dataKey="n" dot={false} stroke="var(--accent)" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
