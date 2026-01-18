/**
 * Utility for merging Tailwind CSS classes.
 *
 * Combines clsx for conditional classes with tailwind-merge to properly
 * handle conflicting Tailwind classes (e.g., p-2 and p-4).
 *
 * @example
 * cn('p-2', 'p-4') // Returns 'p-4' (tailwind-merge removes conflict)
 * cn('text-red-500', condition && 'text-blue-500') // Conditional classes
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
