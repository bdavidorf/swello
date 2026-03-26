import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
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
  if (r >= 7) return '#4ADE80'  // green  — firing
  if (r >= 5) return '#A3E635'  // lime   — good
  if (r >= 3) return '#FACC15'  // yellow — fair
  return '#F87171'              // red    — flat
}

function createMarker(rating: number, selected: boolean) {
  const color = ratingColor(rating)
  const size  = selected ? 48 : 38
  const glow  = selected ? `0 0 16px ${color}99` : `0 0 5px ${color}55`

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${selected ? color : 'rgba(18,37,52,0.92)'};
      border:2px solid ${color};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-family:'Bangers',Impact,system-ui;
      font-size:${selected ? 16 : 13}px;
      letter-spacing:0.04em;
      color:${selected ? '#0D1C2A' : color};
      box-shadow:${glow},0 3px 12px rgba(0,0,0,0.45);
      cursor:pointer;
      backdrop-filter:blur(8px);
      transition:all .2s;
    ">${rating > 0 ? rating : '·'}</div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor:[0, -(size / 2 + 6)],
  })
}

function createPinMarker() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;
      background:rgba(120,184,216,0.20);
      border:2px solid #78B8D8;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 0 12px rgba(120,184,216,0.60),0 3px 12px rgba(0,0,0,0.45);
      cursor:crosshair;
    "></div>`,
    iconSize:   [36, 36],
    iconAnchor: [18, 36],
    popupAnchor:[0, -38],
  })
}

function MapClickHandler() {
  const { setPinLatLon, setMobileTab } = useSpotStore()
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      // Snap to 3 decimal places (~110m precision)
      const name = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`
      setPinLatLon({ lat: +lat.toFixed(5), lon: +lng.toFixed(5), name })
      setMobileTab('waves')
    },
  })
  return null
}

function MapController({ spotId }: { spotId: string }) {
  const map    = useMap()
  const coords = SPOT_COORDS[spotId]
  useEffect(() => {
    // Use ResizeObserver to call invalidateSize whenever the container gets real dimensions
    const container = map.getContainer()
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(container)
    map.invalidateSize()
    return () => ro.disconnect()
  }, [map])
  useEffect(() => {
    if (coords) map.panTo(coords, { animate: true, duration: 0.5 })
  }, [spotId, map, coords])
  return null
}

interface Props { conditions: SurfCondition[] | undefined }

export function SpotMap({ conditions }: Props) {
  const { selectedSpotId, setSelectedSpot, setMobileTab, pinLatLon, setPinLatLon } = useSpotStore()

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
    <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', height: '100%' }}>
      <MapContainer
        center={[33.97, -118.6]}
        zoom={11}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
        zoomControl={false}
        worldCopyJump={false}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          maxZoom={16}
          noWrap={true}
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          attribution=""
          maxZoom={16}
          noWrap={true}
        />
        <MapController spotId={selectedSpotId} />
        <MapClickHandler />

        {/* Custom dropped pin */}
        {pinLatLon && (
          <Marker
            position={[pinLatLon.lat, pinLatLon.lon]}
            icon={createPinMarker()}
          >
            <Popup className="surf-popup" closeButton={false} offset={[0, -4]}>
              <div style={{
                background: 'rgba(18,37,52,0.96)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(120,184,216,0.20)',
                borderRadius: 18,
                padding: '12px 16px',
                minWidth: 140,
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
              }}>
                <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#78B8D8', fontSize: 12, margin: '0 0 2px', letterSpacing: '0.10em' }}>DROPPED PIN</p>
                <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#D8EEF8', fontSize: 13, margin: '0 0 8px', letterSpacing: '0.06em' }}>{pinLatLon.name}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => { setMobileTab('waves') }}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #78B8D8, #5AAAC8)',
                      color: '#0D1C2A', border: 'none', borderRadius: 10,
                      padding: '6px 0',
                      fontFamily: "'Bangers', Impact, system-ui", fontSize: 10,
                      cursor: 'pointer', letterSpacing: '0.10em',
                    }}
                  >VIEW CONDITIONS</button>
                  <button
                    onClick={() => setPinLatLon(null)}
                    style={{
                      background: 'rgba(120,184,216,0.12)',
                      color: '#6AAED0', border: '1px solid rgba(120,184,216,0.20)',
                      borderRadius: 10, padding: '6px 10px',
                      fontFamily: "'Bangers', Impact, system-ui", fontSize: 10,
                      cursor: 'pointer', letterSpacing: '0.08em',
                    }}
                  >CLEAR</button>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {Object.entries(SPOT_COORDS).map(([spotId, coords]) => {
          const rating   = ratingMap[spotId] ?? 0
          const selected = spotId === selectedSpotId
          const name     = nameMap[spotId] ?? spotId
          const wave     = waveMap[spotId] ?? '--'
          const color    = ratingColor(rating)

          return (
            <Marker key={spotId} position={coords} icon={createMarker(rating, selected)}
              eventHandlers={{ click: () => { setSelectedSpot(spotId); setMobileTab('waves') } }}>
              <Popup className="surf-popup" closeButton={false} offset={[0, -4]}>
                <div style={{
                  background: 'rgba(18,37,52,0.96)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(168,200,220,0.12)',
                  borderRadius: 18,
                  padding: '12px 16px',
                  minWidth: 140,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
                }}>
                  <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#D8EEF8', fontSize: 14, margin: '0 0 4px', letterSpacing: '0.06em' }}>{name}</p>
                  <p style={{ fontFamily: "'Bangers', Impact, system-ui", color, fontSize: 20, margin: '0 0 2px', letterSpacing: '0.04em' }}>{wave}</p>
                  <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#6AAED0', fontSize: 10, margin: 0, letterSpacing: '0.10em' }}>
                    RATING {rating}/10
                  </p>
                  <button
                    onClick={() => { setSelectedSpot(spotId); setMobileTab('waves') }}
                    style={{
                      marginTop: 10, width: '100%',
                      background: color, color: '#0D1C2A',
                      border: 'none', borderRadius: 12,
                      padding: '7px 0',
                      fontFamily: "'Bangers', Impact, system-ui", fontWeight: 400,
                      fontSize: 11, cursor: 'pointer',
                      letterSpacing: '0.12em',
                      boxShadow: `0 2px 10px ${color}55`,
                    }}
                  >
                    VIEW CONDITIONS
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
        background: 'rgba(18,37,52,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(168,200,220,0.10)',
        borderRadius: 16, padding: '10px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
      }}>
        <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#6AAED0', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 6px' }}>RATING</p>
        {[['7–10', '#4ADE80', 'FIRING'], ['5–6', '#A3E635', 'GOOD'], ['3–4', '#FACC15', 'FAIR'], ['0–2', '#F87171', 'FLAT']].map(([range, color, label]) => (
          <div key={range} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}88` }} />
            <span style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#A0C0D8', fontSize: 10, letterSpacing: '0.04em' }}>{range}</span>
            <span style={{ fontFamily: "'Bangers', Impact, system-ui", color, fontSize: 9, letterSpacing: '0.08em' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
