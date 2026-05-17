import { memo, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export interface SkuCellProps {
  /** SKU value */
  value: string | null | undefined;
  /** Enable copy-to-clipboard on click (default: false) */
  copyable?: boolean;
  /** Fallback text when null (default: "—") */
  fallback?: string;
  /** Additional className */
  className?: string;
}

type CopyStatus = "idle" | "copied" | "failed";

export const SkuCell = memo(function SkuCell({
  value,
  copyable = false,
  fallback = "—",
  className,
}: SkuCellProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const resetCopyStatusAfterDelay = () => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(() => {
      setCopyStatus("idle");
      resetTimeoutRef.current = null;
    }, 2000);
  };

  if (!value) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        {fallback}
      </span>
    );
  }

  const handleCopy = async () => {
    if (!copyable || !value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("copied");
      resetCopyStatusAfterDelay();
    } catch (err) {
      logger.warn("Failed to copy SKU to clipboard", {
        component: "SkuCell",
        valueLength: value.length,
        error: err instanceof Error ? err.message : String(err),
      });
      setCopyStatus("failed");
      resetCopyStatusAfterDelay();
    }
  };

  if (!copyable) {
    return (
      <span className={cn("font-mono text-sm", className)}>
        {value}
      </span>
    );
  }

  const copyLabel =
    copyStatus === "copied"
      ? "SKU copied"
      : copyStatus === "failed"
        ? "Copy failed"
        : "Copy SKU";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-mono text-sm">{value}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-muted"
        aria-label={copyLabel}
        onClick={(e) => {
          e.stopPropagation();
          void handleCopy();
        }}
        title={copyLabel}
      >
        {copyStatus === "copied" ? (
          <Check className="h-3 w-3 text-emerald-600" />
        ) : copyStatus === "failed" ? (
          <AlertCircle className="h-3 w-3 text-destructive" />
        ) : (
          <Copy className="h-3 w-3 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
});

SkuCell.displayName = "SkuCell";
