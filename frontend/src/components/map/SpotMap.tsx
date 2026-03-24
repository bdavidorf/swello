import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSpotStore } from '../../store/spotStore'
import type { SurfCondition, SpotMeta } from '../../types/surf'

// ── Hardcoded LA spot positions (from la_spots.json) ─────────────────────────
const SPOT_COORDS: Record<string, [number, number]> = {
  leo_carrillo:   [34.0453, -118.9365],
  zuma:           [34.0157, -118.8226],
  point_dume:     [34.0007, -118.8067],
  malibu:         [34.0356, -118.6786],
  sunset_malibu:  [34.0401, -118.6942],
  topanga:        [34.0414, -118.5979],
  venice:         [33.9850, -118.4730],
  manhattan_pier: [33.8847, -118.4134],
  hermosa:        [33.8625, -118.3995],
  redondo:        [33.8436, -118.3932],
  el_porto:       [33.9019, -118.4243],
}

// ── Custom SVG marker ─────────────────────────────────────────────────────────
function ratingColor(r: number) {
  return r >= 7 ? '#00CFC0' : r >= 5 ? '#4AE080' : r >= 3 ? '#FF9A40' : '#6A90AC'
}

function createMarker(rating: number, selected: boolean) {
  const color = ratingColor(rating)
  const size  = selected ? 46 : 36
  const glow  = selected ? `0 0 14px ${color}88` : `0 0 4px ${color}44`

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${selected ? color : 'rgba(14,30,56,0.92)'};
      border:2px solid ${color};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-weight:900;font-size:${selected ? 15 : 12}px;
      color:${selected ? '#0A1628' : color};
      font-family:Inter,system-ui,sans-serif;
      box-shadow:${glow},0 2px 8px rgba(0,0,0,0.30);
      cursor:pointer;
      backdrop-filter:blur(6px);
      transition:all .2s;
    ">${rating > 0 ? rating : '·'}</div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor:[0, -(size / 2 + 6)],
  })
}

// ── Auto-pan to selected spot ─────────────────────────────────────────────────
function MapController({ spotId }: { spotId: string }) {
  const map   = useMap()
  const coords = SPOT_COORDS[spotId]
  useEffect(() => {
    if (coords) map.panTo(coords, { animate: true, duration: 0.5 })
  }, [spotId, map, coords])
  return null
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  conditions: SurfCondition[] | undefined
}

export function SpotMap({ conditions }: Props) {
  const { selectedSpotId, setSelectedSpot, setMobileTab } = useSpotStore()

  const ratingMap: Record<string, number> = {}
  const nameMap:   Record<string, string>  = {}
  const waveMap:   Record<string, string>  = {}

  for (const c of conditions ?? []) {
    ratingMap[c.spot_id] = c.wave_power?.surf_rating ?? 0
    nameMap[c.spot_id]   = c.spot_short_name
    const lo = c.breaking?.face_height_min_ft
    const hi = c.breaking?.face_height_max_ft
    if (lo != null && hi != null) {
      const fmt = (n: number) => n < 4 ? n.toFixed(1) : n.toFixed(0)
      waveMap[c.spot_id] = lo === hi ? `${fmt(lo)}ft` : `${fmt(lo)}–${fmt(hi)}ft`
    } else if (c.buoy.wvht_ft != null) {
      waveMap[c.spot_id] = `${c.buoy.wvht_ft.toFixed(1)}ft`
    }
  }

  return (
    <div className="flex-1 relative" style={{ minHeight: 0 }}>
      <MapContainer
        center={[33.97, -118.6]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        worldCopyJump={false}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
          noWrap={true}
        />

        <MapController spotId={selectedSpotId} />

        {Object.entries(SPOT_COORDS).map(([spotId, coords]) => {
          const rating   = ratingMap[spotId] ?? 0
          const selected = spotId === selectedSpotId
          const name     = nameMap[spotId] ?? spotId
          const wave     = waveMap[spotId] ?? '--'
          const color    = ratingColor(rating)

          return (
            <Marker
              key={spotId}
              position={coords}
              icon={createMarker(rating, selected)}
              eventHandlers={{
                click: () => {
                  setSelectedSpot(spotId)
                  setMobileTab('waves')
                },
              }}
            >
              <Popup
                className="surf-popup"
                closeButton={false}
                offset={[0, -4]}
              >
                <div style={{
                  background: 'rgba(14,30,56,0.95)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  border: '1px solid rgba(0,207,192,0.18)',
                  borderRadius: 16,
                  padding: '10px 14px',
                  minWidth: 130,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                }}>
                  <p style={{ color: '#E0EEF8', fontWeight: 700, fontSize: 13, margin: '0 0 4px' }}>{name}</p>
                  <p style={{ color, fontWeight: 900, fontSize: 15, margin: '0 0 2px' }}>{wave}</p>
                  <p style={{ color: '#4A7090', fontSize: 11, margin: 0 }}>Rating {rating}/10</p>
                  <button
                    onClick={() => { setSelectedSpot(spotId); setMobileTab('waves') }}
                    style={{
                      marginTop: 8, width: '100%',
                      background: `linear-gradient(135deg, ${color}cc, ${color})`,
                      color: '#F5EEE6', border: 'none', borderRadius: 10,
                      padding: '6px 0', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      boxShadow: `0 2px 8px ${color}44`,
                    }}
                  >
                    View Conditions →
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
        background: 'rgba(14,30,56,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,207,192,0.15)',
        borderRadius: 14, padding: '8px 12px',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxShadow: '0 4px 16px rgba(0,0,0,0.30)',
      }}>
        <p style={{ color: '#4A7090', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>Rating</p>
        {[['7–10', '#00CFC0'], ['5–6', '#4AE080'], ['3–4', '#FF9A40'], ['0–2', '#6A90AC']].map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span style={{ color: '#A8C4D8', fontSize: 11 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
