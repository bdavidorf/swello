import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSpotStore } from '../../store/spotStore'
import type { SurfCondition } from '../../types/surf'

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

function ratingColor(r: number) {
  return r >= 7 ? '#1AFFD0' : r >= 5 ? '#4AE090' : r >= 3 ? '#FF9A40' : '#6A8AA0'
}

function createMarker(rating: number, selected: boolean) {
  const color = ratingColor(rating)
  const size  = selected ? 46 : 36
  const glow  = selected ? `0 0 14px ${color}88` : `0 0 4px ${color}44`

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${selected ? color : 'rgba(15,30,46,0.92)'};
      border:2px solid ${color};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-family:'Archivo Black',Impact,system-ui;
      font-size:${selected ? 15 : 12}px;
      color:${selected ? '#0C1420' : color};
      box-shadow:${glow},0 2px 10px rgba(0,0,0,0.40);
      cursor:pointer;
      backdrop-filter:blur(8px);
      transition:all .2s;
    ">${rating > 0 ? rating : '·'}</div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor:[0, -(size / 2 + 6)],
  })
}

function MapController({ spotId }: { spotId: string }) {
  const map    = useMap()
  const coords = SPOT_COORDS[spotId]
  useEffect(() => {
    if (coords) map.panTo(coords, { animate: true, duration: 0.5 })
  }, [spotId, map, coords])
  return null
}

interface Props { conditions: SurfCondition[] | undefined }

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
          url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
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
              eventHandlers={{ click: () => { setSelectedSpot(spotId); setMobileTab('waves') } }}
            >
              <Popup className="surf-popup" closeButton={false} offset={[0, -4]}>
                <div style={{
                  background: 'rgba(15,30,46,0.96)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(237,232,220,0.12)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  minWidth: 130,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.50)',
                }}>
                  <p style={{ color: '#EDE8DC', fontWeight: 700, fontSize: 13, margin: '0 0 4px' }}>{name}</p>
                  <p style={{
                    fontFamily: "'Archivo Black', Impact, system-ui",
                    color,
                    fontSize: 16,
                    margin: '0 0 2px',
                  }}>{wave}</p>
                  <p style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#3A5870',
                    fontSize: 10,
                    margin: 0,
                    letterSpacing: '0.06em',
                  }}>RATING {rating}/10</p>
                  <button
                    onClick={() => { setSelectedSpot(spotId); setMobileTab('waves') }}
                    style={{
                      marginTop: 8, width: '100%',
                      background: `linear-gradient(135deg, ${color}cc, ${color})`,
                      color: '#0C1420', border: 'none', borderRadius: 8,
                      padding: '6px 0',
                      fontFamily: "'Archivo Black', Impact, system-ui",
                      fontSize: 11, cursor: 'pointer',
                      boxShadow: `0 2px 8px ${color}44`,
                    }}
                  >
                    VIEW →
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
        background: 'rgba(15,30,46,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(237,232,220,0.10)',
        borderRadius: 10, padding: '8px 12px',
        fontFamily: "'JetBrains Mono', monospace",
        boxShadow: '0 4px 20px rgba(0,0,0,0.40)',
      }}>
        <p style={{ color: '#3A5870', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 6px' }}>RATING</p>
        {[['7–10', '#1AFFD0'], ['5–6', '#4AE090'], ['3–4', '#FF9A40'], ['0–2', '#6A8AA0']].map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ color: '#9AAABB', fontSize: 10 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
