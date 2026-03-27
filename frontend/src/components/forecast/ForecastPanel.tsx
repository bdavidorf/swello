import { useState } from 'react'
import clsx from 'clsx'
import { Wind, ChevronDown, Waves, ArrowUp } from 'lucide-react'
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

// ── Wave power calc (client-side approximation) ──────────────────────────────
function wavePowerKw(height_m: number | null, period_s: number | null): number | null {
  if (!height_m || !period_s) return null
  return 0.49 * height_m * height_m * period_s
}
function powerLabel(kw: number): string {
  if (kw < 2)   return 'TINY'
  if (kw < 6)   return 'WEAK'
  if (kw < 15)  return 'MOD'
  if (kw < 35)  return 'SOLID'
  if (kw < 70)  return 'POWERFUL'
  return 'HEAVY'
}
function powerColor(kw: number): string {
  if (kw < 2)   return '#6AAED0'
  if (kw < 6)   return '#78B8D8'
  if (kw < 15)  return '#5AAAC8'
  if (kw < 35)  return '#88C8E8'
  if (kw < 70)  return '#A0D0F0'
  return '#C8E8FF'
}

// ── Day summary header ────────────────────────────────────────────────────────
function DaySummary({ day }: { day: ForecastDay }) {
  const windCol = WIND_COLOR[day.best_wind_quality] ?? 'text-ocean-300'
  const pw = wavePowerKw(day.swell_height_m, day.swell_period_s)
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16,
    }}>
      {/* Wave */}
      <div style={{ background: 'rgba(120,184,216,0.07)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(120,184,216,0.12)' }}>
        <div style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 9, color: '#5AAAC8', letterSpacing: '0.14em', marginBottom: 4 }}>WAVE</div>
        <div style={{ fontFamily: "'Inter', system-ui", fontWeight: 800, fontSize: 20, color: '#D8EEF8', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {fmtFace(day.face_height_min_ft, day.face_height_max_ft)}<span style={{ fontSize: 11, color: '#6AAED0', fontWeight: 400 }}>ft</span>
        </div>
        <div style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 9, color: '#6AAED0', letterSpacing: '0.08em', marginTop: 2 }}>
          {day.face_height_label}
        </div>
      </div>

      {/* Swell */}
      <div style={{ background: 'rgba(120,184,216,0.07)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(120,184,216,0.12)' }}>
        <div style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 9, color: '#5AAAC8', letterSpacing: '0.14em', marginBottom: 4 }}>SWELL</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <ArrowUp size={10} style={{ color: '#88C8E8' }} />
          <div style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 16, color: '#D8EEF8', lineHeight: 1, letterSpacing: '0.04em' }}>
            {day.swell_dir_label}
          </div>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#6AAED0', marginTop: 2 }}>
          {day.swell_period_s ? `${day.swell_period_s.toFixed(0)}s` : '--'} · {day.swell_type_short}
        </div>
      </div>

      {/* Wind */}
      <div style={{ background: 'rgba(120,184,216,0.07)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(120,184,216,0.12)' }}>
        <div style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 9, color: '#5AAAC8', letterSpacing: '0.14em', marginBottom: 4 }}>WIND</div>
        <div className={clsx('flex items-center gap-1', windCol)}>
          <Wind size={12} />
          <span style={{ fontFamily: "'Inter', system-ui", fontWeight: 800, fontSize: 18, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {day.avg_wind_speed_mph.toFixed(0)}
          </span>
          <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 10, letterSpacing: '0.08em' }}>MPH</span>
        </div>
        <div style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 9, color: '#6AAED0', letterSpacing: '0.08em', marginTop: 2, textTransform: 'uppercase' }}>
          {day.best_wind_quality.replace('-', ' ')}
        </div>
      </div>

      {/* Power */}
      <div style={{ background: 'rgba(120,184,216,0.07)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(120,184,216,0.12)' }}>
        <div style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 9, color: '#5AAAC8', letterSpacing: '0.14em', marginBottom: 4 }}>POWER</div>
        {pw != null ? (
          <>
            <div style={{ fontFamily: "'Inter', system-ui", fontWeight: 800, fontSize: 18, color: powerColor(pw), lineHeight: 1, letterSpacing: '-0.02em' }}>
              {pw < 10 ? pw.toFixed(1) : pw.toFixed(0)}<span style={{ fontSize: 10, fontWeight: 400, color: '#6AAED0' }}>kJ</span>
            </div>
            <div style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 9, color: powerColor(pw), letterSpacing: '0.08em', marginTop: 2 }}>
              {powerLabel(pw)}
            </div>
          </>
        ) : (
          <div style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 18, color: '#6AAED0' }}>--</div>
        )}
      </div>
    </div>
  )
}

