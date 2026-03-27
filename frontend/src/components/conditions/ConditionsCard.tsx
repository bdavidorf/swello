import { motion } from 'framer-motion'
import { Clock, Sunrise, Sunset, ArrowUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { SurfCondition } from '../../types/surf'
import { CompassRose } from '../shared/CompassRose'
import { CrowdBadge, WindBadge } from '../shared/Badge'
import { EnergyBar } from './EnergyBar'
import { CrowdReportButton } from '../crowd/CrowdReportButton'
import { AISpotAnalysis } from '../ai/AISpotAnalysis'

interface Props { condition: SurfCondition }

function ratingAccent(r: number) {
  return r >= 8 ? '#88C8E8' : r >= 6 ? '#5AAAC8' : r >= 4 ? '#78B8D8' : '#6AAED0'
}
function windAccent(q?: string) {
  if (q === 'offshore' || q === 'cross-offshore') return '#5AAAC8'
  if (q === 'cross') return '#88C8E8'
  return '#78B8D8'
}

// ── Retro Sun SVG ─────────────────────────────────────────────────────────
function RetroSun({ color }: { color: string }) {
  const rays = 16
  return (
    <svg
      viewBox="0 0 200 200"
      style={{
        position: 'absolute',
        right: -10,
        bottom: -10,
        width: 180,
        height: 180,
        pointerEvents: 'none',
        opacity: 0.14,
      }}
    >
      {/* Rays */}
      {Array.from({ length: rays }, (_, i) => {
        const angle = (i / rays) * 2 * Math.PI
        const x1 = 100 + 68 * Math.cos(angle)
        const y1 = 100 + 68 * Math.sin(angle)
        const x2 = 100 + 92 * Math.cos(angle)
        const y2 = 100 + 92 * Math.sin(angle)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="3" strokeLinecap="round" />
      })}
      {/* Sun disc */}
      <circle cx="100" cy="100" r="62" fill={color} />
      <circle cx="100" cy="100" r="52" fill="rgba(0,0,0,0.12)" />
    </svg>
  )
}

function powerLabel(kw: number): string {
  if (kw < 2)   return 'TINY'
  if (kw < 6)   return 'WEAK'
  if (kw < 15)  return 'MODERATE'
  if (kw < 35)  return 'SOLID'
  if (kw < 70)  return 'POWERFUL'
  if (kw < 140) return 'HEAVY'
  return 'MAXED'
}

function powerColor(kw: number): string {
  if (kw < 2)   return '#6AAED0'
  if (kw < 6)   return '#78B8D8'
  if (kw < 15)  return '#5AAAC8'
  if (kw < 35)  return '#88C8E8'
  if (kw < 70)  return '#A0D0F0'
  return '#C8E8FF'
}

export function ConditionsCard({ condition }: Props) {
  const { buoy, wave_power, wind, crowd, breaking, sun, next_tide, swells } = condition
  const updatedAt = new Date(condition.updated_at)

  const rating = wave_power?.surf_rating ?? 0
  const accent = ratingAccent(rating)
  const wColor = windAccent(wind?.quality)

  const fmtFt = (n: number) => n < 4 ? n.toFixed(1) : n.toFixed(0)
  const showFace = breaking && breaking.face_height_max_ft > 0
  const heroNum = showFace
    ? (() => {
        const lo = fmtFt(breaking!.face_height_min_ft)
        const hi = fmtFt(breaking!.face_height_max_ft)
        return lo === hi ? lo : `${lo}–${hi}`
      })()
    : buoy.wvht_ft != null ? buoy.wvht_ft.toFixed(1) : '--'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="card-glow overflow-hidden"
    >
      {/* ── HERO: Spot name + massive wave height ── */}
      <div
        style={{
          position: 'relative',
          padding: '20px 22px 16px',
          overflow: 'hidden',
          borderBottom: '1px solid rgba(168,200,220,0.08)',
        }}
      >
        {/* Top row: name + actions */}
        <div className="flex items-start justify-between relative" style={{ zIndex: 2 }}>
          <div>
            <h2 className="font-display text-ocean-50" style={{ fontSize: 32, lineHeight: 1, letterSpacing: '0.06em' }}>
              {condition.spot_name.toUpperCase()}
            </h2>
            {breaking && (
              <p className="mt-1" style={{
                fontFamily: "'Bangers', Impact, system-ui", fontWeight: 400,
                fontSize: 11, letterSpacing: '0.16em', color: '#6AAED0',
                textTransform: 'uppercase',
              }}>
                {breaking.swell_type_short} · {breaking.buoy_period_s.toFixed(0)}s period
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CrowdReportButton condition={condition} />
            <div className="flex items-center gap-1" style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#6AAED0',
            }}>
              <Clock size={9} />
              {buoy.data_age_minutes != null
                ? `${Math.round(buoy.data_age_minutes)}m`
                : formatDistanceToNow(updatedAt, { addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Wave height + Surfometer side by side */}
        <div className="flex items-center justify-between mt-2 relative" style={{ zIndex: 2 }}>
          <div>
            <div className="flex items-end gap-2 leading-none">
              <span className="wave-height-display"
                style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', lineHeight: 0.85, color: '#EAF6FF' }}>
                {heroNum}
              </span>
              <span className="font-display mb-1.5" style={{ fontSize: 30, color: '#7AAED0', letterSpacing: '0.06em' }}>
                FT
              </span>
            </div>
            {breaking && (
              <p className="mt-1" style={{
                fontFamily: "'Bangers', Impact, system-ui", fontSize: 14,
                color: '#7AAAC8', letterSpacing: '0.10em',
              }}>
                {breaking.face_height_label} · {Math.round(breaking.direction_pct * 100)}% reaching shore
              </p>
            )}
          </div>
          {wave_power && (
            <div className="energy-gauge-wrap">
              <EnergyBar rating={wave_power.surf_rating} />
            </div>
          )}
        </div>
      </div>

      {/* ── BENTO GRID ── */}
      <div className="bento-grid">

        {/* Period */}
        <BentoTile label="PERIOD" accent={buoy.dpd_s != null && buoy.dpd_s >= 12 ? '#88C8E8' : undefined}>
          <span style={{ fontFamily: "'Inter', system-ui", fontWeight: 800, fontSize: 'clamp(32px, 9vw, 58px)', color: '#D8EEF8', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {buoy.dpd_s != null ? buoy.dpd_s.toFixed(0) : '--'}
          </span>
          <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 14, color: '#6AAED0', letterSpacing: '0.10em' }}>
            SECONDS
          </span>
        </BentoTile>

        {/* Wind — taller, spans 2 rows on desktop, has compass */}
        <motion.div
          className="bento-tile bento-wind-tile"
          style={{
            padding: '14px 12px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <p className="stat-label">WIND</p>
          {wind && <CompassRose deg={wind.direction_deg} size={52} color={wColor} />}
          <span style={{ fontFamily: "'Inter', system-ui", fontWeight: 800, fontSize: 'clamp(28px, 7.5vw, 48px)', color: wColor, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {wind ? `${wind.speed_mph.toFixed(0)}` : '--'}
          </span>
          <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 14, color: '#6AAED0', letterSpacing: '0.10em' }}>
            MPH {wind?.direction_label ?? ''}
          </span>
          {wind && (
            <div style={{
              background: `${wColor}22`,
              border: `1px solid ${wColor}44`,
              borderRadius: 20,
              padding: '3px 10px',
              fontFamily: "'Bangers', Impact, system-ui",
              fontWeight: 400,
              fontSize: 13,
              color: wColor,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              {wind.quality_label}
            </div>
          )}
        </motion.div>

        {/* Water temp */}
        <BentoTile label="WATER">
          <span style={{ fontFamily: "'Inter', system-ui", fontWeight: 800, fontSize: 'clamp(32px, 9vw, 58px)', color: '#5AAAC8', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {buoy.wtmp_f != null ? `${buoy.wtmp_f.toFixed(0)}°` : '--'}
          </span>
          <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 14, color: '#6AAED0', letterSpacing: '0.10em' }}>
            FAHRENHEIT
          </span>
          {condition.air_temp_f != null && (
            <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color: '#4A7A9A', letterSpacing: '0.08em' }}>
              AIR {condition.air_temp_f.toFixed(0)}°F
            </span>
          )}
        </BentoTile>

        {/* Swell dir / breakdown */}
        <BentoTile label="SWELL">
          {swells && swells.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              {swells.map((s, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{
                    fontFamily: "'Bangers', Impact, system-ui",
                    fontSize: 9, letterSpacing: '0.14em',
                    color: i === 0 ? '#88C8E8' : i === 1 ? '#5AAAC8' : i === 2 ? '#78B8D8' : '#6AAED0',
                    textTransform: 'uppercase',
                  }}>
                    {s.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <ArrowUp size={10} style={{
                      color: i === 0 ? '#88C8E8' : i === 1 ? '#5AAAC8' : i === 2 ? '#78B8D8' : '#6AAED0',
                      transform: `rotate(${s.direction_deg}deg)`,
                      flexShrink: 0,
                      alignSelf: 'center',
                    }} />
                    <span style={{
                      fontFamily: "'Bangers', Impact, system-ui",
                      fontSize: 20, color: '#D8EEF8', lineHeight: 1, letterSpacing: '0.04em',
                    }}>
                      {s.direction_label}
                    </span>
                    <span style={{
                      fontFamily: "'Inter', system-ui", fontWeight: 800,
                      fontSize: 12, color: '#D8EEF8', fontVariantNumeric: 'tabular-nums',
                    }}>
                      {s.height_ft.toFixed(1)}ft
                    </span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10, color: '#6AAED0',
                    }}>
                      @{s.period_s.toFixed(0)}s
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <span className="font-display" style={{ fontSize: 'clamp(28px, 8vw, 52px)', color: '#D8EEF8', lineHeight: 1, letterSpacing: '0.04em' }}>
                {buoy.mwd_label ?? '--'}
              </span>
              {buoy.mwd_deg != null && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: '#6AAED0' }}>
                  {buoy.mwd_deg.toFixed(0)}°
                </span>
              )}
            </>
          )}
        </BentoTile>

        {/* Wave power */}
        {wave_power && (() => {
          const kw    = wave_power.kw_per_meter
          const pColor = powerColor(kw)
          return (
            <BentoTile label="POWER" accent={pColor}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ fontFamily: "'Inter', system-ui", fontWeight: 800, fontSize: 'clamp(22px, 6vw, 38px)', color: pColor, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {kw < 10 ? kw.toFixed(1) : kw.toFixed(0)}
                </span>
                <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color: '#6AAED0', letterSpacing: '0.10em', marginBottom: 2 }}>kJ</span>
              </div>
              <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color: pColor, letterSpacing: '0.12em' }}>
                {powerLabel(kw)}
              </span>
            </BentoTile>
          )
        })()}

        {/* Crowd badge row */}
        <BentoTile label="CROWD-O-METER">
          <span className="font-display" style={{ fontSize: 'clamp(20px, 5.5vw, 36px)', color: crowd ? '#D8EEF8' : '#6AAED0', lineHeight: 1, letterSpacing: '0.04em' }}>
            {crowd ? crowd.level.toUpperCase() : 'N/A'}
          </span>
        </BentoTile>

        {/* Tide */}
        {(() => {
          const isHigh = next_tide?.event_type === 'high'
          const tideColor = next_tide ? (isHigh ? '#88C8E8' : '#5AAAC8') : '#6AAED0'
          const tideLabel = next_tide ? (isHigh ? 'RISING' : 'DROPPING') : 'TIDE'
          const tideTime = next_tide?.timestamp
            ? new Date(next_tide.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(':00', '').toLowerCase()
            : null

          // Bar: position current tide between 0 and ~6ft (typical max)
          const cur = condition.current_tide_ft
          const barMax = next_tide ? Math.max(next_tide.height_ft + 0.5, 6) : 6
          const barPct = cur != null ? Math.min(100, Math.max(2, (cur / barMax) * 100)) : null

          return (
            <BentoTile label={tideLabel} accent={tideColor}>
              {cur != null ? (
                <>
                  <div className="flex items-end gap-1 leading-none">
                    <span style={{ fontFamily: "'Inter', system-ui", fontWeight: 800, fontSize: 'clamp(24px, 6.5vw, 42px)', color: tideColor, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                      {cur.toFixed(1)}
                    </span>
                    <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 14, color: '#6AAED0', letterSpacing: '0.10em', marginBottom: 4 }}>FT</span>
                  </div>
                  {/* Tide level bar */}
                  {barPct != null && (
                    <div style={{ width: '100%', height: 5, background: 'rgba(120,184,216,0.12)', borderRadius: 4, overflow: 'hidden', margin: '2px 0' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: tideColor, borderRadius: 4, transition: 'width 0.4s ease' }} />
                    </div>
                  )}
                  {next_tide && (
                    <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color: '#4A7A9A', letterSpacing: '0.08em' }}>
                      {isHigh ? '▲ HIGH' : '▼ LOW'} {next_tide.height_ft.toFixed(1)}ft{tideTime ? ` · ${tideTime}` : ''}
                    </span>
                  )}
                </>
              ) : next_tide ? (
                <>
                  <div className="flex items-end gap-1 leading-none">
                    <span style={{ fontFamily: "'Inter', system-ui", fontWeight: 800, fontSize: 'clamp(24px, 6.5vw, 42px)', color: tideColor, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                      {next_tide.height_ft.toFixed(1)}
                    </span>
                    <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 14, color: '#6AAED0', letterSpacing: '0.10em', marginBottom: 4 }}>FT</span>
                  </div>
                  <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color: '#4A7A9A', letterSpacing: '0.08em' }}>
                    {isHigh ? '▲ HIGH' : '▼ LOW'}{tideTime ? ` · ${tideTime}` : ''}
                  </span>
                </>
              ) : (
                <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 28, color: '#6AAED0' }}>--</span>
              )}
            </BentoTile>
          )
        })()}

      </div>

      {/* ── Sun times strip ── */}
      {sun && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center',
          padding: '8px 16px 10px',
          borderTop: '1px solid rgba(168,200,220,0.06)',
        }}>
          <div className="flex items-center gap-1.5" style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color: '#6AAED0', letterSpacing: '0.08em' }}>
            <Sunrise size={11} style={{ color: '#88C8E8' }} />
            {sun.sunrise_display}
          </div>
          <div className="flex items-center gap-1.5" style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color: '#6AAED0', letterSpacing: '0.08em' }}>
            <Sunset size={11} style={{ color: '#78B8D8' }} />
            {sun.sunset_display}
          </div>
          {sun.is_dawn_patrol_window && (
            <span style={{
              fontFamily: "'Bangers', Impact, system-ui", fontSize: 10,
              color: '#88C8E8',
              background: 'rgba(136,200,232,0.12)',
              border: '1px solid rgba(136,200,232,0.30)',
              borderRadius: 20, padding: '3px 10px', letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              Dawn Patrol
            </span>
          )}
        </div>
      )}

      {/* ── Forecaster's Log (sky note) ── */}
      <div style={{ padding: '0 16px 18px' }}>
        <AISpotAnalysis condition={condition} />
      </div>
    </motion.div>
  )
}

// ── Bento Tile ───────────────────────────────────────────────────────────────
function BentoTile({
  label, children, accent,
}: {
  label: string
  children: React.ReactNode
  accent?: string
}) {
  return (
    <motion.div
      className="bento-tile"
      style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <p className="stat-label" style={accent ? { color: accent } : undefined}>{label}</p>
      {children}
    </motion.div>
  )
}
