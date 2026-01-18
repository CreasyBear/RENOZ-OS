/**
 * AI Chat Sidebar Component
 *
 * Global AI assistant accessible from any page via slide-over panel.
 *
 * Features:
 * - Slide-over panel from right side
 * - Chat input with streaming response display
 * - Context badge showing current page
 * - Quick action suggestions based on page
 * - Keyboard shortcut (Cmd+Shift+A) to toggle
 *
 * Note: Currently uses local state. Will integrate with AI SDK useChat
 * hook when AI backend (INT-AI-001) is implemented.
 */
import { useEffect, useState, useCallback } from 'react'
import { useLocation } from '@tanstack/react-router'
import { X, Sparkles, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AIMessageList, type Message } from './ai-message-list'
import { AIChatInput } from './ai-chat-input'
import { getBreadcrumbLabel } from '@/lib/routing'

// ============================================================================
// TYPES
// ============================================================================

interface AISidebarProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// ============================================================================
// QUICK ACTIONS BY ROUTE
// ============================================================================

const ROUTE_QUICK_ACTIONS: Record<string, Array<{ label: string; prompt: string }>> = {
  '/dashboard': [
    { label: 'Summarize today', prompt: 'Give me a summary of today\'s activity' },
    { label: 'Hot leads', prompt: 'Which leads need attention today?' },
    { label: 'Pending orders', prompt: 'Show me pending orders that need action' },
  ],
  '/customers': [
    { label: 'Find customer', prompt: 'Help me find a customer' },
    { label: 'Top customers', prompt: 'Who are my top customers by revenue?' },
    { label: 'Customer insights', prompt: 'What patterns do you see in my customer base?' },
  ],
  '/pipeline': [
    { label: 'Pipeline health', prompt: 'How healthy is my sales pipeline?' },
    { label: 'Closing soon', prompt: 'Which deals are likely to close this month?' },
    { label: 'Stale quotes', prompt: 'Are there any quotes that need follow-up?' },
  ],
  '/orders': [
    { label: 'Order status', prompt: 'What\'s the status of recent orders?' },
    { label: 'Delayed orders', prompt: 'Are there any delayed orders I should know about?' },
    { label: 'Revenue today', prompt: 'What\'s our revenue from orders today?' },
  ],
  default: [
    { label: 'Help me', prompt: 'What can you help me with on this page?' },
    { label: 'Quick actions', prompt: 'What actions can I take here?' },
  ],
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AISidebar({ open: controlledOpen, onOpenChange }: AISidebarProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const location = useLocation()

  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  // Get current page context
  const currentPath = location.pathname
  const currentPageLabel = getBreadcrumbLabel(currentPath)
  const quickActions = ROUTE_QUICK_ACTIONS[currentPath] || ROUTE_QUICK_ACTIONS.default

  // Handle Cmd+Shift+A keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setOpen(!open)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, setOpen])

  // Handle escape to close
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, setOpen])

  // Load conversation history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai-chat-history')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setMessages(parsed)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Save conversation history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai-chat-history', JSON.stringify(messages.slice(-50))) // Keep last 50
    }
  }, [messages])

  const handleSubmit = useCallback(async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Simulate AI response (will be replaced with actual AI SDK integration)
    // TODO: Replace with useChat from @ai-sdk/react when INT-AI-001 is complete
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `I understand you're asking about "${content}" while viewing the ${currentPageLabel} page. This AI assistant will be fully functional once the AI backend integration (INT-AI-001) is complete. For now, I'm here as a placeholder to demonstrate the interface.`,
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }, [currentPageLabel])

  const handleClearHistory = () => {
    setMessages([])
    localStorage.removeItem('ai-chat-history')
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full max-w-md',
          'bg-white shadow-xl',
          'flex flex-col',
          'transform transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-sidebar-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-100 p-1.5">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 id="ai-sidebar-title" className="font-medium text-gray-900">
                AI Assistant
              </h2>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" />
                <span>{currentPageLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="Close AI sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <AIMessageList messages={messages} isLoading={isLoading} />

        {/* Input */}
        <AIChatInput
          onSubmit={handleSubmit}
          isLoading={isLoading}
          quickActions={quickActions}
          placeholder={`Ask about ${currentPageLabel.toLowerCase()}...`}
        />

        {/* Keyboard shortcut hint */}
        <div className="border-t border-gray-100 px-4 py-2 text-center">
          <span className="text-xs text-gray-400">
            <kbd className="rounded bg-gray-100 px-1">⌘</kbd>
            <kbd className="rounded bg-gray-100 px-1 ml-0.5">⇧</kbd>
            <kbd className="rounded bg-gray-100 px-1 ml-0.5">A</kbd>
            {' '}to toggle
          </span>
        </div>
      </div>
    </>
  )
}
