/**
 * AI Message List Component
 *
 * Displays chat messages in the AI sidebar.
 * Handles both user and assistant messages with appropriate styling.
 */
import { cn } from '@/lib/utils'
import { User, Sparkles } from 'lucide-react'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date
}

interface AIMessageListProps {
  messages: Message[]
  isLoading?: boolean
}

export function AIMessageList({ messages, isLoading }: AIMessageListProps) {
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-purple-100 p-3 mb-4">
          <Sparkles className="h-6 w-6 text-purple-600" />
        </div>
        <h3 className="font-medium text-gray-900 mb-1">How can I help?</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Ask me anything about your customers, quotes, or orders. I can help you analyze data and take actions.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 rounded-full bg-purple-100 p-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex-1 rounded-lg bg-gray-100 p-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex-shrink-0 rounded-full p-2',
          isUser ? 'bg-gray-200' : 'bg-purple-100'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-gray-600" />
        ) : (
          <Sparkles className="h-4 w-4 text-purple-600" />
        )}
      </div>
      <div
        className={cn(
          'flex-1 rounded-lg p-3 max-w-[80%]',
          isUser ? 'bg-gray-900 text-white ml-auto' : 'bg-gray-100 text-gray-900'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
