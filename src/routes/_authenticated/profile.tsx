/**
 * Profile Route
 *
 * User profile page showing personal information and preferences.
 * Placeholder - will be expanded in user management PRD.
 */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/profile')({
  component: Profile,
})

function Profile() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Profile</h1>
      <p className="text-gray-600">
        Profile page coming soon.
      </p>
    </div>
  )
}
