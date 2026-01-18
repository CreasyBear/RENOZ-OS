/**
 * Organization Switcher Component
 *
 * Dropdown component for switching between organizations in multi-org setup.
 * Shows current org name and logo, with ability to switch or create new orgs.
 *
 * Features:
 * - Displays current organization with avatar/logo
 * - Dropdown menu with all user's organizations
 * - Preserves current route path when switching
 * - "Create Organization" option
 * - ChevronDown indicator
 *
 * @example
 * ```tsx
 * <OrgSwitcher />
 * ```
 */
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ChevronDown,
  Plus,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentOrg } from '@/hooks/use-current-org'

// ============================================================================
// TYPES
// ============================================================================

interface OrgSwitcherProps {
  /** Whether to show in collapsed (icon-only) mode */
  collapsed?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OrgSwitcher({ collapsed = false }: OrgSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const { currentOrg, organizations, setCurrentOrg, isLoading } = useCurrentOrg()

  const handleOrgSelect = (orgId: string) => {
    setCurrentOrg(orgId)
    setIsOpen(false)
    // Preserve current route path when switching orgs
    // In a full implementation, this might trigger a page reload or data refetch
  }

  const handleCreateOrg = () => {
    setIsOpen(false)
    // Navigate to organization creation page
    // For MVP, this is a placeholder
    navigate({ to: '/settings' })
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg px-2 py-1.5',
          'animate-pulse bg-gray-100',
          collapsed ? 'justify-center' : 'w-full'
        )}
      >
        <div className="h-8 w-8 rounded bg-gray-200" />
        {!collapsed && <div className="h-4 flex-1 rounded bg-gray-200" />}
      </div>
    )
  }

  // No organization (shouldn't happen in normal flow)
  if (!currentOrg) {
    return null
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-2 py-1.5',
          'text-left transition-colors',
          'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200',
          collapsed && 'justify-center'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Current organization: ${currentOrg.name}`}
      >
        {/* Organization avatar/logo */}
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center',
            'rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-medium'
          )}
        >
          {currentOrg.logoUrl ? (
            <img
              src={currentOrg.logoUrl}
              alt={currentOrg.name}
              className="h-full w-full rounded object-cover"
            />
          ) : (
            currentOrg.name.charAt(0).toUpperCase()
          )}
        </div>

        {/* Organization name and chevron (hidden when collapsed) */}
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {currentOrg.name}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-500 transition-transform',
                isOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Menu */}
          <div
            className={cn(
              'absolute z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg',
              collapsed ? 'left-full ml-2 top-0' : 'left-0 top-full'
            )}
            role="listbox"
            aria-label="Select organization"
          >
            {/* Organization list */}
            <div className="max-h-60 overflow-y-auto">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleOrgSelect(org.id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left',
                    'hover:bg-gray-50 focus:outline-none focus:bg-gray-50',
                    org.id === currentOrg.id && 'bg-gray-50'
                  )}
                  role="option"
                  aria-selected={org.id === currentOrg.id}
                >
                  {/* Org avatar */}
                  <div
                    className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center',
                      'rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-medium'
                    )}
                  >
                    {org.logoUrl ? (
                      <img
                        src={org.logoUrl}
                        alt={org.name}
                        className="h-full w-full rounded object-cover"
                      />
                    ) : (
                      org.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Org info */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {org.name}
                    </p>
                    {org.slug && (
                      <p className="truncate text-xs text-gray-500">
                        {org.slug}
                      </p>
                    )}
                  </div>

                  {/* Check mark for current */}
                  {org.id === currentOrg.id && (
                    <Check className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>

            {/* Separator */}
            <div className="my-1 border-t border-gray-200" />

            {/* Create organization option */}
            <button
              type="button"
              onClick={handleCreateOrg}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2 text-left',
                'hover:bg-gray-50 focus:outline-none focus:bg-gray-50',
                'text-sm text-gray-700'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center',
                  'rounded border-2 border-dashed border-gray-300 text-gray-400'
                )}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </div>
              <span>Create Organization</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
