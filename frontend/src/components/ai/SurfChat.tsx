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

const WINDOW_W = 340
const WINDOW_H = 480

function ChatWindow({ onClose }: { onClose: () => void }) {
  const { selectedSpotId } = useSpotStore()
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Drag state
  const windowRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  // Initial position: bottom-right (mirroring the button)
  useEffect(() => {
    const safeBottom = 76 + 16
    setPos({
      x: window.innerWidth - WINDOW_W - 16,
      y: window.innerHeight - WINDOW_H - safeBottom,
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
    const x = Math.max(0, Math.min(window.innerWidth - WINDOW_W, clientX - dragOffset.current.x))
    const y = Math.max(0, Math.min(window.innerHeight - WINDOW_H, clientY - dragOffset.current.y))
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
      className="fixed z-50 flex flex-col overflow-hidden shadow-2xl select-none"
      style={{
        left: pos.x,
        top: pos.y,
        width: WINDOW_W,
        height: WINDOW_H,
        borderRadius: 20,
        background: '#071428',
        border: '1px solid rgba(18,48,85,0.8)',
      }}
    >
      {/* Header — drag handle */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-ocean-700/60 flex-shrink-0 cursor-grab active:cursor-grabbing"
        style={{ background: 'rgba(13,32,64,0.97)', touchAction: 'none' }}
        onMouseDown={e => onDragStart(e.clientX, e.clientY)}
        onTouchStart={e => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-wave-400/20 border border-wave-400/30 flex items-center justify-center">
            <Waves size={13} className="text-wave-400" />
          </div>
          <div>
            <p className="font-bold text-sm text-ocean-50 leading-none">Ask Swello 🤙</p>
            <p className="text-[10px] text-wave-400 mt-0.5">Powered by Gemini</p>
          </div>
        </div>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-ocean-500 hover:text-ocean-200 hover:bg-ocean-700/40 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-wave-400 text-ocean-950 font-medium rounded-br-sm'
                  : 'bg-ocean-800/80 text-ocean-100 border border-ocean-700/50 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-ocean-800/80 border border-ocean-700/50 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-4">
                <span className="w-1.5 h-1.5 bg-ocean-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-ocean-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-ocean-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 border-t border-ocean-700/50 px-3 py-2.5 flex items-end gap-2"
        style={{ background: 'rgba(7,20,40,0.97)' }}
      >
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about conditions or spots..."
          rows={1}
          className="flex-1 bg-ocean-800/60 border border-ocean-700/60 rounded-xl px-3 py-2 text-sm text-ocean-50 placeholder-ocean-600 resize-none focus:outline-none focus:border-wave-400/50 leading-relaxed"
          style={{ maxHeight: 80, overflowY: 'auto' }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl bg-wave-400 flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-all active:scale-95"
        >
          <Send size={14} className="text-ocean-950" />
        </button>
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
        className="fixed z-50 flex items-center gap-2.5 px-5 py-4 rounded-2xl shadow-lg transition-all active:scale-95"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 76px)',
          right: 16,
          background: '#00d4c8',
          display: open ? 'none' : 'flex',
        }}
      >
        <Waves size={20} className="text-ocean-950" />
        <span className="text-ocean-950 font-black text-base">Ask Swello 🤙</span>
      </button>
    </>
  )
}
