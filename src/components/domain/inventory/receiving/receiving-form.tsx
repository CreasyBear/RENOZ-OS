/**
 * Receiving Form Component
 *
 * Form for receiving inventory with cost tracking and lot/serial support.
 *
 * Features:
 * - Product/location selector
 * - Quantity and unit cost input
 * - Lot/batch/serial tracking
 * - Reference linking (PO, supplier)
 *
 * Accessibility:
 * - Form validation with clear error messages
 * - Numeric inputs with proper constraints
 */
import { memo, useEffect } from "react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { z } from "zod";
import {
  Package,
  Hash,
  FileText,
  Loader2,
} from "lucide-react";
import { useOrgFormat } from "@/hooks/use-org-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FormFieldDisplayProvider,
  FormErrorSummary,
  ComboboxField,
  TextField,
  NumberField,
  SelectField,
  TextareaField,
  DateStringField,
} from "@/components/shared/forms";

// ============================================================================
// TYPES
// ============================================================================

const receivingFormBaseSchema = z.object({
  productId: z.string().uuid("Product is required"),
  locationId: z.string().uuid("Location is required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitCost: z.coerce.number().min(0, "Cost must be zero or positive"),
  serialNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

type ReceivingFormValues = z.infer<typeof receivingFormBaseSchema>;

function createReceivingFormSchema(products: { id: string; isSerialized?: boolean }[]) {
  return receivingFormBaseSchema.superRefine((data, ctx) => {
    const product = products.find((p) => p.id === data.productId);
    if (product?.isSerialized) {
      if (data.quantity !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quantity"],
          message: "Serialized products must be received one unit per serial.",
        });
      }
      if (!data.serialNumber?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["serialNumber"],
          message: "Serial number is required for serialized products.",
        });
      }
    }
  });
}

interface Product {
  id: string;
  sku: string;
  name: string;
  costPrice?: number | null;
  isSerialized?: boolean;
}

interface Location {
  id: string;
  code: string;
  name: string;
}

interface ReceivingFormProps {
  products: Product[];
  locations: Location[];
  isLoadingProducts?: boolean;
  isLoadingLocations?: boolean;
  onSubmit: (data: ReceivingFormValues) => Promise<void>;
  onProductSearch?: (query: string) => void;
  defaultLocationId?: string;
  submitError?: string | null;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ReceivingForm = memo(function ReceivingForm({
  products,
  locations,
  isLoadingProducts,
  isLoadingLocations,
  onSubmit,
  onProductSearch,
  defaultLocationId,
  submitError,
  className,
}: ReceivingFormProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });

  const form = useTanStackForm<ReceivingFormValues>({
    schema: createReceivingFormSchema(products),
    defaultValues: {
      productId: "",
      locationId: defaultLocationId ?? "",
      quantity: 1,
      unitCost: 0,
      serialNumber: "",
      batchNumber: "",
      lotNumber: "",
      expiryDate: "",
      referenceType: "",
      referenceId: "",
      notes: "",
    },
    onSubmit: async (values) => {
      await onSubmit(values);
      form.reset({
        productId: "",
        locationId: defaultLocationId ?? "",
        quantity: 1,
        unitCost: 0,
        serialNumber: "",
        batchNumber: "",
        lotNumber: "",
        expiryDate: "",
        referenceType: "",
        referenceId: "",
        notes: "",
      });
    },
    onSubmitInvalid: () => {},
  });

  const selectedProductId = form.useWatch("productId");
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isSerializedProduct = !!selectedProduct?.isSerialized;

  // Auto-fill cost from product when selected
  useEffect(() => {
    if (selectedProduct?.costPrice != null) {
      form.setFieldValue("unitCost", selectedProduct.costPrice);
    }
  }, [selectedProduct?.costPrice, form]);

