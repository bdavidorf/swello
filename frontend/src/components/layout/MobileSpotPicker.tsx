import clsx from 'clsx'
import { useSpotStore } from '../../store/spotStore'
import type { SurfCondition } from '../../types/surf'

interface Props {
  conditions: SurfCondition[] | undefined
}

function ratingColor(r: number) {
  return r >= 7 ? '#00CFC0' : r >= 5 ? '#4AE080' : r >= 3 ? '#FF9A40' : '#6A90AC'
}

export function MobileSpotPicker({ conditions }: Props) {
  const { selectedSpotId, setSelectedSpot } = useSpotStore()

  if (!conditions || conditions.length === 0) return null

  return (
    <div className="md:hidden flex-shrink-0 overflow-x-auto border-b border-ocean-700/60" style={{ background: 'rgba(10,22,40,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div
        className="flex gap-2 px-4 py-2.5"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {conditions.map((c) => {
          const selected = c.spot_id === selectedSpotId
          const rating = c.wave_power?.surf_rating ?? 0

          return (
            <button
              key={c.spot_id}
              onClick={() => setSelectedSpot(c.spot_id)}
              style={{
                scrollSnapAlign: 'start',
                flexShrink: 0,
                ...(!selected ? { background: 'rgba(14,30,56,0.60)' } : {}),
              }}
              className={clsx(
                'flex flex-col items-center px-3 py-1.5 rounded-xl border transition-all text-center min-w-[64px]',
                selected
                  ? 'bg-wave-400/20 border-wave-400/60'
                  : 'border-ocean-700/50'
              )}
            >
              <span className={clsx(
                'text-xs font-semibold leading-tight',
                selected ? 'text-ocean-50' : 'text-ocean-300'
              )}>
                {c.spot_short_name}
              </span>
              {rating > 0 && (
                <span className="text-[11px] font-black mt-0.5" style={{ color: ratingColor(rating) }}>
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
