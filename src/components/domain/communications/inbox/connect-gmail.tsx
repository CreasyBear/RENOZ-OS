/**
 * Connect Gmail Component
 *
 * Dedicated button component for connecting Gmail account.
 * Used in settings and empty states.
 *
 * @see src/hooks/communications/use-inbox-email-accounts.ts
 */

"use client";

import { Button } from "@/components/ui/button";
import { useConnectInboxEmailAccount } from "@/hooks/communications/use-inbox-email-accounts";

export function ConnectGmail() {
  const connectMutation = useConnectInboxEmailAccount();

  return (
    <Button
      className="w-full"
      variant="outline"
      onClick={() => connectMutation.mutate({ provider: "google_workspace" })}
      disabled={connectMutation.isPending}
    >
      <div className="flex items-center space-x-2">
        {/* Gmail icon - using Mail icon with Gmail brand color */}
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M24 5.457v13.909l-8.116-8.116L24 5.457zM5.889 6.3L0 12.188l5.889 5.889V6.3zm13.111 0v11.777l-2.978-2.978-2.133-2.133L18 6.3zM5.889 18.077L12.188 11.78l2.133 2.133-8.433 8.433-8.433-8.433 2.133-2.133L5.889 18.077z"
            fill="#EA4335"
          />
          <path
            d="M12.188 11.78L5.889 5.481H18l-5.812 6.299z"
            fill="#34A853"
          />
          <path
            d="M5.889 5.481L0 11.37l5.889 5.889V5.481z"
            fill="#FBBC04"
          />
          <path
            d="M18 5.481l-5.812 6.299L18 17.258V5.481z"
            fill="#4285F4"
          />
        </svg>
        <span>Connect Gmail</span>
      </div>
    </Button>
  );
}
