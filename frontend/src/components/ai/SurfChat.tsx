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

// ── Surfboard button clip-path ───────────────────────────────────────────────
// Vertical shortboard: pointed nose top, wide body, rounded tail bottom
const SURFBOARD_BTN_CLIP = `path('M 40 0 C 58 0 76 14 76 36 L 76 116 C 76 140 62 156 40 156 C 18 156 4 140 4 116 L 4 36 C 4 14 22 0 40 0 Z')`

function ChatWindow({ onClose }: { onClose: () => void }) {
  const { selectedSpotId } = useSpotStore()
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

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

  return (
    <div
      className="fixed z-50"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 96px)',
        right: 16,
        width: 340,
        background: 'rgba(18,42,66,0.95)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 20,
        border: '1px solid rgba(168,200,220,0.14)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 4px 16px rgba(120,184,216,0.10)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        maxHeight: '65vh',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(120,184,216,0.10)' }}>
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'rgba(120,184,216,0.18)',
            border: '1px solid rgba(120,184,216,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Waves size={14} style={{ color: '#78B8D8' }} />
          </div>
          <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 18, color: '#D8EEF8', lineHeight: 1, letterSpacing: '0.06em' }}>
            Ask Swello 🤙
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#3A5A78', border: '1px solid rgba(26,48,72,0.70)',
            background: 'rgba(13,28,42,0.65)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '84%',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '8px 12px',
              fontSize: 13,
              lineHeight: 1.55,
              fontFamily: 'Inter, system-ui, sans-serif',
              ...(msg.role === 'user' ? {
                background: 'linear-gradient(135deg, #5AAAC8 0%, #3A88B8 100%)',
                color: '#0D1C2A',
                fontWeight: 600,
                boxShadow: '0 2px 10px rgba(90,170,200,0.30)',
              } : {
                background: 'rgba(13,28,42,0.85)',
                color: '#A0C0D8',
                border: '1px solid rgba(120,184,216,0.12)',
              }),
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'rgba(13,28,42,0.85)',
              border: '1px solid rgba(120,184,216,0.12)',
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

      {/* Input */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid rgba(120,184,216,0.10)',
        padding: '10px 14px 12px',
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: 'rgba(8,16,26,0.30)',
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
  )
}

// ── Surfboard trigger button ─────────────────────────────────────────────────
function SurfboardButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Ask Swello"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
        right: 16,
        width: 80,
        height: 156,
        clipPath: SURFBOARD_BTN_CLIP,
        background: 'linear-gradient(180deg, rgba(136,200,232,0.22) 0%, rgba(18,42,66,0.97) 30%, rgba(13,28,42,0.97) 70%, rgba(90,170,200,0.18) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        zIndex: 50,
        boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 2px 12px rgba(120,184,216,0.20)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 14px 40px rgba(0,0,0,0.50), 0 4px 16px rgba(120,184,216,0.30)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.45), 0 2px 12px rgba(120,184,216,0.20)'
      }}
    >
      {/* Board outline overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath: SURFBOARD_BTN_CLIP,
        border: '1.5px solid rgba(168,200,220,0.25)',
        pointerEvents: 'none',
      }} />

      {/* Stringer */}
      <div style={{
        position: 'absolute',
        top: '8%', bottom: '8%',
        left: '50%', width: 1,
        background: 'linear-gradient(to bottom, transparent, rgba(120,184,216,0.30) 25%, rgba(120,184,216,0.30) 75%, transparent)',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }} />

      {/* Icon + text */}
      <Waves size={18} style={{ color: '#78B8D8', position: 'relative', zIndex: 1 }} />
      <span style={{
        fontFamily: "'Bangers', Impact, system-ui",
        fontSize: 11,
        letterSpacing: '0.14em',
        color: '#D8EEF8',
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        transform: 'rotate(180deg)',
        lineHeight: 1,
        position: 'relative',
        zIndex: 1,
      }}>
        ASK SWELLO
      </span>

      {/* Fin nub at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 6, left: '50%',
        transform: 'translateX(-50%)',
        width: 8, height: 8,
        borderRadius: '50%',
        background: 'rgba(120,184,216,0.30)',
        border: '1px solid rgba(120,184,216,0.35)',
      }} />
    </button>
  )
}

export function SurfChatWidget() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && <ChatWindow onClose={() => setOpen(false)} />}
      {!open && <SurfboardButton onClick={() => setOpen(true)} />}
    </>
  )
}
