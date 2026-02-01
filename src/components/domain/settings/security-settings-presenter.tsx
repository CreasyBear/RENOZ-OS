/**
 * Security Settings Presenter
 *
 * Pure UI component for security settings using SettingsSection format.
 * Receives session data, MFA status, and callbacks as props.
 */

import { useState } from "react";
import { SettingsSection, SettingsRow } from "./settings-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Eye,
  EyeOff,
  LogOut,
  Monitor,
  Smartphone,
  Tablet,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

import { formatDistanceToNow } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

export interface SessionInfo {
  id: string;
  device: string;
  browser: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  ipAddress?: string;
  isCurrent: boolean;
  lastActiveAt?: Date;
  createdAt: Date;
}

export interface SecurityPresenterProps {
  sessions: SessionInfo[];
  mfaEnabled: boolean;
  mfaLoading: boolean;
  terminatingSession: string | null;
  terminatingAll: boolean;
  changingPassword: boolean;
  onChangePassword: (current: string, newPassword: string) => Promise<boolean>;
  onTerminateSession: (sessionId: string) => Promise<void>;
  onTerminateAllOthers: () => Promise<void>;
  onEnableMFA: () => void;
  onDisableMFA: () => void;
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

export function SecuritySettingsPresenter({
  sessions,
  mfaEnabled,
  mfaLoading,
  terminatingSession,
  terminatingAll,
  changingPassword,
  onChangePassword,
  onTerminateSession,
  onTerminateAllOthers,
  onEnableMFA,
  onDisableMFA,
}: SecurityPresenterProps) {
  // Password form state (local)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Password strength
  const calculateStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "", color: "bg-gray-200" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z\d]/.test(pwd)) score++;

    if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
    if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" };
    return { score, label: "Strong", color: "bg-green-500" };
  };

  const strength = calculateStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit = currentPassword && newPassword && confirmPassword && passwordsMatch && strength.score >= 3;

  const handlePasswordSubmit = async () => {
    const success = await onChangePassword(currentPassword, newPassword);
    if (success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const getDeviceIcon = (type: SessionInfo["deviceType"]) => {
    switch (type) {
      case "mobile": return Smartphone;
      case "tablet": return Tablet;
      default: return Monitor;
    }
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <>
      {/* Password Section */}
      <SettingsSection id="security-password" title="Password" description="Update your password regularly for security.">
        <SettingsRow label="Current Password" description="Enter your existing password.">
          <div className="relative w-[240px]">
            <Input
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </SettingsRow>

        <SettingsRow label="New Password" description="At least 8 characters, mixed case, numbers.">
          <div className="space-y-2 w-[240px]">
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                  <div className={`h-full ${strength.color} transition-all`} style={{ width: `${(strength.score / 5) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{strength.label}</span>
              </div>
            )}
          </div>
        </SettingsRow>

        <SettingsRow label="Confirm Password" description="Re-enter your new password.">
          <div className="space-y-1 w-[240px]">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>
        </SettingsRow>

        <div className="py-2 flex justify-end">
          <Button onClick={handlePasswordSubmit} disabled={!canSubmit || changingPassword}>
            {changingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Change Password
          </Button>
        </div>
      </SettingsSection>

      {/* Two-Factor Authentication */}
      <SettingsSection id="security-mfa" title="Two-Factor Authentication" description="Add an extra layer of security.">
        <SettingsRow
          label={mfaEnabled ? "2FA Enabled" : "2FA Disabled"}
          description={mfaEnabled ? "Your account is protected with 2FA." : "Enable two-factor for additional security."}
        >
          {mfaLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : mfaEnabled ? (
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <Button variant="outline" size="sm" onClick={onDisableMFA}>Disable</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-yellow-500" />
              <Button size="sm" onClick={onEnableMFA}>Enable 2FA</Button>
            </div>
          )}
        </SettingsRow>
      </SettingsSection>

      {/* Active Sessions */}
      <SettingsSection id="security-sessions" title="Active Sessions" description="Manage devices where you're signed in.">
        {otherSessions.length > 0 && (
          <SettingsRow label="Sign out all others" description="End all sessions except this one.">
            <Button variant="outline" size="sm" onClick={onTerminateAllOthers} disabled={terminatingAll}>
              {terminatingAll && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <LogOut className="w-4 h-4 mr-2" />
              Sign out all
            </Button>
          </SettingsRow>
        )}

        <div className="space-y-2 pt-2">
          {sessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.deviceType);
            return (
              <div key={session.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                <div className="flex items-center gap-3">
                  <DeviceIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{session.device}</span>
                      {session.isCurrent && <Badge variant="secondary" className="text-xs">Current</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {session.browser} · {session.isCurrent ? "Active now" :
                        session.lastActiveAt ? formatDistanceToNow(session.lastActiveAt, { addSuffix: true }) :
                        formatDistanceToNow(session.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onTerminateSession(session.id)}
                    disabled={terminatingSession === session.id}
                  >
                    {terminatingSession === session.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SettingsSection>
    </>
  );
}
