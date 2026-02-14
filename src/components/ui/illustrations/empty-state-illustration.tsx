/**
 * Empty State Illustration Component
 *
 * A unified illustration component for empty states with multiple variants.
 * Uses inline SVG with currentColor for automatic theme adaptation.
 *
 * Features:
 * - Multiple illustration variants (generic and domain-specific)
 * - Three sizes (sm, md, lg)
 * - Automatic dark mode support via currentColor
 * - Accessible with decorative role
 * - Optional subtle float animation
 *
 * @example
 * ```tsx
 * <EmptyStateIllustration variant="no-customers" size="lg" />
 * <EmptyStateIllustration variant="no-results" size="md" animate />
 * ```
 */
import { cn } from "~/lib/utils"
import { logger } from "@/lib/logger"

// ============================================================================
// TYPES
// ============================================================================

export type IllustrationVariant =
  // Generic
  | "no-data"
  | "no-results"
  | "error"
  | "success"
  | "offline"
  | "empty-inbox"
  // Domain-specific
  | "no-customers"
  | "no-orders"
  | "no-products"
  | "no-inventory"
  | "no-quotes"
  | "no-opportunities"

export type IllustrationSize = "sm" | "md" | "lg"

export interface EmptyStateIllustrationProps {
  /** The illustration variant to display */
  variant: IllustrationVariant
  /** Size of the illustration */
  size?: IllustrationSize
  /** Whether to show a subtle float animation */
  animate?: boolean
  /** Additional class name */
  className?: string
}

// ============================================================================
// SIZE CONFIGURATION
// ============================================================================

const SIZES: Record<IllustrationSize, { width: number; height: number }> = {
  sm: { width: 80, height: 80 },
  md: { width: 120, height: 120 },
  lg: { width: 200, height: 200 },
}

// ============================================================================
// SVG ILLUSTRATIONS
// ============================================================================

interface SvgProps {
  className?: string
}

// Generic: No Data
function NoDataSvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Folder base */}
      <path
        d="M20 40H100V95C100 97.7614 97.7614 100 95 100H25C22.2386 100 20 97.7614 20 95V40Z"
        className="fill-muted/40"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Folder tab */}
      <path
        d="M20 40V30C20 27.2386 22.2386 25 25 25H45L55 40H20Z"
        className="fill-muted/60"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Empty indicator lines */}
      <path
        d="M40 60H80M40 75H65"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-40"
      />
    </svg>
  )
}

// Generic: No Results
function NoResultsSvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Magnifying glass */}
      <circle
        cx="50"
        cy="50"
        r="25"
        className="fill-muted/30"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M68 68L90 90"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* X mark inside */}
      <path
        d="M40 40L60 60M60 40L40 60"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-60"
      />
    </svg>
  )
}

// Generic: Error
function ErrorSvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Warning triangle */}
      <path
        d="M60 20L105 95H15L60 20Z"
        className="fill-destructive/10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Exclamation mark */}
      <path
        d="M60 45V65"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="60" cy="78" r="3" fill="currentColor" />
    </svg>
  )
}

// Generic: Success
function SuccessSvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Circle */}
      <circle
        cx="60"
        cy="60"
        r="40"
        className="fill-green-500/10"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Checkmark */}
      <path
        d="M40 60L55 75L80 45"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Generic: Offline
function OfflineSvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Cloud */}
      <path
        d="M30 75C22.268 75 16 68.732 16 61C16 53.268 22.268 47 30 47C30 33.745 40.745 23 54 23C65.2 23 74.5 30.5 77 40.5C79 39.5 81.4 39 84 39C94.493 39 103 47.507 103 58C103 68.493 94.493 77 84 77H30V75Z"
        className="fill-muted/30"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Slash through */}
      <path
        d="M25 95L95 25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-60"
      />
    </svg>
  )
}

// Generic: Empty Inbox
function EmptyInboxSvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Inbox tray */}
      <path
        d="M20 50L35 80H85L100 50"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 50V90C20 92.7614 22.2386 95 25 95H95C97.7614 95 100 92.7614 100 90V50"
        className="fill-muted/30"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Down arrow */}
      <path
        d="M60 25V55M50 45L60 55L70 45"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-50"
      />
    </svg>
  )
}

