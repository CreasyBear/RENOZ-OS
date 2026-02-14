/**
 * Password Change Form
 *
 * Form for changing user password when already authenticated.
 * This is distinct from password reset (`reset-password-form.tsx`) which is used
 * when clicking a reset link from email.
 *
 * ARCHITECTURE: Container/Presenter Pattern
 * - Container handles data fetching (useChangePassword hook)
 * - Presenter renders UI and receives callbacks via props
 *
 * @see src/hooks/use-change-password.ts
 */
import { useState, useCallback } from "react";
import { getPasswordStrength } from "@/lib/auth/password-utils";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "@/hooks/use-change-password";
import type { PasswordStrength } from "@/lib/schemas/auth/auth";

// ============================================================================
// TYPES
// ============================================================================

export interface PasswordChangeFormPresenterProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrent: boolean;
  showNew: boolean;
  showConfirm: boolean;
  error: string | null;
  strength: PasswordStrength;
  isPending: boolean;
  isValid: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleShowCurrent: () => void;
  onToggleShowNew: () => void;
  onToggleShowConfirm: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

// ============================================================================
// PRESENTER
// ============================================================================

/**
 * Password Change Form Presenter
 *
 * Pure UI component - receives all data and callbacks via props.
 * No data fetching hooks, no state management.
 */
export function PasswordChangeFormPresenter({
  currentPassword,
  newPassword,
  confirmPassword,
  showCurrent,
  showNew,
  showConfirm,
  error,
  strength,
  isPending,
  isValid,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleShowCurrent,
  onToggleShowNew,
  onToggleShowConfirm,
  onSubmit,
}: PasswordChangeFormPresenterProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmitCapture={onSubmit} onSubmit={onSubmit} noValidate className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => onCurrentPasswordChange(e.target.value)}
                placeholder="Enter your current password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={onToggleShowCurrent}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                placeholder="Enter your new password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={onToggleShowNew}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {newPassword && (
              <div className="space-y-1">
                <div className="flex h-1.5 gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`flex-1 rounded-full transition-colors ${
                        level <= strength.strength
                          ? strength.color
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Password strength: {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                placeholder="Confirm your new password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={onToggleShowConfirm}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isPending || !isValid}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CONTAINER
// ============================================================================

/**
 * Password Change Form Container
 *
 * Container responsibilities:
 * - Fetches mutation hook (useChangePassword)
 * - Handles form validation logic
 * - Manages form state
 * - Passes data and callbacks to presenter
 *
 * @source changePassword from useChangePassword hook
 */
export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changePassword = useChangePassword();
  const strength = getPasswordStrength(newPassword);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Validation
      if (newPassword.length < 8) {
        setError("New password must be at least 8 characters");
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("New passwords do not match");
        return;
      }

      if (newPassword === currentPassword) {
        setError("New password must be different from current password");
        return;
      }

      try {
        await changePassword.mutateAsync({
          currentPassword,
          newPassword,
        });

        // Clear form on success
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch {
        // Error handled by mutation's onError
      }
    },
    [currentPassword, newPassword, confirmPassword, changePassword]
  );

  const isValid = !!currentPassword && !!newPassword && !!confirmPassword;

  return (
    <PasswordChangeFormPresenter
      currentPassword={currentPassword}
      newPassword={newPassword}
      confirmPassword={confirmPassword}
      showCurrent={showCurrent}
      showNew={showNew}
      showConfirm={showConfirm}
      error={error}
      strength={strength}
      isPending={changePassword.isPending}
      isValid={isValid}
      onCurrentPasswordChange={setCurrentPassword}
      onNewPasswordChange={setNewPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onToggleShowCurrent={() => setShowCurrent(!showCurrent)}
      onToggleShowNew={() => setShowNew(!showNew)}
      onToggleShowConfirm={() => setShowConfirm(!showConfirm)}
      onSubmit={handleSubmit}
    />
  );
}
