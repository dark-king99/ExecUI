import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Minimize2, Maximize2, Sparkles } from 'lucide-react'
import BotMessage from './BotMessage'
import aibotService from '../../services/aibot.service'
import { cn } from '../../utils/helpers'

const WELCOME_MESSAGE = {
  id: 'welcome',
  content: "Hi! I'm Nexus AI, your smart marketplace assistant. I can help you find products, track orders, answer questions, and more! What can I help you with today?",
  isUser: false,
  suggestions: ['Find products', 'Track my order', 'Contact support'],
}

export default function BotWidget() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return

    const userMsg = { id: Date.now(), content: text, isUser: true }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      let sid = sessionId
      if (!sid) {
        const sessRes = await aibotService.createSession()
        sid = sessRes.data?.id || sessRes.data?.sessionId
        setSessionId(sid)
      }

      const res = await aibotService.chat({ message: text, sessionId: sid })
      const reply = res.data?.message || res.data?.reply || 'I understand. Let me help you with that.'
      const suggestions = res.data?.suggestions || []

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        content: reply,
        isUser: false,
        suggestions,
        onSuggestion: (s) => sendMessage(s),
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        content: "I'm sorry, I'm having trouble connecting right now. Please try again or contact our support team.",
        isUser: false,
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className={cn(
          'fixed bottom-20 right-4 z-50 flex flex-col',
          'bg-card border border-border/60 rounded-2xl shadow-2xl',
          'transition-all duration-300',
          minimized ? 'w-64 h-12' : 'w-80 h-[480px] sm:w-96'
        )}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            {!minimized && (
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">Nexus AI</p>
                <p className="text-xs text-secondary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
                  Online
                </p>
              </div>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setMinimized(!minimized)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                {messages.map((msg) => (
                  <BotMessage key={msg.id} message={msg} isUser={msg.isUser} />
                ))}
                {loading && (
                  <div className="flex gap-2 items-end">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                      <Bot size={14} className="text-white" />
                    </div>
                    <div className="px-3 py-2.5 bg-muted rounded-2xl rounded-bl-sm">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border/60 p-3 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    className="p-2 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => { setOpen(!open); setMinimized(false) }}
        className={cn(
          'fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full',
          'bg-gradient-to-br from-primary to-secondary',
          'flex items-center justify-center shadow-xl',
          'hover:scale-110 active:scale-95 transition-transform duration-200',
          'animate-pulse-glow'
        )}
        title="AI Assistant"
      >
        {open ? (
          <X size={22} className="text-white" />
        ) : (
          <Bot size={22} className="text-white" />
        )}
      </button>
    </>
  )
}
