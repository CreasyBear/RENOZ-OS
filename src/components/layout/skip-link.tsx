/**
 * SkipLink Component
 *
 * Accessibility component that provides a skip-to-content link for keyboard users.
 * Hidden by default, becomes visible when focused via Tab key.
 *
 * @example
 * ```tsx
 * // In app shell, before header:
 * <SkipLink />
 * <Header />
 * <main id="main-content" tabIndex={-1}>
 *   {children}
 * </main>
 * ```
 */
import { cn } from '@/lib/utils'

interface SkipLinkProps {
  /** Target element ID (default: "main-content") */
  targetId?: string
  /** Link text (default: "Skip to main content") */
  label?: string
  className?: string
}

export function SkipLink({
  targetId = 'main-content',
  label = 'Skip to main content',
  className,
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        // Hidden until focused
        'sr-only focus:not-sr-only',
        // Position when visible
        'focus:fixed focus:top-4 focus:left-4 focus:z-[100]',
        // Styling when visible
        'focus:bg-background focus:px-4 focus:py-2 focus:rounded-md',
        'focus:border focus:border-border focus:shadow-lg',
        'focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring',
        // Transition
        'transition-opacity duration-200',
        className
      )}
    >
      {label}
    </a>
  )
}
