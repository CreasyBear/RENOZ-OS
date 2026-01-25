/**
 * Alert Configuration Form Component
 *
 * Create and edit inventory alert rules.
 *
 * Features:
 * - Alert type selection
 * - Threshold configuration
 * - Product/location filtering
 * - Notification settings
 *
 * Accessibility:
 * - Form validation with clear error messages
 * - Logical field grouping
 */
import { memo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Package,
  MapPin,
  Bell,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// TYPES
// ============================================================================

export type AlertType =
  | "low_stock"
  | "out_of_stock"
  | "overstock"
  | "expiry"
  | "slow_moving"
  | "forecast_deviation";

const alertConfigSchema = z.object({
  alertType: z.enum([
    "low_stock",
    "out_of_stock",
    "overstock",
    "expiry",
    "slow_moving",
    "forecast_deviation",
  ]),
  name: z.string().min(1, "Name is required").max(100),
  productId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  thresholdValue: z.coerce.number().min(0),
  thresholdPercentage: z.coerce.number().min(0).max(100).optional(),
  notifyEmail: z.boolean().default(false),
  notifyInApp: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

type AlertConfigValues = z.infer<typeof alertConfigSchema>;

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Location {
  id: string;
  name: string;
  code: string;
}

interface AlertConfigFormProps {
  products?: Product[];
  locations?: Location[];
  initialValues?: Partial<AlertConfigValues>;
  onSubmit: (data: AlertConfigValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// ALERT TYPE CONFIG
// ============================================================================

const ALERT_TYPE_CONFIG: Record<
  AlertType,
  { label: string; description: string; thresholdLabel: string }
> = {
  low_stock: {
    label: "Low Stock",
    description: "Alert when stock falls below threshold",
    thresholdLabel: "Minimum Quantity",
  },
  out_of_stock: {
    label: "Out of Stock",
    description: "Alert when stock reaches zero",
    thresholdLabel: "Warning at Quantity",
  },
  overstock: {
    label: "Overstock",
    description: "Alert when stock exceeds threshold",
    thresholdLabel: "Maximum Quantity",
  },
  expiry: {
    label: "Expiry Warning",
    description: "Alert before products expire",
    thresholdLabel: "Days Before Expiry",
  },
  slow_moving: {
    label: "Slow Moving",
    description: "Alert for products with low turnover",
    thresholdLabel: "Days Without Movement",
  },
  forecast_deviation: {
    label: "Forecast Deviation",
    description: "Alert when actual differs from forecast",
    thresholdLabel: "Deviation Percentage",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AlertConfigForm = memo(function AlertConfigForm({
  products = [],
  locations = [],
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
  className,
}: AlertConfigFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(alertConfigSchema) as any,
    defaultValues: {
      alertType: initialValues?.alertType ?? "low_stock",
      name: initialValues?.name ?? "",
      productId: initialValues?.productId ?? null,
      locationId: initialValues?.locationId ?? null,
      thresholdValue: initialValues?.thresholdValue ?? 10,
      thresholdPercentage: initialValues?.thresholdPercentage ?? undefined,
      notifyEmail: initialValues?.notifyEmail ?? false,
      notifyInApp: initialValues?.notifyInApp ?? true,
      isActive: initialValues?.isActive ?? true,
    },
  });

  const alertType = form.watch("alertType") as AlertType;
  const alertConfig = ALERT_TYPE_CONFIG[alertType];

  const handleSubmit = useCallback(
    async (values: any) => {
      try {
        setIsSubmitting(true);
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit]
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{initialValues ? "Edit Alert Rule" : "Create Alert Rule"}</CardTitle>
        <CardDescription>
          Configure automated alerts for inventory conditions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Alert Type */}
            <FormField
              control={form.control}
              name="alertType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select alert type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.entries(ALERT_TYPE_CONFIG) as [AlertType, typeof ALERT_TYPE_CONFIG[AlertType]][]).map(
                        ([type, config]) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex flex-col">
                              <span>{config.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {config.description}
                              </span>
                            </div>
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Low Stock Warning - Warehouse A"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scope */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Alert Scope</h4>

              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product (Optional)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "all" ? null : v)}
                      defaultValue={field.value ?? "all"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All products" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" aria-hidden="true" />
                            All Products
                          </div>
                        </SelectItem>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" aria-hidden="true" />
                              {product.name}
                              <span className="text-muted-foreground text-xs">
                                ({product.sku})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Leave as "All" to monitor all products
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "all" ? null : v)}
                      defaultValue={field.value ?? "all"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                            All Locations
                          </div>
                        </SelectItem>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" aria-hidden="true" />
                              {location.name}
                              <span className="text-muted-foreground text-xs">
                                ({location.code})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Threshold */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Threshold</h4>

              <FormField
                control={form.control}
                name="thresholdValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{alertConfig.thresholdLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        className="tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {alertType === "forecast_deviation" && (
                <FormField
                  control={form.control}
                  name="thresholdPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deviation Threshold (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="tabular-nums"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Alert when forecast deviation exceeds this percentage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Notifications */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Bell className="h-4 w-4" aria-hidden="true" />
                Notifications
              </h4>

              <FormField
                control={form.control}
                name="notifyInApp"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>In-App Notifications</FormLabel>
                      <FormDescription>
                        Show alerts in the notification center
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notifyEmail"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Email Notifications</FormLabel>
                      <FormDescription>
                        Send email when alert triggers
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Alert Active</FormLabel>
                      <FormDescription>
                        Enable or disable this alert rule
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                    {initialValues ? "Save Changes" : "Create Alert"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
});

export default AlertConfigForm;
