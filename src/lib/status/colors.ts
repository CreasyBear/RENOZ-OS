/**
 * Semantic Status Colors
 *
 * Single source of truth for status colors across React, PDF, and Email.
 * Each color provides hex, rgb, and Tailwind classes for multi-format usage.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

/**
 * Color value for a single mode (light or dark)
 */
export interface ModeColors {
  bg: string;
  text: string;
  border: string;
}

/**
 * Complete semantic color definition
 */
export interface SemanticColorDef {
  /** Hex value for PDF/Email rendering (e.g., '#10B981') */
  hex: string;
  /** RGB values for gradients/opacity (e.g., '16, 185, 129') */
  rgb: string;
  /** Light mode Tailwind classes */
  light: ModeColors;
  /** Dark mode Tailwind classes */
  dark: ModeColors;
}

/**
 * Semantic status colors with multi-format values.
 *
 * Each color provides:
 * - hex: For PDF/Email rendering
 * - rgb: For gradients and opacity operations
 * - light: Tailwind classes for light mode
 * - dark: Tailwind classes for dark mode
 */
export const STATUS_COLORS = {
  // ─────────────────────────────────────────────────────────────
  // CORE SEMANTIC COLORS
  // ─────────────────────────────────────────────────────────────

  success: {
    hex: '#10B981',
    rgb: '16, 185, 129',
    light: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    dark: {
      bg: 'dark:bg-emerald-900/30',
      text: 'dark:text-emerald-400',
      border: 'dark:border-emerald-800',
    },
  },

  warning: {
    hex: '#F59E0B',
    rgb: '245, 158, 11',
    light: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
    },
    dark: {
      bg: 'dark:bg-amber-900/30',
      text: 'dark:text-amber-400',
      border: 'dark:border-amber-800',
    },
  },

  error: {
    hex: '#EF4444',
    rgb: '239, 68, 68',
    light: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
    },
    dark: {
      bg: 'dark:bg-red-900/30',
      text: 'dark:text-red-400',
      border: 'dark:border-red-800',
    },
  },

  info: {
    hex: '#3B82F6',
    rgb: '59, 130, 246',
    light: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    dark: {
      bg: 'dark:bg-blue-900/30',
      text: 'dark:text-blue-400',
      border: 'dark:border-blue-800',
    },
  },

  neutral: {
    hex: '#6B7280',
    rgb: '107, 114, 128',
    light: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-200',
    },
    dark: {
      bg: 'dark:bg-gray-800',
      text: 'dark:text-gray-300',
      border: 'dark:border-gray-700',
    },
  },

  // ─────────────────────────────────────────────────────────────
  // EXTENDED SEMANTIC COLORS (domain-specific needs)
  // ─────────────────────────────────────────────────────────────

  /**
   * In-progress/active work state
   * Use for: picking, in_progress, proposal, negotiation
   */
  progress: {
    hex: '#8B5CF6',
    rgb: '139, 92, 246',
    light: {
      bg: 'bg-violet-100',
      text: 'text-violet-700',
      border: 'border-violet-200',
    },
    dark: {
      bg: 'dark:bg-violet-900/30',
      text: 'dark:text-violet-400',
      border: 'dark:border-violet-800',
    },
  },

  /**
   * Pending/awaiting action state
   * Use for: pending_approval, scheduled
   */
  pending: {
    hex: '#F97316',
    rgb: '249, 115, 22',
    light: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-200',
    },
    dark: {
      bg: 'dark:bg-orange-900/30',
      text: 'dark:text-orange-400',
      border: 'dark:border-orange-800',
    },
  },

  /**
   * Inactive/dormant state
   * Use for: inactive, closed, archived
   */
  inactive: {
    hex: '#94A3B8',
    rgb: '148, 163, 184',
    light: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
    },
    dark: {
      bg: 'dark:bg-slate-800',
      text: 'dark:text-slate-400',
      border: 'dark:border-slate-700',
    },
  },

  /**
   * Draft/initial state
   * Use for: draft, new
   */
  draft: {
    hex: '#CBD5E1',
    rgb: '203, 213, 225',
    light: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
    },
    dark: {
      bg: 'dark:bg-slate-800/50',
      text: 'dark:text-slate-400',
      border: 'dark:border-slate-700',
    },
  },
} as const;

export type SemanticColor = keyof typeof STATUS_COLORS;

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Get combined Tailwind classes for a semantic color.
 * Includes both light and dark mode classes.
 */
export function getStatusColorClasses(color: SemanticColor): string {
  const c = STATUS_COLORS[color];
  return [
    c.light.bg,
    c.light.text,
    c.light.border,
    c.dark.bg,
    c.dark.text,
    c.dark.border,
  ].join(' ');
}

/**
 * Get text and bg classes separately for dot variant and similar use cases.
 */
export function getStatusColorClassesSplit(color: SemanticColor): { text: string; bg: string } {
  const c = STATUS_COLORS[color];
  return {
    text: `${c.light.text} ${c.dark.text}`,
    bg: `${c.light.bg} ${c.dark.bg}`,
  };
}

/**
 * Get hex color for PDF/Email rendering.
 */
export function getStatusHex(color: SemanticColor): string {
  return STATUS_COLORS[color].hex;
}

/**
 * Get RGB values for gradient/opacity operations.
 */
export function getStatusRgb(color: SemanticColor): string {
  return STATUS_COLORS[color].rgb;
}

/**
 * Get color with alpha for backgrounds.
 * Example: getStatusRgba('success', 0.1) => 'rgba(16, 185, 129, 0.1)'
 */
export function getStatusRgba(color: SemanticColor, alpha: number): string {
  return `rgba(${STATUS_COLORS[color].rgb}, ${alpha})`;
}

/**
 * Get icon color classes for a semantic color.
 * Returns text color classes for light and dark mode.
 * Use for MetricCard icons and other icon color needs.
 */
export function getIconColorClasses(color: SemanticColor): string {
  const c = STATUS_COLORS[color];
  return `${c.light.text} ${c.dark.text}`;
}
