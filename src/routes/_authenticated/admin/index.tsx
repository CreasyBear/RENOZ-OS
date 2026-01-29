/**
 * Admin Index Route
 *
 * Landing page for the Admin domain. Provides navigation to administrative features:
 * - User Management
 * - Groups
 * - Invitations
 * - Activities
 * - Audit Log
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Users,
  UsersRound,
  Mail,
  Activity,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLayout, RouteErrorFallback } from '@/components/layout'

export const Route = createFileRoute('/_authenticated/admin/')({
  component: AdminIndexPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
})

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
    permission: 'invitation.read',
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
] as const

function AdminIndexPage() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Admin"
        description="User management, groups, and system administration"
      />
      <PageLayout.Content>
        {/* Feature Navigation Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {adminFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.href}
                className="transition-shadow hover:shadow-md"
              >
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
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Open
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </PageLayout.Content>
    </PageLayout>
  )
}
