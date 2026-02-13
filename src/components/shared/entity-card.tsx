/**
 * EntityCard Component
 *
 * Preview card for displaying entity information.
 *
 * @example
 * ```tsx
 * <EntityCard
 *   name="Acme Corporation"
 *   subtitle="Customer since 2023"
 *   imageUrl="/logos/acme.png"
 *   href="/customers/123"
 *   metadata={[
 *     { label: "Total Orders", value: "42" },
 *     { label: "Revenue", value: "$12,500" }
 *   ]}
 * />
 * ```
 */
import type { ReactNode } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Card, CardContent, CardHeader } from "~/components/ui/card"
import { EntityAvatar } from "./entity-avatar"
import { cn } from "~/lib/utils"

export interface EntityCardMetadata {
  label: string
  value: string | number
}

export interface EntityCardProps {
  /** Entity name */
  name: string
  /** Optional subtitle */
  subtitle?: string
  /** Optional image URL for avatar */
  imageUrl?: string | null
  /** Optional link href */
  href?: string
  /** Optional metadata key-value pairs */
  metadata?: EntityCardMetadata[]
  /** Optional actions */
  actions?: ReactNode
  /** Card size variant */
  variant?: "compact" | "default"
  /** Additional class names */
  className?: string
  /** Click handler */
  onClick?: () => void
}

export function EntityCard({
  name,
  subtitle,
  imageUrl,
  href,
  metadata,
  actions,
  variant = "default",
  className,
  onClick,
}: EntityCardProps) {
  const navigate = useNavigate()
  const isClickable = !!href || !!onClick

  const handleClick = () => {
    if (href) {
      if (href.startsWith("/")) {
        navigate({ to: href })
      } else {
        window.location.href = href
      }
    } else if (onClick) {
      onClick()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && isClickable) {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <Card
      className={cn(
        isClickable && "cursor-pointer transition-colors hover:bg-muted/50",
        className
      )}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? "button" : undefined}
    >
      <CardHeader
        className={cn(
          "flex flex-row items-center gap-3",
          variant === "compact" ? "p-3" : "p-4"
        )}
      >
        <EntityAvatar
          name={name}
          imageUrl={imageUrl}
          size={variant === "compact" ? "md" : "lg"}
        />
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              "font-medium truncate",
              variant === "compact" ? "text-sm" : "text-base"
            )}
          >
            {name}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </CardHeader>

      {metadata && metadata.length > 0 && variant !== "compact" && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {metadata.map((item) => (
              <div key={item.label}>
                <dt className="text-muted-foreground text-xs">{item.label}</dt>
                <dd className="font-medium">{item.value}</dd>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
