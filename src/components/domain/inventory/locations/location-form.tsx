/**
 * Location Form Component
 *
 * Form for creating and editing warehouse locations with validation.
 *
 * Features:
 * - Location type selection with hierarchy constraints
 * - Capacity planning with utilization preview
 * - Attribute toggles (pickable, receivable)
 */
import { memo, useCallback, useEffect } from "react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { z } from "zod";
import { Warehouse, LayoutGrid, Rows3, Layers, Box, Package } from "lucide-react";
import {
  FormDialog,
  TextField,
  NumberField,
  SelectField,
  SwitchField,
} from "@/components/shared/forms";
import type { LocationType, WarehouseLocation } from "./location-tree";

// ============================================================================
// SCHEMA
// ============================================================================

const locationFormSchema = z.object({
  locationCode: z
    .string()
    .min(1, "Code is required")
    .max(20, "Code must be 20 characters or less")
    .regex(/^[A-Z0-9-]+$/, "Code must be uppercase letters, numbers, or hyphens"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  locationType: z.enum(["warehouse", "zone", "aisle", "rack", "shelf", "bin"]),
  capacity: z.coerce.number().int().min(0).nullable(),
  isActive: z.boolean(),
  isPickable: z.boolean(),
  isReceivable: z.boolean(),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface LocationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: WarehouseLocation | null;
  parentLocation?: WarehouseLocation | null;
  onSubmit: (data: LocationFormValues & { parentId: string | null }) => Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
}

// ============================================================================
// LOCATION TYPE CONFIG
// ============================================================================

const LOCATION_TYPES: Array<{
  value: LocationType;
  label: string;
  icon: typeof Warehouse;
  description: string;
}> = [
  {
    value: "warehouse",
    label: "Warehouse",
    icon: Warehouse,
    description: "Top-level storage facility",
  },
  {
    value: "zone",
    label: "Zone",
    icon: LayoutGrid,
    description: "Area within warehouse (e.g., receiving, shipping)",
  },
  {
    value: "aisle",
    label: "Aisle",
    icon: Rows3,
    description: "Pathway between racks",
  },
  {
    value: "rack",
    label: "Rack",
    icon: Layers,
    description: "Vertical storage structure",
  },
  {
    value: "shelf",
    label: "Shelf",
    icon: Box,
    description: "Horizontal level on a rack",
  },
  {
    value: "bin",
    label: "Bin",
    icon: Package,
    description: "Individual storage container",
  },
];

// Valid child types for each parent type
const VALID_CHILDREN: Record<LocationType | "root", LocationType[]> = {
  root: ["warehouse"],
  warehouse: ["zone", "aisle", "rack"],
  zone: ["aisle", "rack"],
  aisle: ["rack"],
  rack: ["shelf", "bin"],
  shelf: ["bin"],
  bin: [],
};

// Icon lookup by type (avoids component creation during render)
const LOCATION_TYPE_ICONS: Record<LocationType, typeof Warehouse> = Object.fromEntries(
  LOCATION_TYPES.map((t) => [t.value, t.icon])
) as Record<LocationType, typeof Warehouse>;

// ============================================================================
// COMPONENT
// ============================================================================

function getDefaultValues(validTypes: LocationType[]): LocationFormValues {
  return {
    locationCode: "",
    name: "",
    locationType: validTypes[0] ?? "warehouse",
    capacity: null,
    isActive: true,
    isPickable: true,
    isReceivable: true,
  };
}

function locationToFormValues(loc: WarehouseLocation): LocationFormValues {
  return {
    locationCode: loc.locationCode,
    name: loc.name,
    locationType: loc.locationType,
    capacity: loc.capacity,
    isActive: loc.isActive,
    isPickable: loc.isPickable,
    isReceivable: loc.isReceivable,
  };
}

export const LocationForm = memo(function LocationForm({
  open,
  onOpenChange,
  location,
  parentLocation,
  onSubmit,
  isSubmitting,
  submitError,
}: LocationFormProps) {
  const isEditing = !!location;
  const parentType = parentLocation?.locationType ?? "root";
  const validTypes = VALID_CHILDREN[parentType];

  const form = useTanStackForm<LocationFormValues>({
    schema: locationFormSchema,
    defaultValues: getDefaultValues(validTypes),
    onSubmit: async (values) => {
      await onSubmit({
        ...values,
        parentId: isEditing ? (location?.parentId ?? null) : (parentLocation?.id ?? null),
      });
    },
    onSubmitInvalid: () => {},
  });

  const selectedType = form.useWatch("locationType");
  const typeConfig = LOCATION_TYPES.find((t) => t.value === selectedType);
  const IconComponent = LOCATION_TYPE_ICONS[selectedType] ?? Package;

  // Reset form when location or open changes
  useEffect(() => {
    if (open) {
      form.reset(
        location ? locationToFormValues(location) : getDefaultValues(validTypes)
      );
    }
  }, [open, location, validTypes, form]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && (form.state.isSubmitting || (isSubmitting ?? false))) return;
      onOpenChange(newOpen);
    },
    [onOpenChange, isSubmitting, form.state.isSubmitting]
  );

  const title = (
    <span className="flex items-center gap-2">
      <IconComponent className="h-5 w-5" aria-hidden="true" />
      {isEditing ? "Edit Location" : "New Location"}
    </span>
  );
  const description =
    isEditing
      ? `Update ${location?.name}`
      : parentLocation
        ? `Add a new location under ${parentLocation.name}`
        : "Create a new warehouse location";

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      form={form}
      submitLabel={isEditing ? "Save Changes" : "Create Location"}
      submitError={submitError}
      submitDisabled={isSubmitting ?? false}
      size="md"
      className="sm:max-w-[500px]"
      resetOnClose={false}
    >
      {/* Location Type */}
      <form.Field name="locationType">
              {(field) => (
                <SelectField
                  field={field}
                  label="Location Type"
                  placeholder="Select type"
                  description={typeConfig?.description}
                  disabled={isEditing}
                  options={LOCATION_TYPES.filter((t) => validTypes.includes(t.value)).map(
                    (type) => ({
                      value: type.value,
                      label: type.label,
                    })
                  )}
                  required
                />
              )}
            </form.Field>

            {/* Code and Name */}
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="locationCode">
                {(field) => (
                  <TextField
                    field={field}
                    label="Code"
                    placeholder="A1-R01"
                    required
                    className="font-mono uppercase"
                    onChange={(v) => field.handleChange(v?.toUpperCase() ?? "")}
                  />
                )}
              </form.Field>

              <form.Field name="name">
                {(field) => (
                  <TextField
                    field={field}
                    label="Name"
                    placeholder="Aisle 1, Rack 01"
                    required
                  />
                )}
              </form.Field>
            </div>

            {/* Capacity */}
            <form.Field name="capacity">
              {(field) => (
                <NumberField
                  field={field}
                  label="Capacity (optional)"
                  min={0}
                  placeholder="Leave empty for unlimited"
                  description="Maximum number of items this location can hold"
                />
              )}
            </form.Field>

            {/* Toggles */}
            <div className="space-y-4 pt-2">
              <form.Field name="isActive">
                {(field) => (
                  <div className="rounded-lg border p-3">
                    <SwitchField
                      field={field}
                      label="Active"
                      description="Inactive locations cannot receive new inventory"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="isPickable">
                {(field) => (
                  <div className="rounded-lg border p-3">
                    <SwitchField
                      field={field}
                      label="Pickable"
                      description="Items can be picked from this location for orders"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="isReceivable">
                {(field) => (
                  <div className="rounded-lg border p-3">
                    <SwitchField
                      field={field}
                      label="Receivable"
                      description="New inventory can be received into this location"
                    />
                  </div>
                )}
              </form.Field>
            </div>
    </FormDialog>
  );
});

export default LocationForm;
