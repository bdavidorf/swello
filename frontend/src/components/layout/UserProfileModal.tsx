import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, CheckCircle, AlertCircle } from 'lucide-react'
import { useSpotStore } from '../../store/spotStore'
import type { SkillLevel, BoardType } from '../../types/swelloAI'

const SKILLS: { id: SkillLevel; label: string; desc: string }[] = [
  { id: 'beginner',     label: 'Beginner',     desc: 'Learning the basics' },
  { id: 'intermediate', label: 'Intermediate',  desc: 'Solid pop-up, reading waves' },
  { id: 'advanced',     label: 'Advanced',      desc: 'Carving, steeper drops' },
  { id: 'expert',       label: 'Expert',        desc: 'Big surf, technical breaks' },
]

const BOARDS: { id: BoardType; label: string; icon: string }[] = [
  { id: 'longboard',  label: 'Longboard',  icon: '🏄' },
  { id: 'funboard',   label: 'Funboard',   icon: '🌊' },
  { id: 'fish',       label: 'Fish',       icon: '🐟' },
  { id: 'shortboard', label: 'Shortboard', icon: '⚡' },
]

export function UserProfileModal() {
  const {
    profileOpen, setProfileOpen,
    userProfile, setUserProfile,
    userLocation, setUserLocation,
  } = useSpotStore()

  const [locStatus, setLocStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>(
    userLocation ? 'granted' : 'idle'
  )

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocStatus('denied')
      return
    }
    setLocStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setLocStatus('granted')
      },
      () => setLocStatus('denied'),
      { timeout: 10000 }
    )
  }

  return (
    <AnimatePresence>
      {profileOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setProfileOpen(false)}
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
                    YOUR SURF PROFILE
                  </p>
                  <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#5AAAC8', margin: '4px 0 0' }}>
                    Saved automatically · used by Swello AI
                  </p>
                </div>
                <button
                  onClick={() => setProfileOpen(false)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(120,184,216,0.20)',
                    background: 'rgba(120,184,216,0.08)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#78B8D8', cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Username / Handle */}
              <section style={{ marginBottom: 24 }}>
                <p style={{
                  fontFamily: "'Bangers', Impact, system-ui",
                  fontSize: 11, letterSpacing: '0.18em', color: '#5AAAC8', margin: '0 0 10px',
                }}>
                  🤙 YOUR HANDLE
                </p>
                <input
                  type="text"
                  value={userProfile.username}
                  onChange={e => setUserProfile({ username: e.target.value })}
                  placeholder="e.g. grommet42"
                  style={{
                    width: '100%',
                    background: 'rgba(13,28,42,0.80)',
                    border: '1px solid rgba(120,184,216,0.20)',
                    borderRadius: 14,
                    padding: '12px 16px',
                    fontSize: 16,
                    color: '#A0C0D8',
                    fontFamily: "'Inter', system-ui",
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </section>

              {/* Location */}
              <section style={{ marginBottom: 24 }}>
                <p style={{
                  fontFamily: "'Bangers', Impact, system-ui",
                  fontSize: 11, letterSpacing: '0.18em', color: '#5AAAC8', margin: '0 0 10px',
                }}>
                  📍 YOUR LOCATION
                </p>
                <div style={{
                  background: 'rgba(13,28,42,0.80)',
                  border: '1px solid rgba(120,184,216,0.12)',
                  borderRadius: 16, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {locStatus === 'granted' ? (
                      <CheckCircle size={18} style={{ color: '#4ADE80', flexShrink: 0 }} />
                    ) : locStatus === 'denied' ? (
                      <AlertCircle size={18} style={{ color: '#F87171', flexShrink: 0 }} />
                    ) : (
                      <MapPin size={18} style={{ color: '#5AAAC8', flexShrink: 0 }} />
                    )}
                    <div>
                      <p style={{ fontFamily: "'Inter', system-ui", fontSize: 13, color: '#A0C0D8', margin: 0, fontWeight: 600 }}>
                        {locStatus === 'granted'
                          ? `${userLocation!.lat.toFixed(2)}°N, ${Math.abs(userLocation!.lon).toFixed(2)}°W`
                          : locStatus === 'denied'
                          ? 'Location access denied'
                          : 'Location not set'}
                      </p>
                      <p style={{ fontFamily: "'Inter', system-ui", fontSize: 11, color: '#4A7A9A', margin: '2px 0 0' }}>
                        {locStatus === 'granted'
                          ? 'Swello AI will prioritize nearby spots'
                          : 'Enable to get nearby spot recommendations'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={requestLocation}
                    disabled={locStatus === 'loading'}
                    style={{
                      padding: '7px 14px', borderRadius: 12, flexShrink: 0,
                      background: locStatus === 'granted' ? 'rgba(74,222,128,0.12)' : 'rgba(120,184,216,0.15)',
                      border: `1px solid ${locStatus === 'granted' ? 'rgba(74,222,128,0.30)' : 'rgba(120,184,216,0.30)'}`,
                      fontFamily: "'Bangers', Impact, system-ui",
                      fontSize: 12, letterSpacing: '0.12em',
                      color: locStatus === 'granted' ? '#4ADE80' : '#D8EEF8',
                      cursor: locStatus === 'loading' ? 'default' : 'pointer',
                      opacity: locStatus === 'loading' ? 0.6 : 1,
                    }}
                  >
                    {locStatus === 'loading' ? 'LOCATING…' : locStatus === 'granted' ? 'UPDATE' : 'USE MY LOCATION'}
                  </button>
                </div>
              </section>

              {/* Skill level */}
              <section style={{ marginBottom: 24 }}>
                <p style={{
                  fontFamily: "'Bangers', Impact, system-ui",
                  fontSize: 11, letterSpacing: '0.18em', color: '#5AAAC8', margin: '0 0 10px',
                }}>
                  🏄 SKILL LEVEL
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SKILLS.map(s => {
                    const active = userProfile.skill === s.id
                    return (
                      <button
                        key={s.id}
                        onClick={() => setUserProfile({ skill: s.id })}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 16px', borderRadius: 14, textAlign: 'left',
                          background: active ? 'rgba(120,184,216,0.15)' : 'rgba(13,28,42,0.60)',
                          border: `1px solid ${active ? 'rgba(120,184,216,0.45)' : 'rgba(120,184,216,0.10)'}`,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <div>
                          <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 16, letterSpacing: '0.08em', color: active ? '#D8EEF8' : '#6AAED0', margin: 0 }}>
                            {s.label}
                          </p>
                          <p style={{ fontFamily: "'Inter', system-ui", fontSize: 11, color: active ? '#78B8D8' : '#3A6A8A', margin: '2px 0 0' }}>
                            {s.desc}
                          </p>
                        </div>
                        {active && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#78B8D8', flexShrink: 0 }} />
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Board type */}
              <section style={{ marginBottom: 24 }}>
                <p style={{
                  fontFamily: "'Bangers', Impact, system-ui",
                  fontSize: 11, letterSpacing: '0.18em', color: '#5AAAC8', margin: '0 0 10px',
                }}>
                  🛹 BOARD TYPE
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {BOARDS.map(b => {
                    const active = userProfile.board === b.id
                    return (
                      <button
                        key={b.id}
                        onClick={() => setUserProfile({ board: b.id })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 14px', borderRadius: 14,
                          background: active ? 'rgba(120,184,216,0.15)' : 'rgba(13,28,42,0.60)',
                          border: `1px solid ${active ? 'rgba(120,184,216,0.45)' : 'rgba(120,184,216,0.10)'}`,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{b.icon}</span>
                        <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 15, letterSpacing: '0.08em', color: active ? '#D8EEF8' : '#6AAED0' }}>
                          {b.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Preferences */}
              <section style={{ marginBottom: 8 }}>
                <p style={{
                  fontFamily: "'Bangers', Impact, system-ui",
                  fontSize: 11, letterSpacing: '0.18em', color: '#5AAAC8', margin: '0 0 10px',
                }}>
                  ⚙️ PREFERENCES
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {([
                    { key: 'prefers_bigger',    label: 'I prefer bigger waves',         icon: '🌊' },
                    { key: 'prefers_cleaner',   label: 'Prioritize clean conditions',   icon: '✨' },
                    { key: 'prefers_uncrowded', label: 'Avoid crowded lineups',         icon: '🤙' },
                  ] as const).map(({ key, label, icon }) => {
                    const active = userProfile[key]
                    return (
                      <button
                        key={key}
                        onClick={() => setUserProfile({ [key]: !active })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px', borderRadius: 14, textAlign: 'left',
                          background: active ? 'rgba(120,184,216,0.12)' : 'rgba(13,28,42,0.60)',
                          border: `1px solid ${active ? 'rgba(120,184,216,0.35)' : 'rgba(120,184,216,0.10)'}`,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <div style={{
                          width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                          border: `2px solid ${active ? '#78B8D8' : 'rgba(120,184,216,0.25)'}`,
                          background: active ? 'rgba(120,184,216,0.22)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {active && <span style={{ color: '#88C8E8', fontSize: 12, lineHeight: 1 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 16 }}>{icon}</span>
                        <span style={{ fontFamily: "'Inter', system-ui", fontSize: 14, color: active ? '#C0DCF0' : '#6AAED0' }}>
                          {label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
