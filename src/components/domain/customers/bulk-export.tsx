/**
 * BulkExport Component
 *
 * Export customers with field selection:
 * - Field selection checkboxes
 * - Format options (CSV, Excel)
 * - Export progress
 * - Download link
 */
import { useState } from 'react'
import {
  Download,
  FileSpreadsheet,
  FileText,
  Check,
  Settings,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

type ExportFormat = 'csv' | 'xlsx'

interface ExportField {
  key: string
  label: string
  category: 'basic' | 'contact' | 'address' | 'financial' | 'metrics'
  default: boolean
}

interface BulkExportProps {
  selectedCount: number
  totalCount: number
  onExport: (fields: string[], format: ExportFormat) => Promise<string>
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ============================================================================
// EXPORT FIELDS
// ============================================================================

const EXPORT_FIELDS: ExportField[] = [
  // Basic
  { key: 'customerCode', label: 'Customer Code', category: 'basic', default: true },
  { key: 'name', label: 'Company Name', category: 'basic', default: true },
  { key: 'legalName', label: 'Legal Name', category: 'basic', default: false },
  { key: 'type', label: 'Type', category: 'basic', default: true },
  { key: 'status', label: 'Status', category: 'basic', default: true },
  { key: 'industry', label: 'Industry', category: 'basic', default: false },
  { key: 'size', label: 'Size', category: 'basic', default: false },
  { key: 'website', label: 'Website', category: 'basic', default: false },
  { key: 'taxId', label: 'Tax ID / ABN', category: 'basic', default: false },
  { key: 'createdAt', label: 'Created Date', category: 'basic', default: false },

  // Contact
  { key: 'primaryContactName', label: 'Primary Contact Name', category: 'contact', default: true },
  { key: 'primaryContactEmail', label: 'Primary Contact Email', category: 'contact', default: true },
  { key: 'primaryContactPhone', label: 'Primary Contact Phone', category: 'contact', default: true },
  { key: 'primaryContactMobile', label: 'Primary Contact Mobile', category: 'contact', default: false },
  { key: 'primaryContactTitle', label: 'Primary Contact Title', category: 'contact', default: false },

  // Address
  { key: 'billingAddress', label: 'Billing Address', category: 'address', default: false },
  { key: 'billingCity', label: 'Billing City', category: 'address', default: false },
  { key: 'billingState', label: 'Billing State', category: 'address', default: false },
  { key: 'billingPostcode', label: 'Billing Postcode', category: 'address', default: false },
  { key: 'shippingAddress', label: 'Shipping Address', category: 'address', default: false },
  { key: 'shippingCity', label: 'Shipping City', category: 'address', default: false },
  { key: 'shippingState', label: 'Shipping State', category: 'address', default: false },
  { key: 'shippingPostcode', label: 'Shipping Postcode', category: 'address', default: false },

  // Financial
  { key: 'creditLimit', label: 'Credit Limit', category: 'financial', default: false },
  { key: 'creditHold', label: 'Credit Hold', category: 'financial', default: false },
  { key: 'lifetimeValue', label: 'Lifetime Value', category: 'financial', default: true },
  { key: 'totalOrders', label: 'Total Orders', category: 'financial', default: false },
  { key: 'averageOrderValue', label: 'Average Order Value', category: 'financial', default: false },

  // Metrics
  { key: 'healthScore', label: 'Health Score', category: 'metrics', default: true },
  { key: 'lastOrderDate', label: 'Last Order Date', category: 'metrics', default: true },
  { key: 'firstOrderDate', label: 'First Order Date', category: 'metrics', default: false },
  { key: 'tags', label: 'Tags', category: 'metrics', default: false },
]

const CATEGORIES = [
  { key: 'basic', label: 'Basic Information' },
  { key: 'contact', label: 'Contact Details' },
  { key: 'address', label: 'Addresses' },
  { key: 'financial', label: 'Financial' },
  { key: 'metrics', label: 'Metrics & Analytics' },
] as const

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BulkExport({
  selectedCount,
  totalCount,
  onExport,
  open,
  onOpenChange,
}: BulkExportProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    () => new Set(EXPORT_FIELDS.filter((f) => f.default).map((f) => f.key))
  )
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const exportCount = selectedCount > 0 ? selectedCount : totalCount

  // Toggle field selection
  const toggleField = (fieldKey: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev)
      if (next.has(fieldKey)) {
        next.delete(fieldKey)
      } else {
        next.add(fieldKey)
      }
      return next
    })
  }

  // Toggle all fields in category
  const toggleCategory = (category: string) => {
    const categoryFields = EXPORT_FIELDS.filter((f) => f.category === category)
    const allSelected = categoryFields.every((f) => selectedFields.has(f.key))

    setSelectedFields((prev) => {
      const next = new Set(prev)
      categoryFields.forEach((f) => {
        if (allSelected) {
          next.delete(f.key)
        } else {
          next.add(f.key)
        }
      })
      return next
    })
  }

  // Select all / none
  const selectAll = () => {
    setSelectedFields(new Set(EXPORT_FIELDS.map((f) => f.key)))
  }

  const selectNone = () => {
    setSelectedFields(new Set())
  }

  const selectDefaults = () => {
    setSelectedFields(new Set(EXPORT_FIELDS.filter((f) => f.default).map((f) => f.key)))
  }

  // Start export
  const handleExport = async () => {
    setIsExporting(true)
    setProgress(0)
    setDownloadUrl(null)

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 90))
    }, 200)

    try {
      const url = await onExport(Array.from(selectedFields), format)
      clearInterval(interval)
      setProgress(100)
      setDownloadUrl(url)
    } catch (error) {
      clearInterval(interval)
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Reset dialog
  const handleClose = () => {
    if (!isExporting) {
      setDownloadUrl(null)
      setProgress(0)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Customers
          </DialogTitle>
          <DialogDescription>
            {selectedCount > 0
              ? `Export ${selectedCount} selected customer${selectedCount !== 1 ? 's' : ''}`
              : `Export all ${totalCount} customers`}
          </DialogDescription>
        </DialogHeader>

        {downloadUrl ? (
          // Download complete
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <Check className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">Export Complete!</h3>
            <p className="text-muted-foreground mb-6">
              {exportCount} customer{exportCount !== 1 ? 's' : ''} exported successfully
            </p>
            <Button asChild>
              <a href={downloadUrl} download>
                <Download className="h-4 w-4 mr-2" />
                Download {format.toUpperCase()} File
              </a>
            </Button>
          </div>
        ) : isExporting ? (
          // Export in progress
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <RefreshCw className="h-12 w-12 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-medium mb-2">Exporting...</h3>
            <p className="text-muted-foreground mb-4">
              Please wait while we prepare your export
            </p>
            <Progress value={progress} className="max-w-xs" />
            <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
          </div>
        ) : (
          // Field selection
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Export Format</Label>
              <RadioGroup
                value={format}
                onValueChange={(v) => setFormat(v as ExportFormat)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    CSV
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="xlsx" id="xlsx" />
                  <Label htmlFor="xlsx" className="flex items-center gap-2 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (XLSX)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={selectNone}>
                Select None
              </Button>
              <Button variant="outline" size="sm" onClick={selectDefaults}>
                Defaults
              </Button>
              <span className="text-sm text-muted-foreground ml-auto">
                {selectedFields.size} field{selectedFields.size !== 1 ? 's' : ''} selected
              </span>
            </div>

            {/* Field Selection */}
            <div className="flex-1 overflow-y-auto border rounded-lg p-4 space-y-6">
              {CATEGORIES.map((category) => {
                const categoryFields = EXPORT_FIELDS.filter(
                  (f) => f.category === category.key
                )
                const selectedInCategory = categoryFields.filter((f) =>
                  selectedFields.has(f.key)
                ).length
                const allSelected = selectedInCategory === categoryFields.length

                return (
                  <div key={category.key}>
                    <div
                      className="flex items-center gap-2 mb-2 cursor-pointer"
                      onClick={() => toggleCategory(category.key)}
                    >
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => toggleCategory(category.key)}
                      />
                      <Label className="cursor-pointer font-medium">
                        {category.label}
                      </Label>
                      <Badge variant="secondary" className="ml-auto">
                        {selectedInCategory}/{categoryFields.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 ml-6">
                      {categoryFields.map((field) => (
                        <div
                          key={field.key}
                          className="flex items-center gap-2"
                          onClick={() => toggleField(field.key)}
                        >
                          <Checkbox
                            checked={selectedFields.has(field.key)}
                            onCheckedChange={() => toggleField(field.key)}
                          />
                          <Label className="text-sm cursor-pointer">
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          {!downloadUrl && !isExporting && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={selectedFields.size === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export {exportCount} Customer{exportCount !== 1 ? 's' : ''}
              </Button>
            </>
          )}
          {downloadUrl && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
