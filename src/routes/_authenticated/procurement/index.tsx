/**
 * Procurement Index Route
 *
 * Redirects to the procurement dashboard.
 * Acts as the landing page for the Procurement domain.
 */
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/procurement/')({
  beforeLoad: async () => {
    // Redirect to the dashboard
    throw redirect({
      to: '/procurement/dashboard',
    })
  },
})
