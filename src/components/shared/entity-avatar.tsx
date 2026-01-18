/**
 * EntityAvatar Component
 *
 * Avatar component that displays an image or generates initials from a name.
 *
 * @example
 * ```tsx
 * // With image
 * <EntityAvatar
 *   name="John Doe"
 *   imageUrl="/avatars/john.jpg"
 *   size="md"
 * />
 *
 * // Initials only
 * <EntityAvatar name="Jane Smith" size="lg" />
 * ```
 */
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { cn } from "~/lib/utils"

export interface EntityAvatarProps {
  /** Entity name (used for initials) */
  name: string
  /** Optional image URL */
  imageUrl?: string | null
  /** Avatar size */
  size?: "sm" | "md" | "lg" | "xl"
  /** Additional class names */
  className?: string
}

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
  xl: "h-12 w-12 text-lg",
}

/**
 * Generate initials from a name.
 * Takes the first letter of the first two words.
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

export function EntityAvatar({
  name,
  imageUrl,
  size = "md",
  className,
}: EntityAvatarProps) {
  const initials = getInitials(name)

  return (
    <Avatar className={cn(SIZE_CLASSES[size], className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
      <AvatarFallback className="bg-primary/10 text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
