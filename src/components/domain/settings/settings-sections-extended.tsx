/**
 * Additional Settings Section Components
 *
 * Extended modular sections for domain-specific settings.
 * Each can be slotted into the unified settings shell.
 */

import { useState, useEffect, useRef, type ReactNode } from "react";
import { SettingsSection, SettingsRow } from "./settings-ui";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type {
  PreferencesSettingsData,
  EmailSettingsData,
  SecuritySettingsData,
  ApiToken,
  SettingsCategory,
  TargetsSettingsData,
  SettingsWinLossReason,
} from "@/lib/schemas/settings";

// ============================================================================
// PREFERENCES SECTION
// ============================================================================

export type { PreferencesSettingsData };

export interface PreferencesSectionProps {
  data: PreferencesSettingsData;
  onSave: <K extends keyof PreferencesSettingsData>(key: K, value: PreferencesSettingsData[K]) => Promise<void>;
  isSaving?: string | null;
}

export function PreferencesSettingsSection({
  data,
  onSave,
}: PreferencesSectionProps) {
  const [local, setLocal] = useState(data);
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!isSavingRef.current) setLocal(data);
  }, [data]);

  const update = async <K extends keyof PreferencesSettingsData>(key: K, value: PreferencesSettingsData[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    isSavingRef.current = true;
    try {
      await onSave(key, value);
      toast.success("Preference saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      isSavingRef.current = false;
    }
  };

  return (
    <SettingsSection id="preferences" title="Preferences" description="Personalize your experience.">
      {/* Appearance */}
      <SettingsRow label="Theme" description="Choose light, dark, or system theme.">
        <Select value={local.theme} onValueChange={(v) => update("theme", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow label="Accent Color" description="Primary accent color.">
        <Select value={local.accentColor} onValueChange={(v) => update("accentColor", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="blue">Blue</SelectItem>
            <SelectItem value="green">Green</SelectItem>
            <SelectItem value="purple">Purple</SelectItem>
            <SelectItem value="orange">Orange</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow label="Interface Density" description="Compact, comfortable, or spacious.">
        <Select value={local.density} onValueChange={(v) => update("density", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="compact">Compact</SelectItem>
            <SelectItem value="comfortable">Comfortable</SelectItem>
            <SelectItem value="spacious">Spacious</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>

      {/* Notifications */}
      <SettingsRow label="Email Notifications" description="Receive important updates via email.">
        <Switch checked={local.notifications_email} onCheckedChange={(v) => update("notifications_email", v)} />
      </SettingsRow>

      <SettingsRow label="In-App Notifications" description="Show notifications in the app.">
        <Switch checked={local.notifications_inApp} onCheckedChange={(v) => update("notifications_inApp", v)} />
      </SettingsRow>

      <SettingsRow label="Sound Effects" description="Play sounds for notifications.">
        <Switch checked={local.notifications_sound} onCheckedChange={(v) => update("notifications_sound", v)} />
      </SettingsRow>

      {/* Data Display */}
      <SettingsRow label="Table Page Size" description="Default rows per page.">
        <Select value={local.tablePageSize} onValueChange={(v) => update("tablePageSize", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 rows</SelectItem>
            <SelectItem value="25">25 rows</SelectItem>
            <SelectItem value="50">50 rows</SelectItem>
            <SelectItem value="100">100 rows</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow label="Sticky Headers" description="Keep table headers visible.">
        <Switch checked={local.stickyHeaders} onCheckedChange={(v) => update("stickyHeaders", v)} />
      </SettingsRow>

      {/* Accessibility */}
      <SettingsRow label="Reduce Motion" description="Minimize animations.">
        <Switch checked={local.reduceMotion} onCheckedChange={(v) => update("reduceMotion", v)} />
      </SettingsRow>
    </SettingsSection>
  );
}

// ============================================================================
// EMAIL SETTINGS SECTION
// ============================================================================

export type { EmailSettingsData };

export interface EmailSectionProps {
  data: EmailSettingsData;
  onSave: (data: EmailSettingsData) => Promise<void>;
  isSaving?: boolean;
  // Additional props for metrics/domain status can be passed as children
  children?: ReactNode;
}

export function EmailSettingsSection({
  data,
  onSave,
  isSaving = false,
  children,
}: EmailSectionProps) {
  const [local, setLocal] = useState(data);
  const [dirty, setDirty] = useState(false);

  const update = <K extends keyof EmailSettingsData>(key: K, value: EmailSettingsData[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await onSave(local);
      setDirty(false);
      toast.success("Email settings saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  return (
    <SettingsSection id="email" title="Email" description="Configure email delivery settings.">
      <SettingsRow label="From Name" description="Name shown as sender.">
        <Input value={local.defaultFromName} onChange={(e) => update("defaultFromName", e.target.value)} className="w-[240px]" />
      </SettingsRow>

      <SettingsRow label="From Email" description="Email address for outgoing mail.">
        <Input type="email" value={local.defaultFromEmail} onChange={(e) => update("defaultFromEmail", e.target.value)} className="w-[240px]" />
      </SettingsRow>

      <SettingsRow label="Reply-To Email" description="Where replies are sent.">
        <Input type="email" value={local.replyToEmail} onChange={(e) => update("replyToEmail", e.target.value)} className="w-[240px]" />
      </SettingsRow>

      <SettingsRow label="BCC Email" description="Receive copies of outgoing emails.">
        <Input type="email" value={local.bccEmail} onChange={(e) => update("bccEmail", e.target.value)} className="w-[240px]" />
      </SettingsRow>

      {children}

      {dirty && (
        <div className="py-3 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}

// ============================================================================
// SECURITY SETTINGS SECTION
// ============================================================================

export type { SecuritySettingsData };

export interface SecuritySectionProps {
  data: SecuritySettingsData;
  onSave: <K extends keyof SecuritySettingsData>(key: K, value: SecuritySettingsData[K]) => Promise<void>;
  onChangePassword?: () => void;
  onViewSessions?: () => void;
  isSaving?: string | null;
}

export function SecuritySettingsSection({
  data,
  onSave,
  onChangePassword,
  onViewSessions,
}: SecuritySectionProps) {
  const [local, setLocal] = useState(data);

  const update = async <K extends keyof SecuritySettingsData>(key: K, value: SecuritySettingsData[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    await onSave(key, value);
  };

  return (
    <SettingsSection id="security" title="Security" description="Manage your account security.">
      <SettingsRow label="Two-Factor Authentication" description="Add an extra layer of security.">
        <Switch checked={local.twoFactorEnabled} onCheckedChange={(v) => update("twoFactorEnabled", v)} />
      </SettingsRow>

      <SettingsRow label="Session Timeout" description="Auto-logout after inactivity.">
        <Select value={local.sessionTimeout} onValueChange={(v) => update("sessionTimeout", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="60">1 hour</SelectItem>
            <SelectItem value="480">8 hours</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow label="Password Expiry" description="Require password change periodically.">
        <Select value={local.passwordExpiryDays} onValueChange={(v) => update("passwordExpiryDays", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="60">60 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>

      {onChangePassword && (
        <SettingsRow label="Change Password" description="Update your account password.">
          <Button variant="outline" onClick={onChangePassword}>Change Password</Button>
        </SettingsRow>
      )}

      {onViewSessions && (
        <SettingsRow label="Active Sessions" description="View and manage active sessions.">
          <Button variant="outline" onClick={onViewSessions}>View Sessions</Button>
        </SettingsRow>
      )}
    </SettingsSection>
  );
}

// ============================================================================
// API TOKENS SECTION (List-based)
// ============================================================================

export type { ApiToken };

export interface ApiTokensSectionProps {
  tokens: ApiToken[];
  onCreateToken: () => void;
  onRevokeToken: (id: string) => void;
  isCreating?: boolean;
  isRevoking?: string | null;
}

export function ApiTokensSettingsSection({
  tokens,
  onCreateToken,
  onRevokeToken,
  isCreating = false,
  isRevoking = null,
}: ApiTokensSectionProps) {
  return (
    <SettingsSection id="api-tokens" title="API Tokens" description="Manage API access tokens for integrations.">
      <SettingsRow label="Create Token" description="Generate a new API token.">
        <Button onClick={onCreateToken} disabled={isCreating}>
          {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Plus className="w-4 h-4 mr-2" />
          New Token
        </Button>
      </SettingsRow>

      {tokens.length > 0 && (
        <div className="space-y-2 pt-4 border-t">
          {tokens.map((token) => (
            <div key={token.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
              <div className="flex flex-col">
                <span className="font-medium text-sm">{token.name}</span>
                <span className="text-xs text-muted-foreground">
                  {token.lastUsed ? `Last used ${token.lastUsed}` : "Never used"}
                  {token.expiresAt && ` · Expires ${token.expiresAt}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {token.scopes.slice(0, 2).map((scope) => (
                  <Badge key={scope} variant="secondary" className="text-xs">{scope}</Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevokeToken(token.id)}
                  disabled={isRevoking === token.id}
                >
                  {isRevoking === token.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-destructive" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tokens.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">No API tokens created yet.</p>
      )}
    </SettingsSection>
  );
}

// ============================================================================
// CATEGORIES SECTION (List-based)
// ============================================================================

export type { SettingsCategory as Category } from "@/lib/schemas/settings";

export interface CategoriesSectionProps {
  categories: SettingsCategory[];
  onCreateCategory: () => void;
  onEditCategory: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  isLoading?: boolean;
}

export function CategoriesSettingsSection({
  categories,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  isLoading = false,
}: CategoriesSectionProps) {
  return (
    <SettingsSection id="categories" title="Categories" description="Manage product and service categories.">
      <SettingsRow label="Create Category" description="Add a new category.">
        <Button onClick={onCreateCategory}>
          <Plus className="w-4 h-4 mr-2" />
          New Category
        </Button>
      </SettingsRow>

      {categories.length > 0 && (
        <div className="space-y-2 pt-4 border-t">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
              <div className="flex flex-col">
                <span className="font-medium text-sm">{cat.name}</span>
                {cat.description && <span className="text-xs text-muted-foreground">{cat.description}</span>}
              </div>
              <div className="flex items-center gap-2">
                {cat.childCount > 0 && (
                  <Badge variant="secondary" className="text-xs">{cat.childCount} items</Badge>
                )}
                <Badge variant={cat.isActive ? "default" : "outline"} className="text-xs">
                  {cat.isActive ? "Active" : "Inactive"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => onEditCategory(cat.id)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDeleteCategory(cat.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {categories.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground py-4">No categories created yet.</p>
      )}
    </SettingsSection>
  );
}

// ============================================================================
// TARGETS SECTION
// ============================================================================

export type { TargetsSettingsData };

export interface TargetsSectionProps {
  data: TargetsSettingsData;
  onSave: (data: TargetsSettingsData) => Promise<void>;
  isSaving?: boolean;
}

export function TargetsSettingsSection({
  data,
  onSave,
  isSaving = false,
}: TargetsSectionProps) {
  const [local, setLocal] = useState(data);
  const [dirty, setDirty] = useState(false);

  const update = <K extends keyof TargetsSettingsData>(key: K, value: number) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await onSave(local);
      setDirty(false);
      toast.success("Targets saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  return (
    <SettingsSection id="targets" title="Targets" description="Set sales and performance targets.">
      <SettingsRow label="Monthly Sales Target" description="Number of sales to close.">
        <Input
          type="number"
          value={local.salesTarget}
          onChange={(e) => update("salesTarget", parseInt(e.target.value) || 0)}
          className="w-[120px]"
        />
      </SettingsRow>

      <SettingsRow label="Monthly Lead Target" description="Number of leads to generate.">
        <Input
          type="number"
          value={local.leadTarget}
          onChange={(e) => update("leadTarget", parseInt(e.target.value) || 0)}
          className="w-[120px]"
        />
      </SettingsRow>

      <SettingsRow label="Conversion Rate Target" description="Target conversion percentage.">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={local.conversionTarget}
            onChange={(e) => update("conversionTarget", parseInt(e.target.value) || 0)}
            className="w-[80px]"
            min={0}
            max={100}
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </SettingsRow>

      <SettingsRow label="Monthly Revenue Target" description="Target revenue in dollars.">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">$</span>
          <Input
            type="number"
            value={local.revenueTarget}
            onChange={(e) => update("revenueTarget", parseInt(e.target.value) || 0)}
            className="w-[140px]"
          />
        </div>
      </SettingsRow>

      {dirty && (
        <div className="py-3 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}

// ============================================================================
// WIN/LOSS REASONS SECTION
// ============================================================================

export type { SettingsWinLossReason as WinLossReason } from "@/lib/schemas/settings";

export interface WinLossSectionProps {
  reasons: SettingsWinLossReason[];
  onCreateReason: (type: "win" | "loss") => void;
  onToggleReason: (id: string, isActive: boolean) => void;
  onDeleteReason: (id: string) => void;
}

export function WinLossSettingsSection({
  reasons,
  onCreateReason,
  onToggleReason,
  onDeleteReason,
}: WinLossSectionProps) {
  const winReasons = reasons.filter((r) => r.type === "win");
  const lossReasons = reasons.filter((r) => r.type === "loss");

  return (
    <SettingsSection id="win-loss" title="Win/Loss Reasons" description="Configure opportunity outcome reasons.">
      <SettingsRow label="Add Win Reason" description="Reasons for winning deals.">
        <Button variant="outline" onClick={() => onCreateReason("win")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Win Reason
        </Button>
      </SettingsRow>

      {winReasons.length > 0 && (
        <div className="space-y-1 pl-4">
          {winReasons.map((reason) => (
            <div key={reason.id} className="flex items-center justify-between py-1">
              <span className="text-sm">{reason.label}</span>
              <div className="flex items-center gap-2">
                <Switch checked={reason.isActive} onCheckedChange={(v) => onToggleReason(reason.id, v)} />
                <Button variant="ghost" size="sm" onClick={() => onDeleteReason(reason.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SettingsRow label="Add Loss Reason" description="Reasons for losing deals.">
        <Button variant="outline" onClick={() => onCreateReason("loss")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Loss Reason
        </Button>
      </SettingsRow>

      {lossReasons.length > 0 && (
        <div className="space-y-1 pl-4">
          {lossReasons.map((reason) => (
            <div key={reason.id} className="flex items-center justify-between py-1">
              <span className="text-sm">{reason.label}</span>
              <div className="flex items-center gap-2">
                <Switch checked={reason.isActive} onCheckedChange={(v) => onToggleReason(reason.id, v)} />
                <Button variant="ghost" size="sm" onClick={() => onDeleteReason(reason.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
