/**
 * Settings Section Components
 *
 * Modular, slot-in components for each settings section.
 * Each can be used independently or composed in the unified settings shell.
 * Follows container/presenter pattern - these are presenters.
 */

import { type ReactNode, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Link, type LinkProps } from "@tanstack/react-router";
import { SettingsSection, SettingsRow } from "./settings-ui";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, Upload, ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { useOrganizationLogoUpload, useRemoveOrganizationLogo } from "@/hooks/organizations";
import { isAllowedLogoMimeType } from "@/lib/organization-logo";
import { cn } from "@/lib/utils";
import type {
  RegionalSettingsData,
  NumberFormatValue,
  TimeFormatValue,
} from "@/lib/schemas/auth";
import type {
  GeneralSettingsData,
  AddressSettingsData,
  FinancialSettingsData,
  BrandingSettingsData,
} from "@/lib/schemas/settings";
import {
  generalSettingsSchema,
  addressSettingsSchema,
  regionalSettingsSchema,
  financialSettingsSchema,
  brandingSettingsSchema,
  parseWeekStartDay,
} from "@/lib/schemas/settings";

function isTimeFormat(v: string): v is TimeFormatValue {
  return v === "12h" || v === "24h";
}

const VALID_NUMBER_FORMATS: readonly string[] = ["1,234.56", "1.234,56", "1 234,56"];

function isNumberFormat(v: string): v is NumberFormatValue {
  return VALID_NUMBER_FORMATS.includes(v);
}

/** Extract displayable error message from field meta (handles StandardSchemaV1Issue, string, etc.) */
function formatFieldError(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message: unknown }).message;
    return typeof msg === 'string' ? msg : String(msg ?? '');
  }
  return '';
}

export type { RegionalSettingsData };

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface SectionProps<T> {
  data: T;
  /** Returns form-shaped snapshot for reset-after-mutation */
  onSave: (data: T) => Promise<T>;
}

// ============================================================================
// GENERAL SETTINGS SECTION
// ============================================================================

export type { GeneralSettingsData };

