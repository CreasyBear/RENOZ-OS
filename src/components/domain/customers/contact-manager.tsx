/**
 * ContactManager Component
 *
 * Manages customer contacts with inline editing capability.
 * Supports adding, editing, and removing contacts with:
 * - Contact details (name, email, phone, mobile)
 * - Role flags (primary, decision maker, influencer)
 * - Department and title
 *
 * @source contacts from props (parent provides)
 * @source form state from useTanStackForm hook
 * @source mutations from useCreateContact, useUpdateContact, useDeleteContact hooks
 */
import { useState, useEffect } from 'react'
import { z } from 'zod'
import {
  Mail,
  Phone,
  Smartphone,
  User,
  Pencil,
  Trash2,
  Plus,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  EmailField,
  PhoneField,
  CheckboxField,
  FormFieldDisplayProvider,
} from '@/components/shared/forms'
import { getInitials } from '@/lib/customer-utils'
import { phoneSchema } from '@/lib/schemas/_shared/patterns'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

const contactFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  title: z.string().max(100).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: phoneSchema,
  mobile: phoneSchema,
  department: z.string().max(100).optional(),
  isPrimary: z.boolean(),
  decisionMaker: z.boolean(),
  influencer: z.boolean(),
  notes: z.string().max(2000).optional(),
})

type ContactFormValues = z.infer<typeof contactFormSchema>

export interface ManagedContact extends ContactFormValues {
  id: string
  isNew?: boolean
}

interface ContactManagerProps {
  contacts: ManagedContact[]
  onChange: (contacts: ManagedContact[]) => void
  disabled?: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ============================================================================
// CONTACT CARD
// ============================================================================

interface ContactCardProps {
  contact: ManagedContact
  onEdit: () => void
  onDelete: () => void
  onSetPrimary: () => void
  disabled?: boolean
}

function ContactCard({ contact, onEdit, onDelete, onSetPrimary, disabled }: ContactCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  return (
    <>
      <div className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="text-sm">
            {getInitials(contact.firstName, contact.lastName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">
              {contact.firstName} {contact.lastName}
            </span>
            {contact.isPrimary && (
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Primary
              </Badge>
            )}
            {contact.decisionMaker && (
              <Badge variant="outline" className="text-xs">
                Decision Maker
              </Badge>
            )}
            {contact.influencer && (
              <Badge variant="outline" className="text-xs">
                Influencer
              </Badge>
            )}
            {contact.isNew && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                New
              </Badge>
            )}
          </div>

          {contact.title && (
            <p className="text-sm text-muted-foreground">{contact.title}</p>
          )}
          {contact.department && (
            <p className="text-xs text-muted-foreground">{contact.department}</p>
          )}

          <div className="flex flex-wrap gap-3 mt-2 text-sm">
            {contact.email && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Mail className="h-3 w-3" />
                {contact.email}
              </span>
            )}
            {contact.phone && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3 w-3" />
                {contact.phone}
              </span>
            )}
            {contact.mobile && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Smartphone className="h-3 w-3" />
                {contact.mobile}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!contact.isPrimary && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onSetPrimary}
              disabled={disabled}
              title="Set as primary contact"
              aria-label="Set as primary contact"
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
            aria-label="Edit contact"
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
            aria-label="Delete contact"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {contact.firstName} {contact.lastName}?
              {contact.isPrimary && ' This is currently the primary contact.'}
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
// CONTACT FORM DIALOG
// ============================================================================

interface ContactFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ContactFormValues) => void
  defaultValues?: Partial<ContactFormValues>
  mode: 'add' | 'edit'
}

function ContactFormDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  mode,
}: ContactFormDialogProps) {
  const form = useTanStackForm({
    schema: contactFormSchema,
    defaultValues: {
      firstName: defaultValues?.firstName ?? '',
      lastName: defaultValues?.lastName ?? '',
      title: defaultValues?.title ?? '',
      email: defaultValues?.email ?? '',
      phone: defaultValues?.phone ?? '',
      mobile: defaultValues?.mobile ?? '',
      department: defaultValues?.department ?? '',
      isPrimary: defaultValues?.isPrimary ?? false,
      decisionMaker: defaultValues?.decisionMaker ?? false,
      influencer: defaultValues?.influencer ?? false,
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
        firstName: defaultValues?.firstName ?? '',
        lastName: defaultValues?.lastName ?? '',
        title: defaultValues?.title ?? '',
        email: defaultValues?.email ?? '',
        phone: defaultValues?.phone ?? '',
        mobile: defaultValues?.mobile ?? '',
        department: defaultValues?.department ?? '',
        isPrimary: defaultValues?.isPrimary ?? false,
        decisionMaker: defaultValues?.decisionMaker ?? false,
        influencer: defaultValues?.influencer ?? false,
        notes: defaultValues?.notes ?? '',
      })
    }
  }, [open, defaultValues, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Contact' : 'Edit Contact'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? 'Add a new contact for this customer.' : 'Update contact information.'}
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
          <div className="grid gap-4 grid-cols-2">
            <form.Field name="firstName">
              {(field) => (
                <TextField
                  field={field}
                  label="First Name"
                  placeholder="John"
                  required
                />
              )}
            </form.Field>
            <form.Field name="lastName">
              {(field) => (
                <TextField
                  field={field}
                  label="Last Name"
                  placeholder="Smith"
                  required
                />
              )}
            </form.Field>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <form.Field name="title">
              {(field) => (
                <TextField
                  field={field}
                  label="Job Title"
                  placeholder="e.g., CEO, Manager"
                />
              )}
            </form.Field>
            <form.Field name="department">
              {(field) => (
                <TextField
                  field={field}
                  label="Department"
                  placeholder="e.g., Sales, IT"
                />
              )}
            </form.Field>
          </div>

          <form.Field name="email">
            {(field) => (
              <EmailField
                field={field}
                label="Email"
                placeholder="john@company.com"
              />
            )}
          </form.Field>

          <div className="grid gap-4 grid-cols-2">
            <form.Field name="phone">
              {(field) => (
                <PhoneField
                  field={field}
                  label="Phone"
                  placeholder="+61 2 1234 5678"
                />
              )}
            </form.Field>
            <form.Field name="mobile">
              {(field) => (
                <PhoneField
                  field={field}
                  label="Mobile"
                  placeholder="+61 4XX XXX XXX"
                />
              )}
            </form.Field>
          </div>

          <div className="space-y-3 pt-2">
            <form.Field name="isPrimary">
              {(field) => (
                <CheckboxField
                  field={field}
                  label="Primary contact for this customer"
                />
              )}
            </form.Field>
            <form.Field name="decisionMaker">
              {(field) => (
                <CheckboxField
                  field={field}
                  label="Decision maker"
                />
              )}
            </form.Field>
            <form.Field name="influencer">
              {(field) => (
                <CheckboxField
                  field={field}
                  label="Influencer in purchase decisions"
                />
              )}
            </form.Field>
          </div>

          </FormFieldDisplayProvider>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'add' ? 'Add Contact' : 'Save Changes'}
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

export function ContactManager({ contacts, onChange, disabled = false }: ContactManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ManagedContact | null>(null)

  const handleAdd = (data: ContactFormValues) => {
    const newContact: ManagedContact = {
      ...data,
      id: generateTempId(),
      isNew: true,
      // If this is the first contact, make it primary
      isPrimary: contacts.length === 0 ? true : data.isPrimary,
    }

    // If new contact is primary, unset other primaries
    const updatedContacts = data.isPrimary
      ? contacts.map((c) => ({ ...c, isPrimary: false }))
      : contacts

    onChange([...updatedContacts, newContact])
  }

  const handleEdit = (data: ContactFormValues) => {
    if (!editingContact) return

    const updatedContacts = contacts.map((c) => {
      if (c.id === editingContact.id) {
        return { ...c, ...data }
      }
      // If edited contact is now primary, unset other primaries
      if (data.isPrimary && c.id !== editingContact.id) {
        return { ...c, isPrimary: false }
      }
      return c
    })

    onChange(updatedContacts)
    setEditingContact(null)
  }

  const handleDelete = (contactId: string) => {
    const deletedContact = contacts.find((c) => c.id === contactId)
    const remaining = contacts.filter((c) => c.id !== contactId)

    // If deleted contact was primary and there are remaining contacts, make first one primary
    if (deletedContact?.isPrimary && remaining.length > 0) {
      remaining[0].isPrimary = true
    }

    onChange(remaining)
  }

  const handleSetPrimary = (contactId: string) => {
    const updatedContacts = contacts.map((c) => ({
      ...c,
      isPrimary: c.id === contactId,
    }))
    onChange(updatedContacts)
  }

  const openEditDialog = (contact: ManagedContact) => {
    setEditingContact(contact)
    setDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Contacts
          </CardTitle>
          <CardDescription>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingContact(null)
            setDialogOpen(true)
          }}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Contact
        </Button>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No contacts added yet</p>
            <p className="text-sm">Click &quot;Add Contact&quot; to add the first contact</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={() => openEditDialog(contact)}
                onDelete={() => handleDelete(contact.id)}
                onSetPrimary={() => handleSetPrimary(contact.id)}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </CardContent>

      <ContactFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingContact(null)
        }}
        onSubmit={editingContact ? handleEdit : handleAdd}
        defaultValues={editingContact ?? undefined}
        mode={editingContact ? 'edit' : 'add'}
      />
    </Card>
  )
}
