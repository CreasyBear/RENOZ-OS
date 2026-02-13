/**
 * Profile Page
 *
 * User profile page for viewing and editing personal information.
 * Extracted for code-splitting - see profile.tsx for route definition.
 */
import { useCallback } from "react";
import { PageLayout } from "@/components/layout";
import { SettingsCardsSkeleton } from "@/components/skeletons/settings";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/domain/users/profile-form";
import { PasswordChangeForm } from "@/components/auth/password-change-form";
import { AvatarUpload } from "@/components/domain/users/avatar-upload";
import { NotificationPreferencesForm } from "@/components/domain/users/notification-preferences-form";
import { ProfileErrorBoundary } from "@/components/domain/users/profile-error-boundary";
import { useAuth } from "@/lib/auth/hooks";
import { useUser, useUpdateUser } from "@/hooks/users";
import { toast } from "@/hooks";
import { extractAvatarUrl } from "@/lib/users";
import type { ProfileUpdateData } from "@/lib/schemas/users/profile";
import type { UserWithGroups } from "@/lib/schemas/users";

export default function ProfilePage() {
  const { user: authUser, isLoading: isAuthLoading } = useAuth();
  const userId = authUser?.id || "";
  const {
    data: userData,
    isLoading: isUserLoading,
    error,
    refetch,
  } = useUser(userId, !!userId);
  const updateMutation = useUpdateUser();

  const handleUpdate = useCallback(
    async (data: ProfileUpdateData) => {
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
        toast.error("Failed to update profile", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
        throw err;
      }
    },
    [userId, updateMutation]
  );

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

  if (error || !userData) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Profile"
          description="Manage your personal information and preferences"
        />
        <PageLayout.Content>
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">
              {error?.message || "Failed to load profile. Please try again."}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Profile"
        description="Manage your personal information and preferences"
      />
      <PageLayout.Content>
        <ProfileErrorBoundary>
          <div className="space-y-6 max-w-4xl mx-auto">
            <ProfileErrorBoundary
              title="Avatar Upload Error"
              description="We encountered an error with the avatar upload. Please try again."
            >
              <div className="flex items-center gap-6 p-6 bg-card rounded-lg border">
                <AvatarUpload
                  name={userData.name}
                  avatarUrl={extractAvatarUrl(userData.profile)}
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
            </ProfileErrorBoundary>

            <ProfileErrorBoundary
              title="Profile Form Error"
              description="We encountered an error with the profile form. Please try again."
            >
              <ProfileForm
                user={userData as UserWithGroups}
                currentUser={authUser ? { email: authUser.email } : null}
                onUpdate={handleUpdate}
                isUpdating={updateMutation.isPending}
              />
            </ProfileErrorBoundary>

            <PasswordChangeForm />
            <NotificationPreferencesForm />
          </div>
        </ProfileErrorBoundary>
      </PageLayout.Content>
    </PageLayout>
  );
}
