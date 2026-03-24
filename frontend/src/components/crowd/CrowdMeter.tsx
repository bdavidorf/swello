import type { CrowdLevel } from '../../types/surf'

// Crowd dial: left = crowded (red), right = empty (green)
// Map level → 0–10 scale (10 = empty/best)
const LEVEL_VALUE: Record<CrowdLevel, number> = {
  empty:     10,
  uncrowded: 8,
  moderate:  5,
  crowded:   2,
  packed:    0,
}

const LEVEL_LABEL: Record<CrowdLevel, string> = {
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

// Shared dial geometry (same math as EnergyBar)
const CX = 100, CY = 90, R = 70, STROKE = 14

function toRad(v: number) {
  return Math.PI * (1 - v / 10)
}

function pt(rad: number, radius = R) {
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) }
}

export function CrowdMeter({ score, level, confidence, peakHour }: Props) {
  const v          = LEVEL_VALUE[level]
  const needleRad  = toRad(v)
  const tip        = pt(needleRad, R - 6)
  const fe         = pt(needleRad)

  const trackD  = `M ${CX - R} ${CY} A ${R} ${R} 0 1 0 ${CX + R} ${CY}`
  const filledD = v > 0 ? `M ${CX - R} ${CY} A ${R} ${R} 0 0 0 ${fe.x} ${fe.y}` : null

  // Needle color follows gradient (red left, green right)
  const color = v >= 7 ? '#40C860' : v >= 4 ? '#E8C040' : '#E04040'

  return (
    <div className="card p-5">
      <p className="stat-label mb-1">CROWD</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width="200" height="118" viewBox="0 0 200 118">
          <defs>
            {/* Left = crowded (red), right = empty (green) */}
            <linearGradient id="crowdGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#E04040" />
              <stop offset="48%"  stopColor="#E8C040" />
              <stop offset="100%" stopColor="#40C860" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <path d={trackD} fill="none"
            stroke="rgba(26,48,72,0.90)" strokeWidth={STROKE} strokeLinecap="round" />

          {/* Filled arc */}
          {filledD && (
            <path d={filledD} fill="none"
              stroke="url(#crowdGrad)" strokeWidth={STROKE} strokeLinecap="round" />
          )}

          {/* Tick marks */}
          {[0, 2, 4, 6, 8, 10].map(n => {
            const rad = toRad(n)
            const o = pt(rad, R + STROKE / 2 + 4)
            const i = pt(rad, R - STROKE / 2 - 4)
            return (
              <line key={n} x1={o.x} y1={o.y} x2={i.x} y2={i.y}
                stroke="rgba(168,200,220,0.40)" strokeWidth="1.5" strokeLinecap="round" />
            )
          })}

          {/* End labels */}
          <text x={CX - R - 6} y={CY + 14} textAnchor="end"
            fill="rgba(224,64,64,0.70)" fontSize="8"
            fontFamily="'Bangers', Impact, system-ui" letterSpacing="0.10em">
            CROWDED
          </text>
          <text x={CX + R + 6} y={CY + 14} textAnchor="start"
            fill="rgba(64,200,96,0.70)" fontSize="8"
            fontFamily="'Bangers', Impact, system-ui" letterSpacing="0.10em">
            EMPTY
          </text>

          {/* Needle */}
          <line x1={CX} y1={CY} x2={tip.x} y2={tip.y}
            stroke="#EAF6FF" strokeWidth="2.5" strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 3px rgba(234,246,255,0.7))' }} />

          {/* Hub */}
          <circle cx={CX} cy={CY} r={7}
            fill="rgba(13,28,42,1)" stroke="rgba(168,200,220,0.20)" strokeWidth="1" />
          <circle cx={CX} cy={CY} r={3.5} fill={color} />

          {/* Level label */}
          <text x={CX} y={CY + 18} textAnchor="middle"
            fill={color} fontSize="16"
            fontFamily="'Bangers', Impact, system-ui" letterSpacing="0.08em">
            {LEVEL_LABEL[level]}
          </text>
          {peakHour != null && (
            <text x={CX} y={CY + 31} textAnchor="middle"
              fill={color} fontSize="9" opacity="0.75"
              fontFamily="'Bangers', Impact, system-ui" letterSpacing="0.14em">
              PEAK ~{peakHour > 12 ? `${peakHour - 12}PM` : `${peakHour}AM`}
            </text>
          )}
        </svg>

        {confidence != null && (
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3A5A78' }}>
            {Math.round(confidence * 100)}% conf.
          </p>
        )}
      </div>
    </div>
  )
}
