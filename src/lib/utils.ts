/**
 * Utility functions for shadcn/ui components
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge.
 * This handles conditional classes and deduplication.
 *
 * @example
 * ```tsx
 * <div className={cn("base-class", isActive && "active-class", className)} />
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export CSV utilities
export {
  sanitizeCSVValue,
  escapeCSV,
  escapeAndSanitizeCSV,
  buildSafeCSV,
  downloadCSV,
} from "./utils/csv-sanitize";
