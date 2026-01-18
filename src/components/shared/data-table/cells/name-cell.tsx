import { memo } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export interface NameCellProps {
  /** Primary name/title */
  name: string | null | undefined;
  /** Secondary text (description, subtitle) */
  subtitle?: string | null;
  /** Max width before truncation (default: 250px) */
  maxWidth?: number | string;
  /** Show tooltip on truncation (default: true) */
  showTooltip?: boolean;
  /** Link href (optional - makes name clickable) */
  href?: string;
  /** Additional className */
  className?: string;
}

export const NameCell = memo(function NameCell({
  name,
  subtitle,
  maxWidth = 250,
  showTooltip = true,
  href,
  className,
}: NameCellProps) {
  if (!name) {
    return (
      <span className="text-sm text-muted-foreground">—</span>
    );
  }

  const maxWidthValue = typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;

  const content = (
    <div
      className={cn("flex flex-col", className)}
      style={{ maxWidth: maxWidthValue }}
    >
      {href ? (
        <a
          href={href}
          className="font-medium text-sm truncate hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </a>
      ) : (
        <span className="font-medium text-sm truncate">{name}</span>
      )}
      {subtitle && (
        <span className="text-xs text-muted-foreground line-clamp-1">
          {subtitle}
        </span>
      )}
    </div>
  );

  // Only show tooltip if enabled and name is long enough to potentially truncate
  if (showTooltip && name.length > 30) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">{name}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
});

NameCell.displayName = "NameCell";
