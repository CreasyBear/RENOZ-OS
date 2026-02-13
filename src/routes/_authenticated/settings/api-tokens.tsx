/**
 * API Tokens Settings Route
 *
 * Allows users to create, view, and revoke API tokens for third-party integrations.
 * Only visible to users with api_token.read permission (admin/sales roles).
 *
 * @see src/lib/server/api-tokens.ts for server functions
 * @see drizzle/schema/api-tokens.ts for database schema
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { SettingsTableSkeleton } from '@/components/skeletons/settings';
import {
  PermissionGuard,
  useHasPermission,
} from "@/components/shared/permission-guard";
import { Button } from "@/components/ui/button";
import {
  useApiTokens,
  useCreateApiToken,
  useRevokeApiToken,
  type ApiTokenListItem,
  type CreateApiTokenResponse,
  type ApiTokenScope,
} from "@/hooks/settings";
import { DataTableEmpty } from "@/components/shared/data-table";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/settings/api-tokens")({
  component: ApiTokensPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsTableSkeleton />,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ApiTokensPage() {
  return (
    <PermissionGuard
      permission="api_token.read"
      fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header title="Access Denied" />
          <PageLayout.Content>
            <p className="text-gray-600">
              You don&apos;t have permission to view API tokens.
            </p>
          </PageLayout.Content>
        </PageLayout>
      }
    >
      <ApiTokensContent />
    </PermissionGuard>
  );
}

function ApiTokensContent() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] =
    useState<CreateApiTokenResponse | null>(null);
  const [tokenToRevoke, setTokenToRevoke] = useState<ApiTokenListItem | null>(
    null
  );

  const canCreate = useHasPermission("api_token.create");
  const canRevoke = useHasPermission("api_token.revoke");

  // Fetch tokens using hook
  const { data: tokens, isLoading } = useApiTokens();

  // Create token mutation using hook
  const createMutation = useCreateApiToken();

  // Revoke token mutation using hook
  const revokeMutation = useRevokeApiToken();

  const handleCreate = useCallback(
    (name: string, scopes: ApiTokenScope[], expiresAt: Date | null) => {
      createMutation.mutate(
        { name, scopes, expiresAt },
        {
          onSuccess: (data) => {
            setNewlyCreatedToken(data);
            setShowCreateDialog(false);
          },
        }
      );
    },
    [createMutation]
  );

  const handleRevoke = useCallback(
    (reason?: string) => {
      if (tokenToRevoke) {
        revokeMutation.mutate(
          { tokenId: tokenToRevoke.id, reason },
          {
            onSuccess: () => {
              setTokenToRevoke(null);
            },
          }
        );
      }
    },
    [tokenToRevoke, revokeMutation]
  );

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="API Tokens"
        description="Create and manage API tokens for third-party integrations."
        actions={
          canCreate && (
            <Button onClick={() => setShowCreateDialog(true)}>Create Token</Button>
          )
        }
      />
      <PageLayout.Content>

      {/* Newly created token display */}
      {newlyCreatedToken && (
        <NewTokenDisplay
          token={newlyCreatedToken}
          onDismiss={() => setNewlyCreatedToken(null)}
        />
      )}

        {/* Token list */}
        {isLoading ? (
          <div className="text-gray-500">Loading tokens...</div>
        ) : tokens && tokens.length > 0 ? (
          <TokenList
            tokens={tokens}
            onRevoke={setTokenToRevoke}
            canRevoke={canRevoke}
          />
      ) : (
        <DataTableEmpty
          variant="empty"
          title="No API Tokens"
          description="Create your first API token to enable third-party integrations."
          action={
            canCreate
              ? { label: "Create Token", onClick: () => setShowCreateDialog(true) }
              : undefined
          }
        />
      )}

      {/* Create dialog */}
      {showCreateDialog && (
        <CreateTokenDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreate}
          isLoading={createMutation.isPending}
          error={createMutation.error?.message}
        />
      )}

      {/* Revoke confirmation dialog */}
      {tokenToRevoke && (
        <RevokeConfirmDialog
          token={tokenToRevoke}
          onClose={() => setTokenToRevoke(null)}
          onConfirm={handleRevoke}
          isLoading={revokeMutation.isPending}
        />
      )}
      </PageLayout.Content>
    </PageLayout>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function NewTokenDisplay({
  token,
  onDismiss,
}: {
  token: CreateApiTokenResponse;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(token.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-medium text-green-800">
            Token Created Successfully
          </h3>
          <p className="text-sm text-green-700 mt-1">
            <strong>Important:</strong> Copy your token now. You won&apos;t be able
            to see it again!
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-green-600 hover:text-green-800"
        >
          ✕
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 p-2 bg-white border border-green-300 rounded font-mono text-sm break-all">
          {token.token}
        </code>
        <button
          onClick={copyToClipboard}
          className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="mt-2 text-sm text-green-700">
        <span className="font-medium">Name:</span> {token.name} |{" "}
        <span className="font-medium">Scopes:</span> {token.scopes.join(", ")}
        {token.expiresAt && (
          <>
            {" "}
            | <span className="font-medium">Expires:</span>{" "}
            {new Date(token.expiresAt).toLocaleDateString()}
          </>
        )}
      </div>
    </div>
  );
}

function TokenList({
  tokens,
  onRevoke,
  canRevoke,
}: {
  tokens: ApiTokenListItem[];
  onRevoke: (token: ApiTokenListItem) => void;
  canRevoke: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Token
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Scopes
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Used
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tokens.map((token) => (
            <tr
              key={token.id}
              className={token.isRevoked || token.isExpired ? "opacity-50" : ""}
            >
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {token.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                {token.tokenPrefix}...
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {token.scopes.join(", ")}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(token.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {token.lastUsedAt
                  ? new Date(token.lastUsedAt).toLocaleDateString()
                  : "Never"}
              </td>
              <td className="px-4 py-3 text-sm">
                <TokenStatusBadge token={token} />
              </td>
              <td className="px-4 py-3 text-sm text-right">
                {!token.isRevoked && canRevoke && (
                  <button
                    onClick={() => onRevoke(token)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Revoke
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TokenStatusBadge({ token }: { token: ApiTokenListItem }) {
  if (token.isRevoked) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
        Revoked
      </span>
    );
  }
  if (token.isExpired) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
        Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
      Active
    </span>
  );
}

function CreateTokenDialog({
  onClose,
  onCreate,
  isLoading,
  error,
}: {
  onClose: () => void;
  onCreate: (name: string, scopes: ApiTokenScope[], expiresAt: Date | null) => void;
  isLoading: boolean;
  error?: string;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiTokenScope[]>(["read"]);
  const [expiresIn, setExpiresIn] = useState<string>("never");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let expiresAt: Date | null = null;
    if (expiresIn !== "never") {
      const days = parseInt(expiresIn, 10);
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }
    onCreate(name, scopes, expiresAt);
  };

  const toggleScope = (scope: ApiTokenScope) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Create API Token
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., CI/CD Pipeline, Zapier Integration"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                maxLength={100}
              />
            </div>

            {/* Scopes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scopes
              </label>
              <div className="space-y-2">
                {(["read", "write", "admin"] as const).map((scope) => (
                  <label
                    key={scope}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={scopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {scope}
                    </span>
                    <span className="text-xs text-gray-500">
                      {scope === "read" && "- Read-only access"}
                      {scope === "write" && "- Create and update resources"}
                      {scope === "admin" && "- Full administrative access"}
                    </span>
                  </label>
                ))}
              </div>
              {scopes.length === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  At least one scope is required
                </p>
              )}
            </div>

            {/* Expiration */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration
              </label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="never">Never expires</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </select>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || scopes.length === 0 || !name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating..." : "Create Token"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function RevokeConfirmDialog({
  token,
  onClose,
  onConfirm,
  isLoading,
}: {
  token: ApiTokenListItem;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Revoke Token
          </h2>
          <p className="text-gray-600 mb-4">
            Are you sure you want to revoke <strong>{token.name}</strong>? This
            action cannot be undone.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Security concern, no longer needed"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              maxLength={500}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(reason || undefined)}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? "Revoking..." : "Revoke Token"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
