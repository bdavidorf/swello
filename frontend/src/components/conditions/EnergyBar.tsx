interface Props { rating: number }

// Gauge geometry
const CX = 100, CY = 90, R = 70, STROKE = 14

// Rating → radian angle. 0 = left (π), 10 = right (0), arc goes through top
function toRad(r: number) {
  return Math.PI * (1 - r / 10)
}

// Point on the arc in SVG coords (y-axis flipped relative to math)
function pt(rad: number, radius = R) {
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) }
}

export function EnergyBar({ rating }: Props) {
  const v = Math.max(0, Math.min(10, Math.round(rating)))

  const needleRad = toRad(v)
  const tip       = pt(needleRad, R - 6)
  const fe        = pt(needleRad)          // filled arc endpoint

  // Full semicircle: left → right through top
  // sweep=0 = counter-clockwise in SVG (y-down) → goes upward ✓
  // large-arc=1 disambiguates the 180° case
  const trackD = `M ${CX - R} ${CY} A ${R} ${R} 0 1 0 ${CX + R} ${CY}`

  // Filled arc: always left → needle, counter-clockwise, always ≤ 180° → large-arc=0
  const filledD = v > 0
    ? `M ${CX - R} ${CY} A ${R} ${R} 0 0 0 ${fe.x} ${fe.y}`
    : null

  const color = v >= 7 ? '#40C860' : v >= 4 ? '#E8C040' : '#E04040'
  const label = v >= 8 ? 'FIRING' : v >= 6 ? 'GOOD' : v >= 4 ? 'FAIR' : 'FLAT'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="200" height="118" viewBox="0 0 200 118">
        <defs>
          {/* Red (left/E) → yellow (middle) → green (right/F) */}
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#E04040" />
            <stop offset="48%"  stopColor="#E8C040" />
            <stop offset="100%" stopColor="#40C860" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <path d={trackD} fill="none"
          stroke="rgba(26,48,72,0.90)" strokeWidth={STROKE} strokeLinecap="round" />

        {/* Colored filled arc */}
        {filledD && (
          <path d={filledD} fill="none"
            stroke="url(#gaugeGrad)" strokeWidth={STROKE} strokeLinecap="round" />
        )}

        {/* Tick marks at 0 2 4 6 8 10 */}
        {[0, 2, 4, 6, 8, 10].map(n => {
          const rad = toRad(n)
          const o = pt(rad, R + STROKE / 2 + 4)
          const i = pt(rad, R - STROKE / 2 - 4)
          return (
            <line key={n} x1={o.x} y1={o.y} x2={i.x} y2={i.y}
              stroke="rgba(168,200,220,0.40)" strokeWidth="1.5" strokeLinecap="round" />
          )
        })}

        {/* Needle */}
        <line x1={CX} y1={CY} x2={tip.x} y2={tip.y}
          stroke="#EAF6FF" strokeWidth="2.5" strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 3px rgba(234,246,255,0.7))' }} />

        {/* Hub */}
        <circle cx={CX} cy={CY} r={7}
          fill="rgba(13,28,42,1)" stroke="rgba(168,200,220,0.20)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={3.5} fill={color} />

        {/* Score — Inter for clear numeral distinction */}
        <text x={CX} y={CY + 18} textAnchor="middle"
          fill={color} fontSize="19" fontWeight="800"
          fontFamily="'Inter', system-ui" letterSpacing="-0.02em">
          {v}/10
        </text>
        <text x={CX} y={CY + 31} textAnchor="middle"
          fill={color} fontSize="9" opacity="0.80"
          fontFamily="'Bangers', Impact, system-ui" letterSpacing="0.18em">
          {label}
        </text>
      </svg>
    </div>
  )
}
