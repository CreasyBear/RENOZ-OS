/**
 * User Role Configuration
 *
 * Centralized role badge styling configuration.
 * Replaces hardcoded role colors across components.
 *
 * @source ProfileForm component
 * @source users-page.tsx
 */


/**
 * Role badge color configuration
 * Uses semantic color system for consistency
 */
export const ROLE_BADGE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  manager: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  sales: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  operations: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  support: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  viewer: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

/**
 * Get role badge color classes
 *
 * @param role - User role string
 * @returns Tailwind color classes for role badge
 */
export function getRoleBadgeColor(role: string): string {
  return ROLE_BADGE_COLORS[role] || ROLE_BADGE_COLORS.viewer;
}
