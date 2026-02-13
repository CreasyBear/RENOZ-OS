/**
 * Settings Dialog Component
 *
 * Modal-based settings interface inspired by project-management-reference.
 * Opens as a dialog instead of navigating to a separate /settings route.
 *
 * Features:
 * - Sidebar navigation with grouped sections
 * - Responsive layout (sidebar on desktop, tabs on mobile)
 * - All settings inline within the modal
 */
import { useState, useEffect, startTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Building2,
  MapPin,
  Globe,
  DollarSign,
  Palette,
  Shield,
  Key,
  Target,
  Wrench,
  User,
  Bell,
  Plug2,
} from 'lucide-react'
import { useOrganizationQuery, useUpdateOrganization, useUpdateOrganizationSettings } from '@/hooks/organizations'
import { queryKeys } from '@/lib/query-keys'
import { useOrganizationSettings } from '@/contexts/organization-settings-context'
import { useCurrentUser } from '@/hooks'
import {
  GeneralSettingsSection,
  AddressSettingsSection,
  RegionalSettingsSection,
  FinancialSettingsSection,
  BrandingSettingsSection,
  type GeneralSettingsData,
  type AddressSettingsData,
  type RegionalSettingsData,
  type FinancialSettingsData,
  type BrandingSettingsData,
} from '@/components/domain/settings/settings-sections'
import { createOrganizationSectionHandlers } from '@/lib/settings/organization-section-handlers'
import {
  PreferencesSettingsSection,
  SecuritySettingsSection,
  ApiTokensSettingsSection,
  TargetsSettingsSection,
  type PreferencesSettingsData,
  type SecuritySettingsData,
  type TargetsSettingsData,
} from '@/components/domain/settings/settings-sections-extended'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { OAuthConnectionManager } from '@/components/integrations/oauth/oauth-connection-manager'

// ============================================================================
// TYPES
// ============================================================================

export interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided and dialog opens, switch to this pane immediately */
  initialPane?: SettingsPaneId
}

export type SettingsPaneId =
  | 'account'
  | 'notifications'
  | 'preferences'
  | 'organization'
  | 'address'
  | 'regional'
  | 'financial'
  | 'branding'
  | 'security'
  | 'api-tokens'
  | 'targets'
  | 'integrations'

interface NavItem {
  id: SettingsPaneId
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: 'personal' | 'workspace' | 'advanced'
}

const NAV_ITEMS: NavItem[] = [
  // Personal
  { id: 'account', label: 'Account', icon: User, group: 'personal' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'personal' },
  { id: 'preferences', label: 'Preferences', icon: Wrench, group: 'personal' },
  // Workspace (Organization)
  { id: 'organization', label: 'General', icon: Building2, group: 'workspace' },
  { id: 'address', label: 'Address', icon: MapPin, group: 'workspace' },
  { id: 'regional', label: 'Regional', icon: Globe, group: 'workspace' },
  { id: 'financial', label: 'Financial', icon: DollarSign, group: 'workspace' },
  { id: 'branding', label: 'Branding', icon: Palette, group: 'workspace' },
  { id: 'targets', label: 'Targets', icon: Target, group: 'workspace' },
  // Advanced
  { id: 'security', label: 'Security', icon: Shield, group: 'advanced' },
  { id: 'api-tokens', label: 'API Tokens', icon: Key, group: 'advanced' },
  { id: 'integrations', label: 'Connected Accounts', icon: Plug2, group: 'advanced' },
]

