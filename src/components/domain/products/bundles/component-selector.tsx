/**
 * ComponentSelector Component
 *
 * Container component that fetches data and passes to presenter.
 * Implements Container/Presenter pattern per STANDARDS.md.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { ComponentSelectorContainer } from "./component-selector-container";
import type { SelectedComponent } from "./component-selector-container";

interface ComponentSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (components: SelectedComponent[]) => void;
  excludeProductIds?: string[];
  bundleProductId?: string;
}

export function ComponentSelector(props: ComponentSelectorProps) {
  return <ComponentSelectorContainer {...props} />;
}

// Legacy export - keep for backward compatibility
export { ComponentSelectorContainer };
export type { SelectedComponent };
