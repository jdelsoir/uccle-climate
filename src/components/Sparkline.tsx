import { LineChart, Line, ResponsiveContainer, XAxis } from 'recharts'
import type { CounterPoint } from '../types'

export default function Sparkline({ data }: { data: CounterPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={data}>
        <XAxis dataKey="year" hide />
        <Line dataKey="n" dot={false} stroke="#b22222" />
      </LineChart>
    </ResponsiveContainer>
  )
}
