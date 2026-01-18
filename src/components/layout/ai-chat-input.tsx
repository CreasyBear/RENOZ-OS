/**
 * AI Chat Input Component
 *
 * Input field for sending messages to the AI assistant.
 * Includes quick action suggestions based on current page context.
 */
import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIChatInputProps {
  onSubmit: (message: string) => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  quickActions?: Array<{
    label: string
    prompt: string
  }>
}

export function AIChatInput({
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = 'Ask me anything...',
  quickActions = [],
}: AIChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || disabled) return

    onSubmit(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleQuickAction = (prompt: string) => {
    if (isLoading || disabled) return
    onSubmit(prompt)
  }

  return (
    <div className="border-t border-gray-200 p-4">
      {/* Quick actions */}
      {quickActions.length > 0 && !input && (
        <div className="mb-3 flex flex-wrap gap-2">
          {quickActions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleQuickAction(action.prompt)}
              disabled={isLoading || disabled}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1',
                'text-xs font-medium text-gray-600 bg-gray-100',
                'hover:bg-gray-200 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          rows={1}
          className={cn(
            'w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-12',
            'text-sm placeholder:text-gray-400',
            'focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500',
            'disabled:opacity-50 disabled:bg-gray-50'
          )}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading || disabled}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2',
            'rounded-lg p-2 text-gray-500',
            'hover:bg-gray-100 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </form>

      {/* Keyboard hint */}
      <p className="mt-2 text-xs text-gray-400 text-center">
        Press <kbd className="rounded bg-gray-100 px-1">Enter</kbd> to send,{' '}
        <kbd className="rounded bg-gray-100 px-1">Shift+Enter</kbd> for new line
      </p>
    </div>
  )
}
