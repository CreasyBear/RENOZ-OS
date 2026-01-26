/**
 * Organization Settings Route
 *
 * Settings page for organization configuration with tabs:
 * - General: Name, contact info, ABN
 * - Address: Physical address
 * - Branding: Logo, colors
 * - Settings: Timezone, currency, date format
 *
 * @see Phase 2 of organization management completion plan
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Building2,
  MapPin,
  Palette,
  Settings,
  Loader2,
} from "lucide-react";
import { useOrganization } from "@/hooks/organizations";

// ============================================================================
// SCHEMAS
// ============================================================================

const generalSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal("")),
  abn: z.string().max(50).optional(),
});

const addressSchema = z.object({
  street1: z.string().max(255).optional(),
  street2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

const brandingSchema = z.object({
  logoUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().or(z.literal("")),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
});

const settingsSchema = z.object({
  timezone: z.string().max(100).optional(),
  locale: z.string().max(20).optional(),
  currency: z.string().length(3).optional(),
  dateFormat: z.string().max(50).optional(),
  fiscalYearStart: z.coerce.number().int().min(1).max(12).optional(),
  defaultPaymentTerms: z.coerce.number().int().min(0).max(365).optional(),
});

type GeneralFormValues = z.infer<typeof generalSchema>;
type AddressFormValues = z.infer<typeof addressSchema>;
type BrandingFormValues = z.infer<typeof brandingSchema>;
type SettingsFormValues = z.infer<typeof settingsSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

const TIMEZONES = [
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (AEST/AEDT)" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane (AEST)" },
  { value: "Australia/Perth", label: "Australia/Perth (AWST)" },
  { value: "Australia/Adelaide", label: "Australia/Adelaide (ACST/ACDT)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST/NZDT)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "America/New_York", label: "America/New York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST/PDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "UTC", label: "UTC" },
];

const CURRENCIES = [
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "NZD", label: "NZD - New Zealand Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2024)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2024)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2024-12-31)" },
];

const FISCAL_MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/settings/organization" as any)({
  component: OrganizationSettingsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: OrganizationSettingsSkeleton,
});

// ============================================================================
// SKELETON
// ============================================================================

function OrganizationSettingsSkeleton() {
  return (
    <PageLayout variant="container">
      <PageLayout.Header
        title="Organization Settings"
        description="Manage your organization profile, address, branding, and preferences"
      />
      <PageLayout.Content>
        <div className="space-y-6">
          <Skeleton className="h-10 w-[400px]" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function OrganizationSettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const { organization, isLoading, updateOrganization } = useOrganization();

  if (isLoading) {
    return <OrganizationSettingsSkeleton />;
  }

  return (
    <PageLayout variant="container">
      <PageLayout.Header
        title="Organization Settings"
        description="Manage your organization profile, address, branding, and preferences"
      />
      <PageLayout.Content>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="general" className="gap-2">
              <Building2 className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="address" className="gap-2">
              <MapPin className="h-4 w-4" />
              Address
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralTab
              organization={organization}
              onSubmit={async (data) => {
                await updateOrganization.mutateAsync(data);
                toast.success("Organization updated successfully");
              }}
              isSubmitting={updateOrganization.isPending}
            />
          </TabsContent>

          <TabsContent value="address">
            <AddressTab
              address={organization?.address}
              onSubmit={async (data) => {
                await updateOrganization.mutateAsync({ address: data });
                toast.success("Address updated successfully");
              }}
              isSubmitting={updateOrganization.isPending}
            />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingTab
              branding={organization?.branding}
              onSubmit={async (data) => {
                await updateOrganization.mutateAsync({ branding: data });
                toast.success("Branding updated successfully");
              }}
              isSubmitting={updateOrganization.isPending}
            />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab
              settings={organization?.settings}
              onSubmit={async (data) => {
                await updateOrganization.mutateAsync({ settings: data });
                toast.success("Settings updated successfully");
              }}
              isSubmitting={updateOrganization.isPending}
            />
          </TabsContent>
        </Tabs>
      </PageLayout.Content>
    </PageLayout>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

interface TabProps<T> {
  onSubmit: (data: T) => Promise<void>;
  isSubmitting: boolean;
}

function GeneralTab({
  organization,
  onSubmit,
  isSubmitting,
}: TabProps<GeneralFormValues> & { organization: any }) {
  const form = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: organization?.name || "",
      email: organization?.email || "",
      phone: organization?.phone || "",
      website: organization?.website || "",
      abn: organization?.abn || "",
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Information</CardTitle>
        <CardDescription>
          Basic details about your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Solar" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your company or organization name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+61 2 1234 5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="abn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ABN</FormLabel>
                  <FormControl>
                    <Input placeholder="12 345 678 901" {...field} />
                  </FormControl>
                  <FormDescription>
                    Australian Business Number (11 digits)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function AddressTab({
  address,
  onSubmit,
  isSubmitting,
}: TabProps<AddressFormValues> & { address: any }) {
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street1: address?.street1 || "",
      street2: address?.street2 || "",
      city: address?.city || "",
      state: address?.state || "",
      postalCode: address?.postalCode || "",
      country: address?.country || "Australia",
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Address</CardTitle>
        <CardDescription>
          Your organization's physical address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="street1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="street2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address 2</FormLabel>
                  <FormControl>
                    <Input placeholder="Suite 100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Sydney" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <FormControl>
                      <Input placeholder="NSW" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="2000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Australia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function BrandingTab({
  branding,
  onSubmit,
  isSubmitting,
}: TabProps<BrandingFormValues> & { branding: any }) {
  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      logoUrl: branding?.logoUrl || "",
      primaryColor: branding?.primaryColor || "#3B82F6",
      secondaryColor: branding?.secondaryColor || "#10B981",
      websiteUrl: branding?.websiteUrl || "",
    },
  });

  const primaryColor = form.watch("primaryColor");
  const secondaryColor = form.watch("secondaryColor");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Customize your organization's visual identity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    URL to your organization's logo (recommended: 200x50px)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Color</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="#3B82F6" {...field} />
                      </FormControl>
                      <div
                        className="h-10 w-10 rounded border flex-shrink-0"
                        style={{ backgroundColor: primaryColor || "#3B82F6" }}
                      />
                    </div>
                    <FormDescription>
                      Hex color code (e.g., #3B82F6)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Color</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="#10B981" {...field} />
                      </FormControl>
                      <div
                        className="h-10 w-10 rounded border flex-shrink-0"
                        style={{ backgroundColor: secondaryColor || "#10B981" }}
                      />
                    </div>
                    <FormDescription>
                      Hex color code (e.g., #10B981)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="websiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Website</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Link to your public-facing website
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview Section */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <Label className="text-sm font-medium mb-2 block">Preview</Label>
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-24 rounded flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: primaryColor || "#3B82F6" }}
                >
                  Primary
                </div>
                <div
                  className="h-12 w-24 rounded flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: secondaryColor || "#10B981" }}
                >
                  Secondary
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function SettingsTab({
  settings,
  onSubmit,
  isSubmitting,
}: TabProps<SettingsFormValues> & { settings: any }) {
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      timezone: settings?.timezone || "Australia/Sydney",
      locale: settings?.locale || "en-AU",
      currency: settings?.currency || "AUD",
      dateFormat: settings?.dateFormat || "DD/MM/YYYY",
      fiscalYearStart: settings?.fiscalYearStart || 7,
      defaultPaymentTerms: settings?.defaultPaymentTerms || 30,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          Configure regional and display preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Used for scheduling and date/time display
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((curr) => (
                          <SelectItem key={curr.value} value={curr.value}>
                            {curr.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Format</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DATE_FORMATS.map((fmt) => (
                          <SelectItem key={fmt.value} value={fmt.value}>
                            {fmt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fiscalYearStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year Start</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FISCAL_MONTHS.map((month) => (
                          <SelectItem key={month.value} value={String(month.value)}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      First month of your fiscal year
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultPaymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Payment Terms</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={365}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Days until payment is due
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
