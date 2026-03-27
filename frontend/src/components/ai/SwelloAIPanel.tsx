import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Wind, Waves, Clock, Users, ChevronRight, AlertTriangle, RefreshCw, UserCircle } from 'lucide-react'
import { fetchSwelloAI } from '../../api/client'
import { useSpotStore } from '../../store/spotStore'
import type { SwelloAIResponse, SpotPick } from '../../types/swelloAI'

// ── Colors ────────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 7.5) return '#88C8E8'
  if (s >= 5.5) return '#5AAAC8'
  if (s >= 3.5) return '#78B8D8'
  return '#4A7A9A'
}

function crowdColor(c: string) {
  if (c === 'low')      return '#5AAAC8'
  if (c === 'moderate') return '#78B8D8'
  return '#88C8E8'
}

const RANK_BADGE = ['#F4C430', '#C0C0C0', '#CD7F32']   // gold, silver, bronze

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const color = scoreColor(score)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height: 6, borderRadius: 3,
        background: 'rgba(120,184,216,0.12)',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 3, background: color }}
        />
      </div>
      <span style={{
        fontFamily: "'Inter', system-ui", fontWeight: 800,
        fontSize: 20, color, lineHeight: 1,
        fontVariantNumeric: 'tabular-nums', minWidth: 36,
      }}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

// ── Factor bar mini ────────────────────────────────────────────────────────────
function FactorBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 75 ? '#5AAAC8' : pct >= 45 ? '#78B8D8' : '#6AAED0'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        fontFamily: "'Bangers', Impact, system-ui",
        fontSize: 9, letterSpacing: '0.14em', color: '#6AAED0',
        width: 42, flexShrink: 0,
      }}>{label}</span>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(120,184,216,0.10)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: color }} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#6AAED0', width: 24 }}>
        {pct}%
      </span>
    </div>
  )
}

