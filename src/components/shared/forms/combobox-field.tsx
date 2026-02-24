/**
 * ComboboxField Component
 *
 * Searchable select field with support for async data loading and creating new options.
 * Best for selecting from large lists or when data needs to be fetched.
 *
 * @example
 * ```tsx
 * // Static options
 * <form.Field name="customerId">
 *   {(field) => (
 *     <ComboboxField
 *       field={field}
 *       label="Customer"
 *       options={customers.map(c => ({ value: c.id, label: c.name }))}
 *       placeholder="Search customers..."
 *       required
 *     />
 *   )}
 * </form.Field>
 *
 * // Async options
 * <form.Field name="customerId">
 *   {(field) => (
 *     <ComboboxField
 *       field={field}
 *       label="Customer"
 *       loadOptions={async (search) => {
 *         const customers = await searchCustomers(search)
 *         return customers.map(c => ({ value: c.id, label: c.name }))
 *       }}
 *       placeholder="Search customers..."
 *       required
 *     />
 *   )}
 * </form.Field>
 *
 * // Creatable - allow creating new options
 * <form.Field name="category">
 *   {(field) => (
 *     <ComboboxField
 *       field={field}
 *       label="Category"
 *       options={categories}
 *       creatable
 *       onCreate={async (inputValue) => {
 *         const newCategory = await createCategory({ name: inputValue })
 *         return { value: newCategory.id, label: newCategory.name }
 *       }}
 *       formatCreateLabel={(value) => `Add category "${value}"`}
 *       placeholder="Select or create category..."
 *     />
 *   )}
 * </form.Field>
 * ```
 */
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"
import { useDebounce } from "~/hooks/_shared/use-debounce"
import { Button } from "~/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { FormField } from "./form-field"
import { useFormFieldDisplay } from "./form-field-display-context"
import { logger } from "~/lib/logger"
import { cn } from "~/lib/utils"
import { extractFieldError, type AnyFieldApi } from "./types"

// ============================================================================
// TYPES
// ============================================================================

export interface ComboboxOption {
  /** Option value (stored in form) */
  value: string
  /** Display label */
  label: string
  /** Optional description (also used for search filtering) */
  description?: string
  /** Keywords for search filtering. Defaults to `${label} ${description}` */
  keywords?: string
  /** Disabled state */
  disabled?: boolean
}

