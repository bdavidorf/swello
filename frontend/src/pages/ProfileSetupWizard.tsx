import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'
import { useSpotStore } from '../store/spotStore'
import { useAuthStore } from '../store/authStore'
import type { SkillLevel, BoardType } from '../types/swelloAI'

const STEPS = 4   // skill, board, prefs, location

const SKILLS: { id: SkillLevel; label: string; desc: string; emoji: string }[] = [
  { id: 'beginner',     label: 'Beginner',     emoji: '🌊', desc: 'Still getting comfortable on the board' },
  { id: 'intermediate', label: 'Intermediate',  emoji: '🏄', desc: 'Solid pop-up, can read the lineup' },
  { id: 'advanced',     label: 'Advanced',      emoji: '⚡', desc: 'Carving, late drops, barrel experience' },
  { id: 'expert',       label: 'Expert',        emoji: '🔥', desc: 'Big surf, technical breaks, competitions' },
]

const BOARDS: { id: BoardType; label: string; emoji: string; desc: string }[] = [
  { id: 'longboard',  label: 'Longboard',  emoji: '🏄', desc: 'Mellow waves, nose-rides, cruise sessions' },
  { id: 'funboard',   label: 'Funboard',   emoji: '😎', desc: 'Best of both worlds, easy to paddle' },
  { id: 'fish',       label: 'Fish',       emoji: '🐟', desc: 'Small to medium surf, retro vibes' },
  { id: 'shortboard', label: 'Shortboard', emoji: '⚡', desc: 'Performance surfing, steeper waves' },
]

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
      {Array.from({ length: STEPS }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 2, overflow: 'hidden',
          background: 'rgba(120,184,216,0.15)',
        }}>
          <motion.div
            animate={{ width: i <= step ? '100%' : '0%' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ height: '100%', background: i < step ? '#4ADE80' : '#78B8D8', borderRadius: 2 }}
          />
        </div>
      ))}
    </div>
  )
}

