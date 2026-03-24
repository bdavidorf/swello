import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import type { CrowdLevel } from '../../types/surf'

const LEVEL_COLORS: Record<CrowdLevel, string> = {
  empty:     '#10b981',
  uncrowded: '#84cc16',
  moderate:  '#f59e0b',
  crowded:   '#ef4444',
  packed:    '#9333ea',
}

interface HourlyCrowd {
  hour: number
  score: number
  level: CrowdLevel
}

interface Props {
  data: HourlyCrowd[]
}

function fmtHour(h: number) {
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h > 12 ? `${h - 12}pm` : `${h}am`
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as HourlyCrowd
  return (
    <div className="bg-ocean-800 border border-ocean-700 rounded-xl px-3 py-2 text-sm shadow-card">
      <p className="text-ocean-200 font-semibold">{fmtHour(d.hour)}</p>
      <p className="text-ocean-50 font-bold">{Math.round(d.score)} / 100</p>
      <p className="capitalize" style={{ color: LEVEL_COLORS[d.level] }}>{d.level}</p>
    </div>
  )
}

export function CrowdTimeline({ data }: Props) {
  const now = new Date().getHours()

  return (
    <div className="card p-5">
      <p className="stat-label mb-4">Today's Crowd Forecast</p>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barCategoryGap="20%">
          <XAxis
            dataKey="hour"
            tickFormatter={fmtHour}
            tick={{ fill: '#6aa3d4', fontSize: 10, fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={LEVEL_COLORS[entry.level]}
                opacity={entry.hour === now ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-ocean-500 text-xs text-center mt-1">
        Predicted crowd level by hour of day
      </p>
    </div>
  )
}
