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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Warehouse,
  LayoutGrid,
  Rows3,
  Layers,
  Box,
  Package,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

// ============================================================================
// COMPONENT
// ============================================================================

export const LocationForm = memo(function LocationForm({
  open,
  onOpenChange,
  location,
  parentLocation,
  onSubmit,
  isSubmitting,
}: LocationFormProps) {
  const isEditing = !!location;
  const parentType = parentLocation?.locationType ?? "root";
  const validTypes = VALID_CHILDREN[parentType];

  const form = useForm({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      locationCode: "",
      name: "",
      locationType: validTypes[0] ?? "warehouse",
      capacity: null as number | null,
      isActive: true,
      isPickable: true,
      isReceivable: true,
    },
  });

  // Reset form when location changes
  useEffect(() => {
    if (location) {
      form.reset({
        locationCode: location.locationCode,
        name: location.name,
        locationType: location.locationType,
        capacity: location.capacity,
        isActive: location.isActive,
        isPickable: location.isPickable,
        isReceivable: location.isReceivable,
      });
    } else {
      form.reset({
        locationCode: "",
        name: "",
        locationType: validTypes[0] ?? "warehouse",
        capacity: null,
        isActive: true,
        isPickable: true,
        isReceivable: true,
      });
    }
  }, [location, form, validTypes]);

  const handleSubmit = useCallback(
    async (values: any) => {
      await onSubmit({
        ...values,
        parentId: isEditing ? (location?.parentId ?? null) : (parentLocation?.id ?? null),
      });
    },
    [onSubmit, isEditing, location, parentLocation]
  );

  const selectedType = form.watch("locationType");
  const typeConfig = LOCATION_TYPES.find((t) => t.value === selectedType);
  const TypeIcon = typeConfig?.icon ?? Package;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5" aria-hidden="true" />
            {isEditing ? "Edit Location" : "New Location"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update ${location?.name}`
              : parentLocation
                ? `Add a new location under ${parentLocation.name}`
                : "Create a new warehouse location"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Location Type */}
            <FormField
              control={form.control}
              name="locationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LOCATION_TYPES.filter((t) =>
                        validTypes.includes(t.value)
                      ).map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" aria-hidden="true" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{typeConfig?.description}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Code and Name */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="locationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="A1-R01"
                        className="font-mono uppercase"
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Aisle 1, Rack 01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Capacity */}
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      value={field.value === null ? "" : String(field.value)}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="Leave empty for unlimited"
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of items this location can hold
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Toggles */}
            <div className="space-y-4 pt-2">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Inactive locations cannot receive new inventory
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
                name="isPickable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Pickable</FormLabel>
                      <FormDescription>
                        Items can be picked from this location for orders
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
                name="isReceivable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Receivable</FormLabel>
                      <FormDescription>
                        New inventory can be received into this location
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

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {isEditing ? "Save Changes" : "Create Location"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
});

export default LocationForm;
