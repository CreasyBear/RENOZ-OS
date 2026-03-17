/**
 * OAuth Connection Manager Component
 *
 * React component for managing OAuth connections across different providers.
 * Provides a unified interface for connecting, disconnecting, and monitoring integrations.
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmation } from '@/hooks';
import type { PendingXeroTenantSelection } from '@/lib/schemas/oauth/connection';

// Import OAuth server functions (would be implemented with tRPC or similar)
interface OAuthConnection {
  id: string;
  provider: 'google_workspace' | 'microsoft_365' | 'xero';
  serviceType: 'calendar' | 'email' | 'contacts' | 'accounting';
  isActive: boolean;
  lastSyncedAt?: Date;
  lastSyncAt?: Date;
  externalAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ConnectionHealth {
  status: 'healthy' | 'token_expired' | 'api_error' | 'rate_limited' | 'inactive' | 'network_error';
  lastChecked: Date;
  responseTime?: number;
  errorMessage?: string;
}

interface SyncResult {
  success: boolean;
  eventsProcessed?: number;
  messagesProcessed?: number;
  contactsProcessed?: number;
  errors: string[];
  duration: number;
}

interface OAuthConnectionManagerProps {
  organizationId: string;
  /** URL to redirect to after OAuth callback. Defaults to /?settingsOpen=integrations for settings dialog usage. */
  redirectUrl?: string;
  onConnectionInitiated?: (provider: string, services: string[]) => void;
  onConnectionCompleted?: (connection: OAuthConnection) => void;
  onSyncCompleted?: (result: SyncResult) => void;
}

