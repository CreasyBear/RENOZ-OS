/**
 * Communication Timeline Helper Functions
 *
 * Pure utility functions for formatting and processing communication data.
 */

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins >= 60) {
    const hours = Math.floor(mins / 60)
    const remainMins = mins % 60
    return `${hours}h ${remainMins}m`
  }
  return `${mins}m ${secs}s`
}

/**
 * Format timestamp to relative or short date string
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) {
    return 'Yesterday'
  }
  if (diffDays < 7) {
    return date.toLocaleDateString('en-AU', { weekday: 'short' })
  }
  return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
}

// getInitials moved to @/lib/customer-utils
// Re-export for backward compatibility
export { getInitials } from '@/lib/customer-utils'