// ── Hourly detail panel ────────────────────────────────────────────────────────

function HourlyDetail({ date, day, hourly }: { date: string; day: ForecastDay; hourly: ForecastHour[] }) {
  const rows = hourly.filter(h => h.date === date && h.hour >= 5 && h.hour <= 20)

  return (
    <>
      <DaySummary day={day} />
      {rows.length === 0 ? (
        <p className="text-ocean-500 text-sm py-4 text-center">No hourly data for this day.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[520px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(120,184,216,0.15)' }}>
                {['TIME','WAVE','PERIOD','POWER','WIND','TIDE','CROWD','RATING'].map(h => (
                  <th key={h} style={{
                    fontFamily: "'Bangers', Impact, system-ui", fontSize: 9, letterSpacing: '0.14em',
                    color: '#5AAAC8', padding: '4px 8px 6px', textAlign: h === 'TIME' ? 'left' : 'right',
                    fontWeight: 400,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(h => {
                const pw = wavePowerKw(h.swell_height_m, h.swell_period_s)
                const isGoodHour = h.surf_rating >= 7
                return (
                  <tr key={h.hour} style={{
                    borderBottom: '1px solid rgba(120,184,216,0.07)',
                    background: isGoodHour ? 'rgba(120,184,216,0.04)' : 'transparent',
                  }}>
                    <td style={{ padding: '5px 8px', fontFamily: "'Bangers', Impact, system-ui", fontSize: 12, color: '#88C8E8', letterSpacing: '0.06em' }}>
                      {fmtHour(h.hour)}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                      <span style={{ fontFamily: "'Inter', system-ui", fontWeight: 800, fontSize: 12, color: '#D8EEF8' }}>
                        {fmtFace(h.face_height_min_ft, h.face_height_max_ft)}
                      </span>
                      <span style={{ color: '#6AAED0', fontSize: 10 }}>ft</span>
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: '#88C8E8', fontSize: 11 }}>
                      {h.swell_period_s ? `${h.swell_period_s.toFixed(0)}s` : '--'}
                      <span style={{ color: '#4A7A9A', marginLeft: 3, fontSize: 9 }}>{PERIOD_STARS[h.period_quality] ?? ''}</span>
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                      {pw != null ? (
                        <span style={{ fontFamily: "'Inter', system-ui", fontWeight: 700, fontSize: 11, color: powerColor(pw) }}>
                          {pw < 10 ? pw.toFixed(1) : pw.toFixed(0)}<span style={{ color: '#6AAED0', fontSize: 9 }}>kJ</span>
                        </span>
                      ) : <span style={{ color: '#4A7A9A' }}>--</span>}
                    </td>
                    <td className={clsx('text-right', WIND_COLOR[h.wind_quality])} style={{ padding: '5px 8px', fontFamily: "'Inter', system-ui", fontWeight: 600, fontSize: 11 }}>
                      {h.wind_speed_mph.toFixed(0)}<span style={{ fontSize: 9, opacity: 0.7 }}>mph</span>
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#78B8D8' }}>
                      {h.tide_ft != null ? `${h.tide_ft.toFixed(1)}ft` : '--'}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <div className={clsx('w-1.5 h-1.5 rounded-full', CROWD_DOT[h.crowd_level])} />
                        <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 10, color: '#6AAED0', letterSpacing: '0.06em', textTransform: 'capitalize' }}>{h.crowd_level}</span>
                      </div>
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                      <span style={{ fontFamily: "'Inter', system-ui", fontWeight: 900, fontSize: 13, color: ratingColor(h.surf_rating) }}>
                        {h.surf_rating}
                      </span>
                      <span style={{ color: '#4A7A9A', fontSize: 9 }}>/10</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
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
      <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 30, letterSpacing: '0.06em', color: '#D8EEF8', marginBottom: 16 }}>14-Day Swell Forecast</p>

      {/* ── Day grid — 5 per row, scrollable on mobile ── */}
      <div className="overflow-x-auto -mx-1 px-1">
      <div className="grid grid-cols-5 gap-2" style={{ minWidth: 400 }}>
        {daily.map((day, i) => {
          const isToday    = i === 0
          const isSelected = selectedDate === day.date
          const fmt        = (n: number) => n < 4 ? n.toFixed(1) : n.toFixed(0)
          const faceStr    = fmt(day.face_height_max_ft)
          const hasHourly  = hourly.some(h => h.date === day.date)

          return (
            <button
              key={day.date}
              onClick={() => toggleDay(day.date)}
              className={clsx(
                'rounded-xl p-2 flex flex-col items-center gap-1.5 border transition-all',
                isSelected
                  ? 'bg-wave-400/15 border-wave-400/60 ring-1 ring-wave-400/30'
                  : isToday
                  ? 'bg-wave-400/10 border-wave-400/30 hover:border-wave-400/50'
                  : 'bg-ocean-800/40 border-ocean-700/40 hover:border-ocean-600/60',
              )}
            >
              {/* Day */}
              <p className={clsx(
                'text-xs font-bold tracking-wide',
                isSelected ? 'text-wave-400' : isToday ? 'text-wave-400' : 'text-ocean-300'
              )}>
                {day.day_label}
              </p>

              {/* Wave height */}
              <p className="text-ocean-50 font-black text-xl leading-none">
                {faceStr}<span className="text-ocean-500 font-normal text-sm">ft</span>
              </p>

              {/* Rating bar + score + crowd */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-black leading-none" style={{ color: ratingColor(day.surf_rating) }}>
                    {day.surf_rating}
                  </span>
                  <div className={clsx('w-2 h-2 rounded-full', CROWD_DOT[day.crowd_level])} title={`Crowd: ${day.crowd_level}`} />
                </div>
                <div className="w-full bg-ocean-700/50 rounded-full h-1.5">
                  <div
                    className={clsx('h-1.5 rounded-full transition-all', ratingBg(day.surf_rating))}
                    style={{ width: `${(day.surf_rating / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* Wind */}
              <div className={clsx('flex items-center gap-1 text-xs', WIND_COLOR[day.best_wind_quality])}>
                <Wind size={10} />
                <span>{day.avg_wind_speed_mph.toFixed(0)}mph</span>
              </div>

              {/* Period */}
              {day.swell_period_s && (
                <p className="text-ocean-500 text-xs leading-none">{day.swell_period_s.toFixed(0)}s</p>
              )}

              {/* Expand chevron */}
              {hasHourly && (
                <ChevronDown size={10} className={clsx('text-ocean-700 transition-transform', isSelected && 'rotate-180')} />
              )}
            </button>
          )
        })}
      </div>
      </div>

      {/* ── Hourly detail panel ── */}
      <AnimatePresence>
        {selectedDate && (() => {
          const selDay = daily.find(d => d.date === selectedDate)
          if (!selDay) return null
          return (
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28 }}
              className="overflow-hidden"
            >
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(120,184,216,0.12)' }}>
                <p style={{
                  fontFamily: "'Bangers', Impact, system-ui", fontSize: 18, letterSpacing: '0.08em',
                  color: '#88C8E8', marginBottom: 12,
                }}>
                  {selDay.day_label} — Full Breakdown
                </p>
                <HourlyDetail date={selectedDate} day={selDay} hourly={hourly} />
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 pt-3 border-t border-ocean-700/40 text-xs text-ocean-500">
        <span>Tap any day for full breakdown · Dot = crowd</span>
        <span className="text-emerald-400 flex items-center gap-1"><Wind size={9} /> Offshore</span>
        <span className="text-yellow-400 flex items-center gap-1"><Wind size={9} /> Cross</span>
        <span className="text-red-400 flex items-center gap-1"><Wind size={9} /> Onshore</span>
      </div>
    </div>
  )
}
