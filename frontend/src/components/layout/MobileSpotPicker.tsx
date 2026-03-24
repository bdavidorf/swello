import clsx from 'clsx'
import { useSpotStore } from '../../store/spotStore'
import type { SurfCondition } from '../../types/surf'

interface Props {
  conditions: SurfCondition[] | undefined
}

function ratingColor(r: number) {
  return r >= 7 ? '#1AFFD0' : r >= 5 ? '#4AE090' : r >= 3 ? '#FF9A40' : '#6A8AA0'
}

export function MobileSpotPicker({ conditions }: Props) {
  const { selectedSpotId, setSelectedSpot } = useSpotStore()

  if (!conditions || conditions.length === 0) return null

  return (
    <div
      className="flex-shrink-0 overflow-x-auto border-b"
      style={{
        background: 'rgba(9,16,26,0.90)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(26,48,80,0.60)',
      }}
    >
      <div
        className="flex gap-2 px-4 py-2.5"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {conditions.map((c) => {
          const selected = c.spot_id === selectedSpotId
          const rating   = c.wave_power?.surf_rating ?? 0

          return (
            <button
              key={c.spot_id}
              onClick={() => setSelectedSpot(c.spot_id)}
              style={{
                scrollSnapAlign: 'start',
                flexShrink: 0,
                background: selected
                  ? 'rgba(26,255,208,0.10)'
                  : 'rgba(21,40,64,0.60)',
              }}
              className={clsx(
                'flex flex-col items-center px-3 py-1.5 rounded-lg border transition-all text-center min-w-[64px]',
                selected
                  ? 'border-wave-400/50'
                  : 'border-ocean-700/60 hover:border-ocean-600'
              )}
            >
              <span className={clsx(
                'text-xs font-semibold leading-tight',
                selected ? 'text-ocean-50' : 'text-ocean-400'
              )}>
                {c.spot_short_name}
              </span>
              {rating > 0 && (
                <span
                  className="text-[11px] font-black mt-0.5"
                  style={{
                    fontFamily: "'Archivo Black', Impact, system-ui",
                    color: ratingColor(rating),
                  }}
                >
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