const GROUP_LABELS: Record<NavItem['group'], string> = {
  personal: 'Personal',
  workspace: 'Workspace',
  advanced: 'Advanced',
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SettingsDialog({ open, onOpenChange, initialPane }: SettingsDialogProps) {
  const [activePane, setActivePane] = useState<SettingsPaneId>('account')
  const queryClient = useQueryClient()
  const { user } = useCurrentUser()

  // Sync to initialPane when dialog opens with one specified
  useEffect(() => {
    if (open && initialPane) {
      startTransition(() => setActivePane(initialPane))
    }
  }, [open, initialPane])

  // Fetch organization data
  const { data: organization, isLoading: orgLoading, error: orgError } = useOrganizationQuery()
  const settings = useOrganizationSettings()
  const updateOrganization = useUpdateOrganization()
  const updateSettings = useUpdateOrganizationSettings()

  // Group nav items
  const groupedItems = NAV_ITEMS.reduce(
    (acc, item) => {
      if (!acc[item.group]) acc[item.group] = []
      acc[item.group].push(item)
      return acc
    },
    {} as Record<NavItem['group'], NavItem[]>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-6xl w-full h-[85vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r border-border bg-muted/30 flex flex-col shrink-0">
            <DialogHeader className="px-4 py-4 border-b border-border">
              <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1">
              <nav className="p-2 space-y-4">
                {(['personal', 'workspace', 'advanced'] as const).map((group) => (
                  <div key={group}>
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {GROUP_LABELS[group]}
                    </p>
                    <div className="space-y-0.5">
                      {groupedItems[group]?.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActivePane(item.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left',
                            activePane === item.id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </ScrollArea>

            {/* User info at bottom */}
            {user && (
              <div className="border-t border-border p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={(user.user_metadata?.avatar_url as string) ?? undefined} />
                    <AvatarFallback>
                      {user.email?.charAt(0).toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {(user.user_metadata?.full_name as string) ?? user.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.role}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <ScrollArea className="flex-1">
              <div className="p-6 max-w-3xl">
                {orgLoading || settings.isLoading ? (
                  <LoadingPane />
                ) : orgError || settings.error ? (
                  <ErrorPane
                    error={orgError ?? settings.error ?? new Error('Failed to load settings')}
                    onRetry={() => {
                      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.current() })
                      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.settings() })
                    }}
                  />
                ) : (
                  <SettingsPane
                    pane={activePane}
                    user={user}
                    organization={organization}
                    settings={settings}
                    updateOrganization={updateOrganization}
                    updateSettings={updateSettings}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// PANE RENDERER
// ============================================================================

interface SettingsPaneProps {
  pane: SettingsPaneId
  user: ReturnType<typeof useCurrentUser>['user']
  organization: ReturnType<typeof useOrganizationQuery>['data']
  settings: ReturnType<typeof useOrganizationSettings>
  updateOrganization: ReturnType<typeof useUpdateOrganization>
  updateSettings: ReturnType<typeof useUpdateOrganizationSettings>
}

function SettingsPane({
  pane,
  user,
  organization,
  settings,
  updateOrganization,
  updateSettings,
}: SettingsPaneProps) {
  const handlers = createOrganizationSectionHandlers(updateOrganization, updateSettings)

  // Data preparation
  const generalData: GeneralSettingsData = {
    name: organization?.name ?? '',
    email: organization?.email ?? '',
    phone: organization?.phone ?? '',
    abn: organization?.abn ?? '',
    website: organization?.website ?? '',
  }

  const addressData: AddressSettingsData = {
    addressLine1: organization?.address?.street1 ?? '',
    addressLine2: organization?.address?.street2 ?? '',
    suburb: organization?.address?.city ?? '',
    state: organization?.address?.state ?? '',
    postcode: organization?.address?.postalCode ?? '',
    country: organization?.address?.country ?? 'Australia',
  }

  const regionalData: RegionalSettingsData = {
    timezone: settings.timezone,
    locale: settings.locale,
    currency: settings.currency,
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
    weekStartDay: settings.weekStartDay,
    numberFormat: settings.numberFormat,
  }

  const financialData: FinancialSettingsData = {
    fiscalYearStart: settings.fiscalYearStart ?? 7,
    defaultPaymentTerms: settings.defaultPaymentTerms ?? 30,
    defaultTaxRate: settings.defaultTaxRate ?? 0,
  }

  const brandingData: BrandingSettingsData = {
    logoUrl: settings.portalBranding?.logoUrl ?? '',
    primaryColor: settings.portalBranding?.primaryColor ?? '',
    secondaryColor: settings.portalBranding?.secondaryColor ?? '',
    websiteUrl: settings.portalBranding?.websiteUrl ?? '',
  }

  const preferencesData: PreferencesSettingsData = {
    theme: 'system',
    accentColor: 'blue',
    density: 'comfortable',
    notifications_email: true,
    notifications_inApp: true,
    notifications_sound: false,
    tablePageSize: '25',
    stickyHeaders: true,
    reduceMotion: false,
  }

  const securityData: SecuritySettingsData = {
    twoFactorEnabled: false,
    sessionTimeout: '60',
    requirePasswordChange: false,
    passwordExpiryDays: 'never',
  }

  const targetsData: TargetsSettingsData = {
    salesTarget: 10,
    leadTarget: 50,
    conversionTarget: 20,
    revenueTarget: 100000,
  }

  switch (pane) {
    case 'account':
      return <AccountPane user={user} />

    case 'notifications':
      return <NotificationsPane />

    case 'preferences':
      return (
        <PreferencesSettingsSection
          data={preferencesData}
          onSave={async () => {
            toast.success('Preference saved')
          }}
        />
      )

    case 'organization':
      return (
        <GeneralSettingsSection
          data={generalData}
          onSave={handlers.onSaveGeneral}
        />
      )

    case 'address':
      return (
        <AddressSettingsSection
          data={addressData}
          onSave={handlers.onSaveAddress}
        />
      )

    case 'regional':
      return (
        <RegionalSettingsSection
          data={regionalData}
          onSave={handlers.onSaveRegional}
        />
      )

    case 'financial':
      return (
        <FinancialSettingsSection
          data={financialData}
          onSave={handlers.onSaveFinancial}
        />
      )

    case 'branding':
      return (
        <BrandingSettingsSection
          data={brandingData}
          onSave={handlers.onSaveBranding}
        />
      )

    case 'security':
      return (
        <SecuritySettingsSection
          data={securityData}
          onSave={async () => {
            toast.success('Setting saved')
          }}
          onChangePassword={() => {
            toast.info('Password change dialog coming soon')
          }}
          onViewSessions={() => {
            toast.info('Sessions view coming soon')
          }}
        />
      )

    case 'api-tokens':
      return (
        <ApiTokensSettingsSection
          tokens={[]}
          onCreateToken={() => toast.info('Create token dialog coming soon')}
          onRevokeToken={() => toast.info('Revoke token coming soon')}
        />
      )

    case 'targets':
      return (
        <TargetsSettingsSection
          data={targetsData}
          onSave={async () => {
            toast.success('Targets saved')
          }}
        />
      )

    case 'integrations':
      return organization?.id ? (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-1">Connected Accounts</h3>
            <p className="text-sm text-muted-foreground">
              Connect Google Workspace and Microsoft 365 for calendar, email, and contacts.
            </p>
          </div>
          <OAuthConnectionManager organizationId={organization.id} />
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Loading organization...</div>
      )

    default:
      return null
  }
}

// ============================================================================
// ACCOUNT PANE
// ============================================================================

function AccountPane({
  user,
}: {
  user: ReturnType<typeof useCurrentUser>['user']
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Account</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and profile.
        </p>
      </div>

      {/* Profile Section */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border/40">
        <Avatar className="h-16 w-16">
          <AvatarImage src={(user?.user_metadata?.avatar_url as string) ?? undefined} />
          <AvatarFallback className="text-xl">
            {user?.email?.charAt(0).toUpperCase() ?? 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-lg font-medium">{(user?.user_metadata?.full_name as string) ?? user?.email}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <p className="text-xs text-muted-foreground mt-1 capitalize">
            {user?.role} · Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'recently'}
          </p>
        </div>
      </div>

      {/* Account Info */}
      <div className="space-y-4">
        <div className="flex justify-between items-center py-3 border-b border-border/40">
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => toast.info('Email change coming soon')}
          >
            Change
          </button>
        </div>
        <div className="flex justify-between items-center py-3 border-b border-border/40">
          <div>
            <p className="text-sm font-medium">Password</p>
            <p className="text-sm text-muted-foreground">••••••••••</p>
          </div>
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => toast.info('Password change coming soon')}
          >
            Change
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// NOTIFICATIONS PANE
// ============================================================================

function NotificationsPane() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Configure how you receive notifications.
        </p>
      </div>

      <div className="space-y-4">
        <NotificationRow
          title="Email notifications"
          description="Receive updates via email"
          defaultChecked={true}
        />
        <NotificationRow
          title="In-app notifications"
          description="Show notifications in the app"
          defaultChecked={true}
        />
        <NotificationRow
          title="Project updates"
          description="Get notified when projects are updated"
          defaultChecked={true}
        />
        <NotificationRow
          title="Order status changes"
          description="Notifications when orders move through stages"
          defaultChecked={true}
        />
        <NotificationRow
          title="Quote approvals"
          description="Get notified when quotes need approval"
          defaultChecked={true}
        />
        <NotificationRow
          title="Weekly summary"
          description="Receive a weekly digest of activity"
          defaultChecked={false}
        />
      </div>
    </div>
  )
}

function NotificationRow({
  title,
  description,
  defaultChecked,
}: {
  title: string
  description: string
  defaultChecked: boolean
}) {
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-b-0">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => {
          setChecked(!checked)
          toast.success(checked ? 'Notification disabled' : 'Notification enabled')
        }}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingPane() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// ERROR STATE
// ============================================================================

function ErrorPane({
  error,
  onRetry,
}: {
  error: Error
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
      <h3 className="text-lg font-medium text-foreground">Failed to load settings</h3>
      <p className="text-sm mt-1">{error.message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Retry
      </button>
    </div>
  )
}
