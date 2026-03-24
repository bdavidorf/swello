import clsx from 'clsx'
import type { CrowdLevel, WindQualityType, WaveClassification } from '../../types/surf'

const CROWD_COLORS: Record<CrowdLevel, string> = {
  empty:     'bg-crowd-empty/20 text-crowd-empty border-crowd-empty/30',
  uncrowded: 'bg-crowd-light/20 text-crowd-light border-crowd-light/30',
  moderate:  'bg-crowd-moderate/20 text-crowd-moderate border-crowd-moderate/30',
  crowded:   'bg-crowd-crowded/20 text-crowd-crowded border-crowd-crowded/30',
  packed:    'bg-crowd-packed/20 text-crowd-packed border-crowd-packed/30',
}

const WIND_COLORS: Record<WindQualityType, string> = {
  'offshore':       'bg-green-500/20 text-green-400 border-green-500/30',
  'cross-offshore': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'cross':          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'cross-onshore':  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'onshore':        'bg-red-500/20 text-red-400 border-red-500/30',
}

export function CrowdBadge({ level }: { level: CrowdLevel }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize',
      CROWD_COLORS[level]
    )}>
      {level}
    </span>
  )
}

export function WindBadge({ quality, label }: { quality: WindQualityType; label: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      WIND_COLORS[quality]
    )}>
      {label}
    </span>
  )
}

export function SurfRatingBadge({ rating }: { rating: number }) {
  const color =
    rating >= 8 ? 'bg-wave-400/20 text-wave-400 border-wave-400/30' :
    rating >= 6 ? 'bg-surf-solid/20 text-green-400 border-green-500/30' :
    rating >= 4 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
    'bg-ocean-700/40 text-ocean-400 border-ocean-600/30'

  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border',
      color
    )}>
      {rating}/10
    </span>
  )
}
