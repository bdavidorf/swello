import { useState } from 'react'
import { useSpotStore } from '../../store/spotStore'
import { useQueryClient } from '@tanstack/react-query'
import type { SpotMeta, SurfCondition } from '../../types/surf'

type RatingEntry = { spot_id: string; rating: number | null; wave_height_str: string | null }

interface Props {
  spots: SpotMeta[] | undefined
  ratingsMap?: Map<string, RatingEntry>
}

function ratingColor(r: number) {
  if (r >= 7) return '#4ADE80'
  if (r >= 5) return '#A3E635'
  if (r >= 3) return '#FACC15'
  return '#F87171'
}

export function MobileSpotPicker({ spots, ratingsMap }: Props) {
  const { selectedSpotId, setSelectedSpot, pinLatLon, setPinLatLon } = useSpotStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  if (!spots || spots.length === 0) return null

  const q = search.toLowerCase()
  const filtered = q
    ? spots.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.short_name.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q)
      )
    : spots

  return (
    <div
      className="flex-shrink-0"
      style={{
        background: 'rgba(13,28,42,0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(168,200,220,0.07)',
      }}
    >
      {/* Search bar */}
      <div style={{ padding: '6px 12px 0' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search spots…"
          style={{
            width: '100%',
            background: 'rgba(18,37,52,0.80)',
            border: '1px solid rgba(120,184,216,0.15)',
            borderRadius: 12,
            padding: '5px 12px',
            fontSize: 12,
            color: '#A0C0D8',
            outline: 'none',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        />
      </div>

      {/* Spot tabs */}
      <div
        className="flex gap-2 px-3 py-2"
        style={{ overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
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
            }}
          >
            <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, lineHeight: 1.2, letterSpacing: '0.06em', color: '#78B8D8' }}>📍 PIN</span>
            <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 9, lineHeight: 1.2, color: '#3A5870', letterSpacing: '0.04em' }}
              onClick={(e) => { e.stopPropagation(); setPinLatLon(null) }}>✕ clear</span>
          </button>
        )}

        {filtered.map((s) => {
          const selected = s.id === selectedSpotId
          // Prefer full condition cache (selected spot), fall back to batch ratings
          const cached = qc.getQueryData<SurfCondition>(['condition', s.id])
          const rating = cached?.wave_power?.surf_rating ?? ratingsMap?.get(s.id)?.rating ?? null
          const rc = rating !== null ? ratingColor(Math.max(1, rating)) : null

          return (
            <button
              key={s.id}
              onClick={() => setSelectedSpot(s.id)}
              style={{
                scrollSnapAlign: 'start', flexShrink: 0,
                background: selected ? 'rgba(120,184,216,0.14)' : 'rgba(18,37,52,0.70)',
                border: `1px solid ${selected ? 'rgba(120,184,216,0.40)' : 'rgba(168,200,220,0.08)'}`,
                borderRadius: 16, padding: '6px 14px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                minWidth: 60, cursor: 'pointer', transition: 'all 0.18s',
              }}
            >
              <span style={{
                fontFamily: "'Bangers', Impact, system-ui",
                fontSize: 11, lineHeight: 1.2, letterSpacing: '0.06em',
                color: selected ? '#D8EEF8' : '#6AAED0',
              }}>
                {s.short_name}
              </span>
              <span style={{
                fontFamily: "'Bangers', Impact, system-ui",
                fontSize: 14, lineHeight: 1.2, letterSpacing: '0.04em',
                color: rc ?? '#3A5870',
              }}>
                {rating !== null ? Math.max(1, rating) : '·'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
