import clsx from 'clsx'
import { useSpotStore } from '../../store/spotStore'
import type { SurfCondition } from '../../types/surf'

interface Props { conditions: SurfCondition[] | undefined }

function ratingColor(r: number) {
  return r >= 7 ? '#88C8E8' : r >= 5 ? '#5AAAC8' : r >= 3 ? '#78B8D8' : '#6AAED0'
}

export function MobileSpotPicker({ conditions }: Props) {
  const { selectedSpotId, setSelectedSpot, pinLatLon, setPinLatLon } = useSpotStore()
  if (!conditions || conditions.length === 0) return null

  return (
    <div
      className="flex-shrink-0 overflow-x-auto"
      style={{
        background: 'rgba(13,28,42,0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(168,200,220,0.07)',
      }}
    >
      <div
        className="flex gap-2 px-4 py-2.5"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Dropped pin tab */}
        {pinLatLon && (
          <button
            onClick={() => setSelectedSpot('pin')}
            style={{
              scrollSnapAlign: 'start', flexShrink: 0,
              background: selectedSpotId === 'pin' ? 'rgba(120,184,216,0.18)' : 'rgba(18,37,52,0.70)',
              border: `1px solid ${selectedSpotId === 'pin' ? 'rgba(120,184,216,0.50)' : 'rgba(120,184,216,0.15)'}`,
              borderRadius: 16, padding: '6px 14px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              minWidth: 64, cursor: 'pointer', transition: 'all 0.18s',
              position: 'relative',
            }}
          >
            <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, lineHeight: 1.2, letterSpacing: '0.06em', color: '#78B8D8' }}>📍 PIN</span>
            <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 9, lineHeight: 1.2, color: '#3A5870', letterSpacing: '0.04em' }}
              onClick={(e) => { e.stopPropagation(); setPinLatLon(null) }}>✕ clear</span>
          </button>
        )}

        {conditions.map((c) => {
          const selected = c.spot_id === selectedSpotId
          const rawRating = c.wave_power?.surf_rating ?? 0
          const rating    = rawRating > 0 ? rawRating : (c.wave_power ? 1 : 0)
          const rc        = ratingColor(Math.max(1, rating))

          return (
            <button
              key={c.spot_id}
              onClick={() => setSelectedSpot(c.spot_id)}
              style={{
                scrollSnapAlign: 'start',
                flexShrink: 0,
                background: selected ? 'rgba(120,184,216,0.14)' : 'rgba(18,37,52,0.70)',
                border: `1px solid ${selected ? 'rgba(120,184,216,0.40)' : 'rgba(168,200,220,0.08)'}`,
                borderRadius: 16,
                padding: '6px 14px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                minWidth: 64, cursor: 'pointer', transition: 'all 0.18s',
              }}
            >
              <span style={{
                fontFamily: "'Bangers', Impact, system-ui", fontWeight: 400,
                fontSize: 11, lineHeight: 1.2, letterSpacing: '0.06em',
                color: selected ? '#D8EEF8' : '#6AAED0',
              }}>
                {c.spot_short_name}
              </span>
              <span style={{
                fontFamily: "'Bangers', Impact, system-ui",
                fontSize: 14, lineHeight: 1.2,
                color: c.wave_power ? rc : '#3A5870',
                letterSpacing: '0.04em',
              }}>
                {c.wave_power ? Math.max(1, rating) : '--'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
