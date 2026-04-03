import { Bot } from 'lucide-react'
import { cn } from '../../utils/helpers'

export default function BotMessage({ message, isUser }) {
  return (
    <div className={cn('flex gap-2 items-end', isUser && 'flex-row-reverse')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
          <Bot size={14} className="text-white" />
        </div>
      )}
      <div className={cn(
        'max-w-[85%] px-3 py-2.5 rounded-2xl text-sm',
        isUser
          ? 'bg-primary text-white rounded-br-sm'
          : 'bg-muted text-foreground rounded-bl-sm'
      )}>
        {/* Simple whitespace-preserving text render */}
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {message.suggestions?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => message.onSuggestion?.(s)}
                className="text-xs px-2 py-1 rounded-lg bg-card border border-border/60 text-primary hover:bg-primary/10 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
