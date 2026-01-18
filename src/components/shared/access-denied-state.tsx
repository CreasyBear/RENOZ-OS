/**
 * AccessDeniedState Component (CC-EMPTY-009)
 *
 * Empty states for access denied, insufficient permissions, and upgrade prompts.
 * Uses role="alert" and aria-live="assertive" for immediate notification.
 *
 * @example
 * ```tsx
 * // No permission
 * <AccessDeniedState
 *   variant="no-permission"
 *   onRequestAccess={() => openRequestModal()}
 *   onGoBack={() => navigate(-1)}
 * />
 *
 * // Role required
 * <AccessDeniedState
 *   variant="role-required"
 *   currentRole="Sales"
 *   requiredRole={["Admin", "Owner"]}
 *   adminEmail="admin@company.com"
 * />
 *
 * // Plan limit
 * <AccessDeniedState
 *   variant="plan-limit"
 *   featureName="Advanced Reports"
 *   currentPlan="Starter"
 *   requiredPlan="Pro"
 *   benefits={["Export to Excel", "Scheduled reports", "Custom date ranges", "Team sharing"]}
 *   onUpgrade={() => navigate("/billing/upgrade")}
 * />
 *
 * // Suspended
 * <AccessDeniedState
 *   variant="suspended"
 *   suspensionReason="payment issues"
 *   onUpdateBilling={() => navigate("/billing")}
 * />
 * ```
 */
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Lock, Sparkles } from "lucide-react"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export type AccessDeniedVariant =
  | "no-permission"
  | "role-required"
  | "plan-limit"
  | "suspended"

export interface AccessDeniedStateProps {
  /** The type of access denial */
  variant: AccessDeniedVariant

  // For no-permission / role-required
  /** Required permission name */
  requiredPermission?: string
  /** Roles that have access */
  requiredRole?: string[]
  /** User's current role */
  currentRole?: string
  /** Callback for request access action */
  onRequestAccess?: () => void
  /** Admin contact email */
  adminEmail?: string

  // For plan-limit
  /** Feature being restricted */
  featureName?: string
  /** User's current plan */
  currentPlan?: string
  /** Plan required for access */
  requiredPlan?: string
  /** Benefits of upgrading */
  benefits?: string[]
  /** Callback for upgrade action */
  onUpgrade?: () => void
  /** Link to compare plans */
  comparePlansHref?: string

  // For suspended
  /** Reason for suspension */
  suspensionReason?: string
  /** Callback for update billing action */
  onUpdateBilling?: () => void
  /** Support contact link */
  supportHref?: string

  // Common
  /** Callback for go back action */
  onGoBack?: () => void
  /** Additional class names */
  className?: string
}

// ============================================================================
// VARIANT CONFIGS
// ============================================================================

const VARIANT_CONFIGS = {
  "no-permission": {
    icon: Lock,
    title: "You don't have access",
    message: "This area requires additional permissions. Contact your administrator to request access.",
    iconColor: "text-destructive",
    borderColor: "border-destructive",
    bgColor: "bg-destructive/5",
  },
  "role-required": {
    icon: Lock,
    title: "Admin access required",
    message: "This feature is only available to organization administrators.",
    iconColor: "text-destructive",
    borderColor: "border-destructive",
    bgColor: "bg-destructive/5",
  },
  "plan-limit": {
    icon: Sparkles,
    title: "Unlock {featureName}",
    message: "{featureName} is available on {requiredPlan} and Enterprise plans.",
    iconColor: "text-primary",
    borderColor: "border-primary",
    bgColor: "bg-primary/5",
  },
  suspended: {
    icon: AlertTriangle,
    title: "Account suspended",
    message: "Your organization's account has been suspended due to {reason}. Please update your billing information to restore access.",
    iconColor: "text-destructive",
    borderColor: "border-destructive",
    bgColor: "bg-destructive/5",
  },
} as const

// ============================================================================
// COMPONENT
// ============================================================================

export function AccessDeniedState({
  variant,
  requiredPermission: _requiredPermission,
  requiredRole,
  currentRole,
  onRequestAccess,
  adminEmail,
  featureName = "this feature",
  currentPlan: _currentPlan,
  requiredPlan = "Pro",
  benefits,
  onUpgrade,
  comparePlansHref,
  suspensionReason = "payment issues",
  onUpdateBilling,
  supportHref = "/support",
  onGoBack,
  className,
}: AccessDeniedStateProps) {
  const config = VARIANT_CONFIGS[variant]
  const Icon = config.icon

  // Dynamic title and message
  const title = config.title.replace("{featureName}", featureName)
  const message = config.message
    .replace("{featureName}", featureName)
    .replace("{requiredPlan}", requiredPlan)
    .replace("{reason}", suspensionReason)

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8",
        "border-l-4 rounded-lg",
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      {/* Icon */}
      <div className={cn("rounded-full bg-background p-4 mb-4 shadow-sm")}>
        <Icon
          className={cn("h-12 w-12", config.iconColor)}
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold mb-1">{title}</h2>

      {/* Message */}
      <p className="text-sm text-muted-foreground max-w-md mb-4">{message}</p>

      {/* Role info box (for role-required variant) */}
      {variant === "role-required" && currentRole && requiredRole && (
        <div
          role="group"
          aria-label="Role information"
          className="bg-background rounded-md p-4 mb-4 w-full max-w-sm text-left border"
        >
          <p className="text-sm">
            Your role: <strong>{currentRole}</strong>
          </p>
          <p className="text-sm">
            Required: <strong>{requiredRole.join(" or ")}</strong>
          </p>
        </div>
      )}

      {/* Benefits list (for plan-limit variant) */}
      {variant === "plan-limit" && benefits && benefits.length > 0 && (
        <div className="bg-background rounded-md p-4 mb-4 w-full max-w-sm text-left border">
          <ul className="space-y-2">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* No permission variant */}
        {variant === "no-permission" && onRequestAccess && (
          <Button onClick={onRequestAccess} className="min-h-11">
            Request Access
          </Button>
        )}

        {/* Role required variant */}
        {variant === "role-required" && adminEmail && (
          <Button asChild className="min-h-11">
            <a href={`mailto:${adminEmail}?subject=Access Request`}>
              Contact Admin
            </a>
          </Button>
        )}

        {/* Plan limit variant */}
        {variant === "plan-limit" && onUpgrade && (
          <Button onClick={onUpgrade} className="min-h-11">
            Upgrade to {requiredPlan}
          </Button>
        )}

        {/* Suspended variant */}
        {variant === "suspended" && onUpdateBilling && (
          <Button onClick={onUpdateBilling} className="min-h-11">
            Update Billing
          </Button>
        )}

        {/* Go back (for no-permission) */}
        {variant === "no-permission" && onGoBack && (
          <Button variant="ghost" onClick={onGoBack} className="min-h-11">
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Go Back
          </Button>
        )}
      </div>

      {/* Secondary links */}
      {variant === "plan-limit" && comparePlansHref && (
        <a
          href={comparePlansHref}
          className="inline-flex items-center gap-1 mt-4 text-sm text-primary hover:underline min-h-11"
        >
          Compare plans
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      )}

      {variant === "suspended" && supportHref && (
        <a
          href={supportHref}
          className="inline-flex items-center gap-1 mt-4 text-sm text-primary hover:underline min-h-11"
        >
          Contact support
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </div>
  )
}
