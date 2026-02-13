/**
 * Detail View Design Tokens
 *
 * Centralized constants for detail view layouts across the application.
 * These follow the 5-zone layout pattern from DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

export const DETAIL_VIEW = {
  // Layout dimensions
  SIDEBAR_WIDTH: 320,
  CONTENT_GAP: 24, // gap-6 in Tailwind
  HEADER_HEIGHT: 80,

  // Z-index scale (consistent layering)
  Z_INDEX: {
    CONTENT: 0,
    STICKY_SIDEBAR: 10,
    ALERTS: 20,
    TABS_STICKY: 20,
    HEADER_ACTIONS: 30,
    MOBILE_FAB: 40,
    MODAL_BACKDROP: 40,
    MODAL: 50,
    TOAST: 60,
  },

  // Animation durations (ms)
  TRANSITION: {
    FAST: 150,
    DEFAULT: 200,
    SIDEBAR_COLLAPSE: 150,
    ALERT_SLIDE: 200,
  },

  // Breakpoints
  BREAKPOINTS: {
    MOBILE: 768, // md
    TABLET: 1024, // lg - sidebar becomes visible
    DESKTOP: 1280, // xl
  },

  // Sidebar sticky positioning
  SIDEBAR_STICKY_TOP: 80, // 5rem - accounts for header
  SIDEBAR_MAX_HEIGHT: 'calc(100vh - 6rem)',

  // Touch target minimum (accessibility)
  TOUCH_TARGET_MIN: 44,
} as const;

// Type for Z-index values
export type DetailViewZIndex = keyof typeof DETAIL_VIEW.Z_INDEX;

// Helper to get z-index class
export function getZIndexClass(layer: DetailViewZIndex): string {
  const value = DETAIL_VIEW.Z_INDEX[layer];
  return `z-[${value}]`;
}
