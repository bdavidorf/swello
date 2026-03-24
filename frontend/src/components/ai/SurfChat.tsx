import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, Waves } from 'lucide-react'
import { fetchAIChat } from '../../api/client'
import { useSpotStore } from '../../store/spotStore'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const GREETING: Message = {
  role: 'assistant',
  content: "Hey! I'm your Swello Surf Advisor 🤙 Tell me your skill level and what you're after, and I'll find you the best spots and windows across all 11 LA breaks.",
}

const BOARD_W = 300
const BOARD_H = 520

// ── Surfboard shape — classic shortboard silhouette ─────────────────────────
// Wide in the chest, tapers to nose (top) and tail (bottom)
const BOARD_CLIP = `path('M 150 0 C 205 0 290 48 294 120 L 296 390 C 296 458 240 520 150 520 C 60 520 4 458 4 390 L 6 120 C 10 48 95 0 150 0 Z')`

function ChatWindow({ onClose }: { onClose: () => void }) {
  const { selectedSpotId } = useSpotStore()
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const windowRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const safeBottom = 76 + 16
    const totalH = BOARD_H + 32 + 28
    setPos({
      x: window.innerWidth - BOARD_W - 16,
      y: window.innerHeight - totalH - safeBottom,
    })
  }, [])

  const onDragStart = useCallback((clientX: number, clientY: number) => {
    if (!windowRef.current) return
    dragging.current = true
    const rect = windowRef.current.getBoundingClientRect()
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const onDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragging.current) return
    const totalH = BOARD_H + 60
    const x = Math.max(0, Math.min(window.innerWidth - BOARD_W, clientX - dragOffset.current.x))
    const y = Math.max(0, Math.min(window.innerHeight - totalH, clientY - dragOffset.current.y))
    setPos({ x, y })
  }, [])

  const onDragEnd = useCallback(() => { dragging.current = false }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => onDragMove(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => onDragMove(e.touches[0].clientX, e.touches[0].clientY)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onDragEnd)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onDragEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onDragEnd)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onDragEnd)
    }
  }, [onDragMove, onDragEnd])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const { reply } = await fetchAIChat(
        next.map(m => ({ role: m.role, content: m.content })),
        selectedSpotId,
      )
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, having trouble connecting right now. Try again in a moment." },
      ])
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (!pos) return null

  return (
    <div
      ref={windowRef}
      className="fixed z-50 select-none"
      style={{ left: pos.x, top: pos.y, width: BOARD_W }}
    >
      {/* ── Surfboard nose tip (decorative) ── */}
      <div style={{
        width: 56, height: 32,
        margin: '0 auto',
        position: 'relative',
        bottom: -2,
        background: 'linear-gradient(to bottom, rgba(120,184,216,0.25), rgba(13,28,42,0.95))',
        borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(120,184,216,0.25)',
        borderBottom: 'none',
      }} />

      {/* ── Main board body ── */}
      <div
        style={{
          width: BOARD_W,
          height: BOARD_H,
          clipPath: BOARD_CLIP,
          position: 'relative',
          background: 'linear-gradient(165deg, rgba(13,28,42,0.97) 0%, rgba(18,42,66,0.95) 40%, rgba(10,22,34,0.94) 100%)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.50), 0 8px 24px rgba(120,184,216,0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Board outline highlight — gives the board a glassy edge */}
        <div style={{
          position: 'absolute', inset: 0,
          clipPath: BOARD_CLIP,
          border: '1.5px solid rgba(168,200,220,0.20)',
          borderRadius: 0,
          pointerEvents: 'none',
          zIndex: 10,
        }} />

        {/* Stringer — thin center line down the board */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '6%', bottom: '6%',
          width: 1,
          background: 'linear-gradient(to bottom, transparent, rgba(120,184,216,0.25) 20%, rgba(120,184,216,0.25) 80%, transparent)',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        {/* Rail stripe — subtle color band on left edge */}
        <div style={{
          position: 'absolute',
          left: 18, top: '12%', bottom: '12%',
          width: 3,
          background: 'linear-gradient(to bottom, transparent, rgba(120,184,216,0.30) 30%, rgba(90,170,200,0.20) 70%, transparent)',
          borderRadius: 2,
          pointerEvents: 'none',
          zIndex: 1,
        }} />
        <div style={{
          position: 'absolute',
          right: 18, top: '12%', bottom: '12%',
          width: 3,
          background: 'linear-gradient(to bottom, transparent, rgba(120,184,216,0.30) 30%, rgba(90,170,200,0.20) 70%, transparent)',
          borderRadius: 2,
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        {/* Leash plug dot */}
        <div style={{
          position: 'absolute',
          bottom: 42, left: '50%',
          transform: 'translateX(-50%)',
          width: 8, height: 8,
          borderRadius: '50%',
          background: 'rgba(120,184,216,0.25)',
          border: '1px solid rgba(120,184,216,0.30)',
          pointerEvents: 'none',
          zIndex: 2,
        }} />

        {/* ── Header — drag handle ── */}
        <div
          className="flex items-center justify-between flex-shrink-0 cursor-grab active:cursor-grabbing"
          style={{
            padding: '22px 24px 12px',
            touchAction: 'none',
            zIndex: 3,
            position: 'relative',
          }}
          onMouseDown={e => onDragStart(e.clientX, e.clientY)}
          onTouchStart={e => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        >
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: 'rgba(120,184,216,0.18)',
              border: '1px solid rgba(120,184,216,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Waves size={14} style={{ color: '#78B8D8' }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 20, color: '#D8EEF8', lineHeight: 1, letterSpacing: '0.06em' }}>
                Ask Swello 🤙
              </p>
            </div>
          </div>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#3A5A78', border: '1px solid rgba(26,48,72,0.70)',
              background: 'rgba(13,28,42,0.65)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(120,184,216,0.15)', margin: '0 20px', flexShrink: 0 }} />

        {/* ── Messages ── */}
        <div
          style={{
            flex: 1, overflowY: 'auto',
            padding: '12px 20px',
            display: 'flex', flexDirection: 'column',
            gap: 10,
            zIndex: 3, position: 'relative',
          }}
        >
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '84%',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '8px 12px',
                fontSize: 13,
                lineHeight: 1.5,
                fontFamily: 'Inter, system-ui, sans-serif',
                ...(msg.role === 'user' ? {
                  background: 'linear-gradient(135deg, #5AAAC8 0%, #3A88B8 100%)',
                  color: '#0D1C2A',
                  fontWeight: 600,
                  boxShadow: '0 2px 10px rgba(90,170,200,0.30)',
                } : {
                  background: 'rgba(18,37,52,0.88)',
                  color: '#A0C0D8',
                  border: '1px solid rgba(120,184,216,0.15)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }),
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                background: 'rgba(18,37,52,0.88)',
                border: '1px solid rgba(120,184,216,0.15)',
                borderRadius: '16px 16px 16px 4px',
                padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 14 }}>
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#78B8D8',
                      display: 'inline-block',
                      animation: `bounce 1.2s ${delay}ms ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(120,184,216,0.12)',
          padding: '10px 20px 16px',
          display: 'flex', alignItems: 'flex-end', gap: 8,
          background: 'rgba(8,16,26,0.30)',
          zIndex: 3, position: 'relative',
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about conditions or spots…"
            rows={1}
            style={{
              flex: 1,
              background: 'rgba(13,28,42,0.85)',
              border: '1px solid rgba(120,184,216,0.18)',
              borderRadius: 14,
              padding: '8px 12px',
              fontSize: 13,
              color: '#A0C0D8',
              resize: 'none',
              outline: 'none',
              maxHeight: 72,
              overflowY: 'auto',
              lineHeight: 1.45,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: 36, height: 36, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #78B8D8 0%, #5AAAC8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(120,184,216,0.35)',
              opacity: !input.trim() || loading ? 0.45 : 1,
              transition: 'all 0.15s',
            }}
          >
            <Send size={14} style={{ color: '#0D1C2A' }} />
          </button>
        </div>
      </div>

      {/* ── Surfboard tail / fin cluster ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, position: 'relative', top: -2 }}>
        {/* Side fins */}
        <div style={{
          width: 20, height: 22,
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
          background: 'linear-gradient(to bottom, rgba(13,28,42,0.95), rgba(120,184,216,0.15))',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(120,184,216,0.18)',
          transform: 'rotate(-8deg)',
        }} />
        {/* Center fin */}
        <div style={{
          width: 28, height: 28,
          clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
          background: 'linear-gradient(to bottom, rgba(13,28,42,0.95), rgba(120,184,216,0.20))',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(120,184,216,0.22)',
        }} />
        {/* Side fin */}
        <div style={{
          width: 20, height: 22,
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
          background: 'linear-gradient(to bottom, rgba(13,28,42,0.95), rgba(120,184,216,0.15))',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(120,184,216,0.18)',
          transform: 'rotate(8deg)',
        }} />
      </div>
    </div>
  )
}

export function SurfChatWidget() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && <ChatWindow onClose={() => setOpen(false)} />}

      <button
        onClick={() => setOpen(o => !o)}
        className="ask-swello-btn fixed z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-full"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 76px)',
          right: 16,
          display: open ? 'none' : 'flex',
          color: '#0D1C2A',
        }}
      >
        <Waves size={18} style={{ color: '#0D1C2A' }} />
        <span style={{ fontFamily: "'Bangers', Impact, system-ui", fontWeight: 400, fontSize: 16, letterSpacing: '0.06em' }}>
          Ask Swello 🤙
        </span>
      </button>
    </>
  )
}
