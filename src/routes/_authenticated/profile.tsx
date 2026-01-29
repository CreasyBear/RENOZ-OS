/**
 * Profile Route
 *
 * User profile page for viewing and editing personal information.
 * Includes profile editing, password change, avatar upload, and notification preferences.
 *
 * @see _Initiation/_prd/sprints/sprint-01-route-cleanup.prd.json (SPRINT-01-006)
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { SettingsCardsSkeleton } from "@/components/skeletons/settings";
import { ProfileForm } from "@/components/domain/users/profile-form";
import { PasswordChangeForm } from "@/components/domain/users/password-change-form";
import { AvatarUpload } from "@/components/domain/users/avatar-upload";
import { NotificationPreferencesForm } from "@/components/domain/users/notification-preferences-form";
import { useAuth } from "@/lib/auth/hooks";
import { useUser, useUpdateUser } from "@/hooks/users";
import { toast } from "@/hooks";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Profile" />
      <PageLayout.Content>
        <SettingsCardsSkeleton sections={4} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT (Container)
// ============================================================================

function ProfilePage() {
  // ============================================================================
  // AUTH CONTEXT
  // ============================================================================
  const { user: authUser, isLoading: isAuthLoading } = useAuth();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const userId = authUser?.id || "";

  const {
    data: userData,
    isLoading: isUserLoading,
    error,
  } = useUser(userId, !!userId);

  // ============================================================================
  // MUTATIONS
  // ============================================================================
  const updateMutation = useUpdateUser();

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleUpdate = useCallback(
    async (data: { name?: string; profile?: Record<string, unknown> }) => {
      if (!userId) {
        toast.error("User not found");
        return;
      }

      try {
        await updateMutation.mutateAsync({
          id: userId,
          name: data.name,
          profile: data.profile,
        });
        toast.success("Profile updated successfully");
      } catch (err) {
        console.error("Failed to update profile:", err);
        toast.error("Failed to update profile", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
        throw err;
      }
    },
    [userId, updateMutation]
  );

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (isAuthLoading || isUserLoading) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Profile"
          description="Manage your personal information and preferences"
        />
        <PageLayout.Content>
          <SettingsCardsSkeleton sections={4} />
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error || !userData) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Profile"
          description="Manage your personal information and preferences"
        />
        <PageLayout.Content>
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Failed to load profile. Please try again later.
            </p>
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Profile"
        description="Manage your personal information and preferences"
      />
      <PageLayout.Content>
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Avatar Section */}
          <div className="flex items-center gap-6 p-6 bg-card rounded-lg border">
            <AvatarUpload
              name={userData.name}
              avatarUrl={(userData as unknown as { avatarUrl?: string }).avatarUrl}
              size="xl"
            />
            <div>
              <h2 className="text-xl font-semibold">{userData.name || "Unnamed User"}</h2>
              <p className="text-muted-foreground">{userData.email}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click on your avatar to upload a new photo
              </p>
            </div>
          </div>

          {/* Profile Form */}
          <ProfileForm
            user={userData}
            currentUser={authUser ? { email: authUser.email } : null}
            onUpdate={handleUpdate}
            isUpdating={updateMutation.isPending}
          />

          {/* Password Change */}
          <PasswordChangeForm />

          {/* Notification Preferences */}
          <NotificationPreferencesForm />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}

export default ProfilePage;
