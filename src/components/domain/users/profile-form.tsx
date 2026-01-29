/**
 * User Profile Form
 *
 * Form for viewing and editing user profile information.
 * Follows container/presenter pattern - receives data via props.
 *
 * @see _Initiation/_prd/sprints/sprint-01-route-cleanup.prd.json (SPRINT-01-006)
 */

import { useState, useCallback } from "react";
import { User, Building2, Shield, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ============================================================================
// TYPES
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  type: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  profile?: {
    phone?: string;
    title?: string;
    department?: string;
    bio?: string;
    timezone?: string;
    language?: string;
  } | null;
  preferences?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    theme?: "light" | "dark" | "system";
    dateFormat?: string;
    currency?: string;
  } | null;
  groups?: Array<{
    groupId: string;
    groupName: string;
    role: string;
    joinedAt: Date | string;
  }>;
}

export interface ProfileFormProps {
  /** @source useUser hook in profile.tsx */
  user: UserProfile;
  /** @source useAuth hook in profile.tsx */
  currentUser: { email?: string } | null;
  /** @source useUpdateUser mutation in profile.tsx */
  onUpdate: (data: { name?: string; profile?: Record<string, unknown> }) => Promise<void>;
  /** @source useUpdateUser mutation state in profile.tsx */
  isUpdating: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProfileForm({ user, onUpdate, isUpdating }: ProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || "",
    phone: user.profile?.phone || "",
    title: user.profile?.title || "",
    department: user.profile?.department || "",
    bio: user.profile?.bio || "",
    timezone: user.profile?.timezone || "Australia/Sydney",
    language: user.profile?.language || "en",
  });

  const handleChange = useCallback(
    (field: keyof typeof formData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    await onUpdate({
      name: formData.name,
      profile: {
        ...user.profile,
        phone: formData.phone,
        title: formData.title,
        department: formData.department,
        bio: formData.bio,
        timezone: formData.timezone,
        language: formData.language,
      },
    });
    setIsEditing(false);
  }, [formData, user.profile, onUpdate]);

  const handleCancel = useCallback(() => {
    setFormData({
      name: user.name || "",
      phone: user.profile?.phone || "",
      title: user.profile?.title || "",
      department: user.profile?.department || "",
      bio: user.profile?.bio || "",
      timezone: user.profile?.timezone || "Australia/Sydney",
      language: user.profile?.language || "en",
    });
    setIsEditing(false);
  }, [user]);

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      manager: "bg-blue-100 text-blue-800",
      sales: "bg-green-100 text-green-800",
      operations: "bg-yellow-100 text-yellow-800",
      support: "bg-purple-100 text-purple-800",
      viewer: "bg-gray-100 text-gray-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {user.name || "Unnamed User"}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className={getRoleBadgeColor(user.role)}>
                  {user.role}
                </Badge>
                <Badge variant="outline">{user.status}</Badge>
                {user.type && <Badge variant="secondary">{user.type}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+61 XXX XXX XXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="e.g., Sales Manager"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleChange("department", e.target.value)}
                    placeholder="e.g., Sales"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={isUpdating}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </>
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
                      {user.profile?.phone || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Job Title</p>
                    <p className="font-medium">
                      {user.profile?.title || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">
                      {user.profile?.department || "Not set"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your account status and membership details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium capitalize">{user.role}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{user.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User Type</p>
              <p className="font-medium capitalize">
                {user.type || "Standard"}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium">{formatDate(user.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">{formatDate(user.updatedAt)}</p>
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
                    Joined {formatDate(group.joinedAt)}
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
