import { motion } from 'framer-motion'
import { Clock, Sunrise, Sunset } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { SurfCondition } from '../../types/surf'
import { CompassRose } from '../shared/CompassRose'
import { CrowdBadge, WindBadge } from '../shared/Badge'
import { EnergyBar } from './EnergyBar'
import { CrowdReportButton } from '../crowd/CrowdReportButton'
import { AISpotAnalysis } from '../ai/AISpotAnalysis'

interface Props { condition: SurfCondition }

function ratingAccent(r: number) {
  return r >= 8 ? '#88C8E8' : r >= 6 ? '#5AAAC8' : r >= 4 ? '#78B8D8' : '#4A7090'
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

export function ConditionsCard({ condition }: Props) {
  const { buoy, wave_power, wind, crowd, breaking, sun } = condition
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
        <RetroSun color={accent} />

        {/* Top row: name + actions */}
        <div className="flex items-start justify-between relative" style={{ zIndex: 2 }}>
          <div>
            <h2 className="font-display text-ocean-50" style={{ fontSize: 32, lineHeight: 1, letterSpacing: '0.06em' }}>
              {condition.spot_name.toUpperCase()}
            </h2>
            {breaking && (
              <p className="mt-1" style={{
                fontFamily: "'Bangers', Impact, system-ui", fontWeight: 400,
                fontSize: 11, letterSpacing: '0.16em', color: '#3A5A78',
                textTransform: 'uppercase',
              }}>
                {breaking.swell_type_short} · {breaking.buoy_period_s.toFixed(0)}s period
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CrowdReportButton condition={condition} />
            <div className="flex items-center gap-1" style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3A5A78',
            }}>
              <Clock size={9} />
              {buoy.data_age_minutes != null
                ? `${Math.round(buoy.data_age_minutes)}m`
                : formatDistanceToNow(updatedAt, { addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Wave height + energy bar */}
        <div className="flex items-center justify-between mt-2 relative" style={{ zIndex: 2 }}>
          <div>
            <div className="flex items-end gap-2 leading-none">
              <span
                className="wave-height-display"
                style={{ fontSize: 'clamp(5rem, 16vw, 8rem)', lineHeight: 0.85, color: '#EAF6FF' }}
              >
                {heroNum}
              </span>
              <span className="font-display mb-1.5" style={{ fontSize: 30, color: '#5A8AAA', letterSpacing: '0.06em' }}>
                FT
              </span>
            </div>
            {breaking && (
              <p className="mt-1.5" style={{
                fontFamily: "'Bangers', Impact, system-ui", fontWeight: 400, fontSize: 12,
                color: '#5A8AAA', letterSpacing: '0.10em',
              }}>
                {breaking.face_height_label} · {Math.round(breaking.direction_pct * 100)}% reaching shore
              </p>
            )}
          </div>
          {wave_power && (
            <div style={{ flexShrink: 0 }}>
              <EnergyBar rating={wave_power.surf_rating} />
            </div>
          )}
        </div>
      </div>

      {/* ── BENTO GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 10, padding: '14px 16px' }}>

        {/* Period */}
        <BentoTile label="PERIOD" accent={buoy.dpd_s != null && buoy.dpd_s >= 12 ? '#88C8E8' : undefined}>
          <span style={{ fontFamily: "'Inter', system-ui", fontWeight: 800, fontSize: 36, color: '#D8EEF8', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {buoy.dpd_s != null ? buoy.dpd_s.toFixed(0) : '--'}
          </span>
          <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color: '#3A5A78', letterSpacing: '0.10em' }}>
            SECONDS
          </span>
        </BentoTile>

        {/* Wind — taller, spans 2 rows, has compass */}
        <motion.div
          className="bento-tile"
          style={{
            gridRow: 'span 2',
            padding: '14px 12px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <p className="stat-label">WIND</p>
          {wind && <CompassRose deg={wind.direction_deg} size={52} color={wColor} />}
          <span style={{ fontFamily: "'Inter', system-ui", fontWeight: 800, fontSize: 30, color: wColor, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {wind ? `${wind.speed_mph.toFixed(0)}` : '--'}
          </span>
          <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 10, color: '#3A5A78', letterSpacing: '0.10em' }}>
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
              fontSize: 10,
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
          <span style={{ fontFamily: "'Inter', system-ui", fontWeight: 800, fontSize: 32, color: '#5AAAC8', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {buoy.wtmp_f != null ? `${buoy.wtmp_f.toFixed(0)}°` : '--'}
          </span>
          <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color: '#3A5A78', letterSpacing: '0.10em' }}>
            FAHRENHEIT
          </span>
        </BentoTile>

        {/* Swell dir */}
        <BentoTile label="SWELL">
          <span className="font-display" style={{ fontSize: 30, color: '#D8EEF8', lineHeight: 1, letterSpacing: '0.04em' }}>
            {buoy.mwd_label ?? '--'}
          </span>
          {buoy.mwd_deg != null && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#3A5A78' }}>
              {buoy.mwd_deg.toFixed(0)}°
            </span>
          )}
        </BentoTile>

        {/* Crowd badge row — bottom right */}
        <BentoTile label="CROWD">
          <span className="font-display" style={{ fontSize: 22, color: crowd ? '#D8EEF8' : '#3A5A78', lineHeight: 1, letterSpacing: '0.04em' }}>
            {crowd ? crowd.level.toUpperCase() : 'N/A'}
          </span>
        </BentoTile>

      </div>

      {/* ── Sun times strip ── */}
      {sun && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center',
          padding: '8px 16px 10px',
          borderTop: '1px solid rgba(168,200,220,0.06)',
        }}>
          <div className="flex items-center gap-1.5" style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color: '#3A5A78', letterSpacing: '0.08em' }}>
            <Sunrise size={11} style={{ color: '#88C8E8' }} />
            {sun.sunrise_display}
          </div>
          <div className="flex items-center gap-1.5" style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color: '#3A5A78', letterSpacing: '0.08em' }}>
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
