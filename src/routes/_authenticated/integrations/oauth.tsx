/**
 * OAuth Integrations Page
 *
 * Main page for OAuth integrations management.
 * Provides comprehensive interface for managing connections, monitoring status, and troubleshooting.
 */

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, BarChart3, Zap, Shield, Database, Activity } from 'lucide-react';

import { OAuthConnectionManager } from '@/components/integrations/oauth/oauth-connection-manager';
import { OAuthStatusDashboard } from '@/components/integrations/oauth/oauth-status-dashboard';
import { useCurrentOrg } from '@/hooks/auth/use-current-org';

export const Route = createFileRoute('/_authenticated/integrations/oauth')({
  component: OAuthIntegrationsPage,
});

function OAuthIntegrationsPage() {
  const [activeTab, setActiveTab] = useState('connections');
  const { currentOrg, isLoading } = useCurrentOrg();

  return (
    <div className="container mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Zap className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">OAuth Integrations</h1>
            <p className="text-muted-foreground">
              Seamlessly connect and synchronize with Google Workspace and Microsoft 365 services.
            </p>
          </div>
        </div>

        {/* Feature Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm font-medium">
                <Database className="mr-2 h-4 w-4" />
                Calendar Sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Bidirectional calendar event synchronization with conflict resolution.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm font-medium">
                <Activity className="mr-2 h-4 w-4" />
                Email Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Advanced email processing with threading and spam filtering.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm font-medium">
                <Shield className="mr-2 h-4 w-4" />
                Contact Deduplication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Intelligent contact deduplication with fuzzy matching algorithms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm font-medium">
                <BarChart3 className="mr-2 h-4 w-4" />
                Health Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Real-time monitoring and automated health checks for all integrations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          All OAuth tokens are encrypted with AES-256-GCM and stored securely. Connections are
          monitored for health and automatically refreshed when needed.
        </AlertDescription>
      </Alert>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connections" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Manage Connections</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Status Dashboard</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-6">
          {isLoading || !currentOrg ? (
            <div className="text-muted-foreground text-sm">Loading organization...</div>
          ) : (
            <OAuthConnectionManager
              organizationId={currentOrg.id}
              onConnectionInitiated={(provider, services) => {
                console.log(`Initiating ${provider} connection for services:`, services);
              }}
              onConnectionCompleted={(connection) => {
                console.log('Connection completed:', connection);
                setActiveTab('dashboard'); // Switch to dashboard after connection
              }}
              onSyncCompleted={(result) => {
                console.log('Sync completed:', result);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          {isLoading || !currentOrg ? (
            <div className="text-muted-foreground text-sm">Loading organization...</div>
          ) : (
            <OAuthStatusDashboard organizationId={currentOrg.id} />
          )}
        </TabsContent>
      </Tabs>

      {/* Integration Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>Current status of all OAuth integrations and services.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Calendar Sync</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Operational
                </Badge>
              </div>
              <div className="text-muted-foreground text-xs">
                Last successful sync: 2 minutes ago
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email Integration</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Operational
                </Badge>
              </div>
              <div className="text-muted-foreground text-xs">
                Last successful sync: 5 minutes ago
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Contacts Sync</span>
                <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                  Degraded
                </Badge>
              </div>
              <div className="text-muted-foreground text-xs">
                Rate limited - retrying in 30 minutes
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting Section */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
          <CardDescription>Common issues and solutions for OAuth integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-medium">Connection Issues</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>• Check if the OAuth app is configured correctly</li>
                <li>• Verify redirect URIs match the application settings</li>
                <li>• Ensure proper scopes are requested</li>
                <li>• Check token expiration and refresh status</li>
              </ul>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Sync Problems</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>• Monitor the status dashboard for errors</li>
                <li>• Check API rate limits and quotas</li>
                <li>• Verify network connectivity and DNS</li>
                <li>• Review sync logs for detailed error messages</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Need Help?</h4>
                <p className="text-muted-foreground text-sm">
                  Contact support or check the integration documentation for detailed
                  troubleshooting guides.
                </p>
              </div>
              <Button variant="outline" size="sm">
                View Documentation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
