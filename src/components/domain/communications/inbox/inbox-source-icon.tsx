/**
 * Inbox Source Icon Component
 *
 * Displays provider-specific icons (Gmail/Outlook) for synced emails.
 * Shows which external provider an email came from.
 *
 * @see _reference/.midday-reference/apps/dashboard/src/components/inbox/inbox-source-icon.tsx
 */

"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type InboxSource = "gmail" | "outlook" | null;

function getInboxSource(metadata?: {
  source?: string;
  provider?: string;
}): InboxSource {
  if (!metadata) return null;

  // Check metadata.provider (set during sync)
  if (metadata.provider === "google_workspace") {
    return "gmail";
  }
  if (metadata.provider === "microsoft_365") {
    return "outlook";
  }

  // Check metadata.source as fallback
  if (metadata.source === "synced") {
    // If source is synced but no provider, return null (shouldn't happen)
    return null;
  }

  return null;
}

type SourceIconConfig = {
  icon: React.ReactNode;
  tooltip: string;
  color?: string;
};

const sourceConfigs: Record<Exclude<InboxSource, null>, SourceIconConfig> = {
  gmail: {
    icon: (
      <svg
        className="h-4 w-4"
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
    ),
    tooltip: "Synced from Gmail",
  },
  outlook: {
    icon: (
      <svg
        className="h-4 w-4"
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
    ),
    tooltip: "Synced from Outlook",
  },
};

interface InboxSourceIconProps {
  metadata?: {
    source?: string;
    provider?: string;
    fromName?: string;
  } | null;
  email?: string;
}

export function InboxSourceIcon({ metadata, email }: InboxSourceIconProps) {
  const source = getInboxSource(metadata ?? undefined);

  if (!source) {
    return null;
  }

  const config = sourceConfigs[source];
  const tooltip = email ? `${config.tooltip} (${email})` : config.tooltip;

  return (
    <div className="border-r border-border pr-3 mr-3">
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-default items-center">
              {config.icon}
            </span>
          </TooltipTrigger>
          <TooltipContent className="text-xs px-3 py-1.5">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
