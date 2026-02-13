/**
 * API Tokens Settings Presenter
 *
 * Pure UI component for API token management using SettingsSection format.
 * Receives token data and action callbacks as props.
 */

import { useState } from "react";
import { SettingsSection, SettingsRow } from "./settings-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Copy, CheckCircle2 } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export type ApiTokenScope = "read" | "write" | "admin";

export interface ApiTokenItem {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: ApiTokenScope[];
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  isRevoked: boolean;
  isExpired: boolean;
}

export interface NewlyCreatedToken {
  token: string;
  name: string;
  scopes: ApiTokenScope[];
  expiresAt?: Date;
}

export interface ApiTokensPresenterProps {
  tokens: ApiTokenItem[];
  isLoading: boolean;
  canCreate: boolean;
  canRevoke: boolean;
  newlyCreatedToken: NewlyCreatedToken | null;
  isCreating: boolean;
  isRevoking: string | null;
  createError?: string;
  onCreateToken: (name: string, scopes: ApiTokenScope[], expiresAt: Date | null) => void;
  onRevokeToken: (tokenId: string, reason?: string) => void;
  onDismissNewToken: () => void;
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

export function ApiTokensSettingsPresenter({
  tokens,
  isLoading,
  canCreate,
  canRevoke,
  newlyCreatedToken,
  isCreating,
  isRevoking,
  createError,
  onCreateToken,
  onRevokeToken,
  onDismissNewToken,
}: ApiTokensPresenterProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [tokenToRevoke, setTokenToRevoke] = useState<ApiTokenItem | null>(null);

  // Create dialog state
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<ApiTokenScope[]>(["read"]);
  const [newExpiry, setNewExpiry] = useState("never");

  // Revoke dialog state
  const [revokeReason, setRevokeReason] = useState("");

  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    let expiresAt: Date | null = null;
    if (newExpiry !== "never") {
      const days = parseInt(newExpiry, 10);
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }
    onCreateToken(newName, newScopes, expiresAt);
    setShowCreateDialog(false);
    setNewName("");
    setNewScopes(["read"]);
    setNewExpiry("never");
  };

  const handleRevoke = () => {
    if (tokenToRevoke) {
      onRevokeToken(tokenToRevoke.id, revokeReason || undefined);
      setTokenToRevoke(null);
      setRevokeReason("");
    }
  };

  const copyToken = async (token: string) => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleScope = (scope: ApiTokenScope) => {
    setNewScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const activeTokens = tokens.filter((t) => !t.isRevoked && !t.isExpired);
  const inactiveTokens = tokens.filter((t) => t.isRevoked || t.isExpired);

  return (
    <>
      <SettingsSection id="api-tokens" title="API Tokens" description="Manage API access tokens for integrations.">
        {/* New token display */}
        {newlyCreatedToken && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-medium text-green-800">Token Created!</span>
                <p className="text-sm text-green-700 mt-1">
                  Copy this token now. You won&apos;t be able to see it again.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={onDismissNewToken}>×</Button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-white border border-green-300 rounded font-mono text-sm break-all">
                {newlyCreatedToken.token}
              </code>
              <Button variant="outline" size="sm" onClick={() => copyToken(newlyCreatedToken.token)}>
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Create button */}
        {canCreate && (
          <SettingsRow label="Create Token" description="Generate a new API token.">
            <Button onClick={() => setShowCreateDialog(true)} disabled={isCreating}>
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Plus className="w-4 h-4 mr-2" />
              New Token
            </Button>
          </SettingsRow>
        )}

        {/* Token list */}
        {isLoading ? (
          <div className="py-4 text-center text-muted-foreground">Loading tokens...</div>
        ) : tokens.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No API tokens created yet.</p>
        ) : (
          <div className="space-y-2 pt-4 border-t">
            {activeTokens.map((token) => (
              <div key={token.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{token.name}</span>
                    <code className="text-xs text-muted-foreground">{token.tokenPrefix}...</code>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {token.scopes.join(", ")} · {token.lastUsedAt ? `Last used ${token.lastUsedAt.toLocaleDateString()}` : "Never used"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">Active</Badge>
                  {canRevoke && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTokenToRevoke(token)}
                      disabled={isRevoking === token.id}
                    >
                      {isRevoking === token.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {inactiveTokens.length > 0 && (
              <div className="pt-2">
                <span className="text-xs text-muted-foreground font-medium">Inactive</span>
                {inactiveTokens.map((token) => (
                  <div key={token.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/20 opacity-60">
                    <div className="flex flex-col">
                      <span className="text-sm">{token.name}</span>
                      <span className="text-xs text-muted-foreground">{token.scopes.join(", ")}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {token.isRevoked ? "Revoked" : "Expired"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SettingsSection>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Token</DialogTitle>
            <DialogDescription>Generate a new token for third-party integrations.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Token Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., CI/CD Pipeline"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scopes</label>
              <div className="space-y-2">
                {(["read", "write", "admin"] as const).map((scope) => (
                  <div key={scope} className="flex items-center gap-2">
                    <Checkbox
                      checked={newScopes.includes(scope)}
                      onCheckedChange={() => toggleScope(scope)}
                    />
                    <span className="text-sm capitalize">{scope}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Expiration</label>
              <Select value={newExpiry} onValueChange={setNewExpiry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never expires</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || newScopes.length === 0 || isCreating}>
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={!!tokenToRevoke} onOpenChange={() => setTokenToRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Token</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke <strong>{tokenToRevoke?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Input
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="e.g., Security concern"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTokenToRevoke(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={isRevoking === tokenToRevoke?.id}>
              {isRevoking === tokenToRevoke?.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Revoke Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
