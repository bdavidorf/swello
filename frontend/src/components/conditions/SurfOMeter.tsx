/**
 * Surf-O-Meter — car fuel/speedometer gauge style.
 * Arc sweeps 230° clockwise from lower-left (0, red) to lower-right (10, green).
 */

interface Props {
  rating: number
}

// Layout constants
const CX = 75       // center x
const CY = 76       // center y (positioned low so endpoints land near viewBox bottom)
const R  = 62       // arc radius
const TW = 11       // track stroke width

// Arc start/end angles (standard math: 0°=right, 90°=up, 180°=left)
const START = 205   // lower-left  (rating 0  = "E")
const END   = 335   // lower-right (rating 10 = "F")
const SWEEP = 230   // clockwise degrees from START to END

/** Point on circle at angleDeg */
function pt(deg: number, r = R): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)]
}

/** SVG clockwise arc from startDeg to endDeg */
function arcCW(startDeg: number, endDeg: number, r = R, large = 0): string {
  const [x1, y1] = pt(startDeg, r)
  const [x2, y2] = pt(endDeg, r)
  return (
    `M ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
    `A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
  )
}

// Zone boundary angles (clockwise from START)
const R3  = START - (3  / 10) * SWEEP  // rating 3  → amber starts
const R7  = START - (7  / 10) * SWEEP  // rating 7  → green starts

export function SurfOMeter({ rating }: Props) {
  const clamped    = Math.max(0, Math.min(10, rating))
  const needleDeg  = START - (clamped / 10) * SWEEP
  const activeSpan = (clamped / 10) * SWEEP
  const activeLarge = activeSpan > 180 ? 1 : 0

  // Needle geometry
  const [tipX, tipY]   = pt(needleDeg, R - 8)    // tip near arc
  const [tailX, tailY] = pt(needleDeg, -16)       // short tail past pivot

  // Color based on rating
  const color =
    rating >= 8 ? '#00d4c8' :
    rating >= 6 ? '#22c55e' :
    rating >= 4 ? '#f59e0b' :
    '#ef4444'

  const label =
    rating >= 8 ? 'Excellent' :
    rating >= 6 ? 'Good' :
    rating >= 4 ? 'Fair' : 'Poor'

  // End-label positions (just outside arc at the two endpoints)
  const [elx, ely] = pt(START, R + 14)
  const [erx, ery] = pt(END,   R + 14)

  return (
    <div className="flex flex-col items-center gap-0">
      <p className="stat-label mb-1 self-start">Surf-O-Meter</p>

      <svg viewBox="0 0 150 92" width="162" height="99" style={{ overflow: 'visible' }}>

        {/* ── Gauge face background circle ── */}
        <circle cx={CX} cy={CY} r={R + TW / 2 + 4} fill="#060f1a" />

        {/* ── Background track ── */}
        <path
          d={arcCW(START, END, R, 1)}
          fill="none"
          stroke="#0d2035"
          strokeWidth={TW}
          strokeLinecap="round"
        />

        {/* ── Dim zone tints (always on) ── */}
        <path d={arcCW(START, R3,  R, 0)} fill="none" stroke="#ef444432" strokeWidth={TW} />
        <path d={arcCW(R3,   R7,  R, 0)} fill="none" stroke="#f59e0b28" strokeWidth={TW} />
        <path d={arcCW(R7,   END, R, 0)} fill="none" stroke="#22c55e28" strokeWidth={TW} />

        {/* ── Active arc (filled up to rating) ── */}
        {clamped > 0 && (
          <path
            d={arcCW(START, needleDeg, R, activeLarge)}
            fill="none"
            stroke={color}
            strokeWidth={TW}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${color}99)` }}
          />
        )}

        {/* ── Tick marks every 2 rating points ── */}
        {[0, 2, 4, 6, 8, 10].map(v => {
          const deg  = START - (v / 10) * SWEEP
          const [ox, oy] = pt(deg, R + TW / 2 + 1)
          const [ix, iy] = pt(deg, R - TW / 2 - 1)
          const isMajor = v % 5 === 0
          return (
            <line
              key={v}
              x1={ox.toFixed(2)} y1={oy.toFixed(2)}
              x2={ix.toFixed(2)} y2={iy.toFixed(2)}
              stroke={isMajor ? '#2a5070' : '#162a3d'}
              strokeWidth={isMajor ? 2 : 1.2}
              strokeLinecap="round"
            />
          )
        })}

        {/* ── E / F end labels ── */}
        <text
          x={elx.toFixed(2)} y={ely.toFixed(2)}
          textAnchor="middle" dominantBaseline="middle"
          fill="#ef4444" fontSize="9" fontWeight="700"
          fontFamily="system-ui, sans-serif" opacity="0.8"
        >
          0
        </text>
        <text
          x={erx.toFixed(2)} y={ery.toFixed(2)}
          textAnchor="middle" dominantBaseline="middle"
          fill="#22c55e" fontSize="9" fontWeight="700"
          fontFamily="system-ui, sans-serif" opacity="0.8"
        >
          10
        </text>

        {/* ── Needle tail ── */}
        <line
          x1={CX} y1={CY}
          x2={tailX.toFixed(2)} y2={tailY.toFixed(2)}
          stroke={color} strokeWidth={2} strokeLinecap="round" opacity="0.5"
        />

        {/* ── Needle ── */}
        <line
          x1={CX} y1={CY}
          x2={tipX.toFixed(2)} y2={tipY.toFixed(2)}
          stroke={color} strokeWidth={3} strokeLinecap="round"
        />

        {/* ── Pivot cap ── */}
        <circle cx={CX} cy={CY} r={6}   fill="#060f1a" />
        <circle cx={CX} cy={CY} r={3.5} fill={color} />


      </svg>

      <p className="text-2xl font-black -mt-2 tracking-tight" style={{ color }}>{label}</p>
    </div>
  )
}
