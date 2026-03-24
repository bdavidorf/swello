interface Props {
  rating: number   // 0–10
}

function ratingColor(r: number): string {
  if (r >= 8) return '#1AFFD0'   // Electric Seafoam — excellent
  if (r >= 6) return '#4AE090'   // green — good
  if (r >= 4) return '#FF9A40'   // amber — fair
  return '#FF6B2B'                // Safety Orange — poor
}

function ratingLabel(r: number): string {
  if (r >= 8) return 'EXCELLENT'
  if (r >= 6) return 'GOOD'
  if (r >= 4) return 'FAIR'
  return 'POOR'
}

const SEGMENTS = 10

export function EnergyBar({ rating }: Props) {
  const clamped = Math.max(0, Math.min(10, rating))
  const color   = ratingColor(clamped)
  const label   = ratingLabel(clamped)
  const filled  = Math.round(clamped)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {/* Segmented vertical bar */}
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 3 }}>
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const active = i < filled
          // Color intensity: lower segments dimmer
          const opacity = active ? (0.5 + (i / SEGMENTS) * 0.5) : 1
          return (
            <div
              key={i}
              style={{
                width: 14,
                height: 7,
                borderRadius: 2,
                background: active
                  ? color
                  : 'rgba(26,48,80,0.70)',
                opacity,
                transition: 'background 0.4s ease, opacity 0.4s ease',
                boxShadow: active && i === filled - 1
                  ? `0 0 8px ${color}88`
                  : 'none',
              }}
            />
          )
        })}
      </div>

      {/* Rating number */}
      <span style={{
        fontFamily: "'Archivo Black', Impact, system-ui",
        fontSize: 24,
        lineHeight: 1,
        color,
      }}>
        {clamped}
      </span>

      {/* Label */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 7,
        letterSpacing: '0.12em',
        color,
        opacity: 0.85,
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
    </div>
  )
}
