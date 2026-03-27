import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { api } from '../api/client'

interface Props {
  onSuccess: (isNew: boolean) => void
}

export function AuthPage({ onSuccess }: Props) {
  const { setAuth } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'taken' | 'available'>('idle')
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onUsernameChange(val: string) {
    setUsername(val)
    setError(null)
    setUsernameStatus('idle')
    if (mode !== 'signup') return
    if (checkTimer.current) clearTimeout(checkTimer.current)
    if (val.length < 3) return
    checkTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/check/${encodeURIComponent(val)}`)
        setUsernameStatus(data.available ? 'available' : 'taken')
      } catch {}
    }, 500)
  }

  async function submit() {
    setError(null)
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login'
      const { data } = await api.post(endpoint, { username: username.trim(), password })
      setAuth(data.token, data.username)
      onSuccess(mode === 'signup')
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? 'Something went wrong. Try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') submit()
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    background: 'rgba(13,28,42,0.90)',
    border: '1.5px solid rgba(120,184,216,0.20)',
    borderRadius: 14, padding: '14px 16px',
    fontSize: 16, color: '#D8EEF8',
    fontFamily: "'Inter', system-ui",
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  const labelStyle = {
    fontFamily: "'Bangers', Impact, system-ui",
    fontSize: 11, letterSpacing: '0.18em', color: '#5AAAC8',
    display: 'block', marginBottom: 8,
  }

  return (
    <div style={{
      minHeight: '100dvh', width: '100vw',
      background: 'linear-gradient(160deg, #050f1a 0%, #0a1e30 40%, #091828 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient background waves */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(0,100,160,0.12) 0%, transparent 70%)',
      }} />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <svg width="44" height="28" viewBox="0 0 28 18" fill="none" style={{ margin: '0 auto 10px', display: 'block' }}>
          <path d="M1 11 C4 5, 7 3, 10 3 C13 3, 14 7, 17 7 C20 7, 22 4, 26 2"
            stroke="#78B8D8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M1 16 C4 11, 7 9, 10 9 C13 9, 14 13, 17 13 C20 13, 22 10, 26 8"
            stroke="#78B8D8" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
        </svg>
        <p style={{
          fontFamily: "'Bangers', Impact, system-ui",
          fontSize: 48, color: '#D8EEF8', letterSpacing: '0.10em', lineHeight: 1, margin: 0,
        }}>SWELLO</p>
        <p style={{
          fontFamily: "'Inter', system-ui", fontSize: 14, color: '#4A7A9A',
          margin: '8px 0 0', letterSpacing: '0.02em',
        }}>
          Your personal surf forecast.
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        style={{
          width: '100%', maxWidth: 400,
          background: 'rgba(10,24,40,0.92)',
          border: '1px solid rgba(120,184,216,0.14)',
          borderRadius: 24,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.50)',
          overflow: 'hidden',
        }}
      >
        {/* Mode tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(120,184,216,0.10)' }}>
          {(['signup', 'login'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setUsernameStatus('idle') }}
              style={{
                padding: '16px 0', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: mode === m ? 'rgba(120,184,216,0.10)' : 'transparent',
                borderBottom: mode === m ? '2px solid #78B8D8' : '2px solid transparent',
                fontFamily: "'Bangers', Impact, system-ui",
                fontSize: 15, letterSpacing: '0.14em',
                color: mode === m ? '#D8EEF8' : '#3A6A8A',
              }}
            >
              {m === 'signup' ? 'SIGN UP' : 'LOG IN'}
            </button>
          ))}
        </div>

        <div style={{ padding: '28px 24px 32px' }}>
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, x: mode === 'signup' ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {mode === 'signup' && (
                <p style={{ fontFamily: "'Inter', system-ui", fontSize: 13, color: '#4A7A9A', marginBottom: 24, lineHeight: 1.5, margin: '0 0 24px' }}>
                  Create your account to get personalized spot picks and save your profile.
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>🤙 USERNAME</label>
            <div style={{ position: 'relative' }}>
              <input
                value={username}
                onChange={e => onUsernameChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="e.g. grommet42"
                autoCapitalize="none"
                autoCorrect="off"
                style={{
                  ...inputStyle,
                  borderColor: usernameStatus === 'taken' ? 'rgba(248,113,113,0.50)'
                             : usernameStatus === 'available' ? 'rgba(74,222,128,0.50)'
                             : 'rgba(120,184,216,0.20)',
                  paddingRight: usernameStatus !== 'idle' ? 44 : 16,
                }}
              />
              {mode === 'signup' && usernameStatus !== 'idle' && (
                <span style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 18,
                }}>
                  {usernameStatus === 'available' ? '✓' : '✗'}
                </span>
              )}
            </div>
            {mode === 'signup' && usernameStatus === 'taken' && (
              <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#F87171', margin: '6px 0 0' }}>
                That username is taken. Try another.
              </p>
            )}
            {mode === 'signup' && usernameStatus === 'available' && (
              <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#4ADE80', margin: '6px 0 0' }}>
                ✓ That username is available!
              </p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>🔑 PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null) }}
                onKeyDown={onKeyDown}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                style={{ ...inputStyle, paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#3A6A8A', padding: 4,
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ fontFamily: "'Inter', system-ui", fontSize: 13, color: '#F87171', marginBottom: 16, lineHeight: 1.4 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            onClick={submit}
            disabled={loading || (mode === 'signup' && usernameStatus === 'taken')}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 14, border: 'none',
              background: loading
                ? 'rgba(120,184,216,0.15)'
                : 'linear-gradient(135deg, rgba(120,184,216,0.25) 0%, rgba(90,170,200,0.20) 100%)',
              cursor: loading ? 'default' : 'pointer',
              fontFamily: "'Bangers', Impact, system-ui",
              fontSize: 18, letterSpacing: '0.16em',
              color: loading ? '#3A6A8A' : '#D8EEF8',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(120,184,216,0.15)',
              transition: 'all 0.2s',
              opacity: (mode === 'signup' && usernameStatus === 'taken') ? 0.4 : 1,
            }}
          >
            {loading ? '...' : mode === 'signup' ? 'CREATE ACCOUNT →' : 'LOG IN →'}
          </button>

          {mode === 'login' && (
            <p style={{ textAlign: 'center', marginTop: 16, fontFamily: "'Inter', system-ui", fontSize: 12, color: '#3A6A8A' }}>
              Don't have an account?{' '}
              <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: '#78B8D8', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                Sign up
              </button>
            </p>
          )}
        </div>
      </motion.div>

      <p style={{ marginTop: 24, fontFamily: "'Inter', system-ui", fontSize: 11, color: '#1E3A50', textAlign: 'center' }}>
        By continuing you agree to Swello's terms. Your data stays on your device.
      </p>
    </div>
  )
}
