/**
 * Settings UI Components
 *
 * Tight, row-based settings UI components similar to VS Code / Cursor settings.
 * Pure UI components - no data fetching.
 */

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// ============================================================================
// SETTINGS ROW
// ============================================================================

export interface SettingsRowProps {
  /** Setting label (required) */
  label: string;
  /** Setting description (optional) */
  description?: string;
  /** Control element (input, select, switch, etc.) */
  children: ReactNode;
  /** Additional class name */
  className?: string;
  /** Whether the setting is disabled */
  disabled?: boolean;
  /** Optional hint text shown below the control */
  hint?: string;
}

/**
 * A single settings row with label on left, control on right.
 *
 * @example
 * ```tsx
 * <SettingsRow
 *   label="Organization Name"
 *   description="The public name for your business."
 * >
 *   <Input value={name} onChange={(e) => setName(e.target.value)} />
 * </SettingsRow>
 * ```
 */
export function SettingsRow({
  label,
  description,
  children,
  className,
  disabled,
  hint,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-8 py-4 border-b border-border/40 last:border-b-0",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {/* Left side: Label + Description */}
      <div className="flex-1 min-w-0">
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>

      {/* Right side: Control + Hint */}
      <div className="flex-shrink-0 w-64">
        {children}
        {hint && (
          <p className="text-xs text-muted-foreground mt-1">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS SECTION
// ============================================================================

export interface SettingsSectionProps {
  /** Section title */
  title: string;
  /** Section description (optional) */
  description?: string;
  /** SettingsRow children */
  children: ReactNode;
  /** Additional class name */
  className?: string;
  /** Section ID for anchor linking */
  id?: string;
}

/**
 * A section of related settings with a header.
 *
 * @example
 * ```tsx
 * <SettingsSection title="Regional" description="Timezone and locale settings.">
 *   <SettingsRow label="Timezone" ...>
 *   <SettingsRow label="Currency" ...>
 * </SettingsSection>
 * ```
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
  id,
}: SettingsSectionProps) {
  return (
    <section id={id} className={cn("mb-8", className)}>
      {/* Section Header */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>

      {/* Section Content */}
      <div className="bg-card/50 rounded-lg border border-border/40 px-4">
        {children}
      </div>
    </section>
  );
}

// ============================================================================
// SETTINGS SIDEBAR NAV
// ============================================================================

export interface SettingsSidebarItemProps {
  /** Navigation label */
  label: string;
  /** Whether this item is currently active */
  isActive?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Icon component (optional) */
  icon?: ReactNode;
}

export function SettingsSidebarItem({
  label,
  isActive,
  onClick,
  icon,
}: SettingsSidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

export interface SettingsSidebarProps {
  children: ReactNode;
  className?: string;
}

export function SettingsSidebar({ children, className }: SettingsSidebarProps) {
  return (
    <nav className={cn("w-48 flex-shrink-0", className)}>
      <div className="sticky top-4 space-y-1">
        {children}
      </div>
    </nav>
  );
}

// ============================================================================
// SETTINGS SHELL
// ============================================================================

export interface SettingsShellProps {
  /** Sidebar navigation content */
  sidebar: ReactNode;
  /** Main content area */
  children: ReactNode;
  /** Page title (optional) */
  title?: string;
  /** Additional class name */
  className?: string;
}

/**
 * Full settings page shell with sidebar and content area.
 *
 * @example
 * ```tsx
 * <SettingsShell
 *   title="Settings"
 *   sidebar={
 *     <>
 *       <SettingsSidebarItem label="General" isActive />
 *       <SettingsSidebarItem label="Regional" />
 *       <SettingsSidebarItem label="Financial" />
 *     </>
 *   }
 * >
 *   <SettingsSection title="Organization">
 *     <SettingsRow label="Name" ... />
 *   </SettingsSection>
 * </SettingsShell>
 * ```
 */
export function SettingsShell({
  sidebar,
  children,
  title,
  className,
}: SettingsShellProps) {
  return (
    <div className={cn("min-h-screen", className)}>
      {title && (
        <div className="border-b border-border/40 mb-6 pb-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
        </div>
      )}
      <div className="flex gap-8">
        {/* Sidebar */}
        <SettingsSidebar>{sidebar}</SettingsSidebar>

        {/* Main Content */}
        <main className="flex-1 min-w-0 max-w-3xl">
          {children}
        </main>
      </div>
    </div>
  );
}