export function OAuthConnectionManager({
  organizationId,
  redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?settingsOpen=integrations`,
  onConnectionInitiated,
  onSyncCompleted,
}: OAuthConnectionManagerProps) {
  const confirm = useConfirmation();
  const queryClient = useQueryClient();
  const [initiatingConnection, setInitiatingConnection] = useState<string | null>(null);
  const [syncingConnection, setSyncingConnection] = useState<string | null>(null);
  const [pendingSelectionStateId, setPendingSelectionStateId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') === 'select_tenant') {
      const stateId = params.get('oauthStateId');
      if (stateId) {
        setPendingSelectionStateId(stateId);
      }
    }
  }, []);

  // Query for existing connections
const {
    data: connections,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.oauth.connections(organizationId),
    queryFn: async () => {
      const response = await fetch('/api/oauth/connections', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }
      const data = await response.json();
      return (data.connections as OAuthConnection[]).map((connection) => ({
        ...connection,
        lastSyncedAt: connection.lastSyncedAt
          ? new Date(connection.lastSyncedAt)
          : connection.lastSyncAt
            ? new Date(connection.lastSyncAt)
            : undefined,
        createdAt: new Date(connection.createdAt),
        updatedAt: new Date(connection.updatedAt),
      }));
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Query for connection health
  const { data: healthStatuses } = useQuery({
    queryKey: queryKeys.oauth.health(organizationId),
    queryFn: async () => {
      const response = await fetch('/api/oauth/health', { credentials: 'include' });
      if (!response.ok) {
        return {} as Record<string, ConnectionHealth>;
      }
      const data = await response.json();
      return data.health as Record<string, ConnectionHealth>;
    },
    staleTime: 60000, // Consider data fresh for 1 minute
    refetchInterval: 60000, // Refetch every minute
  });

  const clearPendingSelectionQueryParams = useCallback(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth');
      url.searchParams.delete('oauthStateId');
      url.searchParams.delete('provider');
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }
    setPendingSelectionStateId(null);
  }, []);

  const { data: pendingTenantSelection, isLoading: isLoadingPendingTenantSelection } = useQuery({
    queryKey: ['oauth', 'pending-selection', pendingSelectionStateId],
    enabled: pendingSelectionStateId != null,
    queryFn: async () => {
      const response = await fetch(
        `/api/oauth/pending-selection?stateId=${encodeURIComponent(pendingSelectionStateId ?? '')}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load Xero tenant choices');
      }
      return response.json() as Promise<PendingXeroTenantSelection>;
    },
  });

  // Mutation for initiating OAuth flow
  const initiateConnectionMutation = useMutation({
    mutationFn: async ({ provider, services }: { provider: string; services: string[] }) => {
      const response = await fetch('/api/oauth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider,
          services,
          redirectUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth connection');
      }

      return response.json();
    },
    onSuccess: (data, { provider, services }) => {
      // Redirect to OAuth provider
      window.location.href = data.authorizationUrl;
      onConnectionInitiated?.(provider, services);
    },
    onError: (error) => {
      toast.error('Failed to initiate connection', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Mutation for disconnecting OAuth connection
  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(`/api/oauth/connections/${connectionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.oauth.connections(organizationId) });
      toast.success('Connection disconnected successfully');
    },
    onError: (error) => {
      toast.error('Failed to disconnect', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const completeTenantSelectionMutation = useMutation({
    mutationFn: async ({ stateId, tenantId }: { stateId: string; tenantId: string }) => {
      const response = await fetch('/api/oauth/pending-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stateId, tenantId }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete Xero tenant selection');
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.oauth.connections(organizationId) });
      clearPendingSelectionQueryParams();
      toast.success('Xero tenant connected', {
        description: 'The selected Xero organization is now linked to this Renoz organization.',
      });
    },
    onError: (error) => {
      toast.error('Failed to complete Xero tenant selection', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Mutation for syncing connection
  const syncMutation = useMutation({
    mutationFn: async ({
      connectionId,
      fullSync,
    }: {
      connectionId: string;
      fullSync?: boolean;
    }) => {
      const response = await fetch(`/api/oauth/sync/${connectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fullSync }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync connection');
      }

      return response.json();
    },
    onSuccess: (result) => {
      onSyncCompleted?.(result);
      toast.success('Sync completed', {
        description: `Processed ${result.eventsProcessed || result.messagesProcessed || result.contactsProcessed || 0} items`,
      });
    },
    onError: (error) => {
      toast.error('Sync failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
    onSettled: () => {
      setSyncingConnection(null);
    },
  });

  const handleInitiateConnection = useCallback(
    async (provider: string, services: string[]) => {
      setInitiatingConnection(provider);
      try {
        await initiateConnectionMutation.mutateAsync({ provider, services });
      } finally {
        setInitiatingConnection(null);
      }
    },
    [initiateConnectionMutation]
  );

  const handleDisconnect = useCallback(
    async (connectionId: string) => {
      const { confirmed } = await confirm.confirm({
        title: 'Disconnect Integration',
        description:
          'Are you sure you want to disconnect this integration? This will stop all data synchronization.',
        confirmLabel: 'Disconnect',
        variant: 'destructive',
      });

      if (confirmed) {
        await disconnectMutation.mutateAsync(connectionId);
      }
    },
    [confirm, disconnectMutation]
  );

  const handleSync = useCallback(
    async (connectionId: string, fullSync = false) => {
      setSyncingConnection(connectionId);
      await syncMutation.mutateAsync({ connectionId, fullSync });
    },
    [syncMutation]
  );

  const getStatusBadge = useCallback((isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isActive ? 'active' : 'inactive'}
      </Badge>
    );
  }, []);

  const getHealthIcon = useCallback((status?: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'token_expired':
      case 'api_error':
      case 'network_error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'rate_limited':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  }, []);

  const formatProviderName = useCallback((provider: string) => {
    switch (provider) {
      case 'google_workspace':
        return 'Google Workspace';
      case 'microsoft_365':
        return 'Microsoft 365';
      case 'xero':
        return 'Xero';
      default:
        return provider;
    }
  }, []);

  const formatService = useCallback((service: string) => {
    switch (service) {
      case 'calendar':
        return '📅 Calendar';
      case 'email':
        return '📧 Email';
      case 'contacts':
        return '👥 Contacts';
      case 'accounting':
        return 'Accounting';
      default:
        return service;
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading connections...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load OAuth connections. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">OAuth Integrations</h2>
          <p className="text-muted-foreground">
            Connect your external services to enable seamless data synchronization.
          </p>
        </div>
      </div>

      {pendingSelectionStateId && (
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle>Select Xero Tenant</CardTitle>
            <CardDescription>
              This Xero login can access multiple organizations. Choose the tenant to connect to
              this Renoz organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingPendingTenantSelection ? (
              <div className="text-sm text-muted-foreground">Loading Xero tenants...</div>
            ) : pendingTenantSelection?.tenants?.length ? (
              pendingTenantSelection.tenants.map((tenant) => (
                <div
                  key={tenant.tenantId}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="font-medium">{tenant.tenantId}</div>
                    <div className="text-sm text-muted-foreground">
                      {tenant.tenantType || 'Xero organization'}
                    </div>
                  </div>
                  <Button
                    onClick={() =>
                      completeTenantSelectionMutation.mutate({
                        stateId: pendingSelectionStateId,
                        tenantId: tenant.tenantId,
                      })
                    }
                    disabled={completeTenantSelectionMutation.isPending}
                  >
                    {completeTenantSelectionMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect tenant'
                    )}
                  </Button>
                </div>
              ))
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No selectable Xero tenants were found for this OAuth session.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Connections */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connections?.map((connection) => (
          <Card key={connection.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{formatProviderName(connection.provider)}</CardTitle>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(connection.isActive)}
                  {healthStatuses?.[connection.id] &&
                    getHealthIcon(healthStatuses[connection.id].status)}
                </div>
              </div>
              <CardDescription>
                {connection.provider === 'xero'
                  ? 'Organization-scoped accounting connection'
                  : formatService(connection.serviceType)}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {connection.provider === 'xero' && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="font-medium">Active tenant</div>
                  <div className="text-muted-foreground">
                    {connection.externalAccountId || 'Tenant ID unavailable'}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Invoices and journals fail closed until this accounting connection is healthy.
                  </div>
                </div>
              )}

              {connection.lastSyncedAt && (
                <div className="text-muted-foreground text-sm">
                  Last synced: {new Date(connection.lastSyncedAt).toLocaleString()}
                </div>
              )}

              {healthStatuses?.[connection.id]?.errorMessage && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">
                    {healthStatuses[connection.id].errorMessage}
                  </AlertDescription>
                </Alert>
              )}

              {connection.provider === 'xero' ? (
                <div className="flex space-x-2">
                  <Button
                    variant={connection.isActive ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleInitiateConnection('xero', ['accounting'])}
                    disabled={initiatingConnection === 'xero'}
                    className="flex-1"
                  >
                    {initiatingConnection === 'xero' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {connection.isActive ? 'Reconnect Xero' : 'Connect Xero'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(connection.id)}
                    disabled={disconnectMutation.isPending}
                    aria-label="Disconnect integration"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(connection.id)}
                    disabled={syncingConnection === connection.id || !connection.isActive}
                    className="flex-1"
                  >
                    {syncingConnection === connection.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Sync
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(connection.id, true)}
                    disabled={syncingConnection === connection.id || !connection.isActive}
                    className="flex-1"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Full Sync
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(connection.id)}
                    disabled={disconnectMutation.isPending}
                    aria-label="Disconnect integration"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available Providers */}
      {(!connections || connections.length === 0) && (
        <div className="py-12 text-center">
          <div className="mx-auto max-w-md">
            <h3 className="text-lg font-medium">No integrations connected</h3>
            <p className="text-muted-foreground mt-2">
              Connect your external services to start synchronizing data automatically.
            </p>
          </div>
        </div>
      )}

      {/* Add New Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="mr-2 h-5 w-5" />
            Add New Integration
          </CardTitle>
          <CardDescription>
            Choose a provider and select the services you want to integrate.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Google Workspace */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded bg-red-100"
                  role="img"
                  aria-label="Google Workspace logo"
                >
                  <span className="text-sm font-bold text-red-600">G</span>
                </div>
                <div>
                  <h4 className="font-medium">Google Workspace</h4>
                  <p className="text-muted-foreground text-sm">Calendar, Gmail, Contacts</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => handleInitiateConnection('google_workspace', ['calendar'])}
                  disabled={initiatingConnection === 'google_workspace'}
                  className="flex-1"
                  variant="outline"
                >
                  {initiatingConnection === 'google_workspace' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  📅 Calendar
                </Button>

                <Button
                  onClick={() => handleInitiateConnection('google_workspace', ['email'])}
                  disabled={initiatingConnection === 'google_workspace'}
                  className="flex-1"
                  variant="outline"
                >
                  {initiatingConnection === 'google_workspace' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  📧 Gmail
                </Button>

                <Button
                  onClick={() => handleInitiateConnection('google_workspace', ['contacts'])}
                  disabled={initiatingConnection === 'google_workspace'}
                  className="flex-1"
                  variant="outline"
                >
                  {initiatingConnection === 'google_workspace' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  👥 Contacts
                </Button>
              </div>
            </div>

            {/* Microsoft 365 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded bg-blue-100"
                  role="img"
                  aria-label="Microsoft 365 logo"
                >
                  <span className="text-sm font-bold text-blue-600">M</span>
                </div>
                <div>
                  <h4 className="font-medium">Microsoft 365</h4>
                  <p className="text-muted-foreground text-sm">Outlook, Calendar, People</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => handleInitiateConnection('microsoft_365', ['calendar'])}
                  disabled={initiatingConnection === 'microsoft_365'}
                  className="flex-1"
                  variant="outline"
                >
                  {initiatingConnection === 'microsoft_365' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  📅 Calendar
                </Button>

                <Button
                  onClick={() => handleInitiateConnection('microsoft_365', ['email'])}
                  disabled={initiatingConnection === 'microsoft_365'}
                  className="flex-1"
                  variant="outline"
                >
                  {initiatingConnection === 'microsoft_365' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  📧 Outlook
                </Button>

                <Button
                  onClick={() => handleInitiateConnection('microsoft_365', ['contacts'])}
                  disabled={initiatingConnection === 'microsoft_365'}
                  className="flex-1"
                  variant="outline"
                >
                  {initiatingConnection === 'microsoft_365' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  👥 People
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded bg-sky-100"
                  role="img"
                  aria-label="Xero logo"
                >
                  <span className="text-sm font-bold text-sky-700">X</span>
                </div>
                <div>
                  <h4 className="font-medium">Xero</h4>
                  <p className="text-muted-foreground text-sm">
                    Organization-scoped accounting connection
                  </p>
                </div>
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                Invoice and journal sync will fail closed until a single active Xero accounting
                connection is configured for this organization. If the Xero login can see multiple
                organizations, reconnect with the exact tenant you want to use.
              </div>

              <Button
                onClick={() => handleInitiateConnection('xero', ['accounting'])}
                disabled={initiatingConnection === 'xero'}
                className="w-full"
                variant="outline"
              >
                {initiatingConnection === 'xero' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Connect Xero
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
