import clsx from 'clsx'
import { Waves, Wind } from 'lucide-react'
import { useSpotStore } from '../../store/spotStore'
import type { SurfCondition } from '../../types/surf'

interface Props {
  conditions: SurfCondition[] | undefined
  loading: boolean
}

function fmtFace(lo: number, hi: number): string {
  const fmt = (n: number) => n < 4 ? n.toFixed(1) : n.toFixed(0)
  const loS = fmt(lo), hiS = fmt(hi)
  return loS === hiS ? `${loS}ft` : `${loS}–${hiS}ft`
}

function ratingColor(r: number) {
  return r >= 7 ? '#00d4c8' : r >= 5 ? '#22c55e' : r >= 3 ? '#f59e0b' : '#6b7280'
}

function ratingLabel(r: number) {
  return r >= 8 ? 'Excellent' : r >= 6 ? 'Good' : r >= 4 ? 'Fair' : 'Poor'
}

const REGION_ORDER = ['Malibu', 'South Bay']

function groupByRegion(conditions: SurfCondition[]) {
  const grouped: Record<string, SurfCondition[]> = {}
  for (const c of conditions) {
    const isMalibu = ['malibu', 'zuma', 'leo_carrillo', 'topanga', 'sunset_malibu', 'point_dume'].includes(c.spot_id)
    const region = isMalibu ? 'Malibu' : 'South Bay'
    if (!grouped[region]) grouped[region] = []
    grouped[region].push(c)
  }
  return grouped
}

export function MobileSpotList({ conditions, loading }: Props) {
  const { selectedSpotId, setSelectedSpot, setMobileTab } = useSpotStore()

  const grouped = conditions ? groupByRegion(conditions) : {}

  function selectSpot(id: string) {
    setSelectedSpot(id)
    setMobileTab('waves')
  }

  return (
    <div className="p-4 space-y-5">
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-16 bg-ocean-800/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {REGION_ORDER.map((region) => {
        const spots = grouped[region] ?? []
        if (spots.length === 0 && !loading) return null
        return (
          <div key={region}>
            <p className="text-xs font-bold text-ocean-500 uppercase tracking-widest mb-2 px-1">
              {region}
            </p>
            <div className="space-y-2">
              {spots.map((c) => {
                const selected = c.spot_id === selectedSpotId
                const rating = c.wave_power?.surf_rating ?? 0
                const waveStr = c.breaking
                  ? fmtFace(c.breaking.face_height_min_ft, c.breaking.face_height_max_ft)
                  : c.buoy.wvht_ft != null ? `${c.buoy.wvht_ft.toFixed(1)}ft` : '--'

                return (
                  <button
                    key={c.spot_id}
                    onClick={() => selectSpot(c.spot_id)}
                    className={clsx(
                      'w-full text-left rounded-2xl px-4 py-3.5 border transition-all',
                      selected
                        ? 'bg-wave-400/10 border-wave-400/30'
                        : 'bg-ocean-800/30 border-ocean-700/40 active:bg-ocean-700/40'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={clsx(
                          'font-semibold text-base',
                          selected ? 'text-ocean-50' : 'text-ocean-100'
                        )}>
                          {c.spot_name}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-sm text-ocean-400">
                            <Waves size={12} />
                            {waveStr}
                          </span>
                          {c.buoy.dpd_s && (
                            <span className="text-sm text-ocean-500">{c.buoy.dpd_s.toFixed(0)}s</span>
                          )}
                          {c.wind && (
                            <span className="flex items-center gap-1 text-sm text-ocean-500">
                              <Wind size={12} />
                              {c.wind.speed_mph.toFixed(0)} mph
                            </span>
                          )}
                        </div>
                      </div>
                      {rating > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="text-2xl font-black" style={{ color: ratingColor(rating) }}>
                            {rating}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: ratingColor(rating) }}>
                            {ratingLabel(rating)}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
