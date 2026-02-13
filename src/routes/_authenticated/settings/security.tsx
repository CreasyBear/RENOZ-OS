/**
 * Security Settings Route
 *
 * User security management including password change, session management,
 * and two-factor authentication setup.
 *
 * Sections:
 * - Password: Change password with strength indicator
 * - Sessions: View and terminate active sessions
 * - Two-Factor: Enable/disable 2FA (future)
 * - Security Events: Recent security activity
 *
 * @see src/hooks/users for session and activity hooks
 */
import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SettingsCardsSkeleton } from '@/components/skeletons/settings';
import { format, formatDistanceToNow } from 'date-fns';
import {
  useMySessions,
  useTerminateSession,
  useTerminateAllOtherSessions,
  useMyActivity,
} from '@/hooks/users';
import { useMFA } from '@/hooks';
import { MFAEnrollmentDialog } from '@/components/shared/mfa-enrollment-dialog';
import { MFADisableDialog } from '@/components/shared/mfa-disable-dialog';
import { PasswordChangeForm } from '@/components/auth/password-change-form';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks';

// Icons
import {
  Key,
  Monitor,
  Smartphone,
  Tablet,
  Shield,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
} from 'lucide-react';
import { useConfirmation } from '@/hooks';

// Route definition - no loader, data fetching is done via hooks in component
export const Route = createFileRoute('/_authenticated/settings/security')({
  component: SecuritySettings,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsCardsSkeleton sections={4} />,
});

// Security event type mapping for audit log actions
type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'password_changed'
  | 'session_terminated'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'other';

function getSecurityEventType(action: string): SecurityEventType {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('login') && actionLower.includes('success')) return 'login_success';
  if (actionLower.includes('login') && actionLower.includes('fail')) return 'login_failed';
  if (actionLower.includes('password')) return 'password_changed';
  if (actionLower.includes('session') && actionLower.includes('terminat'))
    return 'session_terminated';
  if (actionLower.includes('mfa') && actionLower.includes('enable')) return 'mfa_enabled';
  if (actionLower.includes('mfa') && actionLower.includes('disable')) return 'mfa_disabled';
  return 'other';
}

function getEventDescription(action: string, entityType: string | null): string {
  const type = getSecurityEventType(action);
  switch (type) {
    case 'login_success':
      return 'Successful login';
    case 'login_failed':
      return 'Failed login attempt';
    case 'password_changed':
      return 'Password was changed';
    case 'session_terminated':
      return 'Session was terminated';
    case 'mfa_enabled':
      return 'Two-factor authentication enabled';
    case 'mfa_disabled':
      return 'Two-factor authentication disabled';
    default:
      return `${action}${entityType ? ` on ${entityType}` : ''}`;
  }
}

