import { motion } from 'framer-motion'
import { Waves, Wind, Thermometer, Clock, Sunrise, Sunset } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { SurfCondition } from '../../types/surf'
import { CompassRose } from '../shared/CompassRose'
import { CrowdBadge, WindBadge, SurfRatingBadge } from '../shared/Badge'
import { WavePowerMeter } from './WavePowerMeter'
import { SurfOMeter } from './SurfOMeter'
import { CrowdReportButton } from '../crowd/CrowdReportButton'
import { AISpotAnalysis } from '../ai/AISpotAnalysis'
import clsx from 'clsx'

const PERIOD_COLORS: Record<string, string> = {
  excellent: 'text-wave-400',
  good:      'text-green-400',
  fair:      'text-yellow-400',
  poor:      'text-orange-400',
}

interface Props {
  condition: SurfCondition
}

export function ConditionsCard({ condition }: Props) {
  const { buoy, wave_power, wind, crowd, breaking, sun } = condition
  const updatedAt = new Date(condition.updated_at)

  const windColor =
    wind?.quality === 'offshore'       ? '#10b981' :
    wind?.quality === 'cross-offshore' ? '#34d399' :
    wind?.quality === 'cross'          ? '#f59e0b' :
    wind?.quality === 'cross-onshore'  ? '#fb923c' : '#ef4444'

  // Use interpreted face height as primary, fall back to buoy
  const showFaceHeight = breaking && (breaking.face_height_max_ft > 0)
  const fmtFt = (n: number) => n < 4 ? n.toFixed(1) : n.toFixed(0)
  const heroLabel = showFaceHeight
    ? (() => {
        const lo = fmtFt(breaking.face_height_min_ft)
        const hi = fmtFt(breaking.face_height_max_ft)
        return lo === hi ? `${lo}` : `${lo}–${hi}`
      })()
    : buoy.wvht_ft != null ? buoy.wvht_ft.toFixed(1) : '--'

  const periodQuality = breaking?.period_quality ?? 'fair'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-glow p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="stat-label mb-1">Live Conditions</p>
          <h2 className="text-xl font-bold text-ocean-50">{condition.spot_name}</h2>
          {breaking && (
            <p className={clsx('text-xs font-medium mt-0.5 capitalize', PERIOD_COLORS[periodQuality])}>
              {breaking.swell_type_short} · {breaking.buoy_period_s.toFixed(0)}s ·{' '}
              {periodQuality === 'excellent' ? '★★★' : periodQuality === 'good' ? '★★☆' : periodQuality === 'fair' ? '★☆☆' : '☆☆☆'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CrowdReportButton condition={condition} />
          <div className="flex items-center gap-1.5 text-ocean-400 text-xs">
            <Clock size={11} />
            <span>
              {buoy.data_age_minutes != null
                ? `${Math.round(buoy.data_age_minutes)}m ago`
                : formatDistanceToNow(updatedAt, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Wave face height + Surf-O-Meter — PRIMARY hero row */}
      <div className="flex items-end gap-4 mb-2">
        <div>
          <p className="stat-label mb-1 flex items-center gap-1.5">
            <Waves size={11} /> Predicted Wave Face
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black wave-height-display leading-none text-ocean-50">
              {heroLabel}
            </span>
            <span className="text-ocean-400 font-medium text-lg mb-1">ft</span>
          </div>
          {breaking && (
            <p className="text-ocean-400 text-sm mt-1 capitalize">{breaking.face_height_label}</p>
          )}
        </div>

        {wave_power && (
          <div className="ml-6">
            <SurfOMeter rating={wave_power.surf_rating} />
          </div>
        )}

        {wave_power && (
          <div className="ml-auto">
            <WavePowerMeter kw={wave_power.kw_per_meter} />
          </div>
        )}
      </div>

      {/* Buoy secondary note */}
      <p className="text-ocean-600 text-xs mb-5">
        Buoy reading: {buoy.wvht_ft?.toFixed(1) ?? '--'}ft Hs open-ocean
        {breaking && (
          <span className="ml-1">
            · {Math.round(breaking.direction_pct * 100)}% reaching shore ({breaking.direction_rating})
          </span>
        )}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatPill
          icon={<Wind size={13} />}
          label="Wind"
          value={wind ? `${wind.speed_mph.toFixed(0)} mph` : '--'}
          sub={wind?.direction_label}
        />
        <StatPill
          label="Period"
          value={buoy.dpd_s != null ? `${buoy.dpd_s.toFixed(0)}s` : '--'}
          sub="dominant"
          highlight={buoy.dpd_s != null && buoy.dpd_s >= 12}
        />
        <StatPill
          icon={<Thermometer size={13} />}
          label="Water Temp"
          value={buoy.wtmp_f != null ? `${buoy.wtmp_f.toFixed(0)}°F` : '--'}
        />
        <StatPill
          label="Swell Dir"
          value={buoy.mwd_label ?? '--'}
          sub={buoy.mwd_deg != null ? `${buoy.mwd_deg.toFixed(0)}°` : undefined}
        />
      </div>

      {/* Sun times row */}
      {sun && (
        <div className="flex items-center gap-4 bg-ocean-800/40 rounded-xl px-4 py-2.5 mb-4 border border-ocean-700/40">
          <div className="flex items-center gap-2 text-xs">
            <Sunrise size={13} className="text-sand-400" />
            <div>
              <p className="text-ocean-500 text-xs">First light</p>
              <p className="text-ocean-200 font-semibold">{sun.first_light_display}</p>
            </div>
          </div>
          <div className="w-px h-6 bg-ocean-700" />
          <div className="flex items-center gap-2 text-xs">
            <Sunrise size={13} className="text-yellow-400" />
            <div>
              <p className="text-ocean-500 text-xs">Sunrise</p>
              <p className="text-ocean-200 font-semibold">{sun.sunrise_display}</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs">
            <Sunset size={13} className="text-orange-400" />
            <div>
              <p className="text-ocean-500 text-xs">Sunset</p>
              <p className="text-ocean-200 font-semibold">{sun.sunset_display}</p>
            </div>
          </div>
          <div className="w-px h-6 bg-ocean-700" />
          <div className="flex items-center gap-2 text-xs">
            <Sunset size={13} className="text-ocean-500" />
            <div>
              <p className="text-ocean-500 text-xs">Last light</p>
              <p className="text-ocean-200 font-semibold">{sun.last_light_display}</p>
            </div>
          </div>

          {/* Dawn patrol badge */}
          {sun.is_dawn_patrol_window && (
            <span className="ml-2 text-xs font-bold text-sand-400 bg-sand-400/15 border border-sand-400/30 rounded-full px-2.5 py-0.5 animate-pulse-slow">
              Dawn Patrol 🌊
            </span>
          )}
          {!sun.is_daytime && !sun.is_dawn_patrol_window && (
            <span className="ml-2 text-xs text-ocean-500">
              {sun.minutes_to_sunrise > 0
                ? `Sunrise in ${sun.minutes_to_sunrise}m`
                : `Sunset ${Math.abs(sun.minutes_to_sunset)}m ago`}
            </span>
          )}
        </div>
      )}


      {/* AI Analysis — replaces rule-based interpretation */}
      <div className="mb-4">
        <AISpotAnalysis condition={condition} />
      </div>

      {/* Wind compass + badges */}
      <div className="flex items-center justify-between border-t border-ocean-700/60 pt-4">
        <div className="flex items-center gap-3">
          {wind && (
            <CompassRose deg={wind.direction_deg} size={48} color={windColor} />
          )}
          <div className="space-y-1.5">
            {wind && <WindBadge quality={wind.quality} label={wind.quality_label} />}
            {crowd && <CrowdBadge level={crowd.level} />}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StatPill({
  icon, label, value, sub, highlight,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className="bg-ocean-800/60 rounded-xl p-3 border border-ocean-700/50">
      <p className="stat-label flex items-center gap-1 mb-1.5">
        {icon}{label}
      </p>
      <p className={clsx('font-bold text-sm', highlight ? 'text-wave-400' : 'text-ocean-50')}>
        {value}
      </p>
      {sub && <p className="text-ocean-500 text-xs mt-0.5">{sub}</p>}
    </div>
  )
}
