/**
 * Support Index Route
 *
 * LAYOUT: full-width
 *
 * Landing page for the Support domain. Provides navigation to all support features:
 * - Dashboard
 * - Issues (tickets)
 * - Warranties
 * - RMAs (Return Merchandise Authorizations)
 * - Claims
 * - Knowledge Base
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Ticket,
  Shield,
  Package,
  FileCheck,
  BookOpen,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLayout, RouteErrorFallback } from '@/components/layout'

export const Route = createFileRoute('/_authenticated/support/')({
  component: SupportIndexPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
})

// Support feature cards for navigation
const supportFeatures = [
  {
    title: 'Dashboard',
    description: 'Overview of support metrics and KPIs',
    href: '/support/dashboard',
    icon: LayoutDashboard,
    color: 'text-blue-500',
  },
  {
    title: 'Issues',
    description: 'Manage customer support tickets and track resolutions',
    href: '/support/issues',
    icon: Ticket,
    color: 'text-orange-500',
  },
  {
    title: 'Warranties',
    description: 'Track warranty records and expiration dates',
    href: '/support/warranties',
    icon: Shield,
    color: 'text-green-500',
  },
  {
    title: 'RMAs',
    description: 'Process returns and manage return merchandise',
    href: '/support/rmas',
    icon: Package,
    color: 'text-purple-500',
  },
  {
    title: 'Claims',
    description: 'Handle warranty and insurance claims',
    href: '/support/claims',
    icon: FileCheck,
    color: 'text-red-500',
  },
  {
    title: 'Knowledge Base',
    description: 'Browse help articles and documentation',
    href: '/support/knowledge-base',
    icon: BookOpen,
    color: 'text-teal-500',
  },
] as const

function SupportIndexPage() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Support"
        description="Customer support, warranties, and claims management"
      />
      <PageLayout.Content>
        {/* Feature Navigation Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {supportFeatures.map((feature) => {
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
