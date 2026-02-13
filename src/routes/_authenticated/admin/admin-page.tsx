/**
 * Admin Index Page Component
 *
 * Landing page for the Admin domain. Provides navigation to administrative features:
 * - User Management
 * - Groups
 * - Invitations
 * - Activities
 * - Audit Log
 *
 * @see src/routes/_authenticated/admin/index.tsx - Route definition
 */
import { Link } from '@tanstack/react-router';
import {
  Users,
  UsersRound,
  Mail,
  Activity,
  ShieldCheck,
  ArrowRight,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLayout } from '@/components/layout';
import { PermissionGuard } from '@/components/shared/permission-guard';
import { useUsers } from '@/hooks/users/use-users';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Admin feature cards for navigation
const adminFeatures = [
  {
    title: 'Users',
    description: 'Manage users, roles, and permissions',
    href: '/admin/users',
    icon: Users,
    color: 'text-blue-500',
    permission: 'user.read',
  },
  {
    title: 'Groups',
    description: 'Organize users into teams and groups',
    href: '/admin/groups',
    icon: UsersRound,
    color: 'text-purple-500',
    permission: 'group.read',
  },
  {
    title: 'Invitations',
    description: 'Send and manage user invitations',
    href: '/admin/invitations',
    icon: Mail,
    color: 'text-green-500',
    permission: 'user.read',
  },
  {
    title: 'Activities',
    description: 'View system and user activity logs',
    href: '/admin/activities',
    icon: Activity,
    color: 'text-orange-500',
    permission: 'activity.read',
  },
  {
    title: 'Audit Log',
    description: 'Review security and data access logs',
    href: '/admin/audit',
    icon: ShieldCheck,
    color: 'text-red-500',
    permission: 'audit.read',
  },
] as const;

export default function AdminPage() {
  const { data: usersData } = useUsers({ page: 1, pageSize: 5, sortOrder: 'desc' });
  const userCount = usersData?.pagination?.totalItems ?? 0;
  const showInviteFirstUser = userCount <= 1;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Admin"
        description="User management, groups, and system administration"
      />
      <PageLayout.Content>
        {/* Contextual CTA when org has no users (or only owner) */}
        {showInviteFirstUser && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Invite your first team member</p>
                <p className="text-muted-foreground text-sm">
                  Add users to your organization to collaborate and manage permissions.
                </p>
              </div>
              <Link
                to="/admin/invitations"
                search={{ page: 1, pageSize: 20, status: 'all' }}
                className={cn(buttonVariants())}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Feature Navigation Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {adminFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <PermissionGuard key={feature.href} permission={feature.permission}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {feature.title}
                    </CardTitle>
                    <Icon className={`h-5 w-5 ${feature.color}`} />
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {feature.description}
                    </CardDescription>
                    <Link
                      to={feature.href}
                      search={
                        feature.href === '/admin/invitations'
                          ? { page: 1, pageSize: 20, status: 'all' }
                          : undefined
                      }
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Open
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              </PermissionGuard>
            );
          })}
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
