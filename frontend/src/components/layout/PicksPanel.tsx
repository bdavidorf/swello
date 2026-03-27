import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useSpotStore } from '../../store/spotStore'
import { fetchSwelloAI } from '../../api/client'
import type { SpotPick, SwelloAIResponse } from '../../types/swelloAI'

const RANK_COLORS = ['#F4C430', '#C0C0C0', '#CD7F32']
const RANK_LABELS = ['1ST', '2ND', '3RD']

function scoreColor(score: number): string {
  if (score >= 7.5) return '#88C8E8'
  if (score >= 5.5) return '#5AAAC8'
  return '#78B8D8'
}

function crowdDotColor(crowd: string): string {
  const lower = crowd.toLowerCase()
  if (lower.includes('empty') || lower.includes('uncrowded') || lower.includes('light')) return '#4ADE80'
  if (lower.includes('moderate') || lower.includes('medium')) return '#FBBF24'
  return '#F87171'
}

export function PicksPanel() {
  const {
    picksOpen, setPicksOpen,
    userProfile, userLocation,
    setSelectedSpot, setMobileTab,
  } = useSpotStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [picks, setPicks] = useState<SpotPick[]>([])

  // Cache key: serialize profile to detect meaningful changes
  const lastFetchKey = useRef<string | null>(null)

  useEffect(() => {
    if (!picksOpen) return

    const key = JSON.stringify({ ...userProfile, userLocation })
    // Only re-fetch if profile changed or we have no results yet
    if (lastFetchKey.current === key && picks.length > 0) return

    async function load() {
      setLoading(true)
      setError(false)
      try {
        const result: SwelloAIResponse = await fetchSwelloAI(
          userProfile,
          userLocation ?? undefined,
        )
        setPicks(result.top_picks.slice(0, 3))
        lastFetchKey.current = key
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [picksOpen, userProfile, userLocation])

  function handleGo(pick: SpotPick) {
    setSelectedSpot(pick.spot_id)
    setMobileTab('waves')
    setPicksOpen(false)
  }

  function retry() {
    lastFetchKey.current = null
    setPicks([])
    // Re-trigger by faking the effect: we need picksOpen to stay true
    // Setting error false will cause re-render, and useEffect will re-run because lastFetchKey is cleared
    setError(false)
    setLoading(true)
    fetchSwelloAI(userProfile, userLocation ?? undefined)
      .then((result: SwelloAIResponse) => {
        setPicks(result.top_picks.slice(0, 3))
        lastFetchKey.current = JSON.stringify({ ...userProfile, userLocation })
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }

  return (
    <AnimatePresence>
      {picksOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPicksOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              zIndex: 201,
              background: 'rgba(10,22,36,0.98)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(120,184,216,0.14)',
              borderBottom: 'none',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
              maxHeight: '88vh',
              overflowY: 'auto',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(120,184,216,0.25)' }} />
            </div>

            <div style={{ padding: '8px 20px 0' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <p style={{
                    fontFamily: "'Bangers', Impact, system-ui",
                    fontSize: 26, color: '#D8EEF8', lineHeight: 1, letterSpacing: '0.06em', margin: 0,
                  }}>
                    YOUR PICKS
                  </p>
                  <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#5AAAC8', margin: '4px 0 0' }}>
                    Top spots for your skill &amp; preferences
                  </p>
                </div>
                <button
                  onClick={() => setPicksOpen(false)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(120,184,216,0.20)',
                    background: 'rgba(120,184,216,0.08)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#78B8D8', cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Loading state */}
              {loading && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{
                    fontFamily: "'Bangers', Impact, system-ui",
                    fontSize: 20, letterSpacing: '0.14em', color: '#5AAAC8',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    margin: 0,
                  }}>
                    LOADING YOUR PICKS...
                  </p>
                  <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.35 } }`}</style>
                </div>
              )}

              {/* Error state */}
              {!loading && error && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <p style={{ fontFamily: "'Inter', system-ui", fontSize: 14, color: '#F87171', marginBottom: 16 }}>
                    Could not load picks. Try again.
                  </p>
                  <button
                    onClick={retry}
                    style={{
                      padding: '8px 20px', borderRadius: 12,
                      background: 'rgba(120,184,216,0.15)',
                      border: '1px solid rgba(120,184,216,0.30)',
                      fontFamily: "'Bangers', Impact, system-ui",
                      fontSize: 13, letterSpacing: '0.12em',
                      color: '#D8EEF8', cursor: 'pointer',
                    }}
                  >
                    RETRY
                  </button>
                </div>
              )}

              {/* Picks cards */}
              {!loading && !error && picks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 8 }}>
                  {picks.map((pick, i) => (
                    <div
                      key={pick.spot_id}
                      style={{
                        background: 'rgba(13,28,42,0.80)',
                        border: '1px solid rgba(120,184,216,0.14)',
                        borderRadius: 18,
                        padding: '16px 16px 14px',
                      }}
                    >
                      {/* Top row: rank badge + spot name + score */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        {/* Rank badge */}
                        <div style={{
                          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                          background: `${RANK_COLORS[i]}22`,
                          border: `1.5px solid ${RANK_COLORS[i]}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{
                            fontFamily: "'Bangers', Impact, system-ui",
                            fontSize: 11, letterSpacing: '0.10em',
                            color: RANK_COLORS[i], lineHeight: 1,
                          }}>
                            {RANK_LABELS[i]}
                          </span>
                        </div>

                        {/* Spot name */}
                        <p style={{
                          fontFamily: "'Bangers', Impact, system-ui",
                          fontSize: 20, letterSpacing: '0.06em',
                          color: '#D8EEF8', margin: 0, flex: 1,
                          lineHeight: 1.1,
                        }}>
                          {pick.spot_name}
                        </p>

                        {/* Score */}
                        <p style={{
                          fontFamily: "'Inter', system-ui",
                          fontWeight: 700, fontSize: 26,
                          color: scoreColor(pick.score),
                          margin: 0, lineHeight: 1, flexShrink: 0,
                        }}>
                          {pick.score.toFixed(1)}
                        </p>
                      </div>

                      {/* Wave info row */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                        <span style={{
                          background: 'rgba(120,184,216,0.10)',
                          border: '1px solid rgba(120,184,216,0.18)',
                          borderRadius: 8, padding: '3px 10px',
                          fontFamily: "'Inter', system-ui", fontSize: 12, color: '#88C8E8',
                        }}>
                          {pick.face_height_label}
                        </span>
                        <span style={{
                          background: 'rgba(120,184,216,0.10)',
                          border: '1px solid rgba(120,184,216,0.18)',
                          borderRadius: 8, padding: '3px 10px',
                          fontFamily: "'Inter', system-ui", fontSize: 12, color: '#88C8E8',
                        }}>
                          {pick.wave_power_label}
                        </span>
                        {/* Crowd */}
                        <span style={{
                          background: 'rgba(120,184,216,0.06)',
                          border: '1px solid rgba(120,184,216,0.12)',
                          borderRadius: 8, padding: '3px 10px',
                          fontFamily: "'Inter', system-ui", fontSize: 12, color: '#6AAED0',
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <span style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: crowdDotColor(pick.crowd), flexShrink: 0,
                            display: 'inline-block',
                          }} />
                          {pick.crowd}
                        </span>
                      </div>

                      {/* GO SURF button */}
                      <button
                        onClick={() => handleGo(pick)}
                        style={{
                          width: '100%', padding: '10px 0',
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, #78B8D8 0%, #5AAAC8 100%)',
                          border: 'none', cursor: 'pointer',
                          fontFamily: "'Bangers', Impact, system-ui",
                          fontSize: 14, letterSpacing: '0.14em',
                          color: '#0D1C2A',
                          boxShadow: '0 2px 10px rgba(120,184,216,0.25)',
                        }}
                      >
                        GO SURF →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
