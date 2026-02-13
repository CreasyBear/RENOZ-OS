/**
 * User Menu Component
 *
 * Dropdown menu with user avatar showing profile, settings, and logout options.
 */
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSignOut } from '@/lib/auth/hooks'
import { useCurrentUser } from '@/hooks/auth/use-current-user'
import { toast } from '@/hooks'

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const signOut = useSignOut()

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as never)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close menu on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    setIsOpen(false)
    try {
      await signOut.mutateAsync()
      toast.success('Signed out successfully')
      navigate({ to: '/login', search: { redirect: undefined } })
    } catch {
      toast.error('Failed to sign out')
    }
  }

  const userInitials = user?.email
    ? user.email.charAt(0).toUpperCase()
    : 'U'

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg px-2 py-1.5',
          'text-gray-700 hover:bg-gray-100 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-gray-200'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            'bg-gray-200 text-gray-600 text-sm font-medium'
          )}
        >
          {userInitials}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-500 transition-transform',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute right-0 mt-2 w-56 origin-top-right rounded-lg',
            'bg-white shadow-lg ring-1 ring-black/5',
            'focus:outline-none z-50'
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.email || 'User'}
            </p>
          </div>

          <div className="py-1">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-2 text-sm text-gray-700',
                'hover:bg-gray-100 transition-colors'
              )}
              role="menuitem"
            >
              <User className="h-4 w-4 text-gray-500" aria-hidden="true" />
              Profile
            </Link>

            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-2 text-sm text-gray-700',
                'hover:bg-gray-100 transition-colors'
              )}
              role="menuitem"
            >
              <Settings className="h-4 w-4 text-gray-500" aria-hidden="true" />
              Settings
            </Link>
          </div>

          <div className="border-t border-gray-100 py-1">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signOut.isPending}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700',
                'hover:bg-gray-100 transition-colors text-left',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              role="menuitem"
            >
              <LogOut className="h-4 w-4 text-gray-500" aria-hidden="true" />
              {signOut.isPending ? 'Logging out...' : 'Log out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