  // Force quantity to 1 when serialized
  useEffect(() => {
    if (!isSerializedProduct) return;
    if (form.getValues().quantity !== 1) {
      form.setFieldValue("quantity", 1);
    }
  }, [isSerializedProduct, form]);

  const quantity = form.useWatch("quantity") || 0;
  const unitCost = form.useWatch("unitCost") || 0;
  const totalValue = quantity * unitCost;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Receive Inventory</CardTitle>
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
            {/* Product Selection */}
            <form.Field name="productId">
              {(field) => (
                <ComboboxField
                  field={field}
                  label="Product"
                  options={products.map((p) => ({
                    value: p.id,
                    label: p.name,
                    description: p.sku,
                  }))}
                  placeholder="Select product..."
                  searchPlaceholder="Search products..."
                  emptyText="No products found"
                  onSearchChange={onProductSearch}
                  isLoading={isLoadingProducts}
                  required
                />
              )}
            </form.Field>

            {isSerializedProduct ? (
              <Alert>
                <AlertDescription>
                  This product is serialized. Receive exactly 1 unit and provide a serial number.
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Location Selection */}
            <form.Field name="locationId">
              {(field) => (
                <SelectField
                  field={field}
                  label="Location"
                  placeholder="Select location..."
                  disabled={isLoadingLocations}
                  options={locations.map((loc) => ({
                    value: loc.id,
                    label: `${loc.name} (${loc.code})`,
                  }))}
                  required
                />
              )}
            </form.Field>

            {/* Quantity and Cost */}
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="quantity">
                {(field) => (
                  <NumberField
                    field={field}
                    label="Quantity"
                    min={1}
                    max={isSerializedProduct ? 1 : undefined}
                    disabled={isSerializedProduct}
                    required
                  />
                )}
              </form.Field>

              <form.Field name="unitCost">
                {(field) => (
                  <NumberField
                    field={field}
                    label="Unit Cost"
                    min={0}
                    step={0.01}
                    prefix="$"
                    required
                  />
                )}
              </form.Field>
            </div>

            {/* Total Value Display */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Value</span>
                <span className="text-lg font-bold tabular-nums">
                  {formatCurrencyDisplay(totalValue)}
                </span>
              </div>
            </div>

            {/* Tracking Fields */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Hash className="h-4 w-4" aria-hidden="true" />
                Tracking Information {isSerializedProduct ? "(Serial Required)" : "(Optional)"}
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <form.Field name="lotNumber">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Lot Number"
                      placeholder="LOT-001"
                    />
                  )}
                </form.Field>

                <form.Field name="batchNumber">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Batch Number"
                      placeholder="BATCH-001"
                    />
                  )}
                </form.Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <form.Field name="serialNumber">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Serial Number"
                      placeholder="SN-12345"
                    />
                  )}
                </form.Field>

                <form.Field name="expiryDate">
                  {(field) => (
                    <DateStringField
                      field={field}
                      label="Expiry Date"
                    />
                  )}
                </form.Field>
              </div>
            </div>

            {/* Reference Fields */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Reference (Optional)
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <form.Field name="referenceType">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Reference Type"
                      placeholder="Select type..."
                      options={[
                        { value: "purchase_order", label: "Purchase Order" },
                        { value: "transfer", label: "Transfer" },
                        { value: "return", label: "Return" },
                        { value: "adjustment", label: "Adjustment" },
                      ]}
                    />
                  )}
                </form.Field>

                <form.Field name="referenceId">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Reference ID"
                      placeholder="PO-001"
                    />
                  )}
                </form.Field>
              </div>
            </div>

            {/* Notes */}
            <form.Field name="notes">
              {(field) => (
                <TextareaField
                  field={field}
                  label="Notes"
                  placeholder="Additional notes about this receipt..."
                  rows={3}
                />
              )}
            </form.Field>
          </FormFieldDisplayProvider>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Receiving...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" aria-hidden="true" />
                Receive Inventory
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
});

export default ReceivingForm;
