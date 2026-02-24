/**
 * User Profile Form
 *
 * Form for viewing and editing user profile information.
 * Uses TanStack Form with Zod validation per FORM-STANDARDS.md
 *
 * @lastReviewed 2026-02-10
 * @see _Initiation/_prd/sprints/sprint-01-route-cleanup.prd.json (SPRINT-01-006)
 * @see FORM-STANDARDS.md for form implementation patterns
 */

import { useState, useMemo, useEffect } from "react";
import { User, Building2, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  getInitials,
  getRoleBadgeColor,
  extractProfileFields,
  getProfilePhone,
  getProfileJobTitle,
  getProfileDepartment,
  getProfileBio,
  calculateProfileCompleteness,
} from "@/lib/users";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  TextField,
  TextareaField,
  SelectField,
  FormActions,
  FormFieldDisplayProvider,
} from "@/components/shared/forms";
import { profileFormSchema, type ProfileFormData } from "@/lib/schemas/users/profile";
import type { ProfileFormProps } from "@/lib/schemas/users/profile";
import { TIMEZONES, LANGUAGES } from "@/lib/constants";
import { mergeProfileUpdate } from "@/lib/users/profile-helpers";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get initial form data from user
 * Uses type-safe profile helpers (no type assertions)
 *
 * @param user - User data from useUser hook
 * @returns Form data mapped from user profile JSONB
 */