export function GeneralSettingsSection({ data, onSave }: SectionProps<GeneralSettingsData>) {
  const form = useForm({
    defaultValues: data,
    validators: {
      onSubmit: generalSettingsSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const result = await onSave(value);
      formApi.reset(result);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <SettingsSection id="general" title="General" description="Basic organization information.">
        <form.Field name="name">
          {(field) => (
            <SettingsRow label="Organization Name" description="The public name for your business.">
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Acme Corp"
              />
{field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive mt-1">
                {formatFieldError(field.state.meta.errors[0])}
              </p>
            )}
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <SettingsRow label="Email" description="Primary contact email.">
              <Input
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="hello@example.com"
              />
{field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive mt-1">
                {formatFieldError(field.state.meta.errors[0])}
              </p>
            )}
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="phone">
          {(field) => (
            <SettingsRow label="Phone" description="Primary contact phone.">
              <Input
                type="tel"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="+61 2 1234 5678"
              />
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="abn">
          {(field) => (
            <SettingsRow label="ABN" description="Australian Business Number.">
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="12 345 678 901"
              />
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="website">
          {(field) => (
            <SettingsRow label="Website" description="Your organization's website.">
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="https://example.com"
              />
{field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive mt-1">
                {formatFieldError(field.state.meta.errors[0])}
              </p>
            )}
            </SettingsRow>
          )}
        </form.Field>
        <div className="py-3 flex justify-end">
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {form.state.isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SettingsSection>
    </form>
  );
}

// ============================================================================
// ADDRESS SETTINGS SECTION
// ============================================================================

export type { AddressSettingsData };

export function AddressSettingsSection({ data, onSave }: SectionProps<AddressSettingsData>) {
  const form = useForm({
    defaultValues: data,
    validators: {
      onSubmit: addressSettingsSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const result = await onSave(value);
      formApi.reset(result);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <SettingsSection id="address" title="Address" description="Physical business address.">
        <form.Field name="addressLine1">
          {(field) => (
            <SettingsRow label="Address Line 1">
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="123 Main Street"
              />
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="addressLine2">
          {(field) => (
            <SettingsRow label="Address Line 2">
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Suite 100"
              />
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="suburb">
          {(field) => (
            <SettingsRow label="Suburb">
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Sydney"
              />
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="state">
          {(field) => (
            <SettingsRow label="State">
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="NSW"
              />
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="postcode">
          {(field) => (
            <SettingsRow label="Postcode">
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="2000"
              />
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="country">
          {(field) => (
            <SettingsRow label="Country">
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Australia"
              />
            </SettingsRow>
          )}
        </form.Field>
        <div className="py-3 flex justify-end">
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {form.state.isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SettingsSection>
    </form>
  );
}

// ============================================================================
// REGIONAL SETTINGS SECTION
// ============================================================================

const TIMEZONES = ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Perth", "Australia/Adelaide", "Pacific/Auckland", "UTC"];
const CURRENCIES = ["AUD", "USD", "EUR", "GBP", "NZD"];
const DATE_FORMATS = [{ value: "DD/MM/YYYY", label: "31/12/2026" }, { value: "MM/DD/YYYY", label: "12/31/2026" }, { value: "YYYY-MM-DD", label: "2026-12-31" }];
const TIME_FORMATS = [{ value: "12h", label: "12-hour (2:30 PM)" }, { value: "24h", label: "24-hour (14:30)" }];
const WEEK_DAYS = [{ value: 0, label: "Sunday" }, { value: 1, label: "Monday" }, { value: 6, label: "Saturday" }];
const NUMBER_FORMATS: Array<{ value: NumberFormatValue; label: string }> = [
  { value: "1,234.56", label: "1,234.56" },
  { value: "1.234,56", label: "1.234,56" },
  { value: "1 234,56", label: "1 234,56" },
];

export function RegionalSettingsSection({ data, onSave }: SectionProps<RegionalSettingsData>) {
  const form = useForm({
    defaultValues: data,
    validators: {
      onSubmit: regionalSettingsSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const result = await onSave(value);
      formApi.reset(result);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <SettingsSection id="regional" title="Regional" description="Timezone, currency, and formatting preferences.">
        <form.Field name="timezone">
          {(field) => (
            <SettingsRow label="Timezone" description="Your primary business timezone.">
              <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="currency">
          {(field) => (
            <SettingsRow label="Currency" description="Default currency for financial operations.">
              <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="dateFormat">
          {(field) => (
            <SettingsRow label="Date Format" description="How dates are displayed.">
              <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="timeFormat">
          {(field) => (
            <SettingsRow label="Time Format" description="12-hour or 24-hour clock.">
              <Select
                value={field.state.value}
                onValueChange={(v) => isTimeFormat(v) && field.handleChange(v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="weekStartDay">
          {(field) => (
            <SettingsRow label="Week Starts On" description="First day of the week for calendars.">
              <Select
                value={String(field.state.value)}
                onValueChange={(v) => field.handleChange(parseWeekStartDay(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEK_DAYS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="numberFormat">
          {(field) => (
            <SettingsRow label="Number Format" description="Number grouping and decimal separator format.">
              <Select
                value={field.state.value}
                onValueChange={(v) => isNumberFormat(v) && field.handleChange(v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NUMBER_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>
          )}
        </form.Field>
        <div className="py-3 flex justify-end">
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {form.state.isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SettingsSection>
    </form>
  );
}

// ============================================================================
// FINANCIAL SETTINGS SECTION
// ============================================================================

export type { FinancialSettingsData };

const FISCAL_MONTHS = [
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
];

export function FinancialSettingsSection({ data, onSave }: SectionProps<FinancialSettingsData>) {
  const form = useForm({
    defaultValues: data,
    validators: {
      onSubmit: financialSettingsSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const result = await onSave(value);
      formApi.reset(result);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <SettingsSection id="financial" title="Financial" description="Financial settings and defaults.">
        <form.Field name="fiscalYearStart">
          {(field) => (
            <SettingsRow label="Fiscal Year Start" description="Month your fiscal year begins.">
              <Select
                value={String(field.state.value)}
                onValueChange={(v) => field.handleChange(parseInt(v, 10))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FISCAL_MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="defaultPaymentTerms">
          {(field) => (
            <SettingsRow label="Default Payment Terms" description="Default payment due period in days.">
              <Select
                value={String(field.state.value)}
                onValueChange={(v) => field.handleChange(parseInt(v, 10))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="defaultTaxRate">
          {(field) => (
            <SettingsRow label="Default Tax Rate" description="Default GST/tax rate (%).">
              <Input
                type="number"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
              />
            </SettingsRow>
          )}
        </form.Field>
        <div className="py-3 flex justify-end">
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {form.state.isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SettingsSection>
    </form>
  );
}

// ============================================================================
// BRANDING SETTINGS SECTION
// ============================================================================

export type { BrandingSettingsData };

export function BrandingSettingsSection({ data, onSave }: SectionProps<BrandingSettingsData>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlCollapsed, setUrlCollapsed] = useState(true);
  const [dragRejected, setDragRejected] = useState(false);
  const logoUpload = useOrganizationLogoUpload();
  const removeLogo = useRemoveOrganizationLogo();

  const form = useForm({
    defaultValues: data,
    validators: {
      onSubmit: brandingSettingsSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const result = await onSave(value);
      formApi.reset(result);
    },
  });

  const logoUrl = data.logoUrl ?? "";
  const hasLogo = !!logoUrl;
  const isUploading = logoUpload.isPending || removeLogo.isPending;
  const uploadError = logoUpload.error?.message ?? removeLogo.error?.message;

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    logoUpload.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragRejected(false);
    const file = e.dataTransfer.files[0];
    if (file && isAllowedLogoMimeType(file.type)) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.items?.[0]?.kind === "file" ? e.dataTransfer.items[0].getAsFile() : e.dataTransfer.files[0];
    if (file && isAllowedLogoMimeType(file.type)) {
      e.dataTransfer.dropEffect = "copy";
      setDragRejected(false);
    } else {
      e.dataTransfer.dropEffect = "none";
      setDragRejected(true);
    }
  };

  const handleDragLeave = () => {
    setDragRejected(false);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <SettingsSection id="branding" title="Branding" description="Customer portal branding settings.">
        <p className="text-sm text-muted-foreground mb-4">
          Upload applies immediately. Color and URL changes require Save. Recommended: 400×100px for best display.
        </p>

        {/* Logo upload area */}
        <div className="space-y-3 mb-6">
          <div
            role="button"
            tabIndex={0}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
              "hover:border-primary/50 hover:bg-muted/50",
              uploadError && "border-destructive/50",
              dragRejected && "border-destructive/50 bg-destructive/5"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />
            {hasLogo ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={logoUrl}
                  alt="Organization logo"
                  className="max-h-16 max-w-[200px] object-contain"
                />
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {logoUpload.isPending ? "Uploading..." : "Removing..."}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Change logo
                    </>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="w-10 h-10" />
                <span className="text-sm">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                      Uploading...
                    </>
                  ) : dragRejected ? (
                    "PNG or JPG only"
                  ) : (
                    "Drag and drop or click to upload PNG or JPG"
                  )}
                </span>
              </div>
            )}
          </div>
          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}
          {hasLogo && !isUploading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeLogo.mutate()}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Remove logo
            </Button>
          )}
        </div>

        {/* Optional URL paste (collapsible) */}
        <Collapsible open={!urlCollapsed} onOpenChange={(open) => setUrlCollapsed(!open)}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              {urlCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              Or paste URL
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <form.Field name="logoUrl">
              {(field) => (
                <SettingsRow label="Logo URL" description="Use an external URL if you host the logo elsewhere.">
                  <Input
                    type="url"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
{field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive mt-1">
                {formatFieldError(field.state.meta.errors[0])}
              </p>
            )}
                </SettingsRow>
              )}
            </form.Field>
          </CollapsibleContent>
        </Collapsible>

        <form.Field name="primaryColor">
          {(field) => (
            <SettingsRow label="Primary Color" description="Hex color for primary accents.">
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="#1F4B99"
              />
{field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive mt-1">
                {formatFieldError(field.state.meta.errors[0])}
              </p>
            )}
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="secondaryColor">
          {(field) => (
            <SettingsRow label="Secondary Color" description="Hex color for secondary accents.">
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="#E7B008"
              />
{field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive mt-1">
                {formatFieldError(field.state.meta.errors[0])}
              </p>
            )}
            </SettingsRow>
          )}
        </form.Field>
        <form.Field name="websiteUrl">
          {(field) => (
            <SettingsRow label="Website URL" description="Link shown in customer portals.">
              <Input
                type="url"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="https://example.com"
              />
{field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive mt-1">
                {formatFieldError(field.state.meta.errors[0])}
              </p>
            )}
            </SettingsRow>
          )}
        </form.Field>
        <div className="py-3 flex justify-end">
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {form.state.isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SettingsSection>
    </form>
  );
}

// ============================================================================
// LINK SECTION (for domain settings pages)
// ============================================================================

export interface LinkSectionProps {
  id: string;
  title: string;
  description: string;
  /** TanStack Router path. Prefer over href for type safety. */
  to?: LinkProps["to"];
  /** @deprecated Use `to` instead. Supported for backward compatibility. */
  href?: string;
  children?: ReactNode;
}

/**
 * A section that links to a separate domain-specific settings page.
 * Used for complex settings that need their own dedicated UI.
 */
export function LinkSettingsSection({
  id,
  title,
  description,
  to,
  href,
  children,
}: LinkSectionProps) {
  const linkTo = to ?? href ?? "/";
  return (
    <SettingsSection id={id} title={title} description={description}>
      {children || (
        <SettingsRow label={`Manage ${title}`} description="Open dedicated settings page.">
          <Link to={linkTo} className={buttonVariants({ variant: "outline" })}>
            Open Settings
          </Link>
        </SettingsRow>
      )}
    </SettingsSection>
  );
}
