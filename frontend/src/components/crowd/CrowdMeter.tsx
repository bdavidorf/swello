import { motion } from 'framer-motion'
import type { CrowdLevel } from '../../types/surf'

const LEVEL_COLORS: Record<CrowdLevel, string> = {
  empty:     '#10b981',
  uncrowded: '#84cc16',
  moderate:  '#f59e0b',
  crowded:   '#ef4444',
  packed:    '#9333ea',
}

const LEVEL_ICONS: Record<CrowdLevel, string> = {
  empty:     '🏄',
  uncrowded: '🏄🏄',
  moderate:  '🏄🏄🏄',
  crowded:   '🏄🏄🏄🏄',
  packed:    '🏄🏄🏄🏄🏄',
}

interface Props {
  score: number
  level: CrowdLevel
  confidence?: number
  peakHour?: number | null
}

export function CrowdMeter({ score, level, confidence, peakHour }: Props) {
  const size = 120
  const cx = size / 2
  const cy = size / 2
  const r = 46
  const strokeWidth = 8

  const sweepDeg = 270
  const startAngle = 135
  const pct = score / 100
  const activeSweep = sweepDeg * pct
  const color = LEVEL_COLORS[level]

  const toRad = (d: number) => (d * Math.PI) / 180
  const arcPath = (start: number, sweep: number) => {
    if (sweep <= 0) return ''
    const s = toRad(start)
    const e = toRad(start + sweep)
    const x1 = cx + r * Math.cos(s)
    const y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e)
    const y2 = cy + r * Math.sin(e)
    const large = sweep > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  return (
    <div className="card p-5">
      <p className="stat-label mb-4">Crowd Forecast</p>
      <div className="flex items-center gap-4">
        <div className="relative">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Track */}
            <path
              d={arcPath(startAngle, sweepDeg)}
              fill="none"
              stroke="#123055"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Active */}
            <motion.path
              d={arcPath(startAngle, activeSweep)}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.0, ease: 'easeOut' }}
            />
            {/* Center */}
            <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize="22" fontWeight="900" fontFamily="Inter">
              {Math.round(score)}
            </text>
            <text x={cx} y={cy + 11} textAnchor="middle" fill="#6aa3d4" fontSize="9" fontFamily="Inter">
              /100
            </text>
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{LEVEL_ICONS[level]}</span>
            <span className="font-bold text-ocean-50 capitalize text-lg">{level}</span>
          </div>
          {peakHour != null && (
            <p className="text-ocean-400 text-sm">
              Peak crowd ~{peakHour > 12 ? `${peakHour - 12}pm` : `${peakHour}am`}
            </p>
          )}
          {confidence != null && (
            <p className="text-ocean-500 text-xs mt-1">
              {Math.round(confidence * 100)}% confidence
            </p>
          )}
          <p className="text-ocean-400 text-xs mt-2 leading-relaxed">
            Based on wave conditions, day of week, holidays, and historical patterns.
          </p>
        </div>
      </div>
    </div>
  )
}
