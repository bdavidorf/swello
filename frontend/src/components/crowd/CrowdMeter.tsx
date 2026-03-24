import { motion } from 'framer-motion'
import type { CrowdLevel } from '../../types/surf'

const LEVEL_COLOR: Record<CrowdLevel, string> = {
  empty:     '#60C8B0',
  uncrowded: '#78D0B8',
  moderate:  '#88C8E8',
  crowded:   '#78B8D8',
  packed:    '#4A68A8',
}

const LEVEL_TEXT: Record<CrowdLevel, string> = {
  empty:     'EMPTY',
  uncrowded: 'UNCROWDED',
  moderate:  'MODERATE',
  crowded:   'CROWDED',
  packed:    'PACKED',
}

interface Props {
  score: number
  level: CrowdLevel
  confidence?: number
  peakHour?: number | null
}

export function CrowdMeter({ score, level, confidence, peakHour }: Props) {
  const color = LEVEL_COLOR[level]

  // Analog dial geometry
  const size = 140
  const cx = size / 2
  const cy = size / 2
  const r = 50
  const strokeW = 9
  const startAngle = 225  // degrees
  const sweepDeg = 270
  const pct = score / 100
  const activeSweep = sweepDeg * pct

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

  // Needle angle
  const needleDeg = startAngle + activeSweep
  const needleRad = toRad(needleDeg)
  const needleTipX = cx + (r - 12) * Math.cos(needleRad)
  const needleTipY = cy + (r - 12) * Math.sin(needleRad)
  const needleTailX = cx + (-14) * Math.cos(needleRad)
  const needleTailY = cy + (-14) * Math.sin(needleRad)

  // Tick marks
  const ticks = [0, 25, 50, 75, 100]

  return (
    <div className="card p-5">
      <p className="stat-label mb-3">Vibe Meter</p>
      <div className="flex items-center gap-5">
        {/* Analog dial */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Tick marks */}
            {ticks.map(t => {
              const a = toRad(startAngle + (t / 100) * sweepDeg)
              const ox = cx + (r + strokeW / 2 + 2) * Math.cos(a)
              const oy = cy + (r + strokeW / 2 + 2) * Math.sin(a)
              const ix = cx + (r - strokeW / 2 - 2) * Math.cos(a)
              const iy = cy + (r - strokeW / 2 - 2) * Math.sin(a)
              return <line key={t} x1={ox} y1={oy} x2={ix} y2={iy}
                stroke="rgba(168,200,220,0.30)" strokeWidth="1.5" strokeLinecap="round" />
            })}

            {/* Track */}
            <path d={arcPath(startAngle, sweepDeg)} fill="none"
              stroke="rgba(26,48,72,0.90)" strokeWidth={strokeW} strokeLinecap="round" />

            {/* Colored fill arc */}
            <motion.path
              d={arcPath(startAngle, activeSweep)}
              fill="none"
              stroke={color}
              strokeWidth={strokeW}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 5px ${color}88)` }}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />

            {/* Needle */}
            <motion.line
              x1={needleTailX} y1={needleTailY}
              x2={needleTipX}  y2={needleTipY}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 3px ${color}cc)` }}
              initial={{ rotate: 0, originX: `${cx}px`, originY: `${cy}px` }}
              animate={{ rotate: 0 }}
            />

            {/* Hub */}
            <circle cx={cx} cy={cy} r={7}
              fill="rgba(18,37,52,0.95)" stroke="rgba(168,200,220,0.20)" strokeWidth={1} />
            <circle cx={cx} cy={cy} r={4} fill={color}
              style={{ filter: `drop-shadow(0 0 3px ${color}cc)` }} />

            {/* Center score */}
            <text x={cx} y={cy + 20}
              textAnchor="middle" fill={color}
              fontSize="14" fontWeight="900"
              fontFamily="'Bangers', Impact, system-ui"
              letterSpacing="0.04em">
              {Math.round(score)}
            </text>
          </svg>
        </div>

        {/* Labels */}
        <div>
          <p className="font-display" style={{ fontSize: 22, color, letterSpacing: '0.06em', lineHeight: 1 }}>
            {LEVEL_TEXT[level]}
          </p>
          {peakHour != null && (
            <p className="mt-1.5" style={{
              fontFamily: "'Bangers', Impact, system-ui", fontSize: 11,
              color: '#3A5A78', letterSpacing: '0.10em',
            }}>
              PEAK ~{peakHour > 12 ? `${peakHour - 12}PM` : `${peakHour}AM`}
            </p>
          )}
          {confidence != null && (
            <p className="mt-1" style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3A5A78',
            }}>
              {Math.round(confidence * 100)}% conf.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