export function ProfileSetupWizard({ onComplete }: { onComplete: () => void }) {
  const { userProfile, setUserProfile, setUserLocation, userLocation } = useSpotStore()
  const { username, setProfileComplete } = useAuthStore()
  const [step, setStep] = useState(0)
  const [locStatus, setLocStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>(
    userLocation ? 'granted' : 'idle'
  )

  function next() {
    if (step < STEPS - 1) {
      setStep(s => s + 1)
    } else {
      setProfileComplete(true)
      onComplete()
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) { setLocStatus('denied'); return }
    setLocStatus('loading')
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLocStatus('granted') },
      () => setLocStatus('denied'),
      { timeout: 10000 }
    )
  }

  const slideVariants = {
    enter:  { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0  },
    exit:   { opacity: 0, x: -40 },
  }

  return (
    <div style={{
      minHeight: '100dvh', width: '100vw',
      background: 'linear-gradient(160deg, #050f1a 0%, #0a1e30 40%, #091828 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <svg width="32" height="20" viewBox="0 0 28 18" fill="none" style={{ margin: '0 auto 8px', display: 'block' }}>
            <path d="M1 11 C4 5, 7 3, 10 3 C13 3, 14 7, 17 7 C20 7, 22 4, 26 2" stroke="#78B8D8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M1 16 C4 11, 7 9, 10 9 C13 9, 14 13, 17 13 C20 13, 22 10, 26 8" stroke="#78B8D8" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
          </svg>
          <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 14, letterSpacing: '0.18em', color: '#5AAAC8', margin: 0 }}>
            HEY {(username ?? 'SURFER').toUpperCase()} 🤙
          </p>
          <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 30, letterSpacing: '0.06em', color: '#D8EEF8', margin: '4px 0 0', lineHeight: 1 }}>
            LET'S SET UP YOUR PROFILE
          </p>
        </div>

        <ProgressBar step={step} />

        <div style={{
          background: 'rgba(10,24,40,0.92)',
          border: '1px solid rgba(120,184,216,0.14)',
          borderRadius: 24,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          padding: '28px 24px',
          minHeight: 360,
          display: 'flex', flexDirection: 'column',
        }}>
          <AnimatePresence mode="wait">
            {/* ── Step 0: Skill level ── */}
            {step === 0 && (
              <motion.div key="skill" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, letterSpacing: '0.18em', color: '#5AAAC8', margin: '0 0 6px' }}>STEP 1 OF 4</p>
                <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 26, letterSpacing: '0.06em', color: '#D8EEF8', margin: '0 0 20px', lineHeight: 1.1 }}>
                  WHAT'S YOUR SKILL LEVEL?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {SKILLS.map(s => {
                    const active = userProfile.skill === s.id
                    return (
                      <button key={s.id} onClick={() => setUserProfile({ skill: s.id })} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 16px', borderRadius: 16, textAlign: 'left', border: 'none',
                        background: active ? 'rgba(120,184,216,0.18)' : 'rgba(120,184,216,0.05)',
                        outline: active ? '1.5px solid rgba(120,184,216,0.50)' : '1px solid rgba(120,184,216,0.10)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{s.emoji}</span>
                        <div>
                          <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 18, letterSpacing: '0.06em', color: active ? '#D8EEF8' : '#6AAED0', margin: 0 }}>{s.label}</p>
                          <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: active ? '#78B8D8' : '#3A6A8A', margin: '2px 0 0' }}>{s.desc}</p>
                        </div>
                        {active && <div style={{ marginLeft: 'auto', width: 10, height: 10, borderRadius: '50%', background: '#78B8D8', flexShrink: 0 }} />}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Board type ── */}
            {step === 1 && (
              <motion.div key="board" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, letterSpacing: '0.18em', color: '#5AAAC8', margin: '0 0 6px' }}>STEP 2 OF 4</p>
                <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 26, letterSpacing: '0.06em', color: '#D8EEF8', margin: '0 0 20px', lineHeight: 1.1 }}>
                  WHAT DO YOU RIDE?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {BOARDS.map(b => {
                    const active = userProfile.board === b.id
                    return (
                      <button key={b.id} onClick={() => setUserProfile({ board: b.id })} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 16px', borderRadius: 16, textAlign: 'left', border: 'none',
                        background: active ? 'rgba(120,184,216,0.18)' : 'rgba(120,184,216,0.05)',
                        outline: active ? '1.5px solid rgba(120,184,216,0.50)' : '1px solid rgba(120,184,216,0.10)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{b.emoji}</span>
                        <div>
                          <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 18, letterSpacing: '0.06em', color: active ? '#D8EEF8' : '#6AAED0', margin: 0 }}>{b.label}</p>
                          <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: active ? '#78B8D8' : '#3A6A8A', margin: '2px 0 0' }}>{b.desc}</p>
                        </div>
                        {active && <div style={{ marginLeft: 'auto', width: 10, height: 10, borderRadius: '50%', background: '#78B8D8', flexShrink: 0 }} />}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Preferences ── */}
            {step === 2 && (
              <motion.div key="prefs" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, letterSpacing: '0.18em', color: '#5AAAC8', margin: '0 0 6px' }}>STEP 3 OF 4</p>
                <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 26, letterSpacing: '0.06em', color: '#D8EEF8', margin: '0 0 8px', lineHeight: 1.1 }}>
                  HOW DO YOU LIKE YOUR WAVES?
                </p>
                <p style={{ fontFamily: "'Inter', system-ui", fontSize: 13, color: '#4A7A9A', margin: '0 0 24px' }}>
                  Select all that apply — Swello AI will use these to find your perfect session.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  {([
                    { key: 'prefers_bigger'    as const, label: 'I like it BIG',           sub: 'Give me overhead+ waves',                emoji: '🌊' },
                    { key: 'prefers_cleaner'   as const, label: 'Clean over powerful',      sub: 'Groomed, glassy conditions over raw size', emoji: '✨' },
                    { key: 'prefers_uncrowded' as const, label: 'Avoid the crowds',         sub: 'I\'d rather drive further for empty peaks', emoji: '🤙' },
                  ]).map(({ key, label, sub, emoji }) => {
                    const active = userProfile[key]
                    return (
                      <button key={key} onClick={() => setUserProfile({ [key]: !active })} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '16px', borderRadius: 16, textAlign: 'left', border: 'none',
                        background: active ? 'rgba(120,184,216,0.15)' : 'rgba(120,184,216,0.04)',
                        outline: active ? '1.5px solid rgba(120,184,216,0.40)' : '1px solid rgba(120,184,216,0.10)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                          border: `2px solid ${active ? '#78B8D8' : 'rgba(120,184,216,0.20)'}`,
                          background: active ? 'rgba(120,184,216,0.25)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {active && <span style={{ color: '#88C8E8', fontSize: 13, lineHeight: 1 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
                        <div>
                          <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 16, letterSpacing: '0.06em', color: active ? '#D8EEF8' : '#6AAED0', margin: 0 }}>{label}</p>
                          <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: active ? '#78B8D8' : '#3A6A8A', margin: '2px 0 0' }}>{sub}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Location ── */}
            {step === 3 && (
              <motion.div key="loc" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, letterSpacing: '0.18em', color: '#5AAAC8', margin: '0 0 6px' }}>STEP 4 OF 4</p>
                <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 26, letterSpacing: '0.06em', color: '#D8EEF8', margin: '0 0 8px', lineHeight: 1.1 }}>
                  WHERE DO YOU SURF?
                </p>
                <p style={{ fontFamily: "'Inter', system-ui", fontSize: 13, color: '#4A7A9A', margin: '0 0 28px', lineHeight: 1.5 }}>
                  Share your location so Swello AI recommends spots near you. You can skip this and set it later.
                </p>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{
                    background: 'rgba(13,28,42,0.80)', border: '1px solid rgba(120,184,216,0.12)',
                    borderRadius: 18, padding: '20px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center',
                  }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: locStatus === 'granted' ? 'rgba(74,222,128,0.15)' : 'rgba(120,184,216,0.12)',
                      border: `1px solid ${locStatus === 'granted' ? 'rgba(74,222,128,0.30)' : 'rgba(120,184,216,0.20)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {locStatus === 'granted'
                        ? <CheckCircle size={28} style={{ color: '#4ADE80' }} />
                        : locStatus === 'denied'
                        ? <AlertCircle size={28} style={{ color: '#F87171' }} />
                        : <MapPin size={28} style={{ color: '#78B8D8' }} />
                      }
                    </div>

                    <div>
                      <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 18, letterSpacing: '0.06em', color: '#D8EEF8', margin: 0 }}>
                        {locStatus === 'granted' ? 'LOCATION SET!' : locStatus === 'denied' ? 'ACCESS DENIED' : 'ENABLE LOCATION'}
                      </p>
                      <p style={{ fontFamily: "'Inter', system-ui", fontSize: 13, color: '#4A7A9A', margin: '6px 0 0' }}>
                        {locStatus === 'granted'
                          ? `${userLocation!.lat.toFixed(2)}°N, ${Math.abs(userLocation!.lon).toFixed(2)}°W — Swello will find spots near you`
                          : locStatus === 'denied'
                          ? 'You can enable location access later in your profile'
                          : 'Swello will prioritize surf spots close to home'}
                      </p>
                    </div>

                    {locStatus !== 'granted' && locStatus !== 'denied' && (
                      <button
                        onClick={requestLocation}
                        disabled={locStatus === 'loading'}
                        style={{
                          padding: '12px 28px', borderRadius: 12, border: 'none',
                          background: 'rgba(120,184,216,0.18)',
                          outline: '1px solid rgba(120,184,216,0.35)',
                          fontFamily: "'Bangers', Impact, system-ui",
                          fontSize: 14, letterSpacing: '0.14em', color: '#D8EEF8',
                          cursor: 'pointer',
                        }}
                      >
                        {locStatus === 'loading' ? 'LOCATING...' : '📍 USE MY LOCATION'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
            <button
              onClick={() => step > 0 ? setStep(s => s - 1) : undefined}
              style={{
                background: 'none', border: 'none', cursor: step > 0 ? 'pointer' : 'default',
                fontFamily: "'Bangers', Impact, system-ui", fontSize: 13, letterSpacing: '0.12em',
                color: step > 0 ? '#4A7A9A' : 'transparent', padding: '8px 0',
              }}
            >
              ← BACK
            </button>

            <button
              onClick={next}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, rgba(120,184,216,0.25) 0%, rgba(90,170,200,0.18) 100%)',
                outline: '1px solid rgba(120,184,216,0.35)',
                fontFamily: "'Bangers', Impact, system-ui",
                fontSize: 16, letterSpacing: '0.14em', color: '#D8EEF8',
                cursor: 'pointer', boxShadow: '0 4px 20px rgba(120,184,216,0.12)',
              }}
            >
              {step === STEPS - 1 ? "LET'S SURF 🤙" : 'NEXT'}
              {step < STEPS - 1 && <ChevronRight size={16} />}
            </button>
          </div>

          {step === STEPS - 1 && (
            <button
              onClick={() => { setProfileComplete(true); onComplete() }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Inter', system-ui", fontSize: 12, color: '#2A4A5A',
                textDecoration: 'underline', marginTop: 12, display: 'block', width: '100%', textAlign: 'center',
              }}
            >
              Skip location for now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
