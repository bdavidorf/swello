/**
 * Surf-O-Meter — sun-bleached glass gauge.
 * Translucent face with soft coastal color zones.
 */

interface Props {
  rating: number
}

const CX = 75
const CY = 76
const R  = 62
const TW = 11

const START = 205
const END   = 335
const SWEEP = 230

function pt(deg: number, r = R): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)]
}

function arcCW(startDeg: number, endDeg: number, r = R, large = 0): string {
  const [x1, y1] = pt(startDeg, r)
  const [x2, y2] = pt(endDeg, r)
  return (
    `M ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
    `A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
  )
}

const R3 = START - (3  / 10) * SWEEP
const R7 = START - (7  / 10) * SWEEP

export function SurfOMeter({ rating }: Props) {
  const clamped    = Math.max(0, Math.min(10, rating))
  const needleDeg  = START - (clamped / 10) * SWEEP
  const activeSpan = (clamped / 10) * SWEEP
  const activeLarge = activeSpan > 180 ? 1 : 0

  const [tipX, tipY]   = pt(needleDeg, R - 8)
  const [tailX, tailY] = pt(needleDeg, -16)

  // Muted coastal palette
  const color =
    rating >= 8 ? '#4E7A7C' :
    rating >= 6 ? '#5E9268' :
    rating >= 4 ? '#C4904A' :
    '#B07860'

  const label =
    rating >= 8 ? 'Excellent' :
    rating >= 6 ? 'Good' :
    rating >= 4 ? 'Fair' : 'Poor'

  const [elx, ely] = pt(START, R + 14)
  const [erx, ery] = pt(END,   R + 14)

  return (
    <div className="flex flex-col items-center gap-0">
      <p className="stat-label mb-1 self-start">Surf-O-Meter</p>

      <svg viewBox="0 0 150 92" width="162" height="99" style={{ overflow: 'visible' }}>
        <defs>
          {/* Gauge face gradient — frosted glass with teal ambient glow */}
          <radialGradient id="faceGrad" cx="50%" cy="55%" r="55%">
            <stop offset="0%"   stopColor="rgba(245,240,234,0.92)" />
            <stop offset="65%"  stopColor="rgba(237,231,223,0.82)" />
            <stop offset="100%" stopColor="rgba(225,218,208,0.65)" />
          </radialGradient>

          {/* Soft ambient glow behind active arc */}
          <radialGradient id="glowGrad" cx="50%" cy="60%" r="60%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.20" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>

          {/* Glass face filter — soft inner shadow */}
          <filter id="glassFace" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(168,218,220,0.25)" />
          </filter>
        </defs>

        {/* ── Ambient glow halo ── */}
        <circle cx={CX} cy={CY} r={R + TW / 2 + 6} fill="url(#glowGrad)" />

        {/* ── Gauge face — frosted glass circle ── */}
        <circle
          cx={CX} cy={CY} r={R + TW / 2 + 4}
          fill="url(#faceGrad)"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={1.5}
          filter="url(#glassFace)"
        />

        {/* ── Background track ── */}
        <path
          d={arcCW(START, END, R, 1)}
          fill="none"
          stroke="rgba(192,213,204,0.45)"
          strokeWidth={TW}
          strokeLinecap="round"
        />

        {/* ── Zone tints — always visible, soft ── */}
        <path d={arcCW(START, R3,  R, 0)} fill="none" stroke="rgba(176,120,96,0.20)"  strokeWidth={TW} />
        <path d={arcCW(R3,   R7,  R, 0)} fill="none" stroke="rgba(196,144,74,0.18)"  strokeWidth={TW} />
        <path d={arcCW(R7,   END, R, 0)} fill="none" stroke="rgba(94,146,104,0.18)"  strokeWidth={TW} />

        {/* ── Active arc with glow ── */}
        {clamped > 0 && (
          <path
            d={arcCW(START, needleDeg, R, activeLarge)}
            fill="none"
            stroke={color}
            strokeWidth={TW}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}bb)` }}
          />
        )}

        {/* ── Tick marks ── */}
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
              stroke={isMajor ? 'rgba(78,130,128,0.55)' : 'rgba(168,218,220,0.40)'}
              strokeWidth={isMajor ? 2 : 1.2}
              strokeLinecap="round"
            />
          )
        })}

        {/* ── End labels ── */}
        <text
          x={elx.toFixed(2)} y={ely.toFixed(2)}
          textAnchor="middle" dominantBaseline="middle"
          fill="#B07860" fontSize="9" fontWeight="700"
          fontFamily="system-ui, sans-serif" opacity="0.85"
        >0</text>
        <text
          x={erx.toFixed(2)} y={ery.toFixed(2)}
          textAnchor="middle" dominantBaseline="middle"
          fill="#5E9268" fontSize="9" fontWeight="700"
          fontFamily="system-ui, sans-serif" opacity="0.9"
        >10</text>

        {/* ── Needle tail ── */}
        <line
          x1={CX} y1={CY}
          x2={tailX.toFixed(2)} y2={tailY.toFixed(2)}
          stroke={color} strokeWidth={2} strokeLinecap="round" opacity="0.45"
        />

        {/* ── Needle — thin with soft glow ── */}
        <line
          x1={CX} y1={CY}
          x2={tipX.toFixed(2)} y2={tipY.toFixed(2)}
          stroke={color} strokeWidth={2.5} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${color}99)` }}
        />

        {/* ── Pivot ── */}
        <circle cx={CX} cy={CY} r={6}   fill="rgba(255,255,255,0.92)" stroke="rgba(192,213,204,0.6)" strokeWidth={1} />
        <circle cx={CX} cy={CY} r={3.5} fill={color} style={{ filter: `drop-shadow(0 0 3px ${color}cc)` }} />
      </svg>

      <p className="text-2xl font-black -mt-2 tracking-tight" style={{ color }}>{label}</p>
    </div>
  )
}