// Domain: No Customers
function NoCustomersSvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Person silhouette */}
      <circle
        cx="60"
        cy="35"
        r="18"
        className="fill-muted/30"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M30 95C30 78.431 43.431 65 60 65C76.569 65 90 78.431 90 95"
        className="fill-muted/30"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Plus sign */}
      <circle cx="88" cy="88" r="14" className="fill-background" stroke="currentColor" strokeWidth="2" />
      <path
        d="M88 80V96M80 88H96"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Domain: No Orders
function NoOrdersSvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Document */}
      <path
        d="M30 20H75L90 35V100H30V20Z"
        className="fill-muted/30"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Folded corner */}
      <path
        d="M75 20V35H90"
        stroke="currentColor"
        strokeWidth="2"
        className="opacity-60"
      />
      {/* Empty lines */}
      <path
        d="M42 50H78M42 65H68M42 80H58"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-40"
      />
    </svg>
  )
}

// Domain: No Products
function NoProductsSvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Box */}
      <path
        d="M60 25L100 45V85L60 105L20 85V45L60 25Z"
        className="fill-muted/30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Box lines */}
      <path
        d="M60 25V105M20 45L60 65L100 45"
        stroke="currentColor"
        strokeWidth="2"
        className="opacity-60"
      />
    </svg>
  )
}

// Domain: No Inventory
function NoInventorySvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shelving unit */}
      <rect
        x="20"
        y="20"
        width="80"
        height="80"
        rx="4"
        className="fill-muted/20"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Shelves */}
      <path
        d="M20 50H100M20 80H100"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Empty box placeholder */}
      <rect
        x="35"
        y="55"
        width="20"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        className="opacity-40"
      />
    </svg>
  )
}

// Domain: No Quotes
function NoQuotesSvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Document with dollar */}
      <path
        d="M30 15H75L90 30V105H30V15Z"
        className="fill-muted/30"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M75 15V30H90"
        stroke="currentColor"
        strokeWidth="2"
        className="opacity-60"
      />
      {/* Dollar sign */}
      <path
        d="M60 45V75M52 52C52 48 55.5 45 60 45C64.5 45 68 48 68 52C68 56 64.5 58 60 60C55.5 62 52 64 52 68C52 72 55.5 75 60 75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Domain: No Opportunities
function NoOpportunitiesSvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Funnel */}
      <path
        d="M20 25H100L70 60V95L50 105V60L20 25Z"
        className="fill-muted/30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Empty indicator */}
      <circle
        cx="60"
        cy="42"
        r="8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 2"
        className="opacity-40"
      />
    </svg>
  )
}

// ============================================================================
// VARIANT MAP
// ============================================================================

const ILLUSTRATIONS: Record<IllustrationVariant, React.FC<SvgProps>> = {
  // Generic
  "no-data": NoDataSvg,
  "no-results": NoResultsSvg,
  "error": ErrorSvg,
  "success": SuccessSvg,
  "offline": OfflineSvg,
  "empty-inbox": EmptyInboxSvg,
  // Domain-specific
  "no-customers": NoCustomersSvg,
  "no-orders": NoOrdersSvg,
  "no-products": NoProductsSvg,
  "no-inventory": NoInventorySvg,
  "no-quotes": NoQuotesSvg,
  "no-opportunities": NoOpportunitiesSvg,
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EmptyStateIllustration({
  variant,
  size = "md",
  animate = false,
  className,
}: EmptyStateIllustrationProps) {
  const IllustrationComponent = ILLUSTRATIONS[variant]
  const dimensions = SIZES[size]

  if (!IllustrationComponent) {
    logger.warn(`Unknown illustration variant: ${variant}`)
    return null
  }

  return (
    <div
      role="img"
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center text-muted-foreground",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
        animate && "motion-safe:animate-float",
        className
      )}
      style={{
        width: dimensions.width,
        height: dimensions.height,
      }}
    >
      <IllustrationComponent className="w-full h-full" />
    </div>
  )
}

// ============================================================================
// EXPORT INDIVIDUAL SVGS FOR ADVANCED USE
// ============================================================================

export {
  NoDataSvg,
  NoResultsSvg,
  ErrorSvg,
  SuccessSvg,
  OfflineSvg,
  EmptyInboxSvg,
  NoCustomersSvg,
  NoOrdersSvg,
  NoProductsSvg,
  NoInventorySvg,
  NoQuotesSvg,
  NoOpportunitiesSvg,
}
