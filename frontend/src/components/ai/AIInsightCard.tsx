import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, MapPin, Clock, Waves, Users } from 'lucide-react'
import type { AIRankingResponse, SpotWindow } from '../../types/surf'
import { format, parseISO } from 'date-fns'

interface Props {
  data: AIRankingResponse | null
  loading: boolean
  onRequest: () => void
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  const idx = useRef(0)

  useEffect(() => {
    idx.current = 0
    setDisplayed('')
    const interval = setInterval(() => {
      if (idx.current < text.length) {
        setDisplayed(text.slice(0, idx.current + 1))
        idx.current++
      } else {
        clearInterval(interval)
      }
    }, 18)
    return () => clearInterval(interval)
  }, [text])

  return <span>{displayed}</span>
}

function WindowCard({ window: w, rank }: { window: SpotWindow; rank: number }) {
  const start = parseISO(w.start)
  const end = parseISO(w.end)
  const isTop = rank === 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      className={`rounded-xl p-4 border transition-colors ${
        isTop
          ? 'border-wave-400/50 bg-wave-400/8'
          : 'border-ocean-700/60 bg-ocean-800/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 ${
            isTop ? 'bg-wave-400 text-ocean-950' : 'bg-ocean-700 text-ocean-300'
          }`}>
            {rank}
          </span>
          <div>
            <p className={`font-bold text-sm ${isTop ? 'text-wave-400' : 'text-ocean-50'}`}>
              {w.spot_name}
            </p>
            <div className="flex items-center gap-1.5 text-ocean-400 text-xs mt-0.5">
              <Clock size={10} />
              <span>{format(start, 'EEE M/d, ha')} – {format(end, 'ha')}</span>
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-wave-400 font-black text-lg leading-none">
            {Math.round(w.composite_score * 100)}
          </div>
          <div className="text-ocean-500 text-xs">score</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 mb-2">
        <Stat icon={<Waves size={10} />} label="Waves" value={`${w.wave_height_ft}ft @ ${w.period_s.toFixed(0)}s`} />
        <Stat icon={<Users size={10} />} label="Crowd" value={`${Math.round(w.crowd_score)}/100`} />
        <Stat label="Wind" value={w.wind_quality} />
      </div>
      <p className="text-ocean-400 text-xs leading-relaxed border-t border-ocean-700/40 pt-2">
        {w.why}
      </p>
    </motion.div>
  )
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="stat-label flex items-center gap-1 mb-0.5">
        {icon}{label}
      </p>
      <p className="text-ocean-200 text-xs font-semibold capitalize">{value}</p>
    </div>
  )
}

export function AIInsightCard({ data, loading, onRequest }: Props) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (data) setExpanded(true)
  }, [data])

  return (
    <div className="card border-l-2 border-l-wave-400 overflow-hidden">
      {/* Header / trigger */}
      <button
        className="w-full p-5 flex items-center justify-between hover:bg-wave-400/5 transition-colors"
        onClick={() => {
          if (!data && !loading) onRequest()
          setExpanded((e) => !e)
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-wave-400/15 flex items-center justify-center">
            <Sparkles size={16} className="text-wave-400" />
          </div>
          <div className="text-left">
            <p className="font-bold text-ocean-50 text-sm">AI Surf Advisor</p>
            <p className="text-ocean-400 text-xs">
              {data ? `Best: ${data.top_pick_time}` : 'Tap to find your best windows'}
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-ocean-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {loading && (
                <div className="flex items-center gap-3 py-6 justify-center">
                  <div className="w-5 h-5 border-2 border-wave-400/30 border-t-wave-400 rounded-full animate-spin" />
                  <p className="text-ocean-400 text-sm">Claude is analyzing all spots...</p>
                </div>
              )}

              {data && !loading && (
                <>
                  {/* Explanation */}
                  <div className="bg-ocean-800/60 rounded-xl p-4 border border-ocean-700/50">
                    <p className="text-ocean-200 text-sm leading-relaxed">
                      <TypewriterText text={data.explanation} />
                    </p>
                  </div>

                  {/* Ranked windows */}
                  <div className="space-y-3">
                    {data.ranked_windows.map((w, i) => (
                      <WindowCard key={`${w.spot_id}-${i}`} window={w} rank={i + 1} />
                    ))}
                  </div>

                  {/* Refresh */}
                  <button
                    onClick={onRequest}
                    className="btn-ghost w-full text-sm flex items-center justify-center gap-2"
                  >
                    <Sparkles size={13} />
                    Refresh Recommendations
                  </button>
                </>
              )}

              {!data && !loading && (
                <div className="py-6 text-center">
                  <Sparkles size={28} className="text-ocean-600 mx-auto mb-3" />
                  <p className="text-ocean-400 text-sm mb-4">
                    Set your preferences and Claude will find the best<br />surf windows for you across all LA spots.
                  </p>
                  <button onClick={onRequest} className="btn-primary">
                    Find My Best Windows
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
