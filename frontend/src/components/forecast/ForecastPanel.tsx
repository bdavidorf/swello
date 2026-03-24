import { useState } from 'react'
import clsx from 'clsx'
import { Wind, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ForecastDay, ForecastHour, CrowdLevel, WindQualityType } from '../../types/surf'

interface Props {
  daily:  ForecastDay[]
  hourly?: ForecastHour[]
}

const CROWD_DOT: Record<CrowdLevel, string> = {
  empty:     'bg-emerald-400',
  uncrowded: 'bg-green-400',
  moderate:  'bg-yellow-400',
  crowded:   'bg-orange-400',
  packed:    'bg-red-500',
}

const WIND_COLOR: Record<WindQualityType, string> = {
  offshore:         'text-emerald-400',
  'cross-offshore': 'text-green-400',
  cross:            'text-yellow-400',
  'cross-onshore':  'text-orange-400',
  onshore:          'text-red-400',
}

const PERIOD_STARS: Record<string, string> = {
  excellent: '★★★',
  good:      '★★☆',
  fair:      '★☆☆',
  poor:      '☆☆☆',
}

function ratingColor(r: number) {
  return r >= 8 ? '#00d4c8' : r >= 6 ? '#22c55e' : r >= 4 ? '#f59e0b' : '#6b7280'
}

function ratingBg(r: number) {
  return r >= 7 ? 'bg-wave-400' : r >= 5 ? 'bg-green-500' : r >= 3 ? 'bg-yellow-500' : 'bg-ocean-700'
}

function fmtFace(lo: number, hi: number): string {
  const fmt = (n: number) => n < 4 ? n.toFixed(1) : n.toFixed(0)
  const l = fmt(lo), h = fmt(hi)
  return l === h ? `${l}` : `${l}–${h}`
}

