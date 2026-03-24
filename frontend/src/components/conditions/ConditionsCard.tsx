import { motion } from 'framer-motion'
import { Wind, Thermometer, Clock, Sunrise, Sunset, Compass } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { SurfCondition } from '../../types/surf'
import { CompassRose } from '../shared/CompassRose'
import { CrowdBadge, WindBadge } from '../shared/Badge'
import { SurfOMeter } from './SurfOMeter'
import { CrowdReportButton } from '../crowd/CrowdReportButton'
import { AISpotAnalysis } from '../ai/AISpotAnalysis'

interface Props { condition: SurfCondition }

// Rating → accent color (muted palette)
function ratingAccent(r: number) {
  return r >= 8 ? '#4E7A7C' : r >= 6 ? '#5E9268' : r >= 4 ? '#C4904A' : '#B07860'
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
    wind?.quality === 'offshore'       ? '#5E9268' :
    wind?.quality === 'cross-offshore' ? '#5E9268' :
    wind?.quality === 'cross'          ? '#C4904A' :
    wind?.quality === 'cross-onshore'  ? '#B07860' : '#B07860'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'rgba(237,231,223,0.78)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderRadius: 20,
        border: '1px solid rgba(255,248,240,0.70)',
        boxShadow: '0 12px 40px rgba(50,38,28,0.12), 0 4px 16px rgba(50,38,28,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* ── Rating accent bar ── */}
      <div style={{ height: 4, background: accent, opacity: 0.85 }} />

      {/* ── Header: spot name + meta ── */}
      <div className="flex items-start justify-between px-5 pt-4 pb-2">
        <div>
          <h2 className="text-xl font-black text-ocean-50 tracking-tight leading-none">
            {condition.spot_name}
          </h2>
          {breaking && (
            <p className="text-ocean-500 text-xs mt-1 font-medium">
              {breaking.swell_type_short} · {breaking.buoy_period_s.toFixed(0)}s ·{' '}
              <span style={{ color: accent }}>{ratingLabel(rating)}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <CrowdReportButton condition={condition} />
          <div className="flex items-center gap-1 text-ocean-600 text-xs">
            <Clock size={10} />
            <span>
              {buoy.data_age_minutes != null
                ? `${Math.round(buoy.data_age_minutes)}m ago`
                : formatDistanceToNow(updatedAt, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* ── HERO: wave height dominant element ── */}
      <div className="flex items-end gap-4 px-5 pb-3">
        <div>
          <div className="flex items-end gap-2 leading-none">
            <span
              className="font-black text-ocean-50 wave-height-display"
              style={{ fontSize: 'clamp(3.8rem, 12vw, 5.2rem)', lineHeight: 1 }}
            >
              {heroNum}
            </span>
            <span className="text-ocean-500 font-semibold text-xl mb-1.5">ft</span>
          </div>
          {breaking && (
            <p className="text-ocean-500 text-xs mt-1">
              {breaking.face_height_label} · {Math.round(breaking.direction_pct * 100)}% reaching shore
            </p>
          )}
        </div>

        <div className="ml-auto flex-shrink-0 -mb-1">
          {wave_power && <SurfOMeter rating={wave_power.surf_rating} />}
        </div>
      </div>

      {/* ── Stats strip — horizontal, divided ── */}
      <div
        className="grid grid-cols-4 border-t border-b"
        style={{ borderColor: 'rgba(168,160,152,0.30)' }}
      >
        <StatCell
          label="Period"
          value={buoy.dpd_s != null ? `${buoy.dpd_s.toFixed(0)}s` : '--'}
          highlight={buoy.dpd_s != null && buoy.dpd_s >= 12}
          accent={accent}
        />
        <StatCell
          label="Wind"
          value={wind ? `${wind.speed_mph.toFixed(0)}mph` : '--'}
          sub={wind?.direction_label}
          color={windColor}
        />
        <StatCell
          label="Water"
          value={buoy.wtmp_f != null ? `${buoy.wtmp_f.toFixed(0)}°F` : '--'}
        />
        <StatCell
          label="Swell"
          value={buoy.mwd_label ?? '--'}
          sub={buoy.mwd_deg != null ? `${buoy.mwd_deg.toFixed(0)}°` : undefined}
        />
      </div>

      {/* ── AI Analysis — inline, no sub-card ── */}
      <div className="px-5 pt-4 pb-3">
        <p className="stat-label mb-2.5">Swello Analysis</p>
        <AISpotAnalysis condition={condition} />
      </div>

      {/* ── Wind compass + badges ── */}
      <div
        className="flex items-center gap-4 px-5 pt-3 pb-4 border-t"
        style={{ borderColor: 'rgba(168,160,152,0.25)', background: 'rgba(50,38,28,0.03)' }}
      >
        {wind && <CompassRose deg={wind.direction_deg} size={46} color={windColor} />}
        <div className="space-y-1.5">
          {wind && <WindBadge quality={wind.quality} label={wind.quality_label} />}
          {crowd && <CrowdBadge level={crowd.level} />}
        </div>

        {/* Sun times — compact inline */}
        {sun && (
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-ocean-500">
              <Sunrise size={11} className="text-coral-400" />
              <span>{sun.sunrise_display}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ocean-500">
              <Sunset size={11} className="text-ocean-600" />
              <span>{sun.sunset_display}</span>
            </div>
            {sun.is_dawn_patrol_window && (
              <span className="text-[10px] font-bold text-coral-400 bg-coral-400/12 border border-coral-400/30 rounded-full px-2 py-0.5">
                Dawn Patrol
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Horizontal stat cell ────────────────────────────────────────────────────
function StatCell({
  label, value, sub, highlight, accent, color,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
  accent?: string
  color?: string
}) {
  const valueColor = color ?? (highlight && accent ? accent : undefined)
  return (
    <div
      className="flex flex-col items-center py-2.5 px-1 border-r last:border-r-0 text-center"
      style={{ borderColor: 'rgba(168,160,152,0.25)' }}
    >
      <p className="stat-label mb-1">{label}</p>
      <p
        className="text-sm font-black leading-tight text-ocean-200"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-ocean-600 text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}
