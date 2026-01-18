/**
 * Reduced Motion Hook
 *
 * Detects user's reduced motion preference from system settings.
 * Used to disable animations for accessibility.
 *
 * @see _Initiation/_prd/1-foundation/accessibility/accessibility.prd.json CC-A11Y-007
 */

import * as React from "react";

/**
 * Returns true if the user prefers reduced motion.
 * Listens for changes to the system preference.
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    // Check if we're in browser
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}
