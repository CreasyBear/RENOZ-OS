/**
 * Reports Index Page
 *
 * Landing page for the Reports domain. Provides navigation to all reports.
 */
import { Link } from '@tanstack/react-router'
import {
  Users,
  Shield,
  TrendingUp,
  Briefcase,
  ShoppingCart,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Report feature cards for navigation
const reportFeatures = [
  {
    title: 'Customer Reports',
    description: 'Customer analytics, segmentation, and insights',
    href: '/reports/customers',
    icon: Users,
    color: 'text-blue-500',
  },
  {
    title: 'Warranty Reports',
    description: 'Warranty status, claims, and coverage analysis',
    href: '/reports/warranties',
    icon: Shield,
    color: 'text-green-500',
  },
  {
    title: 'Pipeline Forecast',
    description: 'Sales pipeline projections and trend analysis',
    href: '/reports/pipeline-forecast',
    icon: TrendingUp,
    color: 'text-purple-500',
  },
  {
    title: 'Job Costing',
    description: 'Job profitability and cost breakdowns',
    href: '/reports/job-costing',
    icon: Briefcase,
    color: 'text-orange-500',
  },
  {
    title: 'Procurement Reports',
    description: 'Purchase order and supplier analytics',
    href: '/reports/procurement',
    icon: ShoppingCart,
    color: 'text-teal-500',
  },
  {
    title: 'Expiring Warranties',
    description: 'Upcoming warranty expirations and renewals',
    href: '/reports/expiring-warranties',
    icon: Clock,
    color: 'text-red-500',
  },
] as const

/**
 * Reports index content component.
 * @source routes/_authenticated/reports/index.tsx
 */
export function ReportsIndexContent() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {reportFeatures.map((feature) => {
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
                View Report
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

/**
 * @deprecated Use ReportsIndexContent instead. Route now owns PageLayout.
 * Reports index container.
 * @source routes/_authenticated/reports/index.tsx
 */
export function ReportsIndexPage() {
  return <ReportsIndexContent />
}
