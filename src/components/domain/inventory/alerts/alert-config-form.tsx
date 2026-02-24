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
import { memo, useCallback } from "react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { z } from "zod";
import {
  Bell,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FormFieldDisplayProvider,
  FormErrorSummary,
  TextField,
  NumberField,
  SelectField,
  SwitchField,
} from "@/components/shared/forms";

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
  submitError?: string | null;
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

function getDefaultValues(initial?: Partial<AlertConfigValues>): AlertConfigValues {
  return {
    alertType: initial?.alertType ?? "low_stock",
    name: initial?.name ?? "",
    productId: initial?.productId ?? null,
    locationId: initial?.locationId ?? null,
    thresholdValue: initial?.thresholdValue ?? 10,
    thresholdPercentage: initial?.thresholdPercentage ?? undefined,
    notifyEmail: initial?.notifyEmail ?? false,
    notifyInApp: initial?.notifyInApp ?? true,
    isActive: initial?.isActive ?? true,
  };
}

export const AlertConfigForm = memo(function AlertConfigForm({
  products = [],
  locations = [],
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
  submitError,
  className,
}: AlertConfigFormProps) {
  const form = useTanStackForm<AlertConfigValues>({
    schema: alertConfigSchema,
    defaultValues: getDefaultValues(initialValues),
    onSubmit: async (values) => {
      await onSubmit(values);
    },
    onSubmitInvalid: () => {},
  });

  const alertType = form.useWatch("alertType") as AlertType;
  const alertConfig = ALERT_TYPE_CONFIG[alertType];

  const handleCancel = useCallback(() => {
    form.reset();
    onCancel?.();
  }, [form, onCancel]);

  const isSubmitting = form.state.isSubmitting;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{initialValues ? "Edit Alert Rule" : "Create Alert Rule"}</CardTitle>
        <CardDescription>
          Configure automated alerts for inventory conditions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-6"
        >
          <FormFieldDisplayProvider form={form}>
            <FormErrorSummary form={form} submitError={submitError} />
            {/* Alert Type */}
            <form.Field name="alertType">
              {(field) => (
                <SelectField
                  field={field}
                  label="Alert Type"
                  placeholder="Select alert type..."
                  options={(Object.entries(ALERT_TYPE_CONFIG) as [AlertType, (typeof ALERT_TYPE_CONFIG)[AlertType]][]).map(
                    ([type, config]) => ({
                      value: type,
                      label: `${config.label} – ${config.description}`,
                    })
                  )}
                  required
                />
              )}
            </form.Field>

            {/* Name */}
            <form.Field name="name">
              {(field) => (
                <TextField
                  field={field}
                  label="Alert Name"
                  placeholder="e.g., Low Stock Warning - Warehouse A"
                  required
                />
              )}
            </form.Field>

            {/* Scope */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Alert Scope</h4>

              <form.Field name="productId">
                {(field) => (
                  <SelectField
                    field={field}
                    label="Product (Optional)"
                    nullOption={{ value: "__all__", label: "All Products" }}
                    options={products.map((p) => ({
                      value: p.id,
                      label: `${p.name} (${p.sku})`,
                    }))}
                    placeholder="All products"
                    description="Leave as &quot;All&quot; to monitor all products"
                  />
                )}
              </form.Field>

              <form.Field name="locationId">
                {(field) => (
                  <SelectField
                    field={field}
                    label="Location (Optional)"
                    nullOption={{ value: "__all__", label: "All Locations" }}
                    options={locations.map((loc) => ({
                      value: loc.id,
                      label: `${loc.name} (${loc.code})`,
                    }))}
                    placeholder="All locations"
                  />
                )}
              </form.Field>
            </div>

            {/* Threshold */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Threshold</h4>

              <form.Field name="thresholdValue">
                {(field) => (
                  <NumberField
                    field={field}
                    label={alertConfig.thresholdLabel}
                    min={0}
                    required
                  />
                )}
              </form.Field>

              {alertType === "forecast_deviation" && (
                <form.Field name="thresholdPercentage">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Deviation Threshold (%)"
                      min={0}
                      max={100}
                      description="Alert when forecast deviation exceeds this percentage"
                    />
                  )}
                </form.Field>
              )}
            </div>

            {/* Notifications */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Bell className="h-4 w-4" aria-hidden="true" />
                Notifications
              </h4>

              <form.Field name="notifyInApp">
                {(field) => (
                  <SwitchField
                    field={field}
                    label="In-App Notifications"
                    description="Show alerts in the notification center"
                    className="rounded-lg border p-3"
                  />
                )}
              </form.Field>

              <form.Field name="notifyEmail">
                {(field) => (
                  <SwitchField
                    field={field}
                    label="Email Notifications"
                    description="Send email when alert triggers"
                    className="rounded-lg border p-3"
                  />
                )}
              </form.Field>

              <form.Field name="isActive">
                {(field) => (
                  <SwitchField
                    field={field}
                    label="Alert Active"
                    description="Enable or disable this alert rule"
                    className="rounded-lg border p-3"
                  />
                )}
              </form.Field>
            </div>
          </FormFieldDisplayProvider>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
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
      </CardContent>
    </Card>
  );
});

export default AlertConfigForm;
