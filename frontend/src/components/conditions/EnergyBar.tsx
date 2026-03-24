interface Props { rating: number }

function ratingColor(r: number): string {
  if (r >= 8) return '#D4A853'  // Sandy Gold — firing
  if (r >= 6) return '#3D5A80'  // Muted Teal — good
  if (r >= 4) return '#E07A5F'  // Burnt Orange — fair
  return '#C05A40'              // Deeper orange — poor
}

const SEGMENTS = 10

export function EnergyBar({ rating }: Props) {
  const clamped = Math.max(0, Math.min(10, rating))
  const color   = ratingColor(clamped)
  const label   = clamped >= 8 ? 'FIRING' : clamped >= 6 ? 'GOOD' : clamped >= 4 ? 'FAIR' : 'WEAK'
  const filled  = Math.round(clamped)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {/* Segmented vertical bar */}
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 3 }}>
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const active = i < filled
          return (
            <div
              key={i}
              style={{
                width: 12, height: 7, borderRadius: 2,
                background: active ? color : 'rgba(48,44,40,0.80)',
                opacity: active ? (0.4 + (i / SEGMENTS) * 0.6) : 1,
                transition: 'all 0.4s ease',
                boxShadow: active && i === filled - 1 ? `0 0 8px ${color}99` : 'none',
              }}
            />
          )
        })}
      </div>
      <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 26, lineHeight: 1, color }}>
        {clamped}
      </span>
      <span style={{ fontFamily: "'Syne', system-ui", fontWeight: 800, fontSize: 7, color, opacity: 0.75, letterSpacing: '0.14em' }}>
        {label}
      </span>
    </div>
  )
}
