import clsx from 'clsx'
import { MapPin, Waves } from 'lucide-react'
import { useSpotStore } from '../../store/spotStore'
import type { SurfCondition } from '../../types/surf'
import { SkeletonRow } from '../shared/SkeletonCard'

interface Props {
  conditions: SurfCondition[] | undefined
  loading: boolean
}

/** Show 1 decimal for small waves, integer for bigger ones */
function fmtFace(lo: number, hi: number): string {
  const fmt = (n: number) => n < 4 ? n.toFixed(1) : n.toFixed(0)
  const loS = fmt(lo), hiS = fmt(hi)
  return loS === hiS ? `${loS}ft` : `${loS}–${hiS}ft`
}

const RATING_COLOR = (r: number) =>
  r >= 7 ? 'text-wave-400' :
  r >= 5 ? 'text-green-400' :
  r >= 3 ? 'text-yellow-400' : 'text-ocean-500'

const REGION_ORDER = ['Malibu', 'South Bay']

function groupByRegion(conditions: SurfCondition[]) {
  const grouped: Record<string, SurfCondition[]> = {}
  for (const c of conditions) {
    const spot = c.spot_id
    // We don't have region in SurfCondition directly, so we group by a pattern
    // The region is embedded in spot names above 'venice'
    const isMalibu = ['malibu', 'zuma', 'leo_carrillo', 'topanga', 'sunset_malibu', 'point_dume'].includes(spot)
    const region = isMalibu ? 'Malibu' : 'South Bay'
    if (!grouped[region]) grouped[region] = []
    grouped[region].push(c)
  }
  return grouped
}

export function SpotSidebar({ conditions, loading }: Props) {
  const { selectedSpotId, setSelectedSpot } = useSpotStore()

  const grouped = conditions ? groupByRegion(conditions) : {}

  return (
    <aside className="w-64 flex-shrink-0 border-r border-ocean-700/60 overflow-y-auto bg-ocean-900/50">
      <div className="p-3">
        <p className="stat-label px-2 py-3">Los Angeles Surf Spots</p>

        {loading && (
          <div className="space-y-1">
            {Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {REGION_ORDER.map((region) => {
          const spots = grouped[region] ?? []
          if (spots.length === 0 && !loading) return null
          return (
            <div key={region} className="mb-4">
              <p className="text-xs font-bold text-ocean-600 uppercase tracking-widest px-2 mb-1">
                {region}
              </p>
              {spots.map((c) => {
                const selected = c.spot_id === selectedSpotId
                const rating = c.wave_power?.surf_rating ?? 0
                return (
                  <button
                    key={c.spot_id}
                    onClick={() => setSelectedSpot(c.spot_id)}
                    className={clsx(
                      'w-full text-left rounded-xl px-3 py-2.5 mb-0.5 transition-all',
                      selected
                        ? 'bg-wave-400/10 border border-wave-400/30'
                        : 'hover:bg-ocean-800/60 border border-transparent'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin
                          size={11}
                          className={selected ? 'text-wave-400 flex-shrink-0' : 'text-ocean-600 flex-shrink-0'}
                        />
                        <span className={clsx(
                          'text-sm font-medium truncate',
                          selected ? 'text-ocean-50' : 'text-ocean-200'
                        )}>
                          {c.spot_short_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {(c.breaking?.face_height_max_ft ?? c.buoy.wvht_ft) != null && (
                          <span className="flex items-center gap-0.5 text-xs text-ocean-400">
                            <Waves size={9} />
                            {c.breaking
                              ? fmtFace(c.breaking.face_height_min_ft, c.breaking.face_height_max_ft)
                              : c.buoy.wvht_ft!.toFixed(1)
                            }
                          </span>
                        )}
                        {rating > 0 && (
                          <span className={clsx('text-xs font-bold', RATING_COLOR(rating))}>
                            {rating}
                          </span>
                        )}
                      </div>
                    </div>
                    {selected && c.wave_power && (
                      <p className="text-xs text-ocean-500 mt-0.5 pl-4 capitalize">
                        {c.wave_power.classification}
                        {c.buoy.dpd_s && ` · ${c.buoy.dpd_s.toFixed(0)}s`}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
