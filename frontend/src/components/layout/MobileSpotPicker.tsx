import clsx from 'clsx'
import { useSpotStore } from '../../store/spotStore'
import type { SurfCondition } from '../../types/surf'

interface Props { conditions: SurfCondition[] | undefined }

function ratingColor(r: number) {
  return r >= 7 ? '#D4A853' : r >= 5 ? '#3D5A80' : r >= 3 ? '#E07A5F' : '#4A4440'
}

export function MobileSpotPicker({ conditions }: Props) {
  const { selectedSpotId, setSelectedSpot } = useSpotStore()
  if (!conditions || conditions.length === 0) return null

  return (
    <div
      className="flex-shrink-0 overflow-x-auto"
      style={{
        background: 'rgba(20,18,16,0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(240,226,200,0.07)',
      }}
    >
      <div
        className="flex gap-2 px-4 py-2.5"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {conditions.map((c) => {
          const selected = c.spot_id === selectedSpotId
          const rating   = c.wave_power?.surf_rating ?? 0
          const rc       = ratingColor(rating)

          return (
            <button
              key={c.spot_id}
              onClick={() => setSelectedSpot(c.spot_id)}
              style={{
                scrollSnapAlign: 'start',
                flexShrink: 0,
                background: selected ? 'rgba(224,122,95,0.14)' : 'rgba(30,28,26,0.70)',
                border: `1px solid ${selected ? 'rgba(224,122,95,0.40)' : 'rgba(240,226,200,0.08)'}`,
                borderRadius: 16,
                padding: '6px 14px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                minWidth: 64, cursor: 'pointer', transition: 'all 0.18s',
              }}
            >
              <span style={{
                fontFamily: "'Syne', system-ui", fontWeight: 700,
                fontSize: 10, lineHeight: 1.2, letterSpacing: '0.04em',
                color: selected ? '#F0E2C8' : '#8A7868',
              }}>
                {c.spot_short_name}
              </span>
              {rating > 0 && (
                <span style={{
                  fontFamily: "'Bangers', Impact, system-ui",
                  fontSize: 14, lineHeight: 1.2, color: rc,
                  letterSpacing: '0.04em',
                }}>
                  {rating}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
