/**
 * Inbox Email Accounts Settings Component
 *
 * UI component for managing external email account connections via OAuth.
 * Allows users to connect Gmail/Outlook accounts and sync emails to inbox.
 *
 * @see src/hooks/communications/use-inbox-email-accounts.ts
 * @see src/server/functions/communications/inbox-accounts.ts
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import { Mail, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { ConnectGmail } from "./connect-gmail";
import { ConnectOutlook } from "./connect-outlook";
import { ConnectEmailModal } from "./connect-email-modal";
import { SyncInboxAccountButton } from "./sync-inbox-account-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect, startTransition } from "react";
import { toast } from "@/lib/toast";
import { getUserFriendlyMessage } from "@/lib/error-handling";
import { useConfirmation } from "@/hooks/_shared/use-confirmation";
import {
  useInboxEmailAccounts,
  useSyncInboxEmailAccount,
  useDeleteInboxEmailAccount,
} from "@/hooks/communications/use-inbox-email-accounts";
import { Skeleton } from "@/components/ui/skeleton";
import { QUERY_CONFIG } from "@/lib/constants";
import type { InboxEmailAccount } from "@/lib/schemas/communications/inbox-accounts";

// ============================================================================
// PROVIDER ICONS
// ============================================================================

function getProviderIcon(provider: "google_workspace" | "microsoft_365") {
  if (provider === "google_workspace") {
    return (
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
    );
  }
  return (
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
  );
}

// ============================================================================
// ACCOUNT ITEM COMPONENT
// ============================================================================

interface InboxEmailAccountItemProps {
  account: InboxEmailAccount;
  onSync: (connectionId: string) => void;
  onDelete: (connectionId: string) => void;
  isSyncing?: boolean;
}

function InboxEmailAccountItem({
  account,
  onSync,
  onDelete,
  isSyncing = false,
}: InboxEmailAccountItemProps) {
  const { confirm } = useConfirmation();

  const isDisconnected = account.status === "disconnected";

  const handleDelete = async () => {
    const result = await confirm({
      title: "Delete Email Account",
      description: `Are you sure you want to disconnect ${account.email}? This will stop syncing emails from this account.`,
      confirmLabel: "Disconnect",
      variant: "destructive",
    });

    if (result.confirmed) {
      onDelete(account.id);
    }
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
      <div className="flex items-center space-x-4">
        <Avatar className="h-[34px] w-[34px]">
          <AvatarFallback className="bg-white border border-border">
            {getProviderIcon(account.provider)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{account.email}</span>
            {isDisconnected && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs cursor-help">
                      Disconnected
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px] text-xs">
                    <p>
                      Account access has expired. Email providers typically expire access tokens
                      periodically as part of their security practices. Reconnect to restore
                      functionality.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {account.status === "connected" && (
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
          <span className="text-muted-foreground text-xs">
            {isSyncing ? (
              "Syncing..."
            ) : account.lastSyncedAt ? (
              <>
                Last synced {formatDistanceToNow(account.lastSyncedAt, { addSuffix: true })}
              </>
            ) : (
              "Never synced"
            )}
          </span>
        </div>
      </div>

      <div className="flex space-x-2 items-center">
        {!isDisconnected && (
          <SyncInboxAccountButton
            onClick={() => onSync(account.id)}
            disabled={isSyncing}
          />
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Disconnect this email account</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// ============================================================================
// ACCOUNTS LIST COMPONENT
// ============================================================================

interface InboxEmailAccountsListProps {
  accounts: InboxEmailAccount[];
  onSync: (connectionId: string) => void;
  onDelete: (connectionId: string) => void;
  syncingConnectionId?: string;
}

function InboxEmailAccountsList({
  accounts,
  onSync,
  onDelete,
  syncingConnectionId,
}: InboxEmailAccountsListProps) {
  if (accounts.length === 0) {
    return (
      <div className="px-6 py-8 pb-12 text-center flex flex-col items-center">
        <Mail className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-4">
          No email accounts connected. Connect an account to sync emails into your inbox.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 divide-y">
      {accounts.map((account) => (
        <InboxEmailAccountItem
          key={account.id}
          account={account}
          onSync={onSync}
          onDelete={onDelete}
          isSyncing={syncingConnectionId === account.id}
        />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InboxEmailAccountsSettings() {
  const syncMutation = useSyncInboxEmailAccount();
  const deleteMutation = useDeleteInboxEmailAccount();
  
  // Track sync state for polling (follows TanStack Query polling pattern)
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingConnectionId = syncMutation.variables?.connectionId;
  
  // Poll account status when sync is in progress
  const { data, isLoading, error } = useInboxEmailAccounts({
    refetchInterval: isSyncing ? QUERY_CONFIG.REFETCH_INTERVAL_NORMAL : false,
  });

  const accounts = data?.accounts ?? [];

  // Track sync state and auto-stop polling after 30 seconds
  useEffect(() => {
    if (syncMutation.isPending || syncingConnectionId) {
      startTransition(() => setIsSyncing(true));
      // Stop polling after 30 seconds
      const timeout = setTimeout(() => {
        startTransition(() => setIsSyncing(false));
      }, QUERY_CONFIG.REFETCH_INTERVAL_SLOW);
      return () => clearTimeout(timeout);
    } else {
      startTransition(() => setIsSyncing(false));
    }
  }, [syncMutation.isPending, syncingConnectionId]);

  const handleSync = (connectionId: string) => {
    setIsSyncing(true);
    syncMutation.mutate(
      { connectionId, manualSync: true },
      {
        onSettled: () => {
          // Stop polling after sync completes (success or error)
          setTimeout(() => setIsSyncing(false), QUERY_CONFIG.REFETCH_INTERVAL_SLOW);
        },
      }
    );
  };

  const handleDelete = (connectionId: string) => {
    deleteMutation.mutate(connectionId, {
      onSuccess: () => {
        toast.success("Account Disconnected", {
          description: "Email account has been disconnected successfully.",
        });
      },
      onError: (error) => {
        toast.error("Disconnect Failed", {
          description: getUserFriendlyMessage(error as Error),
        });
      },
    });
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Connections</CardTitle>
          <CardDescription>Manage your connected email accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Failed to load email accounts: {error.message}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5" />
          <span>Email Connections</span>
        </CardTitle>
        <CardDescription>
          Connect external email accounts to sync emails into your unified inbox.
        </CardDescription>
      </CardHeader>

      {isLoading ? (
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      ) : (
        <>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="px-6 py-8 pb-12 text-center flex flex-col items-center">
                <div className="flex flex-col space-y-3 max-w-[300px]">
                  <ConnectGmail />
                  <ConnectOutlook />
                </div>
              </div>
            ) : (
              <InboxEmailAccountsList
                accounts={accounts}
                onSync={handleSync}
                onDelete={handleDelete}
                syncingConnectionId={syncingConnectionId}
              />
            )}
          </CardContent>

          {accounts.length > 0 && (
            <CardFooter className="flex justify-end">
              <ConnectEmailModal>
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Connect Another Account
                </Button>
              </ConnectEmailModal>
            </CardFooter>
          )}
        </>
      )}
    </Card>
  );
}
