interface Props { rating: number }

const CX = 100, CY = 92, R = 68, STROKE = 14

// Convert a 0–10 rating to an angle (π at 0, 0 at 10, left→right through top)
function ratingToRad(r: number) {
  return Math.PI * (1 - r / 10)
}

// Point on the arc at a given angle (SVG y-axis flipped)
function arcPoint(rad: number, radius: number) {
  return {
    x: CX + radius * Math.cos(rad),
    y: CY - radius * Math.sin(rad),
  }
}

export function EnergyBar({ rating }: Props) {
  const clamped = Math.max(0, Math.min(10, rating))
  const needleRad = ratingToRad(clamped)
  const needleTip = arcPoint(needleRad, R - 6)

  // Track: full semicircle left → right through top
  const trackPath = `M ${CX - R} ${CY} A ${R} ${R} 0 1 0 ${CX + R} ${CY}`

  // Filled arc: left point → needle position (counterclockwise in SVG = sweep 0)
  const filledEnd = arcPoint(needleRad, R)
  const largeArc  = needleRad < Math.PI / 2 ? 1 : 0
  const filledPath = clamped > 0
    ? `M ${CX - R} ${CY} A ${R} ${R} 0 ${largeArc} 0 ${filledEnd.x} ${filledEnd.y}`
    : null

  const label = clamped >= 8 ? 'FIRING' : clamped >= 6 ? 'GOOD' : clamped >= 4 ? 'FAIR' : 'WEAK'

  // Needle color mirrors gauge gradient position
  const needleColor = clamped >= 7 ? '#50C878' : clamped >= 4 ? '#E8C040' : '#E05050'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="200" height="108" viewBox="0 0 200 108" overflow="visible">
        <defs>
          {/* Red → yellow → green, left to right */}
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#E04040" />
            <stop offset="45%"  stopColor="#E8C040" />
            <stop offset="100%" stopColor="#40C060" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <path d={trackPath} fill="none"
          stroke="rgba(26,48,72,0.90)" strokeWidth={STROKE} strokeLinecap="round" />

        {/* Gradient filled arc */}
        {filledPath && (
          <path d={filledPath} fill="none"
            stroke="url(#gaugeGrad)" strokeWidth={STROKE} strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.15))' }} />
        )}

        {/* Tick marks at 0, 2, 4, 6, 8, 10 */}
        {[0, 2, 4, 6, 8, 10].map(v => {
          const rad  = ratingToRad(v)
          const outer = arcPoint(rad, R + STROKE / 2 + 3)
          const inner = arcPoint(rad, R - STROKE / 2 - 3)
          return (
            <line key={v}
              x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
              stroke="rgba(168,200,220,0.30)" strokeWidth="1.5" strokeLinecap="round" />
          )
        })}

        {/* Needle */}
        <line
          x1={CX} y1={CY}
          x2={needleTip.x} y2={needleTip.y}
          stroke="#EAF6FF" strokeWidth="2.5" strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 3px rgba(234,246,255,0.60))' }}
        />

        {/* Hub */}
        <circle cx={CX} cy={CY} r={7}
          fill="rgba(18,37,52,0.98)" stroke="rgba(168,200,220,0.20)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={3.5} fill={needleColor}
          style={{ filter: `drop-shadow(0 0 4px ${needleColor})` }} />

        {/* Rating number + label */}
        <text x={CX} y={CY + 20}
          textAnchor="middle"
          fill={needleColor}
          fontSize="20"
          fontFamily="'Bangers', Impact, system-ui"
          letterSpacing="0.04em">
          {clamped}/10
        </text>
        <text x={CX} y={CY + 34}
          textAnchor="middle"
          fill={needleColor}
          fontSize="10"
          fontFamily="'Bangers', Impact, system-ui"
          letterSpacing="0.16em"
          opacity="0.85">
          {label}
        </text>
      </svg>
    </div>
  )
}
