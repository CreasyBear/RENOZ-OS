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

        {/* Placeholder for future settings sections */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-gray-400">⚙️</span>
            <div>
              <h3 className="text-lg font-medium text-gray-400">
                More Settings
              </h3>
              <p className="text-sm text-gray-400">Coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
