import { memo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

export const SkuCell = memo(function SkuCell({
  value,
  copyable = false,
  fallback = "—",
  className,
}: SkuCellProps) {
  const [copied, setCopied] = useState(false);

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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!copyable) {
    return (
      <span className={cn("font-mono text-sm", className)}>
        {value}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-mono text-sm">{value}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-muted"
        onClick={(e) => {
          e.stopPropagation();
          handleCopy();
        }}
        title="Copy SKU"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-600" />
        ) : (
          <Copy className="h-3 w-3 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
});

SkuCell.displayName = "SkuCell";
