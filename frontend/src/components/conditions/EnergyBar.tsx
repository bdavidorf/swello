interface Props { rating: number }

const CX = 130, CY = 110, R = 96, STROKE = 16

// Angle in radians: rating 0 → left (π), rating 10 → right (0), arc through top
function toRad(r: number) { return Math.PI * (1 - r / 10) }

// Point on arc in SVG coordinates (y-axis flipped vs math)
function pt(rad: number, radius = R) {
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) }
}

export function EnergyBar({ rating }: Props) {
  const v = Math.max(0, Math.min(10, Math.round(rating)))

  const needleRad = toRad(v)
  const tip       = pt(needleRad, R - 8)
  const fe        = pt(needleRad)

  // Full semicircle: left → right, going CLOCKWISE through top (sweep=1)
  const trackD  = `M ${CX - R} ${CY} A ${R} ${R} 0 1 1 ${CX + R} ${CY}`

  // Filled arc: left → needle, clockwise (sweep=1), always ≤180° so large-arc=0
  const filledD = v > 0
    ? `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${fe.x} ${fe.y}`
    : null

  const color = v >= 7 ? '#40C860' : v >= 4 ? '#E8C040' : '#E04040'
  const label = v >= 8 ? 'FIRING' : v >= 6 ? 'GOOD' : v >= 4 ? 'FAIR' : 'FLAT'

  // Width: CX+R+pad = 130+96+14 = 240; Height: CY+textspace = 110+40 = 150
  return (
    <svg width="260" height="148" viewBox="0 0 260 148" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#E04040" />
          <stop offset="48%"  stopColor="#E8C040" />
          <stop offset="100%" stopColor="#40C860" />
        </linearGradient>
      </defs>

      {/* Background track */}
      <path d={trackD} fill="none"
        stroke="rgba(26,48,72,0.90)" strokeWidth={STROKE} strokeLinecap="round" />

      {/* Gradient filled arc */}
      {filledD && (
        <path d={filledD} fill="none"
          stroke="url(#gaugeGrad)" strokeWidth={STROKE} strokeLinecap="round" />
      )}

      {/* Tick marks at 0 2 4 6 8 10 */}
      {[0, 2, 4, 6, 8, 10].map(n => {
        const rad = toRad(n)
        const o = pt(rad, R + STROKE / 2 + 5)
        const i = pt(rad, R - STROKE / 2 - 5)
        return (
          <line key={n} x1={o.x} y1={o.y} x2={i.x} y2={i.y}
            stroke="rgba(168,200,220,0.40)" strokeWidth="1.5" strokeLinecap="round" />
        )
      })}

      {/* E / F end labels */}
      <text x={CX - R - 8} y={CY + 6} textAnchor="end"
        fill="rgba(224,64,64,0.75)" fontSize="11"
        fontFamily="'Bangers', Impact, system-ui" letterSpacing="0.12em">E</text>
      <text x={CX + R + 8} y={CY + 6} textAnchor="start"
        fill="rgba(64,200,96,0.75)" fontSize="11"
        fontFamily="'Bangers', Impact, system-ui" letterSpacing="0.12em">F</text>

      {/* Needle */}
      <line x1={CX} y1={CY} x2={tip.x} y2={tip.y}
        stroke="#EAF6FF" strokeWidth="3" strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 4px rgba(234,246,255,0.8))' }} />

      {/* Hub */}
      <circle cx={CX} cy={CY} r={9}
        fill="rgba(13,28,42,1)" stroke="rgba(168,200,220,0.25)" strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r={4.5} fill={color} />

      {/* Score — Inter for clear numerals */}
      <text x={CX} y={CY + 22} textAnchor="middle"
        fill={color} fontSize="20" fontWeight="800"
        fontFamily="'Inter', system-ui" letterSpacing="-0.02em">
        {v}/10
      </text>
      <text x={CX} y={CY + 36} textAnchor="middle"
        fill={color} fontSize="10" opacity="0.80"
        fontFamily="'Bangers', Impact, system-ui" letterSpacing="0.18em">
        {label}
      </text>
    </svg>
  )
}
