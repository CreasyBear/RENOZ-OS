/**
 * DetailPageBackButton
 *
 * Reusable Back button for detail pages with:
 * - Link-based navigation (preserves browser history)
 * - 44x44px touch target on mobile (WCAG)
 * - Required aria-label for icon-only accessibility
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see docs/design-system/PAGE-LAYOUT-STANDARDS.md
 */
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface DetailPageBackButtonProps {
  /** Route to navigate back to (e.g. "/customers", "/orders") */
  to: string
  /** Accessible label for icon-only button (e.g. "Back to customers") */
  'aria-label': string
  /** Optional path params for dynamic routes (e.g. { poId: "123" }) */
  params?: Record<string, string>
  /** Optional search params for the link */
  search?: Record<string, unknown>
  /** Optional additional class names */
  className?: string
}

export function DetailPageBackButton({
  to,
  'aria-label': ariaLabel,
  params,
  search,
  className,
}: DetailPageBackButtonProps) {
  return (
    <Link
      to={to}
      params={params}
      search={search}
      preload="intent"
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0',
        className
      )}
      aria-label={ariaLabel}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
    </Link>
  )
}
