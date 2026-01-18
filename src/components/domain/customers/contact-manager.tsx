/**
 * ContactManager Component
 *
 * Manages customer contacts with inline editing capability.
 * Supports adding, editing, and removing contacts with:
 * - Contact details (name, email, phone, mobile)
 * - Role flags (primary, decision maker, influencer)
 * - Department and title
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

// ============================================================================
// TYPES
// ============================================================================

const contactFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  title: z.string().max(100).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  mobile: z.string().max(30).optional(),
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

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

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
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      title: '',
      email: '',
      phone: '',
      mobile: '',
      department: '',
      isPrimary: false,
      decisionMaker: false,
      influencer: false,
      notes: '',
      ...defaultValues,
    },
  })

  const handleSubmit = (data: ContactFormValues) => {
    onSubmit(data)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Contact' : 'Edit Contact'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? 'Add a new contact for this customer.' : 'Update contact information.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CEO, Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sales, IT" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-10" placeholder="john@company.com" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-10" placeholder="+61 2 1234 5678" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-10" placeholder="+61 4XX XXX XXX" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 pt-2">
              <FormField
                control={form.control}
                name="isPrimary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Primary contact for this customer</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="decisionMaker"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Decision maker</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="influencer"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Influencer in purchase decisions</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {mode === 'add' ? 'Add Contact' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
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
            <p className="text-sm">Click "Add Contact" to add the first contact</p>
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
