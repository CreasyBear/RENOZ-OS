/**
 * Sync Inbox Account Button Component
 *
 * Dedicated sync button component for manually syncing email accounts.
 * Used in account list items.
 *
 * @see src/hooks/communications/use-inbox-email-accounts.ts
 */

"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SyncInboxAccountButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function SyncInboxAccountButton({
  onClick,
  disabled = false,
}: SyncInboxAccountButtonProps) {
  return (
    <TooltipProvider delayDuration={70}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={disabled}
            onClick={onClick}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${disabled ? "animate-spin" : ""}`} />
            Sync
          </Button>
        </TooltipTrigger>
        <TooltipContent className="px-3 py-1.5 text-xs" sideOffset={10}>
          Manually sync emails from this account
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