// ── Spot card ─────────────────────────────────────────────────────────────────
function SpotCard({ pick, rank, onSelect }: {
  pick: SpotPick
  rank: number
  onSelect: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(rank === 0)
  const color = scoreColor(pick.score)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.12, duration: 0.4 }}
      style={{
        background: 'rgba(13,28,42,0.80)',
        border: `1px solid ${rank === 0 ? 'rgba(136,200,232,0.25)' : 'rgba(120,184,216,0.10)'}`,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: rank === 0 ? '0 4px 24px rgba(120,184,216,0.12)' : 'none',
      }}
    >
      {/* Header row */}
      <div
        style={{ padding: '14px 16px 12px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          {/* Rank + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              background: RANK_BADGE[rank] + '22',
              border: `1px solid ${RANK_BADGE[rank]}66`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Bangers', Impact, system-ui",
              fontSize: 13, color: RANK_BADGE[rank], letterSpacing: '0.06em',
            }}>
              #{rank + 1}
            </div>
            <div>
              <p style={{
                fontFamily: "'Bangers', Impact, system-ui",
                fontSize: 20, color: '#D8EEF8', lineHeight: 1, letterSpacing: '0.06em',
              }}>
                {pick.spot_short_name.toUpperCase()}
              </p>
              <p style={{
                fontFamily: "'Bangers', Impact, system-ui",
                fontSize: 10, color: '#6AAED0', letterSpacing: '0.12em',
                marginTop: 2,
              }}>
                {pick.face_height_label} · {pick.wave_power_label} power
              </p>
            </div>
          </div>

          {/* Score + confidence */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              fontFamily: "'Inter', system-ui", fontWeight: 800,
              fontSize: 28, color, lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {pick.score.toFixed(1)}
            </div>
            <div style={{
              fontFamily: "'Bangers', Impact, system-ui",
              fontSize: 9, color: '#6AAED0', letterSpacing: '0.12em',
              marginTop: 2,
            }}>
              {pick.confidence}% CONF
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <ScoreBar score={pick.score} />
        </div>

        {/* Quick stats row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, marginTop: 10,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} style={{ color: '#6AAED0' }} />
            <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color: '#A0C0D8', letterSpacing: '0.08em' }}>
              {pick.best_window_start}–{pick.best_window_end}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={10} style={{ color: crowdColor(pick.crowd) }} />
            <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, color: crowdColor(pick.crowd), letterSpacing: '0.08em' }}>
              {pick.crowd.toUpperCase()} CROWD
            </span>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              borderTop: '1px solid rgba(120,184,216,0.08)',
              padding: '12px 16px 14px',
            }}>
              {/* Factor breakdown */}
              <p style={{
                fontFamily: "'Bangers', Impact, system-ui",
                fontSize: 9, letterSpacing: '0.18em', color: '#6AAED0',
                margin: '0 0 8px', textTransform: 'uppercase',
              }}>Score Breakdown</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                <FactorBar label="DIR"    value={pick.breakdown.direction} />
                <FactorBar label="WIND"   value={pick.breakdown.wind} />
                <FactorBar label="POWER"  value={pick.breakdown.power} />
                <FactorBar label="SIZE"   value={pick.breakdown.size} />
                <FactorBar label="PERIOD" value={pick.breakdown.period} />
                <FactorBar label="TIDE"   value={pick.breakdown.tide} />
              </div>

              {/* Reasons */}
              {pick.reasons.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {pick.reasons.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                      <Zap size={10} style={{ color: '#5AAAC8', flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#A0C0D8', lineHeight: 1.4 }}>
                        {r}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {pick.warnings.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {pick.warnings.map((w, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                      <AlertTriangle size={10} style={{ color: '#78B8D8', flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#6AAED0', lineHeight: 1.4 }}>
                        {w}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Go here button */}
              <button
                onClick={() => onSelect(pick.spot_id)}
                style={{
                  width: '100%', padding: '9px 0',
                  background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
                  border: `1px solid ${color}44`,
                  borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  cursor: 'pointer',
                  fontFamily: "'Bangers', Impact, system-ui",
                  fontSize: 13, color, letterSpacing: '0.14em',
                  transition: 'all 0.15s',
                }}
              >
                VIEW CONDITIONS
                <ChevronRight size={14} style={{ color }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle hint */}
      <div
        style={{
          padding: '4px 16px 8px',
          display: 'flex', justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <span style={{
          fontFamily: "'Bangers', Impact, system-ui",
          fontSize: 9, letterSpacing: '0.14em', color: '#4A7A9A',
        }}>
          {expanded ? '▲ LESS' : '▼ MORE'}
        </span>
      </div>
    </motion.div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function SwelloAIPanel() {
  const { setSelectedSpot, setMobileTab, userProfile, userLocation, setProfileOpen } = useSpotStore()
  const [result, setResult] = useState<SwelloAIResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function getRecommendations() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSwelloAI(userProfile, userLocation ?? undefined)
      setResult(data)
    } catch (e) {
      setError('Could not load recommendations. Backend may be starting up.')
    } finally {
      setLoading(false)
    }
  }

  function goToSpot(spotId: string) {
    setSelectedSpot(spotId)
    setMobileTab('waves')
  }

  const generatedTime = result
    ? new Date(result.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{
        background: 'rgba(13,28,42,0.80)',
        border: '1px solid rgba(120,184,216,0.12)',
        borderRadius: 18, padding: '16px 18px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{
            fontFamily: "'Bangers', Impact, system-ui",
            fontSize: 30, color: '#D8EEF8', lineHeight: 1, letterSpacing: '0.06em',
            margin: 0,
          }}>
            SWELLO AI 🤙
          </p>
          <p style={{
            fontFamily: "'Inter', system-ui", fontSize: 13, color: '#6AAED0',
            margin: '6px 0 0', lineHeight: 1.4,
          }}>
            Personalized spot rankings based on live NOAA conditions, wave power, and your surf style.
          </p>
          {result && (
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: '#5AAAC8', margin: '8px 0 0',
            }}>
              {result.conditions_summary}
            </p>
          )}
        </div>
        {/* Background wave decoration */}
        <Waves size={80} style={{
          position: 'absolute', right: -10, bottom: -10,
          color: 'rgba(120,184,216,0.06)', pointerEvents: 'none',
        }} />
      </div>

      {/* Profile summary — tap to edit */}
      <div
        onClick={() => setProfileOpen(true)}
        style={{
          background: 'rgba(13,28,42,0.80)',
          border: '1px solid rgba(120,184,216,0.12)',
          borderRadius: 16, padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', transition: 'border-color 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserCircle size={20} style={{ color: '#78B8D8', flexShrink: 0 }} />
          <div>
            <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 15, color: '#D8EEF8', letterSpacing: '0.06em', margin: 0 }}>
              {userProfile.skill.charAt(0).toUpperCase() + userProfile.skill.slice(1)} · {userProfile.board.charAt(0).toUpperCase() + userProfile.board.slice(1)}
            </p>
            <p style={{ fontFamily: "'Inter', system-ui", fontSize: 11, color: '#4A7A9A', margin: '2px 0 0' }}>
              {[
                userProfile.prefers_bigger    && 'bigger waves',
                userProfile.prefers_cleaner   && 'clean surf',
                userProfile.prefers_uncrowded && 'uncrowded',
              ].filter(Boolean).join(' · ') || 'No preferences set'}
              {userLocation && ' · 📍 nearby'}
            </p>
          </div>
        </div>
        <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, letterSpacing: '0.14em', color: '#5AAAC8' }}>
          EDIT ›
        </span>
      </div>

      {/* CTA button */}
      <button
        onClick={getRecommendations}
        disabled={loading}
        style={{
          width: '100%', padding: '13px 0',
          background: loading
            ? 'rgba(120,184,216,0.08)'
            : 'linear-gradient(135deg, rgba(120,184,216,0.18) 0%, rgba(90,170,200,0.12) 100%)',
          border: '1px solid rgba(120,184,216,0.30)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: loading ? 'default' : 'pointer',
          transition: 'all 0.2s',
          opacity: loading ? 0.7 : 1,
        }}
      >
        <RefreshCw size={14} style={{
          color: '#78B8D8',
          animation: loading ? 'spin 1s linear infinite' : 'none',
        }} />
        <span style={{
          fontFamily: "'Bangers', Impact, system-ui",
          fontSize: 16, letterSpacing: '0.14em', color: '#D8EEF8',
        }}>
          {loading ? 'ANALYZING CONDITIONS…' : result ? 'REFRESH PICKS' : 'GET MY PICKS'}
        </span>
      </button>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(120,184,216,0.06)',
          border: '1px solid rgba(120,184,216,0.15)',
          borderRadius: 12, padding: '12px 14px',
        }}>
          <p style={{ fontFamily: "'Inter', system-ui", fontSize: 13, color: '#6AAED0', margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && result.top_picks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{
                fontFamily: "'Bangers', Impact, system-ui",
                fontSize: 9, letterSpacing: '0.18em', color: '#6AAED0',
                margin: 0,
              }}>
                TOP PICKS RIGHT NOW
              </p>
              {generatedTime && (
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#4A7A9A', margin: 0 }}>
                  updated {generatedTime}
                </p>
              )}
            </div>
            {result.top_picks.map((pick, i) => (
              <SpotCard key={pick.spot_id} pick={pick} rank={i} onSelect={goToSpot} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
