import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import clsx from 'clsx'
import type { BreakingConditions } from '../../types/surf'

const DIR_COLORS = {
  ideal:    { bg: 'bg-wave-400/15', border: 'border-wave-400/40', text: 'text-wave-400', dot: 'bg-wave-400' },
  good:     { bg: 'bg-green-500/15', border: 'border-green-500/30', text: 'text-green-400', dot: 'bg-green-400' },
  cross:    { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  marginal: { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-400' },
  blocked:  { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
}

const PERIOD_COLORS = {
  excellent: 'text-wave-400',
  good:      'text-green-400',
  fair:      'text-yellow-400',
  poor:      'text-orange-400',
}

interface Props {
  breaking: BreakingConditions
  spotName: string
}

export function BreakingConditionsCard({ breaking, spotName }: Props) {
  const dirStyle = DIR_COLORS[breaking.direction_rating]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="card p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Info size={14} className="text-wave-400 flex-shrink-0" />
        <p className="stat-label">Predicted Breaking Conditions at {spotName}</p>
      </div>

      {/* Face height — the hero number */}
      <div className="flex items-end gap-6">
        <div>
          <p className="text-ocean-500 text-xs uppercase tracking-widest mb-1">Predicted Wave Face</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-black text-ocean-50 leading-none wave-height-display">
              {(() => {
                const fmt = (n: number) => n < 4 ? n.toFixed(1) : n.toFixed(0)
                const lo = fmt(breaking.face_height_min_ft)
                const hi = fmt(breaking.face_height_max_ft)
                return lo === hi ? lo : `${lo}–${hi}`
              })()}
            </span>
            <span className="text-ocean-400 text-lg mb-0.5">ft</span>
          </div>
          <p className="text-wave-400 font-semibold text-sm mt-1 capitalize">{breaking.face_height_label}</p>
        </div>

        {/* Vs buoy */}
        <div className="text-right pb-1">
          <p className="text-ocean-500 text-xs uppercase tracking-widest mb-1">Buoy reads</p>
          <p className="text-2xl font-bold text-ocean-400 wave-height-display">
            {breaking.buoy_hs_ft.toFixed(1)}ft
          </p>
          <p className="text-ocean-600 text-xs">open-ocean Hs</p>
        </div>
      </div>

      {/* Swell type + direction pills */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Swell type */}
        <div className="bg-ocean-800/60 rounded-xl p-3 border border-ocean-700/40">
          <p className="stat-label mb-1.5">Swell Type</p>
          <p className={clsx('font-bold text-sm capitalize', PERIOD_COLORS[breaking.period_quality])}>
            {breaking.swell_type_short}
          </p>
          <p className="text-ocean-500 text-xs mt-0.5">{breaking.buoy_period_s.toFixed(0)}s period</p>
          <div className={clsx('mt-1.5 text-xs font-medium', PERIOD_COLORS[breaking.period_quality])}>
            {breaking.period_quality === 'excellent' && '★★★ Excellent power'}
            {breaking.period_quality === 'good'      && '★★☆ Good power'}
            {breaking.period_quality === 'fair'      && '★☆☆ Moderate power'}
            {breaking.period_quality === 'poor'      && '☆☆☆ Low power'}
          </div>
        </div>

        {/* Swell direction */}
        <div className={clsx('rounded-xl p-3 border', dirStyle.bg, dirStyle.border)}>
          <p className="stat-label mb-1.5">Swell Direction</p>
          <p className={clsx('font-bold text-sm capitalize', dirStyle.text)}>
            {breaking.direction_rating}
          </p>
          <p className="text-ocean-500 text-xs mt-0.5">
            {breaking.swell_angle_diff.toFixed(0)}° off ideal
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className={clsx('h-1.5 rounded-full flex-shrink-0', dirStyle.dot)}
              style={{ width: `${Math.round(breaking.direction_pct * 100)}%`, maxWidth: '100%', minWidth: '4px' }}
            />
            <span className={clsx('text-xs font-medium', dirStyle.text)}>
              {Math.round(breaking.direction_pct * 100)}% reaching shore
            </span>
          </div>
        </div>
      </div>

      {/* AI interpretation text */}
      <div className="bg-ocean-800/40 rounded-xl p-4 border border-ocean-700/40">
        <p className="text-ocean-300 text-sm leading-relaxed">{breaking.interpretation}</p>
      </div>

      {/* Spot-specific context */}
      {breaking.spot_context && (
        <p className="text-ocean-500 text-xs leading-relaxed border-t border-ocean-700/40 pt-3">
          <span className="text-ocean-400 font-medium">Spot note: </span>
          {breaking.spot_context}
        </p>
      )}
    </motion.div>
  )
}