function fmtHour(h: number): string {
  if (h === 0)  return '12am'
  if (h < 12)  return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

// ── Hourly detail panel ────────────────────────────────────────────────────────

function HourlyDetail({ date, hourly }: { date: string; hourly: ForecastHour[] }) {
  const rows = hourly
    .filter(h => h.date === date && h.hour >= 5 && h.hour <= 20)

  if (rows.length === 0) return (
    <p className="text-ocean-500 text-sm py-4 text-center">No hourly data for this day.</p>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[480px]">
        <thead>
          <tr className="text-ocean-500 border-b border-ocean-700/50">
            <th className="text-left py-2 pr-3 font-medium">Time</th>
            <th className="text-right pr-3 font-medium">Wave</th>
            <th className="text-right pr-3 font-medium">Period</th>
            <th className="text-right pr-3 font-medium">Wind</th>
            <th className="text-right pr-3 font-medium">Tide</th>
            <th className="text-right pr-3 font-medium">Crowd</th>
            <th className="text-right font-medium">Rating</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(h => (
            <tr key={h.hour} className="border-b border-ocean-800/60 hover:bg-ocean-800/30 transition-colors">
              <td className="py-1.5 pr-3 text-ocean-300 font-semibold">{fmtHour(h.hour)}</td>

              <td className="text-right pr-3">
                <span className="text-ocean-50 font-bold">
                  {fmtFace(h.face_height_min_ft, h.face_height_max_ft)}
                </span>
                <span className="text-ocean-500">ft</span>
              </td>

              <td className="text-right pr-3">
                <span className="text-ocean-200">
                  {h.swell_period_s ? `${h.swell_period_s.toFixed(0)}s` : '--'}
                </span>
                <span className="text-ocean-600 ml-1">{PERIOD_STARS[h.period_quality] ?? ''}</span>
              </td>

              <td className={clsx('text-right pr-3 font-medium', WIND_COLOR[h.wind_quality])}>
                {h.wind_speed_mph.toFixed(0)} mph
              </td>

              <td className="text-right pr-3 text-ocean-400">
                {h.tide_ft != null ? `${h.tide_ft.toFixed(1)}ft` : '--'}
              </td>

              <td className="text-right pr-3">
                <div className="flex items-center justify-end gap-1">
                  <div className={clsx('w-2 h-2 rounded-full', CROWD_DOT[h.crowd_level])} />
                  <span className="text-ocean-500 capitalize">{h.crowd_level}</span>
                </div>
              </td>

              <td className="text-right">
                <span className="font-black text-sm" style={{ color: ratingColor(h.surf_rating) }}>
                  {h.surf_rating}
                </span>
                <span className="text-ocean-600">/10</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ForecastPanel({ daily, hourly = [] }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  if (!daily || daily.length === 0) return null

  const toggleDay = (date: string) =>
    setSelectedDate(prev => prev === date ? null : date)

  return (
    <div className="card-glow p-5">
      <p className="stat-label mb-4">14-Day Swell Forecast</p>

      {/* ── Day grid — 7 per row, wraps to second row ── */}
      <div className="grid grid-cols-7 gap-1.5">
        {daily.map((day, i) => {
          const isToday    = i === 0
          const isSelected = selectedDate === day.date
          const faceStr    = fmtFace(day.face_height_min_ft, day.face_height_max_ft)
          const hasHourly  = hourly.some(h => h.date === day.date)

          return (
            <button
              key={day.date}
              onClick={() => toggleDay(day.date)}
              className={clsx(
                'rounded-xl p-2 flex flex-col items-center gap-1.5 border transition-all text-left',
                isSelected
                  ? 'bg-wave-400/15 border-wave-400/60 ring-1 ring-wave-400/30'
                  : isToday
                  ? 'bg-wave-400/10 border-wave-400/30 hover:border-wave-400/50'
                  : 'bg-ocean-800/40 border-ocean-700/40 hover:border-ocean-600/60',
              )}
            >
              {/* Day label */}
              <p className={clsx(
                'text-xs font-bold',
                isSelected ? 'text-wave-400' : isToday ? 'text-wave-400' : 'text-ocean-300'
              )}>
                {day.day_label}
              </p>

              {/* Face height */}
              <div className="text-center">
                <p className="text-ocean-50 font-black text-base leading-tight">
                  {faceStr}<span className="text-ocean-500 font-normal text-xs">ft</span>
                </p>
                <p className="text-ocean-500 text-[10px] leading-tight truncate w-full">
                  {day.face_height_label}
                </p>
              </div>

              {/* Period */}
              {day.swell_period_s && (
                <div className="text-center">
                  <p className="text-ocean-200 text-xs font-semibold">{day.swell_period_s.toFixed(0)}s</p>
                  <p className="text-[10px] text-ocean-500 leading-none">
                    {PERIOD_STARS[day.period_quality] ?? '★☆☆'}
                  </p>
                </div>
              )}

              {/* Swell direction */}
              <p className="text-ocean-400 text-[10px] font-medium">{day.swell_dir_label}</p>

              {/* Wind */}
              <div className={clsx('flex items-center gap-0.5 text-[10px]', WIND_COLOR[day.best_wind_quality])}>
                <Wind size={9} />
                <span>{day.avg_wind_speed_mph.toFixed(0)}</span>
              </div>

              {/* Rating bar + number */}
              <div className="w-full mt-0.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-black" style={{ color: ratingColor(day.surf_rating) }}>
                    {day.surf_rating}
                  </span>
                  <span className="text-ocean-600 text-[10px]">/10</span>
                </div>
                <div className="w-full bg-ocean-700/50 rounded-full h-1.5">
                  <div
                    className={clsx('h-1.5 rounded-full transition-all', ratingBg(day.surf_rating))}
                    style={{ width: `${(day.surf_rating / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* Peak time + crowd + expand indicator */}
              <div className="flex items-center justify-between w-full px-0.5">
                <span className="text-[9px] text-ocean-600">{fmtHour(day.peak_hour)}</span>
                <div className="flex items-center gap-1">
                  <div
                    className={clsx('w-2 h-2 rounded-full', CROWD_DOT[day.crowd_level])}
                    title={`Crowd: ${day.crowd_level}`}
                  />
                  {hasHourly && (
                    <ChevronDown
                      size={9}
                      className={clsx(
                        'text-ocean-600 transition-transform',
                        isSelected && 'rotate-180'
                      )}
                    />
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Hourly detail panel ── */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-ocean-700/50">
              <p className="stat-label mb-3">
                {daily.find(d => d.date === selectedDate)?.day_label ?? selectedDate} — Hourly Breakdown
              </p>
              <HourlyDetail date={selectedDate} hourly={hourly} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 pt-3 border-t border-ocean-700/40 text-[11px] text-ocean-500">
        <span>Tap any day for hourly breakdown · Dot = crowd</span>
        <span className="text-emerald-400 flex items-center gap-1"><Wind size={9} /> Offshore</span>
        <span className="text-yellow-400 flex items-center gap-1"><Wind size={9} /> Cross</span>
        <span className="text-red-400 flex items-center gap-1"><Wind size={9} /> Onshore</span>
      </div>
    </div>
  )
}
