/**
 * Settings Route
 *
 * User and application settings page with navigation to sub-pages.
 * Will be expanded in settings domain PRD.
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { PermissionGuard } from '@/components/shared/permission-guard'

export const Route = createFileRoute('/_authenticated/settings')({
  component: Settings,
})

function Settings() {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>

      <div className="grid gap-4">
        {/* API Tokens - only visible to users with api_token.read permission */}
        <PermissionGuard permission="api_token.read">
          <Link
            to="/settings/api-tokens"
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔑</span>
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
              <span className="text-2xl">🎯</span>
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
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Scheduled Reports</h3>
                <p className="text-sm text-gray-600">
                  Configure automated reports sent on a schedule
                </p>
              </div>
            </div>
          </Link>
        </PermissionGuard>

        {/* Organization Settings - only visible to admins/owners */}
        <PermissionGuard permission="organization.update">
          <Link
            to="/settings/organization"
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏢</span>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Organization</h3>
                <p className="text-sm text-gray-600">
                  Manage organization details, branding, and preferences
                </p>
              </div>
            </div>
          </Link>
        </PermissionGuard>

        {/* Win/Loss Reasons */}
        <PermissionGuard permission="organization.read">
          <Link
            to="/settings/win-loss-reasons"
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📈</span>
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
    </div>
  )
}
