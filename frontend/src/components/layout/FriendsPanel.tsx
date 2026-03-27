import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, Check, Copy, Link } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSpotStore } from '../../store/spotStore'
import { useAuthStore } from '../../store/authStore'
import {
  fetchFriendsList, sendFriendRequest, acceptFriendRequest,
  removeFriend, setMySurfSession, clearMySurfSession, fetchMySession,
  type FriendOut,
} from '../../api/client'

type Tab = 'friends' | 'add' | 'share'

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const colors = ['#78B8D8', '#5AAAC8', '#4ADE80', '#FBBF24', '#F87171', '#C084FC']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${color}22`, border: `1.5px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: size * 0.44, color, lineHeight: 1 }}>
        {name[0].toUpperCase()}
      </span>
    </div>
  )
}

export function FriendsPanel() {
  const { friendsOpen, setFriendsOpen, selectedSpotId, setMobileTab } = useSpotStore()
  const { username } = useAuthStore()
  const qc = useQueryClient()

  const [tab, setTab] = useState<Tab>('friends')
  const [addInput, setAddInput] = useState('')
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [copied, setCopied] = useState(false)

  const friendLink = username ? `${window.location.origin}?add=${username}` : ''

  const friendsQ = useQuery({
    queryKey: ['friends'],
    queryFn: fetchFriendsList,
    enabled: friendsOpen,
    refetchInterval: friendsOpen ? 30_000 : false,
  })

  const mySessionQ = useQuery({
    queryKey: ['my-session'],
    queryFn: fetchMySession,
    enabled: friendsOpen,
    refetchInterval: friendsOpen ? 30_000 : false,
  })

  const sendReq = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      setAddSuccess(`Request sent! They'll see it when they open Friends.`)
      setAddInput('')
      setAddError('')
      qc.invalidateQueries({ queryKey: ['friends'] })
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail ?? ''
      if (detail.toLowerCase().includes('not found')) {
        setAddError('Username not found. Check the spelling and try again.')
      } else if (detail.toLowerCase().includes('already')) {
        setAddError(detail)
      } else {
        setAddError('Could not send request. Try again.')
      }
      setAddSuccess('')
    },
  })

  const acceptReq = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })

  const removeReq = useMutation({
    mutationFn: removeFriend,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })

  const setSession = useMutation({
    mutationFn: setMySurfSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-session'] }),
  })

  const clearSession = useMutation({
    mutationFn: clearMySurfSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-session'] }),
  })

  const friends = friendsQ.data ?? []
  const accepted = friends.filter(f => f.status === 'accepted')
  const pendingIn = friends.filter(f => f.status === 'pending_received')
  const pendingSent = friends.filter(f => f.status === 'pending_sent')
  const surfingNow = accepted.filter(f => f.surfing)
  const mySession = mySessionQ.data

  function handleSurfNow() {
    if (mySession) { clearSession.mutate(); return }
    const spotMeta = qc.getQueryData<any[]>(['spot-meta'])
    const spot = spotMeta?.find(s => s.id === selectedSpotId)
    if (!spot) return
    setSession.mutate({ spot_id: spot.id, spot_name: spot.name, lat: spot.lat, lon: spot.lon })
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(friendLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
    fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, letterSpacing: '0.12em',
    background: active ? 'rgba(120,184,216,0.18)' : 'rgba(120,184,216,0.07)',
    border: `1px solid ${active ? 'rgba(120,184,216,0.40)' : 'rgba(120,184,216,0.14)'}`,
    color: active ? '#78B8D8' : '#5AAAC8',
  })

  return (
    <AnimatePresence>
      {friendsOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setFriendsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
              background: 'rgba(10,22,36,0.98)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(120,184,216,0.14)', borderBottom: 'none',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
              maxHeight: '92vh', overflowY: 'auto',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(120,184,216,0.25)' }} />
            </div>

            <div style={{ padding: '8px 20px 0' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 26, color: '#D8EEF8', lineHeight: 1, letterSpacing: '0.06em', margin: 0 }}>FRIENDS</p>
                  <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#5AAAC8', margin: '4px 0 0' }}>See where your crew is surfing</p>
                </div>
                <button onClick={() => setFriendsOpen(false)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(120,184,216,0.20)', background: 'rgba(120,184,216,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#78B8D8', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Surf Now card */}
              <div style={{ background: mySession ? 'rgba(74,222,128,0.08)' : 'rgba(120,184,216,0.07)', border: `1px solid ${mySession ? 'rgba(74,222,128,0.30)' : 'rgba(120,184,216,0.18)'}`, borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 14, letterSpacing: '0.12em', color: mySession ? '#4ADE80' : '#78B8D8', margin: 0 }}>
                      {mySession ? '● SURFING NOW' : 'SHARE YOUR SESSION'}
                    </p>
                    <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: mySession ? '#86EFAC' : '#5AAAC8', margin: '3px 0 0' }}>
                      {mySession ? mySession.spot_name : "Let friends see where you're at"}
                    </p>
                  </div>
                  <button onClick={handleSurfNow} style={{ padding: '7px 14px', borderRadius: 10, cursor: 'pointer', background: mySession ? 'rgba(248,113,113,0.15)' : 'linear-gradient(135deg, #78B8D8, #5AAAC8)', border: mySession ? '1px solid rgba(248,113,113,0.40)' : 'none', fontFamily: "'Bangers', Impact, system-ui", fontSize: 12, letterSpacing: '0.12em', color: mySession ? '#F87171' : '#0D1C2A' }}>
                    {mySession ? 'END SESSION' : 'GO LIVE →'}
                  </button>
                </div>
              </div>

              {/* Surfing Now */}
              {surfingNow.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, letterSpacing: '0.18em', color: '#4ADE80', margin: '0 0 10px' }}>IN THE WATER NOW</p>
                  {surfingNow.map(f => (
                    <div key={f.username} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 14, padding: '10px 12px' }}>
                      <Avatar name={f.username} size={36} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 16, color: '#D8EEF8', margin: 0 }}>{f.username}</p>
                        <p style={{ fontFamily: "'Inter', system-ui", fontSize: 11, color: '#4ADE80', margin: '2px 0 0' }}>● {f.surfing!.spot_name}</p>
                      </div>
                      <button onClick={() => { setFriendsOpen(false); setMobileTab('spots') }} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.30)', fontFamily: "'Bangers', Impact, system-ui", fontSize: 10, letterSpacing: '0.10em', color: '#4ADE80', cursor: 'pointer' }}>MAP →</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending requests badge */}
              {pendingIn.length > 0 && tab !== 'friends' && (
                <button onClick={() => setTab('friends')} style={{ width: '100%', marginBottom: 12, padding: '10px', borderRadius: 12, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.35)', fontFamily: "'Bangers', Impact, system-ui", fontSize: 12, letterSpacing: '0.12em', color: '#FBBF24', cursor: 'pointer' }}>
                  🏄 {pendingIn.length} FRIEND REQUEST{pendingIn.length > 1 ? 'S' : ''} WAITING
                </button>
              )}

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setTab('friends')} style={btnStyle(tab === 'friends')}>
                  FRIENDS {pendingIn.length > 0 ? `(${pendingIn.length} NEW)` : `(${accepted.length})`}
                </button>
                <button onClick={() => setTab('add')} style={btnStyle(tab === 'add')}>ADD</button>
                <button onClick={() => setTab('share')} style={btnStyle(tab === 'share')}>MY QR</button>
              </div>

              {/* ── Tab: Friends list ── */}
              {tab === 'friends' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                  {pendingIn.map(f => (
                    <div key={f.username} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: 14, padding: '10px 12px' }}>
                      <Avatar name={f.username} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 16, color: '#D8EEF8', margin: 0 }}>{f.username}</p>
                        <p style={{ fontFamily: "'Inter', system-ui", fontSize: 11, color: '#FBBF24', margin: '2px 0 0' }}>wants to be friends</p>
                      </div>
                      <button onClick={() => acceptReq.mutate(f.username)} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.30)', color: '#4ADE80', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Check size={14} /></button>
                      <button onClick={() => removeReq.mutate(f.username)} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#F87171', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
                    </div>
                  ))}
                  {accepted.map(f => (
                    <div key={f.username} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(13,28,42,0.80)', border: '1px solid rgba(120,184,216,0.14)', borderRadius: 14, padding: '10px 12px' }}>
                      <Avatar name={f.username} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 16, color: '#D8EEF8', margin: 0 }}>{f.username}</p>
                        <p style={{ fontFamily: "'Inter', system-ui", fontSize: 11, color: f.surfing ? '#4ADE80' : '#3A6A8A', margin: '2px 0 0' }}>
                          {f.surfing ? `● Surfing at ${f.surfing.spot_name}` : 'Not surfing'}
                        </p>
                      </div>
                      <button onClick={() => removeReq.mutate(f.username)} style={{ padding: '5px 8px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', color: '#F87171', cursor: 'pointer', fontSize: 10, fontFamily: "'Bangers', Impact, system-ui", letterSpacing: '0.10em' }}>
                        REMOVE
                      </button>
                    </div>
                  ))}
                  {pendingSent.map(f => (
                    <div key={f.username} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(13,28,42,0.60)', border: '1px solid rgba(120,184,216,0.10)', borderRadius: 14, padding: '10px 12px', opacity: 0.7 }}>
                      <Avatar name={f.username} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 16, color: '#D8EEF8', margin: 0 }}>{f.username}</p>
                        <p style={{ fontFamily: "'Inter', system-ui", fontSize: 11, color: '#5AAAC8', margin: '2px 0 0' }}>Request sent — waiting for them to accept</p>
                      </div>
                      <button onClick={() => removeReq.mutate(f.username)} style={{ padding: '5px 8px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(120,184,216,0.14)', color: '#5AAAC8', cursor: 'pointer', fontSize: 10, fontFamily: "'Bangers', Impact, system-ui", letterSpacing: '0.10em' }}>
                        CANCEL
                      </button>
                    </div>
                  ))}
                  {accepted.length === 0 && pendingIn.length === 0 && pendingSent.length === 0 && (
                    <p style={{ fontFamily: "'Inter', system-ui", fontSize: 13, color: '#3A6A8A', textAlign: 'center', padding: '24px 0' }}>No friends yet — use ADD or MY QR to connect</p>
                  )}
                </div>
              )}

              {/* ── Tab: Add by username ── */}
              {tab === 'add' && (
                <div style={{ paddingBottom: 8 }}>
                  <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, letterSpacing: '0.16em', color: '#5AAAC8', margin: '0 0 6px' }}>SEARCH BY USERNAME</p>
                  <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#3A6A8A', margin: '0 0 14px' }}>
                    They'll get a request and need to accept it to become friends.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={addInput}
                      onChange={e => { setAddInput(e.target.value); setAddError(''); setAddSuccess('') }}
                      onKeyDown={e => { if (e.key === 'Enter' && addInput.trim()) sendReq.mutate(addInput.trim()) }}
                      placeholder="their username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      style={{
                        flex: 1, background: 'rgba(120,184,216,0.08)',
                        border: '1px solid rgba(120,184,216,0.25)', borderRadius: 12,
                        padding: '12px 14px', color: '#D8EEF8',
                        fontFamily: "'Inter', system-ui",
                        fontSize: 16,   /* 16px prevents iOS auto-zoom */
                        outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <button
                      onClick={() => addInput.trim() && sendReq.mutate(addInput.trim())}
                      disabled={sendReq.isPending || !addInput.trim()}
                      style={{ padding: '12px 16px', borderRadius: 12, background: addInput.trim() ? 'linear-gradient(135deg, #78B8D8, #5AAAC8)' : 'rgba(120,184,216,0.15)', border: 'none', cursor: addInput.trim() ? 'pointer' : 'default', fontFamily: "'Bangers', Impact, system-ui", fontSize: 13, letterSpacing: '0.12em', color: '#0D1C2A', flexShrink: 0 }}
                    >
                      <UserPlus size={16} />
                    </button>
                  </div>
                  {addError && <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#F87171', marginTop: 10, lineHeight: 1.4 }}>{addError}</p>}
                  {addSuccess && <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#4ADE80', marginTop: 10, lineHeight: 1.4 }}>{addSuccess}</p>}
                </div>
              )}

              {/* ── Tab: My QR / Share link ── */}
              {tab === 'share' && username && (
                <div style={{ paddingBottom: 8, textAlign: 'center' }}>
                  <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 11, letterSpacing: '0.16em', color: '#5AAAC8', margin: '0 0 6px' }}>YOUR FRIEND CODE</p>
                  <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#3A6A8A', margin: '0 0 20px' }}>
                    Have your friend scan this QR code — it sends them a friend request straight to you.
                  </p>

                  {/* QR code */}
                  <div style={{ display: 'inline-block', background: '#fff', borderRadius: 16, padding: 16, marginBottom: 20 }}>
                    <QRCodeSVG
                      value={friendLink}
                      size={180}
                      bgColor="#ffffff"
                      fgColor="#0D1C2A"
                      level="M"
                    />
                  </div>

                  <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 18, letterSpacing: '0.08em', color: '#D8EEF8', margin: '0 0 4px' }}>
                    @{username}
                  </p>
                  <p style={{ fontFamily: "'Inter', system-ui", fontSize: 11, color: '#3A6A8A', margin: '0 0 20px', wordBreak: 'break-all' }}>
                    {friendLink}
                  </p>

                  {/* Copy link button */}
                  <button
                    onClick={handleCopyLink}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, cursor: 'pointer', background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(120,184,216,0.12)', border: `1px solid ${copied ? 'rgba(74,222,128,0.40)' : 'rgba(120,184,216,0.30)'}`, fontFamily: "'Bangers', Impact, system-ui", fontSize: 13, letterSpacing: '0.12em', color: copied ? '#4ADE80' : '#D8EEF8' }}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? 'COPIED!' : 'COPY LINK'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
