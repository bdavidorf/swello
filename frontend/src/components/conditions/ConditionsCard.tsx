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
  return r >= 8 ? '#1AFFD0' : r >= 6 ? '#4AE090' : r >= 4 ? '#FF9A40' : '#FF6B2B'
}
function ratingLabel(r: number) {
  return r >= 8 ? 'Excellent' : r >= 6 ? 'Good' : r >= 4 ? 'Fair' : 'Poor'
}

export function ConditionsCard({ condition }: Props) {
  const { buoy, wave_power, wind, crowd, breaking, sun } = condition
  const updatedAt = new Date(condition.updated_at)

  const rating = wave_power?.surf_rating ?? 0
  const accent = ratingAccent(rating)

  const fmtFt = (n: number) => n < 4 ? n.toFixed(1) : n.toFixed(0)
  const showFace = breaking && breaking.face_height_max_ft > 0
  const heroNum = showFace
    ? (() => {
        const lo = fmtFt(breaking!.face_height_min_ft)
        const hi = fmtFt(breaking!.face_height_max_ft)
        return lo === hi ? lo : `${lo}–${hi}`
      })()
    : buoy.wvht_ft != null ? buoy.wvht_ft.toFixed(1) : '--'

  const windColor =
    wind?.quality === 'offshore'       ? '#1AFFD0' :
    wind?.quality === 'cross-offshore' ? '#1AFFD0' :
    wind?.quality === 'cross'          ? '#FF9A40' :
    wind?.quality === 'cross-onshore'  ? '#FF6B2B' : '#FF6B2B'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'rgba(15,30,46,0.88)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRadius: 14,
        border: '1px solid rgba(237,232,220,0.10)',
        boxShadow: '0 16px 56px rgba(0,0,0,0.50), 0 4px 16px rgba(0,0,0,0.30)',
        overflow: 'hidden',
      }}
    >
      {/* ── Top accent line ── */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}cc, ${accent}44)` }} />

      {/* ── Header: spot + meta ── */}
      <div className="flex items-start justify-between px-5 pt-4 pb-1">
        <div>
          <h2 className="font-display text-2xl text-ocean-50 leading-none tracking-wide">
            {condition.spot_name}
          </h2>
          {breaking && (
            <p className="mt-1" style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: '#3A5870',
              letterSpacing: '0.06em',
            }}>
              {breaking.swell_type_short} · {breaking.buoy_period_s.toFixed(0)}s ·{' '}
              <span style={{ color: accent }}>{ratingLabel(rating)}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <CrowdReportButton condition={condition} />
          <div className="flex items-center gap-1.5" style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: '#3A5870',
          }}>
            <Clock size={10} />
            {buoy.data_age_minutes != null
              ? `${Math.round(buoy.data_age_minutes)}m`
              : formatDistanceToNow(updatedAt, { addSuffix: true })}
          </div>
        </div>
      </div>

      {/* ── HERO: giant wave height + energy bar ── */}
      <div className="flex items-end gap-5 px-5 pt-2 pb-4">
        <div className="flex-1">
          <div className="flex items-end gap-3 leading-none">
            <span
              className="wave-height-display text-ocean-50"
              style={{ fontSize: 'clamp(4.5rem, 14vw, 6.5rem)', lineHeight: 0.9 }}
            >
              {heroNum}
            </span>
            <div className="mb-1">
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                color: '#3A5870',
              }}>ft</span>
            </div>
          </div>
          {breaking && (
            <p className="mt-1.5" style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: '#3A5870',
              letterSpacing: '0.04em',
            }}>
              {breaking.face_height_label} · {Math.round(breaking.direction_pct * 100)}% reaching shore
            </p>
          )}
        </div>

        <div className="flex-shrink-0 mb-1">
          {wave_power && <EnergyBar rating={wave_power.surf_rating} />}
        </div>
      </div>

      {/* ── Stats strip — monospace data values ── */}
      <div
        className="grid grid-cols-4 border-t border-b"
        style={{ borderColor: 'rgba(26,48,80,0.70)' }}
      >
        <StatCell label="Period"  value={buoy.dpd_s != null ? `${buoy.dpd_s.toFixed(0)}s` : '--'}  accent={buoy.dpd_s != null && buoy.dpd_s >= 12 ? accent : undefined} />
        <StatCell label="Wind"    value={wind ? `${wind.speed_mph.toFixed(0)}mph` : '--'}             color={windColor} sub={wind?.direction_label} />
        <StatCell label="Water"   value={buoy.wtmp_f != null ? `${buoy.wtmp_f.toFixed(0)}°F` : '--'} />
        <StatCell label="Swell"   value={buoy.mwd_label ?? '--'}                                      sub={buoy.mwd_deg != null ? `${buoy.mwd_deg.toFixed(0)}°` : undefined} />
      </div>

      {/* ── Forecaster's Log (AI analysis) ── */}
      <div className="px-5 pt-4 pb-3">
        <AISpotAnalysis condition={condition} />
      </div>

      {/* ── Footer: compass + badges + sun ── */}
      <div
        className="flex items-center gap-4 px-5 pt-3 pb-4 border-t"
        style={{ borderColor: 'rgba(26,48,80,0.60)', background: 'rgba(0,0,0,0.15)' }}
      >
        {wind && <CompassRose deg={wind.direction_deg} size={44} color={windColor} />}
        <div className="space-y-1.5">
          {wind && <WindBadge quality={wind.quality} label={wind.quality_label} />}
          {crowd && <CrowdBadge level={crowd.level} />}
        </div>

        {sun && (
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5" style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: '#3A5870',
            }}>
              <Sunrise size={10} style={{ color: '#FF9A40' }} />
              {sun.sunrise_display}
            </div>
            <div className="flex items-center gap-1.5" style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: '#3A5870',
            }}>
              <Sunset size={10} style={{ color: '#6A8AA0' }} />
              {sun.sunset_display}
            </div>
            {sun.is_dawn_patrol_window && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                fontWeight: 600,
                color: '#FF9A40',
                background: 'rgba(255,154,64,0.12)',
                border: '1px solid rgba(255,154,64,0.30)',
                borderRadius: 20,
                padding: '2px 8px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                Dawn Patrol
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Stat cell ──────────────────────────────────────────────────────────────
function StatCell({
  label, value, sub, accent, color,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
  color?: string
}) {
  const valueColor = color ?? accent
  return (
    <div
      className="flex flex-col items-center py-3 px-1 border-r last:border-r-0 text-center"
      style={{ borderColor: 'rgba(26,48,80,0.70)' }}
    >
      <p className="stat-label mb-1.5">{label}</p>
      <p
        className="data-val leading-tight"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
      {sub && (
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: '#3A5870',
          marginTop: 2,
        }}>
          {sub}
        </p>
      )}
    </div>
  )
}
