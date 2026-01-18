/**
 * EntityCombobox Component
 *
 * Searchable entity selector with async search and debounce.
 * Generic base that can be wrapped for specific entity types.
 *
 * @example
 * ```tsx
 * // Generic usage
 * <EntityCombobox
 *   value={selectedCustomer}
 *   onSelect={setSelectedCustomer}
 *   searchFn={searchCustomers}
 *   getDisplayValue={(c) => c.name}
 *   placeholder="Select customer..."
 * />
 *
 * // Create a typed wrapper
 * function CustomerCombobox(props: Omit<EntityComboboxProps<Customer>, 'searchFn' | 'getDisplayValue'>) {
 *   return (
 *     <EntityCombobox
 *       {...props}
 *       searchFn={searchCustomers}
 *       getDisplayValue={(c) => c.name}
 *     />
 *   )
 * }
 * ```
 */
import { useState, useCallback, useEffect, useRef } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
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
import { cn } from "~/lib/utils"

export interface EntityComboboxProps<T> {
  /** Currently selected entity */
  value?: T | null
  /** Selection callback */
  onSelect: (entity: T | null) => void
  /** Async search function */
  searchFn: (query: string) => Promise<T[]>
  /** Function to get display value from entity */
  getDisplayValue: (entity: T) => string
  /** Function to get unique key from entity */
  getKey?: (entity: T) => string | number
  /** Placeholder text */
  placeholder?: string
  /** Empty state message */
  emptyMessage?: string
  /** Debounce delay in ms */
  debounceMs?: number
  /** Whether the field is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

export function EntityCombobox<T>({
  value,
  onSelect,
  searchFn,
  getDisplayValue,
  getKey = (entity) => getDisplayValue(entity),
  placeholder = "Select...",
  emptyMessage = "No results found.",
  debounceMs = 300,
  disabled = false,
  className,
}: EntityComboboxProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null!)
  const abortControllerRef = useRef<AbortController | null>(null!)

  // Debounced search
  const debouncedSearch = useCallback(
    async (searchQuery: string) => {
      // Cancel previous request
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      if (!searchQuery.trim()) {
        setOptions([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const results = await searchFn(searchQuery)
        setOptions(results)
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Search error:", error)
          setOptions([])
        }
      } finally {
        setIsLoading(false)
      }
    },
    [searchFn]
  )

  // Handle query change with debounce
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      debouncedSearch(query)
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [query, debounceMs, debouncedSearch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleSelect = (entity: T) => {
    onSelect(entity)
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value ? getDisplayValue(value) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search...`}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : options.length === 0 ? (
              <CommandEmpty>
                {query.trim() ? emptyMessage : "Type to search..."}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((option) => {
                  const key = getKey(option)
                  const displayValue = getDisplayValue(option)
                  const isSelected = value && getKey(value) === key

                  return (
                    <CommandItem
                      key={String(key)}
                      value={String(key)}
                      onSelect={() => handleSelect(option)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {displayValue}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
