import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'
import type { ForecastHour } from '../../types/surf'

interface Props {
  data: ForecastHour[]
  hoursToShow?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-ocean-800 border border-ocean-700 rounded-xl px-3 py-2 text-xs shadow-card space-y-1">
      <p className="text-ocean-200 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function HourlyChart({ data, hoursToShow = 72 }: Props) {
  const slice = data.slice(0, hoursToShow).map((h) => ({
    ...h,
    time: format(new Date(h.timestamp), 'EEE ha'),
    wvht: h.face_height_max_ft,
    crowd: h.crowd_score,
  }))

  // Show every 6th label
  const xTick = (value: string, index: number) =>
    index % 6 === 0 ? value : ''

  return (
    <div className="card p-5">
      <p className="stat-label mb-4">7-Day Hourly Forecast</p>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={slice} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00d4c8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00d4c8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="crowdGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#123055" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={xTick}
            tick={{ fill: '#6aa3d4', fontSize: 10, fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="wave"
            tick={{ fill: '#6aa3d4', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}ft`}
            width={32}
          />
          <YAxis
            yAxisId="crowd"
            orientation="right"
            tick={{ fill: '#6aa3d4', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            yAxisId="wave"
            type="monotone"
            dataKey="wvht"
            stroke="#00d4c8"
            strokeWidth={2}
            fill="url(#waveGrad)"
            name="Wave (ft)"
            dot={false}
          />
          <Line
            yAxisId="crowd"
            type="monotone"
            dataKey="crowd"
            stroke="#9333ea"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            name="Crowd"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
