/**
 * TruncateTooltip Component
 *
 * Displays text with truncation and shows full content in a tooltip on hover.
 */
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TruncateTooltipProps {
  text: string;
  maxLength?: number;
  maxWidth?: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

export function TruncateTooltip({
  text,
  maxLength = 30,
  maxWidth = "max-w-[200px]",
  className,
  side = "right",
}: TruncateTooltipProps) {
  const shouldTruncate = text.length > maxLength;

  if (!shouldTruncate) {
    return <span className={cn("truncate", maxWidth, className)}>{text}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("truncate", maxWidth, className)}>{text}</span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[380px]">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
