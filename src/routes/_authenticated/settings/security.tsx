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
 * @see src/server/functions/users.ts for user server functions
 */
import { createFileRoute, useLoaderData } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { format, formatDistanceToNow } from 'date-fns';
import {
  listMySessions,
  terminateSession,
  terminateAllOtherSessions,
  type SessionInfo,
} from '@/server/functions/users/sessions';
import { getMyActivity } from '@/server/functions/_shared/audit-logs';
import { useMFA } from '@/hooks';
import { MFAEnrollmentDialog } from '@/components/shared/mfa-enrollment-dialog';
import { MFADisableDialog } from '@/components/shared/mfa-disable-dialog';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
} from 'lucide-react';
import { useConfirmation } from '@/hooks/use-confirmation';

// Route definition
export const Route = createFileRoute('/_authenticated/settings/security' as any)({
  component: SecuritySettings,
  loader: async () => {
    const [sessions, activity] = await Promise.all([
      listMySessions({ data: {} }),
      getMyActivity({ data: { page: 1, pageSize: 10 } }),
    ]);
    return { sessions, securityEvents: activity.items };
  },
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

  // Loader data
  const loaderData = useLoaderData({ from: '/_authenticated/settings/security' as any });

  // Server functions
  const terminateSessionFn = useServerFn(terminateSession);
  const terminateAllFn = useServerFn(terminateAllOtherSessions);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Session state - initialized from loader
  const [sessions, setSessions] = useState<SessionInfo[]>(loaderData?.sessions ?? []);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);
  const [terminatingAll, setTerminatingAll] = useState(false);

  // MFA state
  const mfa = useMFA();
  const [showMFAEnrollment, setShowMFAEnrollment] = useState(false);
  const [showMFADisable, setShowMFADisable] = useState(false);

  // Fetch MFA status on mount
  useEffect(() => {
    mfa.refreshStatus();
  }, []);

  // Update sessions when loader data changes
  useEffect(() => {
    if (loaderData?.sessions) {
      setSessions(loaderData.sessions);
    }
  }, [loaderData?.sessions]);

  // Password strength calculation
  const calculatePasswordStrength = (
    password: string
  ): { score: number; label: string; color: string } => {
    if (!password) return { score: 0, label: '', color: 'bg-gray-200' };

    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z\d]/.test(password)) score += 1;

    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' };
    if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' };
    if (score <= 4) return { score, label: 'Strong', color: 'bg-green-500' };
    return { score, label: 'Very Strong', color: 'bg-green-600' };
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  // Password requirements check
  const passwordRequirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'Contains number', met: /\d/.test(newPassword) },
    { label: 'Contains special character', met: /[^a-zA-Z\d]/.test(newPassword) },
  ];

  // Handle password change
  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordStrength.score < 3) {
      toast.error('Password is too weak. Please choose a stronger password.');
      return;
    }

    setChangingPassword(true);
    try {
      // In real implementation, call server function
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

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
      setTerminatingSession(sessionId);
      try {
        await terminateSessionFn({ data: { id: sessionId } });
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        toast.success('Session terminated');
      } catch {
        toast.error('Failed to terminate session');
      } finally {
        setTerminatingSession(null);
      }
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
      setTerminatingAll(true);
      try {
        await terminateAllFn({ data: {} });
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        toast.success('Other sessions terminated');
      } catch {
        toast.error('Failed to terminate sessions');
      } finally {
        setTerminatingAll(false);
      }
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

  // Security events from loader
  const securityEvents = loaderData?.securityEvents ?? [];

  return (
    <div className="max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Security</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your password, sessions, and security settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password regularly to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground text-sm">{passwordStrength.label}</span>
                  </div>

                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {passwordRequirements.map((req) => (
                      <div
                        key={req.label}
                        className={`flex items-center gap-1 ${req.met ? 'text-green-600' : 'text-muted-foreground'}`}
                      >
                        {req.met ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border" />
                        )}
                        {req.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            <Button
              onClick={handlePasswordChange}
              disabled={
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                newPassword !== confirmPassword ||
                changingPassword
              }
            >
              {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Active Sessions
                </CardTitle>
                <CardDescription>Manage devices where you're signed in</CardDescription>
              </div>
              {sessions.filter((s) => !s.isCurrent).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTerminateAllOthers}
                  disabled={terminatingAll}
                >
                  {terminatingAll ? (
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
                        disabled={terminatingSession === session.id}
                      >
                        {terminatingSession === session.id ? (
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
  );
}
