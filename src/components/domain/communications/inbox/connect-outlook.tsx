/**
 * Connect Outlook Component
 *
 * Dedicated button component for connecting Outlook account.
 * Used in settings and empty states.
 *
 * @see src/hooks/communications/use-inbox-email-accounts.ts
 */

"use client";

import { Button } from "@/components/ui/button";
import { useConnectInboxEmailAccount } from "@/hooks/communications/use-inbox-email-accounts";

export function ConnectOutlook() {
  const connectMutation = useConnectInboxEmailAccount();

  return (
    <Button
      className="w-full"
      variant="outline"
      onClick={() => connectMutation.mutate({ provider: "microsoft_365" })}
      disabled={connectMutation.isPending}
    >
      <div className="flex items-center space-x-2">
        {/* Outlook icon - using Mail icon with Outlook brand color */}
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.5 3.75L3.75 7.5v9L7.5 20.25h12L23.25 16.5v-9L19.5 3.75H7.5z"
            fill="#0078D4"
          />
          <path
            d="M12 8.25L7.5 12l4.5 3.75V8.25z"
            fill="#fff"
            opacity="0.9"
          />
          <path
            d="M16.5 8.25L12 12l4.5 3.75V8.25z"
            fill="#fff"
            opacity="0.7"
          />
        </svg>
        <span>Connect Outlook</span>
      </div>
    </Button>
  );
}
