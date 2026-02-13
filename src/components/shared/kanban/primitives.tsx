/* eslint-disable react-refresh/only-export-components -- Component exports components + helpers */
/**
 * Kanban Primitives
 *
 * Small reusable building blocks for kanban cards.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { memo } from "react";
import {
  Minus,
  Hexagon,
  AlertCircle,
  Stars,
  CheckCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { KanbanPriority } from "./types";

// ============================================================================
// PRIORITY INDICATOR - Square UI Badge Style
// ============================================================================

const PRIORITY_CONFIG: Record<
  KanbanPriority,
  {
    icon: LucideIcon;
    bg: string;
    text: string;
    label: string;
  }
> = {
  low: {
    icon: Minus,
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
    label: "Low"
  },
  medium: {
    icon: Hexagon,
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-600 dark:text-yellow-400",
    label: "Medium"
  },
  high: {
    icon: AlertCircle,
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-600 dark:text-orange-400",
    label: "High"
  },
  urgent: {
    icon: Stars,
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-400",
    label: "Urgent"
  },
};

export interface PriorityIndicatorProps {
  priority: KanbanPriority;
  showTooltip?: boolean;
  /** Show as badge (default) or just icon */
  variant?: "badge" | "icon";
  className?: string;
}

export const PriorityIndicator = memo(function PriorityIndicator({
  priority,
  showTooltip = true,
  variant = "badge",
  className,
}: PriorityIndicatorProps) {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;

  // Icon-only variant (for compact spaces)
  if (variant === "icon") {
    const iconIndicator = (
      <div className={cn("size-4 shrink-0", config.text, className)}>
        <Icon className="size-4" />
      </div>
    );

    if (!showTooltip) return iconIndicator;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{iconIndicator}</TooltipTrigger>
        <TooltipContent>{config.label} priority</TooltipContent>
      </Tooltip>
    );
  }

  // Badge variant (Square UI style)
  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "text-[10px] font-medium capitalize border-0",
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>{config.label} priority</TooltipContent>
    </Tooltip>
  );
});

// ============================================================================
// COMPLETED INDICATOR
// ============================================================================

export interface CompletedIndicatorProps {
  className?: string;
}

export const CompletedIndicator = memo(function CompletedIndicator({
  className,
}: CompletedIndicatorProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Wrap icon in span to avoid TooltipTrigger asChild + SVG ref forwarding issues */}
        <span className="inline-flex">
          <CheckCircle className={cn("size-4 shrink-0 text-green-500", className)} />
        </span>
      </TooltipTrigger>
      <TooltipContent>Completed</TooltipContent>
    </Tooltip>
  );
});

// ============================================================================
// METADATA PILL
// ============================================================================

export interface MetadataPillProps {
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export const MetadataPill = memo(function MetadataPill({
  icon: Icon,
  children,
  className,
}: MetadataPillProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 border border-border rounded-sm py-1 px-2 text-xs text-muted-foreground",
        className
      )}
    >
      {Icon && <Icon className="size-3" />}
      {children}
    </div>
  );
});

// ============================================================================
// PROGRESS RING
// ============================================================================

export interface ProgressRingProps {
  /** Progress value from 0-100 */
  value: number;
  /** Size class (default: size-3) */
  className?: string;
  /** Track color */
  trackColor?: string;
  /** Progress color */
  progressColor?: string;
}

export const ProgressRing = memo(function ProgressRing({
  value,
  className,
  trackColor = "text-muted",
  progressColor = "text-green-500",
}: ProgressRingProps) {
  const radius = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <svg className={cn("size-3", className)} viewBox="0 0 16 16">
      {/* Background circle */}
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={trackColor}
      />
      {/* Progress circle */}
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className={progressColor}
        transform="rotate(-90 8 8)"
      />
    </svg>
  );
});

// ============================================================================
// AVATAR STACK - Square UI Style
// ============================================================================

export interface AvatarStackProps {
  avatars: Array<{
    id: string;
    name: string;
    image?: string;
  }>;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export const AvatarStack = memo(function AvatarStack({
  avatars,
  max = 2, // Square UI shows 2 by default
  size = "sm",
  className,
}: AvatarStackProps) {
  // Square UI sizes: size-6 (24px) with border-2, use card border color
  const sizeClass = size === "sm" ? "size-6" : "size-7";
  const textSize = size === "sm" ? "text-[8px]" : "text-[10px]";
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <div className={cn("flex -space-x-1.5", className)}>
      {visible.map((avatar) => (
        <Tooltip key={avatar.id}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                sizeClass,
                // Square UI: border-2 border-card (matches card background)
                "rounded-full border-2 border-card bg-muted flex items-center justify-center overflow-hidden",
                "ring-1 ring-border/20" // Subtle outer ring
              )}
            >
              {avatar.image ? (
                <img
                  src={avatar.image}
                  alt={avatar.name}
                  className="size-full object-cover"
                />
              ) : (
                <span className={cn(textSize, "font-medium text-muted-foreground")}>
                  {getInitials(avatar.name)}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {avatar.name}
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                sizeClass,
                textSize,
                "rounded-full border-2 border-card bg-muted flex items-center justify-center",
                "text-muted-foreground font-medium"
              )}
            >
              +{overflow}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {overflow} more
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get initials from a name (first letter of first and last name)
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return d < new Date();
}
