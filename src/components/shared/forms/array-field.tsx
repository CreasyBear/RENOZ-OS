/**
 * ArrayField Component
 *
 * Dynamic list field for repeatable form sections.
 * Supports adding, removing, and reordering items.
 *
 * @example
 * ```tsx
 * // Define the item type
 * interface LineItem {
 *   productId: string
 *   quantity: number
 *   price: number
 * }
 *
 * // Use in form
 * <form.Field name="lineItems" mode="array">
 *   {(field) => (
 *     <ArrayField
 *       field={field}
 *       label="Line Items"
 *       addLabel="Add Item"
 *       minItems={1}
 *       maxItems={20}
 *       defaultItem={{ productId: '', quantity: 1, price: 0 }}
 *       renderItem={(item, index, { remove, moveUp, moveDown }) => (
 *         <div className="flex gap-2">
 *           <form.Field name={`lineItems[${index}].productId`}>
 *             {(f) => <TextField field={f} label="Product" />}
 *           </form.Field>
 *           <form.Field name={`lineItems[${index}].quantity`}>
 *             {(f) => <NumberField field={f} label="Qty" />}
 *           </form.Field>
 *           <Button variant="ghost" onClick={remove}>
 *             <Trash className="h-4 w-4" />
 *           </Button>
 *         </div>
 *       )}
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import * as React from "react"
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, AlertCircle } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Label } from "~/components/ui/label"
import { cn } from "~/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export interface ArrayFieldApi<TItem> {
  name: string
  state: {
    value: TItem[]
    meta: {
      isTouched: boolean
      errors: (import("./types").ValidationError | string)[]
    }
  }
  handleChange: (value: TItem[]) => void
  handleBlur: () => void
  pushValue: (item: TItem) => void
  removeValue: (index: number) => void
  moveValue: (fromIndex: number, toIndex: number) => void
}

export interface ItemActions {
  /** Remove this item */
  remove: () => void
  /** Move item up in list */
  moveUp: () => void
  /** Move item down in list */
  moveDown: () => void
  /** Whether item can move up */
  canMoveUp: boolean
  /** Whether item can move down */
  canMoveDown: boolean
  /** Whether item can be removed */
  canRemove: boolean
}

export interface ArrayFieldProps<TItem> {
  /** TanStack Form field instance with array mode */
  field: ArrayFieldApi<TItem>
  /** Section label */
  label?: string
  /** Description text */
  description?: string
  /** Render function for each item */
  renderItem: (item: TItem, index: number, actions: ItemActions) => React.ReactNode
  /** Label for add button */
  addLabel?: string
  /** Default item when adding new */
  defaultItem: TItem
  /** Minimum number of items */
  minItems?: number
  /** Maximum number of items */
  maxItems?: number
  /** Additional class names */
  className?: string
  /** Show reorder controls */
  reorderable?: boolean
  /** Add button position */
  addPosition?: "top" | "bottom" | "both"
  /** Item wrapper class */
  itemClassName?: string
  /** Empty state message */
  emptyMessage?: string
  /** Disabled state */
  disabled?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ArrayField<TItem>({
  field,
  label,
  description,
  renderItem,
  addLabel = "Add Item",
  defaultItem,
  minItems = 0,
  maxItems,
  className,
  reorderable = false,
  addPosition = "bottom",
  itemClassName,
  emptyMessage = "No items added yet",
  disabled = false,
}: ArrayFieldProps<TItem>) {
  const items = field.state.value ?? []
  const canAdd = !maxItems || items.length < maxItems
  const canRemove = items.length > minItems

  // Extract error
  const rawError = field.state.meta.isTouched && field.state.meta.errors.length > 0
    ? field.state.meta.errors[0]
    : undefined
  const error = typeof rawError === 'string' ? rawError : rawError?.message

  const handleAdd = () => {
    if (canAdd && !disabled) {
      field.pushValue(defaultItem)
    }
  }

  const handleRemove = (index: number) => {
    if (canRemove && !disabled) {
      field.removeValue(index)
    }
  }

  const handleMoveUp = (index: number) => {
    if (index > 0 && !disabled) {
      field.moveValue(index, index - 1)
    }
  }

  const handleMoveDown = (index: number) => {
    if (index < items.length - 1 && !disabled) {
      field.moveValue(index, index + 1)
    }
  }

  const AddButton = () => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleAdd}
      disabled={!canAdd || disabled}
      className="gap-1"
    >
      <Plus className="h-4 w-4" />
      {addLabel}
    </Button>
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      {(label || description || addPosition === "top") && (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {label && (
              <Label className={cn(error && "text-destructive")}>
                {label}
                {minItems > 0 && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {(addPosition === "top" || addPosition === "both") && <AddButton />}
        </div>
      )}

      {/* Items */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          {addPosition === "bottom" && (
            <div className="mt-4">
              <AddButton />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const actions: ItemActions = {
              remove: () => handleRemove(index),
              moveUp: () => handleMoveUp(index),
              moveDown: () => handleMoveDown(index),
              canMoveUp: index > 0 && !disabled,
              canMoveDown: index < items.length - 1 && !disabled,
              canRemove: canRemove && !disabled,
            }

            return (
              <div
                key={index}
                className={cn(
                  "relative rounded-lg border bg-card p-4",
                  itemClassName
                )}
              >
                {reorderable && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveUp(index)}
                      disabled={!actions.canMoveUp}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveDown(index)}
                      disabled={!actions.canMoveDown}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <div className={cn(reorderable && "pl-8")}>
                  {renderItem(item, index, actions)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom Add Button */}
      {items.length > 0 && (addPosition === "bottom" || addPosition === "both") && (
        <div className="flex justify-start">
          <AddButton />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1" role="alert">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Count info */}
      {maxItems && (
        <p className="text-xs text-muted-foreground">
          {items.length} of {maxItems} items
        </p>
      )}
    </div>
  )
}

// ============================================================================
// SIMPLE VARIANT: String Array
// ============================================================================

export interface StringArrayFieldProps {
  /** TanStack Form field instance for string array */
  field: {
    name: string
    state: {
      value: string[]
      meta: {
        isTouched: boolean
        errors: (import("./types").ValidationError | string)[]
      }
    }
    handleChange: (value: string[]) => void
    handleBlur: () => void
  }
  /** Field label */
  label: string
  /** Placeholder for input */
  placeholder?: string
  /** Description text */
  description?: string
  /** Whether the field is required */
  required?: boolean
  /** Additional class names */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Maximum number of items */
  maxItems?: number
}

/**
 * Simplified array field for lists of strings (tags, emails, etc.)
 */
export function StringArrayField({
  field,
  label,
  placeholder = "Add item...",
  description,
  required,
  className,
  disabled,
  maxItems,
}: StringArrayFieldProps) {
  const [inputValue, setInputValue] = React.useState("")
  const items = field.state.value ?? []

  const rawError = field.state.meta.isTouched && field.state.meta.errors.length > 0
    ? field.state.meta.errors[0]
    : undefined
  const error = typeof rawError === 'string' ? rawError : rawError?.message

  const canAdd = !maxItems || items.length < maxItems

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (trimmed && canAdd && !items.includes(trimmed)) {
      field.handleChange([...items, trimmed])
      setInputValue("")
    }
  }

  const handleRemove = (index: number) => {
    field.handleChange(items.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label className={cn(error && "text-destructive")}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={field.handleBlur}
          placeholder={placeholder}
          disabled={disabled || !canAdd}
          className={cn(
            "flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          disabled={disabled || !canAdd || !inputValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-0.5 text-sm"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1" role="alert">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