export interface ComboboxFieldProps {
  /** TanStack Form field instance */
  field: AnyFieldApi<string>
  /** Field label */
  label: string
  /** Static options (mutually exclusive with loadOptions) */
  options?: ComboboxOption[]
  /** Async function to load options (mutually exclusive with options) */
  loadOptions?: (search: string) => Promise<ComboboxOption[]>
  /** Placeholder text when no selection */
  placeholder?: string
  /** Search input placeholder */
  searchPlaceholder?: string
  /** Text shown when no options match search */
  emptyText?: string
  /** Whether the field is required */
  required?: boolean
  /** Helper text */
  description?: string
  /** Additional class names for the wrapper */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Debounce delay for async search (ms) */
  debounceMs?: number
  /** Allow clearing the selection */
  allowClear?: boolean
  /** Allow creating new options by typing */
  creatable?: boolean
  /** Callback when a new option is created. Return the new option to add it. */
  onCreate?: (inputValue: string) => ComboboxOption | Promise<ComboboxOption>
  /** Custom label for the create option (default: "Create {inputValue}") */
  formatCreateLabel?: (inputValue: string) => string
  /** Callback when search input changes (e.g. for parent to load/filter options) */
  onSearchChange?: (search: string) => void
  /** External loading state (e.g. when parent is fetching options) */
  isLoading?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ComboboxField({
  field,
  label,
  options: staticOptions,
  loadOptions,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found",
  required,
  description,
  className,
  disabled,
  debounceMs = 300,
  allowClear = true,
  creatable = false,
  onCreate,
  formatCreateLabel = (value) => `Create "${value}"`,
  onSearchChange,
  isLoading: externalLoading = false,
}: ComboboxFieldProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [asyncOptions, setAsyncOptions] = useState<ComboboxOption[]>([])
  const [createdOptions, setCreatedOptions] = useState<ComboboxOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const debouncedSearch = useDebounce(search, debounceMs)
  const { showErrorsAfterSubmit } = useFormFieldDisplay()
  const error = extractFieldError(field, { showErrorsAfterSubmit })

  // Use refs to store callbacks to avoid dependency issues (sync in effect to satisfy ref-during-render rule)
  const loadOptionsRef = useRef(loadOptions)
  const onCreateRef = useRef(onCreate)
  useEffect(() => {
    loadOptionsRef.current = loadOptions
    onCreateRef.current = onCreate
  }, [loadOptions, onCreate])

  // Merge static/async options with created options
  const baseOptions = staticOptions ?? asyncOptions
  const options = [...createdOptions, ...baseOptions]

  // Load async options when search changes
  useEffect(() => {
    const loadOptionsFn = loadOptionsRef.current
    if (!loadOptionsFn) return

    let cancelled = false

    const fetchOptions = async () => {
      setIsLoading(true)
      try {
        const results = await loadOptionsFn(debouncedSearch)
        if (!cancelled) {
          setAsyncOptions(results)
        }
      } catch (err) {
        logger.error("Failed to load options", err as Error, { context: "combobox-field" })
        if (!cancelled) {
          setAsyncOptions([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchOptions()

    return () => {
      cancelled = true
    }
  }, [debouncedSearch])

  // Find the currently selected option
  const selectedOption = options.find((opt) => opt.value === field.state.value)

  // Check if search matches any existing option (case-insensitive)
  const searchMatchesOption = options.some(
    (opt) => opt.label.toLowerCase() === search.toLowerCase()
  )

  // Show create option if creatable, has search text, and no exact match
  const showCreateOption = creatable && search.trim() && !searchMatchesOption && !isLoading

  const handleSelect = useCallback(
    (value: string) => {
      // If selecting the same value and allowClear is true, clear it
      if (value === field.state.value && allowClear) {
        field.handleChange("")
      } else {
        field.handleChange(value)
      }
      setSearch("")
      setOpen(false)
      field.handleBlur()
    },
    [field, allowClear]
  )

  const handleCreate = useCallback(async () => {
    const onCreateFn = onCreateRef.current
    if (!onCreateFn || !search.trim()) return

    setIsCreating(true)
    try {
      const newOption = await onCreateFn(search.trim())
      setCreatedOptions((prev) => [...prev, newOption])
      field.handleChange(newOption.value)
      setSearch("")
      setOpen(false)
      field.handleBlur()
    } catch (err) {
      logger.error("Failed to create option", err as Error, { context: "combobox-field" })
    } finally {
      setIsCreating(false)
    }
  }, [search, field])

  return (
    <FormField
      label={label}
      name={field.name}
      error={error}
      description={description}
      required={required}
      className={className}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={!!error}
            className={cn(
              "w-full justify-between font-normal",
              !selectedOption && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <span className="truncate">
              {selectedOption?.label ?? placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={!loadOptions}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={(v) => {
                setSearch(v)
                onSearchChange?.(v)
              }}
            />
            <CommandList>
              {(isLoading || externalLoading) ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Loading...
                  </span>
                </div>
              ) : (
                <>
                  {!showCreateOption && options.length === 0 && (
                    <CommandEmpty>{emptyText}</CommandEmpty>
                  )}
                  {showCreateOption && (
                    <CommandGroup heading="Create new">
                      <CommandItem
                        value={`__create__${search}`}
                        onSelect={handleCreate}
                        disabled={isCreating}
                        className="cursor-pointer"
                      >
                        {isCreating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        <span>{formatCreateLabel(search)}</span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                  {options.length > 0 && (
                    <CommandGroup>
                      {options.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.keywords ?? `${option.label} ${option.description ?? ""}`.trim()}
                          onSelect={() => handleSelect(option.value)}
                          disabled={option.disabled}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.state.value === option.value
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            {option.description && (
                              <span className="text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FormField>
  )
}

// ============================================================================
// MULTI-SELECT VARIANT
// ============================================================================

export interface GroupedComboboxOption extends ComboboxOption {
  /** Group this option belongs to */
  group?: string
  /** Whether this option is fixed and cannot be removed */
  fixed?: boolean
}

export interface MultiComboboxFieldProps {
  /** TanStack Form field instance for string array */
  field: import("./types").StringArrayFieldApi
  /** Field label */
  label: string
  /** Options (can include group property for grouping) */
  options: GroupedComboboxOption[]
  /** Placeholder text when no selection */
  placeholder?: string
  /** Search input placeholder */
  searchPlaceholder?: string
  /** Text shown when no options match search */
  emptyText?: string
  /** Whether the field is required */
  required?: boolean
  /** Helper text */
  description?: string
  /** Additional class names for the wrapper */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Maximum number of selections */
  maxSelections?: number
  /** Callback when max selections is reached */
  onMaxSelected?: (count: number) => void
  /** Show selected items as badges/tags below the input */
  showSelectedTags?: boolean
  /** Allow removing fixed options */
  allowRemoveFixed?: boolean
}

/**
 * Multi-select combobox for selecting multiple options with grouping support.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <MultiComboboxField
 *   field={field}
 *   label="Tags"
 *   options={tags}
 *   maxSelections={5}
 * />
 *
 * // With grouping
 * <MultiComboboxField
 *   field={field}
 *   label="Assign Team"
 *   options={[
 *     { value: 'john', label: 'John', group: 'Sales' },
 *     { value: 'jane', label: 'Jane', group: 'Sales' },
 *     { value: 'bob', label: 'Bob', group: 'Support' },
 *   ]}
 *   showSelectedTags
 * />
 *
 * // With fixed options (can't be removed)
 * <MultiComboboxField
 *   field={field}
 *   label="Recipients"
 *   options={[
 *     { value: 'admin', label: 'Admin', fixed: true },
 *     { value: 'user1', label: 'User 1' },
 *   ]}
 * />
 * ```
 */
export function MultiComboboxField({
  field,
  label,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found",
  required,
  description,
  className,
  disabled,
  maxSelections,
  onMaxSelected,
  showSelectedTags = false,
  allowRemoveFixed = false,
}: MultiComboboxFieldProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selectedValues = useMemo(() => field.state.value ?? [], [field.state.value])
  const selectedOptions = options.filter((opt) =>
    selectedValues.includes(opt.value)
  )

  const { showErrorsAfterSubmit } = useFormFieldDisplay()
  const error = extractFieldError(field, { showErrorsAfterSubmit })

  // Group options by group property
  const groupedOptions = options.reduce<Record<string, GroupedComboboxOption[]>>(
    (acc, option) => {
      const group = option.group ?? ""
      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push(option)
      return acc
    },
    {}
  )

  const groups = Object.keys(groupedOptions).sort((a, b) => {
    // Empty group (ungrouped) comes last
    if (a === "") return 1
    if (b === "") return -1
    return a.localeCompare(b)
  })

  const handleSelect = useCallback(
    (value: string) => {
      const option = options.find((opt) => opt.value === value)
      const isSelected = selectedValues.includes(value)
      const isFixed = option?.fixed && !allowRemoveFixed

      if (isSelected) {
        // Don't allow removing fixed options
        if (isFixed) return
        // Remove
        field.handleChange(selectedValues.filter((v) => v !== value))
      } else {
        // Add (if under max)
        if (!maxSelections || selectedValues.length < maxSelections) {
          field.handleChange([...selectedValues, value])
        } else {
          // Reached max, trigger callback
          onMaxSelected?.(selectedValues.length)
        }
      }
    },
    [field, selectedValues, maxSelections, options, allowRemoveFixed, onMaxSelected]
  )

  const handleRemoveTag = useCallback(
    (value: string) => {
      const option = options.find((opt) => opt.value === value)
      if (option?.fixed && !allowRemoveFixed) return
      field.handleChange(selectedValues.filter((v) => v !== value))
    },
    [field, selectedValues, options, allowRemoveFixed]
  )

  const displayText =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length === 1
        ? selectedOptions[0].label
        : `${selectedOptions.length} selected`

  const renderOptionItem = (option: GroupedComboboxOption) => {
    const isSelected = selectedValues.includes(option.value)
    const isFixed = option.fixed
    const atMax = Boolean(
      maxSelections &&
      selectedValues.length >= maxSelections &&
      !isSelected
    )

    return (
      <CommandItem
        key={option.value}
        value={option.value}
        onSelect={() => handleSelect(option.value)}
        disabled={option.disabled || atMax}
        className="cursor-pointer"
      >
        <Check
          className={cn(
            "mr-2 h-4 w-4",
            isSelected ? "opacity-100" : "opacity-0"
          )}
        />
        <div className="flex flex-col flex-1">
          <span className="flex items-center gap-2">
            {option.label}
            {isFixed && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                Fixed
              </span>
            )}
          </span>
          {option.description && (
            <span className="text-xs text-muted-foreground">
              {option.description}
            </span>
          )}
        </div>
      </CommandItem>
    )
  }

  return (
    <FormField
      label={label}
      name={field.name}
      error={error}
      description={description}
      required={required}
      className={className}
    >
      <div className="flex flex-col gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-invalid={!!error}
              className={cn(
                "w-full justify-between font-normal",
                selectedOptions.length === 0 && "text-muted-foreground"
              )}
              disabled={disabled}
            >
              <span className="truncate">{displayText}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput
                placeholder={searchPlaceholder}
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>{emptyText}</CommandEmpty>
                {groups.length === 1 && groups[0] === "" ? (
                  // No grouping - render flat list
                  <CommandGroup>
                    {options.map(renderOptionItem)}
                  </CommandGroup>
                ) : (
                  // Render grouped options
                  groups.map((group) => (
                    <CommandGroup
                      key={group || "__ungrouped__"}
                      heading={group || undefined}
                    >
                      {groupedOptions[group].map(renderOptionItem)}
                    </CommandGroup>
                  ))
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Selected tags display */}
        {showSelectedTags && selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedOptions.map((option) => {
              const isFixed = option.fixed && !allowRemoveFixed

              return (
                <span
                  key={option.value}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm",
                    isFixed
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {option.label}
                  {!isFixed && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(option.value)}
                      className="hover:bg-primary/20 rounded-sm p-0.5 transition-colors"
                      aria-label={`Remove ${option.label}`}
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </FormField>
  )
}
