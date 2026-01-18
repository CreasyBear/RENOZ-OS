# Form Components

Reusable form field components integrated with TanStack Form and Zod validation.

## Components

| Component | Description |
|-----------|-------------|
| `FormField` | Base wrapper providing label, error, and description |
| `TextField` | Text input with TanStack Form integration |
| `EmailField` | Email input with validation display |
| `CurrencyField` | Currency input with formatting |
| `SelectField` | Dropdown select with options |
| `TextareaField` | Multiline text input |
| `FormSection` | Groups related fields with title |

## Usage Pattern

All field components follow the same pattern with TanStack Form:

```tsx
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { z } from 'zod'
import { TextField, EmailField, FormSection } from '~/components/shared/forms'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  price: z.string().refine(v => !isNaN(parseFloat(v)), 'Must be a number'),
})

function ContactForm() {
  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      price: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: schema,
    },
    onSubmit: async ({ value }) => {
      // Handle submit
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <FormSection title="Contact Information">
        <form.Field name="name">
          {(field) => (
            <TextField
              field={field}
              label="Name"
              placeholder="Enter name"
              required
            />
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <EmailField
              field={field}
              label="Email"
              required
            />
          )}
        </form.Field>
      </FormSection>

      <Button type="submit" disabled={form.state.isSubmitting}>
        Submit
      </Button>
    </form>
  )
}
```

## Field Props

All fields share common props:

| Prop | Type | Description |
|------|------|-------------|
| `field` | `FieldApi` | TanStack Form field instance |
| `label` | `string` | Field label text |
| `required` | `boolean` | Shows required indicator |
| `description` | `string` | Helper text below field |
| `className` | `string` | Additional CSS classes |
| `disabled` | `boolean` | Disabled state |

## Error Handling

Errors are automatically displayed when:
1. The field has been touched (`field.state.meta.isTouched`)
2. There are validation errors (`field.state.meta.errors`)

Zod validation errors are extracted and displayed below the field.

## FormSection Layouts

```tsx
// Vertical (default) - fields stack
<FormSection layout="vertical">
  {/* fields */}
</FormSection>

// Grid - responsive grid
<FormSection layout="grid" columns={2}>
  {/* 2 columns on md+ screens */}
</FormSection>

// Horizontal - inline fields
<FormSection layout="horizontal">
  {/* fields wrap inline */}
</FormSection>
```

## Accessibility

- Labels are properly associated with inputs via `htmlFor`
- Error messages use `role="alert"` for screen readers
- `aria-invalid` is set on inputs with errors
- `aria-describedby` links inputs to descriptions/errors
- Required fields have visible indicator
