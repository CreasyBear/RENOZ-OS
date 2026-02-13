/**
 * Settings Route
 *
 * User and application settings page with navigation to sub-pages.
 * Organized into logical groups: Organization, Support, Templates, User Preferences
 *
 * LAYOUT: full-width
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 */
import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import {
  BarChart3,
  BookOpen,
  Building2,
  Key,
  Lock,
  Mail,
  Settings as SettingsIcon,
  Shield,
  Tag,
  Target,
  Ticket,
  TrendingUp,
  Upload,
  Users,
  Wrench,
} from 'lucide-react'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { PermissionGuard } from '@/components/shared/permission-guard'
import { SettingsPageSkeleton } from '@/components/skeletons/settings'

export const Route = createFileRoute('/_authenticated/settings')({
  component: Settings,
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Settings" />
      <PageLayout.Content>
        <SettingsPageSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
})

function Settings() {
  const location = useLocation()
  const isIndex = location.pathname === '/settings'

  // If we're on a child route (like /settings/organization), render the Outlet
  if (!isIndex) {
    return <Outlet />
  }

  // Otherwise, render the settings index (menu)
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Settings" />
      <PageLayout.Content>
        <div className="max-w-4xl">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-8">
        {/* Organization Section */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Organization
          </h2>
          <div className="grid gap-4">
            {/* Organization Settings - only visible to admins/owners */}
            <PermissionGuard permission="organization.update">
              <Link
                to="/settings/organization"
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Organization</h3>
                    <p className="text-sm text-gray-600">
                      Manage organization details, branding, and preferences
                    </p>
                  </div>
                </div>
              </Link>
            </PermissionGuard>

            {/* API Tokens */}
            <PermissionGuard permission="api_token.read">
              <Link
                to="/settings/api-tokens"
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <Key className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">API Tokens</h3>
                    <p className="text-sm text-gray-600">
                      Manage API tokens for third-party integrations
                    </p>
                  </div>
                </div>
              </Link>
            </PermissionGuard>

            {/* KPI Targets */}
            <PermissionGuard permission="dashboard.read">
              <Link
                to="/settings/targets"
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <Target className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">KPI Targets</h3>
                    <p className="text-sm text-gray-600">
                      Set and track performance targets for your organization
                    </p>
                  </div>
                </div>
              </Link>
            </PermissionGuard>

            {/* Scheduled Reports */}
            <PermissionGuard permission="scheduled_report.read">
              <Link
                to="/settings/scheduled-reports"
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Scheduled Reports</h3>
                    <p className="text-sm text-gray-600">
                      Configure automated reports sent on a schedule
                    </p>
                  </div>
                </div>
              </Link>
            </PermissionGuard>

            {/* Categories */}
            <PermissionGuard permission="category.read">
              <Link
                to="/settings/categories"
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <Tag className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Categories</h3>
                    <p className="text-sm text-gray-600">
                      Manage product and customer categories
                    </p>
                  </div>
                </div>
              </Link>
            </PermissionGuard>

            {/* Win/Loss Reasons */}
            <PermissionGuard permission="win_loss_reason.read">
              <Link
                to="/settings/win-loss-reasons"
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Win/Loss Reasons</h3>
                    <p className="text-sm text-gray-600">
                      Configure reasons for won and lost deals
                    </p>
                  </div>
                </div>
              </Link>
            </PermissionGuard>
          </div>
        </section>

        {/* Support & Warranty Section */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Support & Warranty
          </h2>
          <div className="grid gap-4">
            {/* Warranty Policies */}
            <PermissionGuard permission="warranty_policy.read">
              <Link
                to="/settings/warranty-policies"
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Warranty Policies</h3>
                    <p className="text-sm text-gray-600">
                      Define warranty terms, coverage periods, and conditions
                    </p>
                  </div>
                </div>
              </Link>
            </PermissionGuard>

            {/* Warranty Import */}
            <PermissionGuard permission="warranty.create">
              <Link
                to="/settings/warranty-import"
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Warranty Import</h3>
                    <p className="text-sm text-gray-600">
                      Bulk import warranty records from CSV or Excel files
                    </p>
                  </div>
                </div>
              </Link>
            </PermissionGuard>

            {/* Knowledge Base */}
            <PermissionGuard permission="knowledge_base.read">
              <Link
                to="/settings/knowledge-base"
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Knowledge Base</h3>
                    <p className="text-sm text-gray-600">
                      Manage help articles and documentation
                    </p>
                  </div>
                </div>
              </Link>
            </PermissionGuard>
          </div>
        </section>

        {/* Templates Section */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Templates
          </h2>
          <div className="grid gap-4">
            {/* Job Templates */}
            <PermissionGuard permission="job_template.read">
              <Link
                to="/settings/job-templates"
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <Wrench className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Job Templates</h3>
                    <p className="text-sm text-gray-600">
                      Create and manage reusable job templates
                    </p>
                  </div>
                </div>
              </Link>
            </PermissionGuard>

            {/* Issue Templates */}
            <PermissionGuard permission="issue_template.read">
              <Link
                to="/settings/issue-templates"
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <Ticket className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Issue Templates</h3>
                    <p className="text-sm text-gray-600">
                      Standardize support issue types and workflows
                    </p>
                  </div>
                </div>
              </Link>
            </PermissionGuard>
          </div>
        </section>

        {/* User Preferences Section */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            User Preferences
          </h2>
          <div className="grid gap-4">
            {/* Preferences */}
            <Link
              to="/settings/preferences"
              className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <SettingsIcon className="h-6 w-6 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Preferences</h3>
                  <p className="text-sm text-gray-600">
                    Personal settings, notifications, and display options
                  </p>
                </div>
              </div>
            </Link>

            {/* Email Settings */}
            <PermissionGuard permission="email.read">
              <Link
                to="/settings/email"
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Email Settings</h3>
                    <p className="text-sm text-gray-600">
                      Email signatures, templates, and notification preferences
                    </p>
                  </div>
                </div>
              </Link>
            </PermissionGuard>

            {/* Security */}
            <Link
              to="/settings/security"
              className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <Lock className="h-6 w-6 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Security</h3>
                  <p className="text-sm text-gray-600">
                    Password, two-factor authentication, and session management
                  </p>
                </div>
              </div>
            </Link>

            {/* Delegations */}
            <PermissionGuard permission="delegation.read">
              <Link
                to="/settings/delegations"
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Delegations</h3>
                    <p className="text-sm text-gray-600">
                      Set up approval delegations for when you&apos;re away
                    </p>
                  </div>
                </div>
              </Link>
            </PermissionGuard>
          </div>
        </section>
      </div>
        </div>
      </PageLayout.Content>
    </PageLayout>
  )
}
