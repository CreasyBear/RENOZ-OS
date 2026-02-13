/**
 * MergeWizard Component
 *
 * Side-by-side customer merge interface:
 * - Customer comparison view
 * - Field-by-field selection
 * - Merge preview and confirmation
 * - Conflict resolution
 */
import { useState, useMemo } from 'react'
import {
  ArrowRight,
  Check,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Merge,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface CustomerRecord {
  id: string
  customerCode: string
  name: string
  legalName: string | null
  type: string
  status: string
  industry: string | null
  size: string | null
  website: string | null
  taxId: string | null
  healthScore: number | null
  lifetimeValue: number | null
  totalOrders: number
  createdAt: string
  contacts: Array<{
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    isPrimary: boolean
  }>
  addresses: Array<{
    id: string
    type: string
    street1: string
    city: string
    state: string | null
    postcode: string
    isPrimary: boolean
  }>
}

type MergeField = keyof Omit<CustomerRecord, 'id' | 'contacts' | 'addresses' | 'createdAt'>

interface FieldSelection {
  [key: string]: 'primary' | 'secondary' | 'custom'
}

interface MergeWizardProps {
  primaryCustomer: CustomerRecord
  secondaryCustomer: CustomerRecord
  onMerge: (result: MergeResult) => void
  onCancel: () => void
  className?: string
}

interface MergeResult {
  primaryId: string
  secondaryId: string
  fieldOverrides: Record<string, unknown>
  mergeContacts: boolean
  mergeAddresses: boolean
}

// ============================================================================
// FIELD CONFIG
// ============================================================================

const MERGE_FIELDS: Array<{
  key: MergeField
  label: string
  format?: (value: unknown) => string
}> = [
  { key: 'customerCode', label: 'Customer Code' },
  { key: 'name', label: 'Company Name' },
  { key: 'legalName', label: 'Legal Name' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'industry', label: 'Industry' },
  { key: 'size', label: 'Size' },
  { key: 'website', label: 'Website' },
  { key: 'taxId', label: 'Tax ID' },
  {
    key: 'healthScore',
    label: 'Health Score',
    format: (v) => (v !== null ? `${v}` : 'N/A'),
  },
  {
    key: 'lifetimeValue',
    label: 'Lifetime Value',
    format: (v) =>
      v !== null ? `$${(v as number).toLocaleString()}` : 'N/A',
  },
  {
    key: 'totalOrders',
    label: 'Total Orders',
    format: (v) => `${v}`,
  },
]

// ============================================================================
// FIELD COMPARISON ROW
// ============================================================================

interface FieldRowProps {
  field: (typeof MERGE_FIELDS)[0]
  primaryValue: unknown
  secondaryValue: unknown
  selection: 'primary' | 'secondary' | 'custom'
  onSelect: (value: 'primary' | 'secondary') => void
  hasConflict: boolean
}

function FieldRow({
  field,
  primaryValue,
  secondaryValue,
  selection,
  onSelect,
  hasConflict,
}: FieldRowProps) {
  const formatValue = field.format ?? ((v) => (v ?? 'N/A') as string)

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto_1fr] gap-4 py-3 px-4 rounded-lg',
        hasConflict ? 'bg-yellow-50' : 'bg-muted/30'
      )}
    >
      {/* Primary value */}
      <div
        className={cn(
          'flex items-center gap-2 cursor-pointer p-2 rounded border-2 transition-colors',
          selection === 'primary'
            ? 'border-primary bg-primary/5'
            : 'border-transparent hover:border-muted-foreground/30'
        )}
        onClick={() => onSelect('primary')}
      >
        <RadioGroupItem value="primary" id={`${field.key}-primary`} checked={selection === 'primary'} />
        <span className="text-sm">{formatValue(primaryValue)}</span>
      </div>

      {/* Field label */}
      <div className="flex items-center gap-2 min-w-[140px]">
        <span className="text-sm font-medium text-muted-foreground">
          {field.label}
        </span>
        {hasConflict && (
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        )}
      </div>

      {/* Secondary value */}
      <div
        className={cn(
          'flex items-center gap-2 cursor-pointer p-2 rounded border-2 transition-colors',
          selection === 'secondary'
            ? 'border-primary bg-primary/5'
            : 'border-transparent hover:border-muted-foreground/30'
        )}
        onClick={() => onSelect('secondary')}
      >
        <RadioGroupItem value="secondary" id={`${field.key}-secondary`} checked={selection === 'secondary'} />
        <span className="text-sm">{formatValue(secondaryValue)}</span>
      </div>
    </div>
  )
}

// ============================================================================
// RELATED DATA SECTION
// ============================================================================

interface RelatedDataSectionProps {
  title: string
  primaryCount: number
  secondaryCount: number
  mergeEnabled: boolean
  onToggle: (enabled: boolean) => void
}

