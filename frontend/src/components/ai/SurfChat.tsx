import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { fetchAIChat } from '../../api/client'
import { useSpotStore } from '../../store/spotStore'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const GREETING: Message = {
  role: 'assistant',
  content: "Hey! I'm Swello, your AI surf advisor 🤙 Tell me your skill level and what kind of surf you're after, and I'll find you the best spots and windows across all 11 LA breaks.",
}

export function SurfChat() {
  const { selectedSpotId } = useSpotStore()
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
        { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Make sure the GEMINI_API_KEY is set in Vercel." },
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
    <div className="card flex flex-col overflow-hidden" style={{ height: 'min(520px, 65vh)' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-ocean-700/60 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-wave-400/15 flex items-center justify-center">
          <Sparkles size={14} className="text-wave-400" />
        </div>
        <div>
          <p className="font-bold text-sm text-ocean-50">AI Surf Advisor</p>
          <p className="text-[10px] text-ocean-500">Powered by Gemini</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-wave-400 text-ocean-950 font-medium rounded-br-sm'
                  : 'bg-ocean-800 text-ocean-100 border border-ocean-700/60 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-ocean-800 border border-ocean-700/60 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
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
      <div className="flex-shrink-0 border-t border-ocean-700/60 px-3 py-2.5 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about conditions, spots, or get a recommendation..."
          rows={1}
          className="flex-1 bg-ocean-800/60 border border-ocean-700/60 rounded-xl px-3 py-2 text-sm text-ocean-50 placeholder-ocean-600 resize-none focus:outline-none focus:border-wave-400/50 leading-relaxed"
          style={{ maxHeight: 96, overflowY: 'auto' }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl bg-wave-400 flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity active:scale-95"
        >
          <Send size={15} className="text-ocean-950" />
        </button>
      </div>
    </div>
  )
}
