/* eslint-disable react-refresh/only-export-components -- Cell component exports component + SOURCE_CONFIG */
import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Globe,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Share2,
  Megaphone,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Pre-defined source configurations
 */
export const SOURCE_CONFIG: Record<
  string,
  { icon: LucideIcon; label: string; color: string }
> = {
  website: {
    icon: Globe,
    label: "Website",
    color: "text-blue-500",
  },
  phone: {
    icon: Phone,
    label: "Phone",
    color: "text-emerald-500",
  },
  email: {
    icon: Mail,
    label: "Email",
    color: "text-amber-500",
  },
  chat: {
    icon: MessageSquare,
    label: "Chat",
    color: "text-purple-500",
  },
  referral: {
    icon: Users,
    label: "Referral",
    color: "text-pink-500",
  },
  social: {
    icon: Share2,
    label: "Social",
    color: "text-cyan-500",
  },
  ads: {
    icon: Megaphone,
    label: "Ads",
    color: "text-orange-500",
  },
  organic: {
    icon: Search,
    label: "Organic",
    color: "text-green-500",
  },
};

export type SourceType = keyof typeof SOURCE_CONFIG;

export interface SourceCellProps {
  /** Source type (predefined) or custom label */
  source: SourceType | string;
  /** Custom icon (overrides predefined) */
  icon?: LucideIcon;
  /** Custom color class */
  color?: string;
  /** Show as badge or inline */
  variant?: "badge" | "inline";
  /** Additional className */
  className?: string;
}

/**
 * Source badge cell with icon.
 *
 * Supports predefined sources (website, phone, email, etc.)
 * or custom sources with explicit icon/color.
 *
 * @example
 * ```tsx
 * // Predefined source
 * <SourceCell source="website" />
 *
 * // Custom source
 * <SourceCell
 *   source="Custom"
 *   icon={Star}
 *   color="text-yellow-500"
 * />
 * ```
 */
export const SourceCell = memo(function SourceCell({
  source,
  icon: customIcon,
  color: customColor,
  variant = "badge",
  className,
}: SourceCellProps) {
  const config = SOURCE_CONFIG[source as SourceType];
  const Icon = customIcon || config?.icon || Globe;
  const label = config?.label || source;
  const color = customColor || config?.color || "text-muted-foreground";

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <Icon className={cn("size-3.5", color)} />
        <span className="text-sm">{label}</span>
      </div>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 font-normal", className)}
    >
      <Icon className={cn("size-3", color)} />
      <span>{label}</span>
    </Badge>
  );
});

SourceCell.displayName = "SourceCell";