function RelatedDataSection({
  title,
  primaryCount,
  secondaryCount,
  mergeEnabled,
  onToggle,
}: RelatedDataSectionProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">
          Primary: {primaryCount} | Secondary: {secondaryCount}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor={`merge-${title.toLowerCase()}`} className="text-sm">
          Merge all to primary
        </Label>
        <input
          type="checkbox"
          id={`merge-${title.toLowerCase()}`}
          checked={mergeEnabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MergeWizard({
  primaryCustomer,
  secondaryCustomer,
  onMerge,
  onCancel,
  className,
}: MergeWizardProps) {
  // Field selections
  const [selections, setSelections] = useState<FieldSelection>(() => {
    const initial: FieldSelection = {}
    MERGE_FIELDS.forEach((field) => {
      initial[field.key] = 'primary'
    })
    return initial
  })

  // Related data merge options
  const [mergeContacts, setMergeContacts] = useState(true)
  const [mergeAddresses, setMergeAddresses] = useState(true)

  // Confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Collapsible sections
  const [relatedDataOpen, setRelatedDataOpen] = useState(true)

  // Calculate conflicts (values that differ between customers)
  const conflicts = useMemo(() => {
    const conflictFields: MergeField[] = []
    MERGE_FIELDS.forEach((field) => {
      const primaryVal = primaryCustomer[field.key]
      const secondaryVal = secondaryCustomer[field.key]
      if (primaryVal !== secondaryVal) {
        conflictFields.push(field.key)
      }
    })
    return conflictFields
  }, [primaryCustomer, secondaryCustomer])

  // Handle field selection
  const handleFieldSelect = (field: MergeField, value: 'primary' | 'secondary') => {
    setSelections((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Build merge result
  const buildMergeResult = (): MergeResult => {
    const fieldOverrides: Record<string, unknown> = {}

    MERGE_FIELDS.forEach((field) => {
      if (selections[field.key] === 'secondary') {
        fieldOverrides[field.key] = secondaryCustomer[field.key]
      }
    })

    return {
      primaryId: primaryCustomer.id,
      secondaryId: secondaryCustomer.id,
      fieldOverrides,
      mergeContacts,
      mergeAddresses,
    }
  }

  // Handle merge confirmation
  const handleConfirmMerge = () => {
    const result = buildMergeResult()
    onMerge(result)
    setShowConfirmDialog(false)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Merge className="h-6 w-6" />
            Merge Customers
          </h2>
          <p className="text-muted-foreground">
            Select which values to keep for each field
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => setShowConfirmDialog(true)}>
            <Check className="h-4 w-4 mr-2" />
            Review & Merge
          </Button>
        </div>
      </div>

      {/* Conflict Alert */}
      {conflicts.length > 0 && (
        <Alert variant="default" className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Conflicts Detected</AlertTitle>
          <AlertDescription>
            {conflicts.length} field{conflicts.length > 1 ? 's have' : ' has'} different values.
            Review the highlighted fields and select which value to keep.
          </AlertDescription>
        </Alert>
      )}

      {/* Customer Headers */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
        <Card className="border-primary border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge>Primary</Badge>
              <Badge variant="outline">Will be kept</Badge>
            </div>
            <CardTitle className="text-lg">{primaryCustomer.name}</CardTitle>
            <CardDescription>{primaryCustomer.customerCode}</CardDescription>
          </CardHeader>
        </Card>

        <div className="flex items-center justify-center">
          <ArrowRight className="h-8 w-8 text-muted-foreground" />
        </div>

        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Secondary</Badge>
              <Badge variant="outline">Will be archived</Badge>
            </div>
            <CardTitle className="text-lg">{secondaryCustomer.name}</CardTitle>
            <CardDescription>{secondaryCustomer.customerCode}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Field Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Field Selection</CardTitle>
          <CardDescription>
            Choose which value to keep for each field
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <RadioGroup>
            {MERGE_FIELDS.map((field) => (
              <FieldRow
                key={field.key}
                field={field}
                primaryValue={primaryCustomer[field.key]}
                secondaryValue={secondaryCustomer[field.key]}
                selection={selections[field.key] as 'primary' | 'secondary'}
                onSelect={(value) => handleFieldSelect(field.key, value)}
                hasConflict={conflicts.includes(field.key)}
              />
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Related Data */}
      <Collapsible open={relatedDataOpen} onOpenChange={setRelatedDataOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Related Data</CardTitle>
                <CardDescription>
                  Contacts and addresses from both customers
                </CardDescription>
              </div>
              {relatedDataOpen ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-2">
              <RelatedDataSection
                title="Contacts"
                primaryCount={primaryCustomer.contacts.length}
                secondaryCount={secondaryCustomer.contacts.length}
                mergeEnabled={mergeContacts}
                onToggle={setMergeContacts}
              />
              <RelatedDataSection
                title="Addresses"
                primaryCount={primaryCustomer.addresses.length}
                secondaryCount={secondaryCustomer.addresses.length}
                mergeEnabled={mergeAddresses}
                onToggle={setMergeAddresses}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Information */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>What happens during merge?</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>The secondary customer will be archived (not deleted)</li>
            <li>All orders, quotes, and jobs will be reassigned to the primary customer</li>
            <li>Related contacts and addresses will be merged if selected</li>
            <li>Activity history from both customers will be combined</li>
            <li>You can view merge history and undo if needed</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Customer Merge</DialogTitle>
            <DialogDescription>
              This action will merge &quot;{secondaryCustomer.name}&quot; into &quot;{primaryCustomer.name}&quot;.
              The secondary customer will be archived.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4">
              <h4 className="font-medium mb-2">Summary</h4>
              <ul className="text-sm space-y-1">
                <li>
                  <Check className="h-4 w-4 inline mr-2 text-green-600" />
                  {Object.values(selections).filter((s) => s === 'secondary').length} fields
                  from secondary customer will be used
                </li>
                <li>
                  <Check className="h-4 w-4 inline mr-2 text-green-600" />
                  {mergeContacts ? 'Contacts will be merged' : 'Only primary contacts kept'}
                </li>
                <li>
                  <Check className="h-4 w-4 inline mr-2 text-green-600" />
                  {mergeAddresses ? 'Addresses will be merged' : 'Only primary addresses kept'}
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmMerge}>
              <Merge className="h-4 w-4 mr-2" />
              Confirm Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