function getInitialFormData(user: ProfileFormProps["user"]): ProfileFormData {
  const profileFields = extractProfileFields(user.profile);

  return {
    name: user.name || "",
    ...profileFields,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Profile Form Component
 *
 * Displays user profile information in read-only mode with edit capability.
 * Uses TanStack Form with Zod validation for type-safe form handling.
 *
 * @param user - User data from useUser hook (@source useUser in profile.tsx)
 * @param currentUser - Current authenticated user (@source useAuth in profile.tsx)
 * @param onUpdate - Update handler (@source useUpdateUser mutation in profile.tsx)
 * @param isUpdating - Loading state (@source useUpdateUser mutation state in profile.tsx)
 */
export function ProfileForm({ user, onUpdate, isUpdating }: ProfileFormProps) {
  const initialFormData = useMemo(() => getInitialFormData(user), [user]);
  const [isEditing, setIsEditing] = useState(false);

  // Calculate profile completeness
  const completeness = useMemo(
    () => calculateProfileCompleteness({ name: user.name, profile: user.profile }),
    [user.name, user.profile]
  );

  const form = useTanStackForm<ProfileFormData>({
    schema: profileFormSchema,
    onSubmitInvalid: () => {
      toast.error("Please fix the errors below and try again.");
    },
    defaultValues: initialFormData,
    onSubmit: async (values) => {
      // Build profile update using helper (preserves existing fields, updates changed ones)
      const profileUpdate = mergeProfileUpdate(user.profile, values);

      await onUpdate({
        name: values.name,
        profile: profileUpdate,
      });
      setIsEditing(false);
    },
  });

  // Reset form when entering edit mode or when user data changes
  useEffect(() => {
    if (isEditing) {
      form.reset(initialFormData);
    }
    // form.reset is stable, but form object reference changes - only reset when entering edit mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, initialFormData]);

  const handleCancel = () => {
    form.reset(initialFormData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20" aria-label={`${user.name || "User"} avatar`}>
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {user.name || "Unnamed User"}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-3" role="list" aria-label="User badges">
                <Badge className={getRoleBadgeColor(user.role)} role="listitem">
                  {user.role}
                </Badge>
                <Badge variant="outline" role="listitem">{user.status}</Badge>
                {user.type && <Badge variant="secondary" role="listitem">{user.type}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Completeness Indicator */}
      {!completeness.isComplete && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              Complete Your Profile
            </CardTitle>
            <CardDescription className="text-xs">
              {completeness.missingFields.length > 0 && (
                <>Add {completeness.missingFields.slice(0, 2).join(" and ")} to improve your profile</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Profile completeness</span>
              <span className="font-medium">{completeness.percentage}%</span>
            </div>
            <Progress value={completeness.percentage} className="h-2" aria-label={`Profile ${completeness.percentage}% complete`} />
            {completeness.missingFields.length > 0 && (
              <ul className="text-xs text-muted-foreground mt-2 space-y-1" role="list">
                {completeness.missingFields.map((field) => (
                  <li key={field} className="flex items-center gap-1" role="listitem">
                    <span className="h-1 w-1 rounded-full bg-current" aria-hidden="true" />
                    {field}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {completeness.isComplete && completeness.percentage >= 100 && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Profile Complete
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Your profile is {completeness.percentage}% complete
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card role="region" aria-labelledby="profile-info-title">
          <CardHeader>
            <CardTitle id="profile-info-title" className="flex items-center gap-2">
              <User className="h-5 w-5" aria-hidden="true" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit();
                }}
                className="space-y-4"
                role="form"
                aria-label="Profile information form"
                noValidate
              >
                <FormFieldDisplayProvider form={form}>
                <form.Field name="name">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Full Name"
                      placeholder="Enter your full name"
                      required
                      autocomplete="name"
                      aria-required="true"
                    />
                  )}
                </form.Field>

                <form.Field name="phone">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Phone Number"
                      placeholder="+61 XXX XXX XXX"
                      type="tel"
                      autocomplete="tel"
                      inputMode="tel"
                    />
                  )}
                </form.Field>

                <form.Field name="jobTitle">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Job Title"
                      placeholder="e.g., Sales Manager"
                      autocomplete="organization-title"
                    />
                  )}
                </form.Field>

                <form.Field name="department">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Department"
                      placeholder="e.g., Sales"
                      autocomplete="organization-unit"
                    />
                  )}
                </form.Field>

                <form.Field name="bio">
                  {(field) => (
                    <TextareaField
                      field={field}
                      label="Bio"
                      placeholder="Tell us about yourself..."
                      rows={4}
                      maxLength={500}
                      aria-describedby="bio-description"
                    />
                  )}
                </form.Field>
                <p id="bio-description" className="text-xs text-muted-foreground -mt-2">
                  Maximum 500 characters
                </p>

                <form.Field name="timezone">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Timezone"
                      options={TIMEZONES.SUPPORTED.map((tz) => ({ value: tz, label: tz }))}
                      placeholder="Select timezone"
                    />
                  )}
                </form.Field>

                <form.Field name="language">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Language"
                      options={[...LANGUAGES]}
                      placeholder="Select language"
                    />
                  )}
                </form.Field>

                </FormFieldDisplayProvider>

                <FormActions
                  form={form}
                  submitLabel="Save Changes"
                  onCancel={handleCancel}
                  submitDisabled={isUpdating}
                  loadingLabel="Saving..."
                />
              </form>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">
                      {user.name || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">
                      {getProfilePhone(user.profile) || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Job Title</p>
                    <p className="font-medium">
                      {getProfileJobTitle(user.profile) || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">
                      {getProfileDepartment(user.profile) || "Not set"}
                    </p>
                  </div>
                  {getProfileBio(user.profile) && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bio</p>
                      <p className="font-medium">
                        {getProfileBio(user.profile)}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit profile information"
                >
                  Edit Profile
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card role="region" aria-labelledby="account-info-title">
          <CardHeader>
            <CardTitle id="account-info-title" className="flex items-center gap-2">
              <Shield className="h-5 w-5" aria-hidden="true" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your account status and membership details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4" role="list" aria-label="Account details">
            <div role="listitem">
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium capitalize" aria-label={`User role: ${user.role}`}>{user.role}</p>
            </div>
            <div role="listitem">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize" aria-label={`Account status: ${user.status}`}>{user.status}</p>
            </div>
            <div role="listitem">
              <p className="text-sm text-muted-foreground">User Type</p>
              <p className="font-medium capitalize" aria-label={`User type: ${user.type || "Standard"}`}>
                {user.type || "Standard"}
              </p>
            </div>
            <Separator role="separator" aria-orientation="horizontal" />
            <div role="listitem">
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium" aria-label={`Member since: ${formatDate(user.createdAt, {
                dateStyle: "long",
              })}`}>
                {formatDate(user.createdAt, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  locale: "en-AU",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">
                {formatDate(user.updatedAt, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  locale: "en-AU",
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups */}
      {user.groups && user.groups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Group Memberships
            </CardTitle>
            <CardDescription>
              Teams and groups you belong to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.groups.map((group) => (
                <div
                  key={group.groupId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{group.groupName}</p>
                    <p className="text-sm text-muted-foreground">
                      Role: {group.role}
                    </p>
                  </div>
                  <Badge variant="outline">
                    Joined{" "}
                    {formatDate(group.joinedAt, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      locale: "en-AU",
                    })}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ProfileForm;
