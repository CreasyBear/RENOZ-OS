/**
 * AddressManager Component
 *
 * Manages customer addresses with inline editing capability.
 * Supports adding, editing, and removing addresses with:
 * - Address types (billing, shipping, service, headquarters)
 * - Primary address flag
 * - Full address fields with Australian defaults
 *
 * @source addresses from props (parent provides)
 * @source form state from useTanStackForm hook
 * @source mutations from useCreateAddress, useUpdateAddress, useDeleteAddress hooks
 */
import { useState, useEffect } from 'react'
import { z } from 'zod'
import {
  MapPin,
  Building,
  Truck,
  Wrench,
  Pencil,
  Trash2,
  Plus,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form'
import {
  TextField,
  SelectField,
  CheckboxField,
  FormFieldDisplayProvider,
} from '@/components/shared/forms'
import { addressTypeValues } from '@/lib/schemas/customers'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

const addressFormSchema = z.object({
  type: z.enum(['billing', 'shipping', 'service', 'headquarters']),
  isPrimary: z.boolean(),
  street1: z.string().min(1, 'Street address is required').max(255),
  street2: z.string().max(255).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().max(100).optional(),
  postcode: z.string().min(1, 'Postcode is required').max(20),
  country: z.string().max(100),
  notes: z.string().max(500).optional(),
})

type AddressFormValues = z.infer<typeof addressFormSchema>

export interface ManagedAddress extends AddressFormValues {
  id: string
  isNew?: boolean
}

interface AddressManagerProps {
  addresses: ManagedAddress[]
  onChange: (addresses: ManagedAddress[]) => void
  disabled?: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const typeConfig: Record<string, { label: string; icon: typeof MapPin; color: string }> = {
  billing: { label: 'Billing', icon: Building, color: 'text-blue-600 bg-blue-100' },
  shipping: { label: 'Shipping', icon: Truck, color: 'text-green-600 bg-green-100' },
  service: { label: 'Service', icon: Wrench, color: 'text-orange-600 bg-orange-100' },
  headquarters: { label: 'Headquarters', icon: Building, color: 'text-purple-600 bg-purple-100' },
}

const australianStates = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
]

// ============================================================================
// ADDRESS CARD
// ============================================================================

interface AddressCardProps {
  address: ManagedAddress
  onEdit: () => void
  onDelete: () => void
  onSetPrimary: () => void
  disabled?: boolean
}

function AddressCard({ address, onEdit, onDelete, onSetPrimary, disabled }: AddressCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const config = typeConfig[address.type] || typeConfig.billing
  const Icon = config.icon

  return (
    <>
      <div className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className={`p-2 rounded-full shrink-0 ${config.color}`}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium">{config.label}</span>
            {address.isPrimary && (
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Primary
              </Badge>
            )}
            {address.isNew && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                New
              </Badge>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-0.5">
            <p>{address.street1}</p>
            {address.street2 && <p>{address.street2}</p>}
            <p>
              {address.city}
              {address.state && `, ${address.state}`} {address.postcode}
            </p>
            {address.country && address.country !== 'AU' && (
              <p>{address.country}</p>
            )}
          </div>

          {address.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">{address.notes}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!address.isPrimary && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onSetPrimary}
              disabled={disabled}
              title="Set as primary address"
              aria-label="Set as primary address"
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onEdit}
            disabled={disabled}
            aria-label="Edit address"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={disabled}
            aria-label="Delete address"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this {config.label.toLowerCase()} address?
              {address.isPrimary && ' This is currently the primary address.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ============================================================================
// ADDRESS FORM DIALOG
// ============================================================================

interface AddressFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AddressFormValues) => void
  defaultValues?: Partial<AddressFormValues>
  mode: 'add' | 'edit'
}

function AddressFormDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  mode,
}: AddressFormDialogProps) {
  const form = useTanStackForm({
    schema: addressFormSchema,
    defaultValues: {
      type: defaultValues?.type ?? 'billing',
      isPrimary: defaultValues?.isPrimary ?? false,
      street1: defaultValues?.street1 ?? '',
      street2: defaultValues?.street2 ?? '',
      city: defaultValues?.city ?? '',
      state: defaultValues?.state ?? '',
      postcode: defaultValues?.postcode ?? '',
      country: defaultValues?.country ?? 'AU',
      notes: defaultValues?.notes ?? '',
    },
    onSubmit: async (data) => {
      onSubmit(data)
      form.reset()
      onOpenChange(false)
    },
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.')
    },
  })

  // Reset form when dialog opens with new values
  useEffect(() => {
    if (open) {
      form.reset({
        type: defaultValues?.type ?? 'billing',
        isPrimary: defaultValues?.isPrimary ?? false,
        street1: defaultValues?.street1 ?? '',
        street2: defaultValues?.street2 ?? '',
        city: defaultValues?.city ?? '',
        state: defaultValues?.state ?? '',
        postcode: defaultValues?.postcode ?? '',
        country: defaultValues?.country ?? 'AU',
        notes: defaultValues?.notes ?? '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form.reset is stable
  }, [open, defaultValues])

  // Build type options with icons in labels
  const typeOptions = addressTypeValues.map((type) => ({
    value: type,
    label: typeConfig[type].label,
  }))

  const stateOptions = [
    { value: '', label: 'Select state' },
    ...australianStates,
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Address' : 'Edit Address'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? 'Add a new address for this customer.' : 'Update address information.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="space-y-4"
        >
          <FormFieldDisplayProvider form={form}>
          <form.Field name="type">
            {(field) => (
              <SelectField
                field={field}
                label="Address Type"
                options={typeOptions}
                required
              />
            )}
          </form.Field>

          <form.Field name="street1">
            {(field) => (
              <TextField
                field={field}
                label="Street Address"
                placeholder="123 Main Street"
                required
              />
            )}
          </form.Field>

          <form.Field name="street2">
            {(field) => (
              <TextField
                field={field}
                label="Address Line 2"
                placeholder="Suite 100, Building A"
              />
            )}
          </form.Field>

          <div className="grid gap-4 grid-cols-2">
            <form.Field name="city">
              {(field) => (
                <TextField
                  field={field}
                  label="City"
                  placeholder="Sydney"
                  required
                />
              )}
            </form.Field>
            <form.Field name="state">
              {(field) => (
                <SelectField
                  field={field}
                  label="State"
                  placeholder="Select state"
                  options={stateOptions}
                />
              )}
            </form.Field>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <form.Field name="postcode">
              {(field) => (
                <TextField
                  field={field}
                  label="Postcode"
                  placeholder="2000"
                  required
                />
              )}
            </form.Field>
            <form.Field name="country">
              {(field) => (
                <TextField
                  field={field}
                  label="Country"
                  placeholder="AU"
                />
              )}
            </form.Field>
          </div>

          <form.Field name="notes">
            {(field) => (
              <TextField
                field={field}
                label="Notes"
                placeholder="Delivery instructions, access codes, etc."
              />
            )}
          </form.Field>

          <form.Field name="isPrimary">
            {(field) => (
              <CheckboxField
                field={field}
                label="Set as primary address"
              />
            )}
          </form.Field>

          </FormFieldDisplayProvider>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'add' ? 'Add Address' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AddressManager({ addresses, onChange, disabled = false }: AddressManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<ManagedAddress | null>(null)

  const handleAdd = (data: AddressFormValues) => {
    const newAddress: ManagedAddress = {
      ...data,
      id: generateTempId(),
      isNew: true,
      // If this is the first address, make it primary
      isPrimary: addresses.length === 0 ? true : data.isPrimary,
    }

    // If new address is primary, unset other primaries
    const updatedAddresses = data.isPrimary
      ? addresses.map((a) => ({ ...a, isPrimary: false }))
      : addresses

    onChange([...updatedAddresses, newAddress])
  }

  const handleEdit = (data: AddressFormValues) => {
    if (!editingAddress) return

    const updatedAddresses = addresses.map((a) => {
      if (a.id === editingAddress.id) {
        return { ...a, ...data }
      }
      // If edited address is now primary, unset other primaries
      if (data.isPrimary && a.id !== editingAddress.id) {
        return { ...a, isPrimary: false }
      }
      return a
    })

    onChange(updatedAddresses)
    setEditingAddress(null)
  }

  const handleDelete = (addressId: string) => {
    const deletedAddress = addresses.find((a) => a.id === addressId)
    const remaining = addresses.filter((a) => a.id !== addressId)

    // If deleted address was primary and there are remaining addresses, make first one primary
    if (deletedAddress?.isPrimary && remaining.length > 0) {
      remaining[0].isPrimary = true
    }

    onChange(remaining)
  }

  const handleSetPrimary = (addressId: string) => {
    const updatedAddresses = addresses.map((a) => ({
      ...a,
      isPrimary: a.id === addressId,
    }))
    onChange(updatedAddresses)
  }

  const openEditDialog = (address: ManagedAddress) => {
    setEditingAddress(address)
    setDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Addresses
          </CardTitle>
          <CardDescription>
            {addresses.length} address{addresses.length !== 1 ? 'es' : ''}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingAddress(null)
            setDialogOpen(true)
          }}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Address
        </Button>
      </CardHeader>
      <CardContent>
        {addresses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No addresses added yet</p>
            <p className="text-sm">Click &quot;Add Address&quot; to add the first address</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={() => openEditDialog(address)}
                onDelete={() => handleDelete(address.id)}
                onSetPrimary={() => handleSetPrimary(address.id)}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </CardContent>

      <AddressFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingAddress(null)
        }}
        onSubmit={editingAddress ? handleEdit : handleAdd}
        defaultValues={editingAddress ?? undefined}
        mode={editingAddress ? 'edit' : 'add'}
      />
    </Card>
  )
}
