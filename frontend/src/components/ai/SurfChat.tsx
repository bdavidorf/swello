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
  content: "Hey! I'm Swello 🤙 Tell me your skill level and what you're after, and I'll point you to the best surf spots anywhere in the US.",
}

// ── Surfboard button clip-path ───────────────────────────────────────────────
// Horizontal shortboard: sharp nose on left, squash tail on right
// Board is 220px wide × 54px tall
const BOARD_W = 220
const BOARD_H = 54
// Sharp pointed nose (left), wide body, slightly rounded squash tail (right)
const SURFBOARD_BTN_CLIP = `path('M 2 27 C 12 6 42 2 80 2 L 168 2 C 196 2 218 12 218 27 C 218 42 196 52 168 52 L 80 52 C 42 52 12 48 2 27 Z')`

function ChatWindow({ onClose }: { onClose: () => void }) {
  const { selectedSpotId, userProfile, userLocation } = useSpotStore()
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [modelUsed, setModelUsed] = useState<string | null>(null)
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
      const { reply, model_used } = await fetchAIChat(
        next.map(m => ({ role: m.role, content: m.content })),
        selectedSpotId,
        userProfile,
        userLocation ?? undefined,
      )
      setModelUsed(model_used)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Debug — ${detail}` },
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
      className="fixed z-50 surf-chat-window"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 188px)',
        right: 16,
        width: 'min(340px, calc(100vw - 32px))',
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
      <div className="surf-chat-header flex items-center justify-between flex-shrink-0" style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(120,184,216,0.10)' }}>
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'rgba(120,184,216,0.18)',
            border: '1px solid rgba(120,184,216,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Waves size={14} style={{ color: '#78B8D8' }} />
          </div>
          <div>
            <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 18, color: '#D8EEF8', lineHeight: 1, letterSpacing: '0.06em' }}>
              Ask Swello 🤙
            </p>
            {modelUsed && (
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3A6A8A', letterSpacing: '0.06em', marginTop: 2, lineHeight: 1 }}>
                via {modelUsed}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ffffff', border: '2px solid rgba(120,184,216,0.50)',
            background: 'rgba(120,184,216,0.20)',
            cursor: 'pointer', transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          <X size={20} />
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
      <div className="surf-chat-input-area" style={{
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
            fontSize: 16,
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

// ── Surfboard trigger button (horizontal) ────────────────────────────────────
function SurfboardButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Ask Swello"
      className="surf-chat-fab"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 120px)',
        right: 16,
        width: `min(${BOARD_W}px, calc(100vw - 32px))`,
        height: BOARD_H,
        clipPath: SURFBOARD_BTN_CLIP,
        // Warm teak/balsa wood — grain runs left-to-right on horizontal board
        background: `linear-gradient(
          5deg,
          #E8B06A 0%,
          #C47832 10%,
          #8B4820 28%,
          #6A3010 50%,
          #8B4820 72%,
          #C47832 88%,
          #E8B06A 100%
        )`,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        zIndex: 50,
        boxShadow: '0 8px 28px rgba(0,0,0,0.55), 0 3px 10px rgba(100,50,10,0.40), inset 0 1px 0 rgba(255,220,160,0.25)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 16px 40px rgba(0,0,0,0.60), 0 5px 16px rgba(100,50,10,0.40)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(0,0,0,0.55), 0 3px 10px rgba(100,50,10,0.40), inset 0 1px 0 rgba(255,220,160,0.25)'
      }}
    >
      {/* Wood grain lines (horizontal, running top-to-bottom) */}
      {[10, 20, 34].map((y) => (
        <div key={y} style={{
          position: 'absolute',
          left: '8%', right: '8%',
          top: y,
          height: 1,
          background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.12) 20%, rgba(0,0,0,0.10) 80%, transparent)',
          pointerEvents: 'none',
        }} />
      ))}

      {/* Stringer — horizontal center line */}
      <div style={{
        position: 'absolute',
        left: '4%', right: '4%',
        top: '50%', height: 1.5,
        background: 'linear-gradient(to right, transparent, rgba(255,210,140,0.55) 15%, rgba(255,210,140,0.55) 85%, transparent)',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
      }} />

      {/* Board edge shadow */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath: SURFBOARD_BTN_CLIP,
        boxShadow: 'inset 0 0 0 2px rgba(80,30,5,0.35)',
        pointerEvents: 'none',
      }} />

      {/* Content: icon + text in a row */}
      <Waves size={12} style={{ color: 'rgba(255,230,170,0.95)', position: 'relative', zIndex: 1, flexShrink: 0 }} />
      <span style={{
        fontFamily: "'Bangers', Impact, system-ui",
        fontSize: 24,
        letterSpacing: '0.18em',
        color: 'rgba(255,230,170,0.95)',
        lineHeight: 1,
        textShadow: '0 1px 4px rgba(0,0,0,0.55)',
        position: 'relative',
        zIndex: 1,
        whiteSpace: 'nowrap',
      }}>
        ASK SWELLO
      </span>

      {/* Leash plug — right side near tail */}
      <div style={{
        position: 'absolute',
        right: 22, top: '50%',
        transform: 'translateY(-50%)',
        width: 7, height: 7,
        borderRadius: '50%',
        background: 'rgba(80,30,5,0.60)',
        border: '1px solid rgba(255,180,80,0.40)',
        zIndex: 1,
      }} />
    </button>
  )
}

export function SurfChatWidget() {
  const { aiPanelOpen, setAiPanelOpen } = useSpotStore()

  return (
    <>
      {aiPanelOpen && <ChatWindow onClose={() => setAiPanelOpen(false)} />}
      {!aiPanelOpen && <SurfboardButton onClick={() => setAiPanelOpen(true)} />}
    </>
  )
}
