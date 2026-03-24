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

const BOARD_W = 320
const BOARD_H = 470

// ── Surfboard shape via clip-path (shortboard silhouette) ───────────────────
// The path tapers at nose (top) and tail (bottom) while keeping the body wide
const BOARD_CLIP = `path('M 160 0 C 210 0 302 42 314 108 L 316 364 C 316 432 256 470 160 470 C 64 470 4 432 4 364 L 6 108 C 18 42 110 0 160 0 Z')`

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
    // Account for nose (32px) + fin (24px) decorations
    const totalH = BOARD_H + 32 + 24
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
    const totalH = BOARD_H + 56
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
      {/* ── Surfboard nose (decorative) ── */}
      <div style={{
        width: 68, height: 32,
        margin: '0 auto',
        position: 'relative',
        bottom: -2,
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(240,252,250,0.88))',
        borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.7)',
        borderBottom: 'none',
      }} />

      {/* ── Main board body ── */}
      <div
        style={{
          width: BOARD_W,
          height: BOARD_H,
          clipPath: BOARD_CLIP,
          position: 'relative',
          // Surfboard foam texture — warm white with subtle teal tint
          background: 'linear-gradient(165deg, rgba(255,255,255,0.92) 0%, rgba(240,252,250,0.88) 40%, rgba(236,248,252,0.90) 100%)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          boxShadow: '0 20px 60px rgba(100,160,150,0.18), 0 8px 24px rgba(100,160,150,0.12)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Board outline highlight */}
        <div style={{
          position: 'absolute', inset: 0,
          clipPath: BOARD_CLIP,
          border: '1.5px solid rgba(255,255,255,0.88)',
          borderRadius: 0,
          pointerEvents: 'none',
          zIndex: 10,
        }} />

        {/* Stringer — thin center line down the board */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '6%', bottom: '6%',
          width: 1,
          background: 'linear-gradient(to bottom, transparent, rgba(168,218,220,0.35) 20%, rgba(168,218,220,0.35) 80%, transparent)',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        {/* Leash plug dot */}
        <div style={{
          position: 'absolute',
          bottom: 38, left: '50%',
          transform: 'translateX(-50%)',
          width: 7, height: 7,
          borderRadius: '50%',
          background: 'rgba(168,218,220,0.6)',
          border: '1px solid rgba(120,190,194,0.8)',
          pointerEvents: 'none',
          zIndex: 2,
        }} />

        {/* ── Header — drag handle, positioned in the board body ── */}
        <div
          className="flex items-center justify-between flex-shrink-0 cursor-grab active:cursor-grabbing"
          style={{
            padding: '20px 24px 12px',
            touchAction: 'none',
            zIndex: 3,
            position: 'relative',
          }}
          onMouseDown={e => onDragStart(e.clientX, e.clientY)}
          onTouchStart={e => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        >
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(168,218,220,0.25)',
              border: '1px solid rgba(168,218,220,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Waves size={13} style={{ color: '#78BEC2' }} />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 14, color: '#1C3535', lineHeight: 1 }}>
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
              color: '#91AFAA', border: '1px solid rgba(192,213,204,0.6)',
              background: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(192,213,204,0.45)', margin: '0 20px', flexShrink: 0 }} />

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
                ...(msg.role === 'user' ? {
                  background: 'linear-gradient(135deg, #A8DADC 0%, #88C8CC 100%)',
                  color: '#1C3535',
                  fontWeight: 500,
                  boxShadow: '0 2px 8px rgba(168,218,220,0.35)',
                } : {
                  background: 'rgba(255,255,255,0.75)',
                  color: '#2E5454',
                  border: '1px solid rgba(192,213,204,0.55)',
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
                background: 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(192,213,204,0.55)',
                borderRadius: '16px 16px 16px 4px',
                padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 14 }}>
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#A8DADC',
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
          borderTop: '1px solid rgba(192,213,204,0.45)',
          padding: '10px 20px 14px',
          display: 'flex', alignItems: 'flex-end', gap: 8,
          background: 'rgba(255,255,255,0.30)',
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
              background: 'rgba(255,255,255,0.65)',
              border: '1px solid rgba(192,213,204,0.65)',
              borderRadius: 14,
              padding: '8px 12px',
              fontSize: 13,
              color: '#1C3535',
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
              background: 'linear-gradient(135deg, #A8DADC 0%, #78BEC2 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(168,218,220,0.45)',
              opacity: !input.trim() || loading ? 0.45 : 1,
              transition: 'all 0.15s',
            }}
          >
            <Send size={14} style={{ color: '#FDFBF7' }} />
          </button>
        </div>
      </div>

      {/* ── Surfboard fin (decorative) ── */}
      <div style={{
        width: 44, height: 24,
        margin: '0 auto',
        position: 'relative',
        top: -2,
        clipPath: 'polygon(18% 0%, 82% 0%, 100% 100%, 0% 100%)',
        background: 'linear-gradient(to bottom, rgba(236,248,252,0.90), rgba(200,230,228,0.55))',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }} />
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
          color: '#1C3535',
        }}
      >
        <Waves size={18} style={{ color: '#56A0A4' }} />
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>
          Ask Swello 🤙
        </span>
      </button>
    </>
  )
}