function SecuritySettings() {
  const confirm = useConfirmation();

  // Data fetching via hooks
  const { data: sessions = [], isLoading: sessionsLoading } = useMySessions();
  const { data: activityData, isLoading: activityLoading } = useMyActivity({ page: 1, pageSize: 10 });
  const securityEvents = activityData?.items ?? [];

  // Session mutations
  const terminateSessionMutation = useTerminateSession();
  const terminateAllMutation = useTerminateAllOtherSessions();

  // Track which session is being terminated (for UI feedback)
  const [terminatingSessionId, setTerminatingSessionId] = useState<string | null>(null);

  // MFA state
  const mfa = useMFA();
  const [showMFAEnrollment, setShowMFAEnrollment] = useState(false);
  const [showMFADisable, setShowMFADisable] = useState(false);

  // Fetch MFA status on mount
  useEffect(() => {
    mfa.refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle session termination
  const handleTerminateSession = async (sessionId: string) => {
    const confirmed = await confirm.confirm({
      title: 'Terminate Session',
      description:
        'Are you sure you want to terminate this session? You will be logged out from that device.',
      confirmLabel: 'Terminate Session',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      setTerminatingSessionId(sessionId);
      terminateSessionMutation.mutate(
        { id: sessionId },
        {
          onSuccess: () => {
            toast.success('Session terminated');
            setTerminatingSessionId(null);
          },
          onError: () => {
            toast.error('Failed to terminate session');
            setTerminatingSessionId(null);
          },
        }
      );
    }
  };

  // Handle terminate all other sessions
  const handleTerminateAllOthers = async () => {
    const confirmed = await confirm.confirm({
      title: 'Sign out of all other sessions?',
      description:
        "This will sign you out from all devices except this one. You'll need to sign in again on those devices.",
      confirmLabel: 'Sign out all',
    });

    if (confirmed.confirmed) {
      terminateAllMutation.mutate(undefined, {
        onSuccess: () => {
          toast.success('Other sessions terminated');
        },
        onError: () => {
          toast.error('Failed to terminate sessions');
        },
      });
    }
  };

  // Get device icon
  const getDeviceIcon = (type: 'desktop' | 'mobile' | 'tablet' | 'unknown') => {
    switch (type) {
      case 'mobile':
        return Smartphone;
      case 'tablet':
        return Tablet;
      default:
        return Monitor;
    }
  };

  // Get event icon and color
  const getEventStyle = (type: SecurityEventType) => {
    switch (type) {
      case 'login_success':
        return { icon: CheckCircle, color: 'text-green-500' };
      case 'login_failed':
        return { icon: AlertTriangle, color: 'text-red-500' };
      case 'password_changed':
        return { icon: Key, color: 'text-blue-500' };
      case 'session_terminated':
        return { icon: LogOut, color: 'text-orange-500' };
      case 'mfa_enabled':
        return { icon: ShieldCheck, color: 'text-green-500' };
      case 'mfa_disabled':
        return { icon: ShieldAlert, color: 'text-yellow-500' };
      default:
        return { icon: Shield, color: 'text-gray-500' };
    }
  };

  // Show loading skeleton while data is being fetched
  if (sessionsLoading || activityLoading) {
    return <SettingsCardsSkeleton sections={4} />;
  }

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Security"
        description="Manage your password, sessions, and security settings"
      />
      <PageLayout.Content>
        <div className="max-w-4xl space-y-6">

      <div className="space-y-6">
        {/* Password Section */}
        <PasswordChangeForm />

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Active Sessions
                </CardTitle>
                <CardDescription>Manage devices where you&apos;re signed in</CardDescription>
              </div>
              {sessions.filter((s) => !s.isCurrent).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTerminateAllOthers}
                  disabled={terminateAllMutation.isPending}
                >
                  {terminateAllMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  Sign out all others
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sessions.map((session) => {
                const DeviceIcon = getDeviceIcon(session.deviceType);
                const isTerminating = terminatingSessionId === session.id;
                return (
                  <div
                    key={session.id}
                    className="flex items-start justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-muted rounded-lg p-2">
                        <DeviceIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{session.device}</span>
                          {session.isCurrent && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground mt-1 text-sm">{session.browser}</div>
                        <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
                          {session.ipAddress && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.ipAddress}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.isCurrent
                              ? 'Active now'
                              : session.lastActiveAt
                                ? `Last active ${formatDistanceToNow(session.lastActiveAt, { addSuffix: true })}`
                                : `Created ${formatDistanceToNow(session.createdAt, { addSuffix: true })}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTerminateSession(session.id)}
                        disabled={isTerminating}
                      >
                        {isTerminating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>Add an extra layer of security to your account</CardDescription>
          </CardHeader>
          <CardContent>
            {mfa.loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : mfa.isEnrolled ? (
              <div className="flex items-center justify-between rounded-lg border bg-green-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-green-100 p-2">
                    <ShieldCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">2FA is enabled</p>
                    <p className="text-sm text-green-700">
                      Your account is protected with authenticator app verification
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowMFADisable(true)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Disable
                </Button>
              </div>
            ) : (
              <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-yellow-100 p-2">
                    <ShieldAlert className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">2FA is not enabled</p>
                    <p className="text-muted-foreground text-sm">
                      Enable two-factor authentication for additional security
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowMFAEnrollment(true)}>Enable 2FA</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Security Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Recent Security Activity
            </CardTitle>
            <CardDescription>Review recent security events on your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityEvents.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No recent security activity
                </p>
              ) : (
                securityEvents.map(
                  (event: {
                    id: string;
                    action: string;
                    entityType: string | null;
                    entityId: string | null;
                    timestamp: Date;
                    ipAddress: string | null;
                  }) => {
                    const eventType = getSecurityEventType(event.action);
                    const style = getEventStyle(eventType);
                    const Icon = style.icon;
                    return (
                      <div key={event.id} className="flex items-start gap-4">
                        <Icon className={`mt-0.5 h-5 w-5 ${style.color}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            {getEventDescription(event.action, event.entityType)}
                          </p>
                          <div className="text-muted-foreground mt-1 flex items-center gap-4 text-xs">
                            <span>{format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}</span>
                            {event.ipAddress && <span>IP: {event.ipAddress}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MFA Enrollment Dialog */}
      <MFAEnrollmentDialog
        open={showMFAEnrollment}
        onOpenChange={setShowMFAEnrollment}
        onEnrolled={() => mfa.refreshStatus()}
      />

      {/* MFA Disable Dialog */}
      {mfa.factors[0] && (
        <MFADisableDialog
          open={showMFADisable}
          onOpenChange={setShowMFADisable}
          factorId={mfa.factors[0].id}
          onDisabled={() => mfa.refreshStatus()}
        />
      )}
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
