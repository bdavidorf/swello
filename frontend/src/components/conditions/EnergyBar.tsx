interface Props { rating: number }

function ratingColor(r: number): string {
  if (r >= 8) return '#88C8E8'  // Sky blue — firing
  if (r >= 6) return '#5AAAC8'  // Ocean blue — good
  if (r >= 4) return '#78B8D8'  // Powder blue — fair
  return '#4A7090'              // Muted blue — poor
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
                width: 18, height: 10, borderRadius: 3,
                background: active ? color : 'rgba(26,48,72,0.80)',
                opacity: active ? (0.4 + (i / SEGMENTS) * 0.6) : 1,
                transition: 'all 0.4s ease',
                boxShadow: active && i === filled - 1 ? `0 0 10px ${color}bb` : 'none',
              }}
            />
          )
        })}
      </div>
      <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 36, lineHeight: 1, color, textShadow: `0 0 12px ${color}66` }}>
        {clamped}
      </span>
      <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color, letterSpacing: '0.14em' }}>
        {label}
      </span>
    </div>
  )
}
