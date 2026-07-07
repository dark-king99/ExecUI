import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { useSidebar } from './SidebarContext';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function apiFetch(path, options = {}) {
  const token = localStorage.getItem('auth_token');
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `HTTP ${res.status}`);
    }
    return res.json();
  });
}

export default function BotWidget() {
  const { theme } = useSidebar();
  const isDark = theme === 'dark';

  const [open, setOpen]         = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I\'m your Exec AI. Ask me anything about your CRM, marketing campaigns, or network status.' },
  ]);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimized]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.text }));
      const data = await apiFetch('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text, history }),
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Sorry, I ran into an error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div
          className={`flex flex-col rounded-2xl shadow-2xl border transition-all duration-200 overflow-hidden
            ${minimized ? 'h-12 w-80' : 'h-[520px] w-80'}
            ${isDark
              ? 'bg-slate-900 border-slate-700 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
            }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 shrink-0
              ${isDark ? 'bg-slate-800 border-b border-slate-700' : 'bg-slate-50 border-b border-slate-200'}`}
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-linear-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold"> Exec AI </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized((v) => !v)}
                className={`p-1.5 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                aria-label="Minimize"
              >
                {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className={`p-1.5 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed
                        ${msg.role === 'user'
                          ? 'bg-linear-to-br from-cyan-500 to-blue-600 text-white rounded-br-sm'
                          : isDark
                            ? 'bg-slate-800 text-slate-100 rounded-bl-sm'
                            : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                        }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className={`rounded-2xl rounded-bl-sm px-3 py-2 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className={`shrink-0 px-3 py-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className={`flex items-end gap-2 rounded-xl border px-3 py-2
                  ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-300'}`}>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask anything…"
                    className={`flex-1 resize-none bg-transparent text-sm outline-none
                      placeholder:text-slate-400 max-h-24`}
                    style={{ minHeight: '20px' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="shrink-0 h-7 w-7 rounded-lg bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center
                      disabled:opacity-40 transition-opacity hover:opacity-90"
                    aria-label="Send"
                  >
                    <Send className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
                <p className="mt-1 text-center text-[10px] text-slate-400">
                  AI can make mistakes — verify important info.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB trigger */}
      <button
        onClick={() => { setOpen((v) => !v); setMinimized(false); }}
        className="h-14 w-14 rounded-full shadow-xl flex items-center justify-center
          bg-linear-to-br from-cyan-500 to-fuchsia-600 hover:scale-105 active:scale-95
          transition-transform duration-150"
        aria-label="Open AI Assistant"
      >
        {open
          ? <X className="h-6 w-6 text-white" />
          : <Bot className="h-6 w-6 text-white" />
        }
      </button>
    </div>
  );
}
