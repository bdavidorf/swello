import { useState, useCallback, useRef, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { useSpotStore } from '../../store/spotStore'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import type { SpotMeta, SurfCondition } from '../../types/surf'
import { fetchFriendsList } from '../../api/client'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

// Deep Ocean dark style
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',            stylers: [{ color: '#0D1C2A' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#0D1C2A' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#6AAED0' }] },
  { featureType: 'water', elementType: 'geometry',         stylers: [{ color: '#071420' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3A6A8A' }] },
  { featureType: 'landscape',           stylers: [{ color: '#122534' }] },
  { featureType: 'landscape.natural',   stylers: [{ color: '#1A3048' }] },
  { featureType: 'poi',                 stylers: [{ visibility: 'off' }] },
  { featureType: 'road',                stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',             stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2E5275' }, { weight: 0.8 }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#5A8AAA' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#2E5275' }, { weight: 1 }] },
]

function ratingColor(r: number) {
  if (r >= 7) return '#4ADE80'
  if (r >= 5) return '#A3E635'
  if (r >= 3) return '#FACC15'
  return '#F87171'
}

function spotIcon(rating: number | null, selected: boolean): google.maps.Icon {
  const hasRating = rating !== null
  const color = hasRating ? ratingColor(Math.max(rating!, 1)) : '#3A6A8A'
  const size  = selected ? 48 : 36
  const bg    = selected ? color : 'rgba(18,37,52,0.95)'
  const text  = selected ? '#0D1C2A' : (hasRating ? color : '#3A6A8A')
  const sw    = selected ? 3 : 2

  const label = hasRating ? String(Math.max(rating!, 1)) : '·'
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${bg}" stroke="${color}" stroke-width="${sw}"/>
      <text x="${size/2}" y="${size/2+5}" text-anchor="middle" fill="${text}"
        font-family="Impact,system-ui" font-size="${selected ? 17 : 13}"
      >${label}</text>
    </svg>`
  )
  return {
    url: `data:image/svg+xml;charset=utf-8,${svg}`,
    scaledSize: new window.google.maps.Size(size, size),
    anchor:     new window.google.maps.Point(size / 2, size / 2),
  }
}

function pinIcon(): google.maps.Icon {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 25 15 25S30 26.2 30 15C30 6.7 23.3 0 15 0z"
        fill="rgba(120,184,216,0.90)" stroke="#78B8D8" stroke-width="1.5"/>
      <circle cx="15" cy="15" r="5.5" fill="rgba(13,28,42,0.95)" stroke="#A0D0F0" stroke-width="1.5"/>
    </svg>`
  )
  return {
    url: `data:image/svg+xml;charset=utf-8,${svg}`,
    scaledSize: new window.google.maps.Size(30, 40),
    anchor:     new window.google.maps.Point(15, 40),
  }
}

function friendIcon(initial: string): google.maps.Icon {
  const colors = ['#78B8D8', '#5AAAC8', '#4ADE80', '#FBBF24', '#F87171', '#C084FC']
  const color = colors[initial.charCodeAt(0) % colors.length]
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="46">
      <path d="M19 0C10.7 0 4 6.7 4 15c0 11.2 15 25 15 25S30 26.2 30 15C30 6.7 23.3 0 19 0z"
        fill="${color}" stroke="rgba(13,28,42,0.9)" stroke-width="1.5"/>
      <circle cx="19" cy="15" r="8" fill="rgba(13,28,42,0.92)"/>
      <text x="19" y="20" text-anchor="middle" fill="${color}"
        font-family="Impact,system-ui" font-size="12">${initial.toUpperCase()}</text>
    </svg>`
  )
  return {
    url: `data:image/svg+xml;charset=utf-8,${svg}`,
    scaledSize: new window.google.maps.Size(38, 46),
    anchor: new window.google.maps.Point(19, 46),
  }
}

const popupStyle: React.CSSProperties = {
  background: 'rgba(13,28,42,0.98)',
  border: '1px solid rgba(120,184,216,0.15)',
  borderRadius: 16,
  padding: '12px 16px',
  minWidth: 140,
  fontFamily: 'Inter, system-ui, sans-serif',
}

// Stable constants — defined outside component so references never change between renders.
// @react-google-maps/api watches `center` and `options` with useEffect and re-applies them
// whenever the reference changes, which causes the map to snap/glitch on every re-render.
const DEFAULT_CENTER = { lat: 38.5, lng: -96.0 }
const DEFAULT_ZOOM = 4
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }
const MAP_OPTIONS: google.maps.MapOptions = {
  styles: MAP_STYLES,
  disableDefaultUI: true,
  zoomControl: true,
  zoomControlOptions: { position: 7 /* RIGHT_BOTTOM */ },
  clickableIcons: false,
  gestureHandling: 'greedy',
}

type RatingEntry = { spot_id: string; rating: number | null; wave_height_str: string | null }

interface Props {
  spots: SpotMeta[] | undefined
  ratingsMap?: Map<string, RatingEntry>
}

export function SpotMap({ spots, ratingsMap }: Props) {
  const { selectedSpotId, setSelectedSpot, setMobileTab, pinLatLon, setPinLatLon, aiPanelOpen } = useSpotStore()
  const qc = useQueryClient()
  const [openPopup, setOpenPopup] = useState<string | null>(selectedSpotId ?? null)
  const [hoverSpot, setHoverSpot] = useState<string | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const centeredRef = useRef(false)

  // Center once on initial map load — never again (lets user pan freely)
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    if (centeredRef.current) return
    centeredRef.current = true
    setTimeout(() => {
      if (pinLatLon) {
        map.panTo({ lat: pinLatLon.lat, lng: pinLatLon.lon })
        map.setZoom(12)
        return
      }
      const spot = spots?.find(s => s.id === selectedSpotId)
      if (spot) {
        map.panTo({ lat: spot.lat, lng: spot.lon })
        map.setZoom(12)
      }
    }, 80)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — intentionally no deps, run once

  // Friends surfing sessions — poll every 60s
  const friendsQ = useQuery({
    queryKey: ['friends'],
    queryFn: fetchFriendsList,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
  const friendsOnMap = (friendsQ.data ?? []).filter(f => f.status === 'accepted' && f.surfing)

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  })

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat()
    const lng = e.latLng?.lng()
    if (lat == null || lng == null) return
    setOpenPopup(null)
    const name = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`
    setPinLatLon({ lat: +lat.toFixed(5), lon: +lng.toFixed(5), name })
    setMobileTab('waves')
  }, [setPinLatLon, setMobileTab])

  if (!isLoaded) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1C2A' }}>
        <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#6AAED0', letterSpacing: '0.10em', fontSize: 14 }}>
          LOADING MAP…
        </p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%' }}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        onLoad={handleMapLoad}
        options={MAP_OPTIONS}
        onClick={handleMapClick}
      >
        {/* Spot markers */}
        {(spots ?? []).map((spot) => {
          const selected = spot.id === selectedSpotId
          const cached = qc.getQueryData<SurfCondition>(['condition', spot.id])
          const batchRating = ratingsMap?.get(spot.id)
          const rating = cached?.wave_power?.surf_rating ?? batchRating?.rating ?? null
          const wave = (() => {
            if (cached) {
              const lo = cached.breaking?.face_height_min_ft
              const hi = cached.breaking?.face_height_max_ft
              const fmt = (n: number) => n < 4 ? n.toFixed(1) : n.toFixed(0)
              if (lo != null && hi != null) return lo === hi ? `${fmt(lo)}ft` : `${fmt(lo)}–${fmt(hi)}ft`
              if (cached.buoy.wvht_ft != null) return `${cached.buoy.wvht_ft.toFixed(1)}ft`
            }
            return batchRating?.wave_height_str ?? null
          })()
          const color = rating !== null ? ratingColor(Math.max(rating, 1)) : '#3A6A8A'

          return (
            <Marker
              key={spot.id}
              position={{ lat: spot.lat, lng: spot.lon }}
              icon={spotIcon(rating, selected)}
              zIndex={selected ? 10 : 1}
              onClick={() => {
                setHoverSpot(null)
                setOpenPopup(spot.id)
                setSelectedSpot(spot.id)
              }}
              onMouseOver={() => { if (openPopup !== spot.id) setHoverSpot(spot.id) }}
              onMouseOut={() => setHoverSpot(null)}
            >
              {/* Hover tooltip — spot name only */}
              {hoverSpot === spot.id && openPopup !== spot.id && (
                <InfoWindow
                  position={{ lat: spot.lat, lng: spot.lon }}
                  options={{ disableAutoPan: true, pixelOffset: new window.google.maps.Size(0, -20) }}
                >
                  <div style={{ background: 'rgba(13,28,42,0.95)', borderRadius: 8, padding: '4px 8px', border: '1px solid rgba(120,184,216,0.20)' }}>
                    <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#D8EEF8', fontSize: 12, margin: 0, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{spot.name}</p>
                  </div>
                </InfoWindow>
              )}
              {openPopup === spot.id && (
                <InfoWindow
                  position={{ lat: spot.lat, lng: spot.lon }}
                  onCloseClick={() => setOpenPopup(null)}
                  options={{ disableAutoPan: false, pixelOffset: new window.google.maps.Size(0, -8) }}
                >
                  <div style={popupStyle}>
                    <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#D8EEF8', fontSize: 13, margin: '0 0 1px', letterSpacing: '0.06em' }}>{spot.name}</p>
                    <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#4A7A9A', fontSize: 10, margin: '0 0 4px', letterSpacing: '0.08em' }}>{spot.region}</p>
                    {wave && <p style={{ fontFamily: "'Bangers', Impact, system-ui", color, fontSize: 22, margin: '0 0 2px', letterSpacing: '0.04em' }}>{wave}</p>}
                    {rating !== null && <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#6AAED0', fontSize: 10, margin: '0 0 10px', letterSpacing: '0.10em' }}>RATING {Math.max(rating, 1)}/10</p>}
                    {!wave && <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#6AAED0', fontSize: 10, margin: '0 0 10px', letterSpacing: '0.08em' }}>{spot.break_type} · {spot.difficulty}</p>}
                    <button
                      onClick={() => { setSelectedSpot(spot.id); setMobileTab('waves'); setOpenPopup(null) }}
                      style={{
                        width: '100%', background: color, color: '#0D1C2A',
                        border: 'none', borderRadius: 10, padding: '7px 0',
                        fontFamily: "'Bangers', Impact, system-ui", fontSize: 11,
                        cursor: 'pointer', letterSpacing: '0.12em',
                        boxShadow: `0 2px 10px ${color}55`,
                      }}
                    >VIEW CONDITIONS</button>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          )
        })}

        {/* Dropped pin */}
        {pinLatLon && (
          <Marker
            position={{ lat: pinLatLon.lat, lng: pinLatLon.lon }}
            icon={pinIcon()}
            zIndex={20}
            onClick={() => setOpenPopup('pin')}
          >
            {openPopup === 'pin' && (
              <InfoWindow
                position={{ lat: pinLatLon.lat, lng: pinLatLon.lon }}
                onCloseClick={() => setOpenPopup(null)}
                options={{ disableAutoPan: false, pixelOffset: new window.google.maps.Size(0, -8) }}
              >
                <div style={popupStyle}>
                  <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#78B8D8', fontSize: 11, margin: '0 0 2px', letterSpacing: '0.10em' }}>DROPPED PIN</p>
                  <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#D8EEF8', fontSize: 13, margin: '0 0 10px', letterSpacing: '0.06em' }}>{pinLatLon.name}</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => { setMobileTab('waves'); setOpenPopup(null) }}
                      style={{
                        flex: 1, background: 'linear-gradient(135deg,#78B8D8,#5AAAC8)',
                        color: '#0D1C2A', border: 'none', borderRadius: 10,
                        padding: '6px 0', fontFamily: "'Bangers', Impact, system-ui",
                        fontSize: 10, cursor: 'pointer', letterSpacing: '0.10em',
                      }}
                    >VIEW CONDITIONS</button>
                    <button
                      onClick={() => { setPinLatLon(null); setOpenPopup(null) }}
                      style={{
                        background: 'rgba(120,184,216,0.12)', color: '#6AAED0',
                        border: '1px solid rgba(120,184,216,0.20)', borderRadius: 10,
                        padding: '6px 10px', fontFamily: "'Bangers', Impact, system-ui",
                        fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em',
                      }}
                    >CLEAR</button>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}

        {/* Friends surfing now */}
        {friendsOnMap.map(f => (
          <Marker
            key={`friend-${f.username}`}
            position={{ lat: f.surfing!.lat, lng: f.surfing!.lon }}
            icon={friendIcon(f.username[0])}
            zIndex={15}
            onClick={() => setOpenPopup(`friend-${f.username}`)}
          >
            {openPopup === `friend-${f.username}` && (
              <InfoWindow
                position={{ lat: f.surfing!.lat, lng: f.surfing!.lon }}
                onCloseClick={() => setOpenPopup(null)}
                options={{ disableAutoPan: false, pixelOffset: new window.google.maps.Size(0, -10) }}
              >
                <div style={popupStyle}>
                  <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#4ADE80', fontSize: 10, margin: '0 0 2px', letterSpacing: '0.12em' }}>● SURFING NOW</p>
                  <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#D8EEF8', fontSize: 14, margin: '0 0 4px', letterSpacing: '0.06em' }}>{f.username}</p>
                  <p style={{ fontFamily: "'Inter', system-ui", color: '#78B8D8', fontSize: 11, margin: '0 0 0', letterSpacing: '0.04em' }}>{f.surfing!.spot_name}</p>
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}
      </GoogleMap>

      {/* Legend — hidden when Ask Swello chat is open */}
      {!aiPanelOpen && <div className="map-legend" style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
        background: 'rgba(13,28,42,0.92)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(168,200,220,0.10)',
        borderRadius: 16, padding: '10px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
      }}>
        <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#6AAED0', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 6px' }}>RATING</p>
        {([['7–10','#4ADE80','FIRING'],['5–6','#A3E635','GOOD'],['3–4','#FACC15','FAIR'],['0–2','#F87171','FLAT']] as const).map(([range, color, label]) => (
          <div key={range} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}88` }} />
            <span style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#A0C0D8', fontSize: 10, letterSpacing: '0.04em' }}>{range}</span>
            <span style={{ fontFamily: "'Bangers', Impact, system-ui", color, fontSize: 9, letterSpacing: '0.08em' }}>{label}</span>
          </div>
        ))}
        <p style={{ fontFamily: "'Bangers', Impact, system-ui", color: '#3A6A8A', fontSize: 8, letterSpacing: '0.08em', margin: '6px 0 0' }}>· = not yet loaded</p>
      </div>}
    </div>
  )
}
