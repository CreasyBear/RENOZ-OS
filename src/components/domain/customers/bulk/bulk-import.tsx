/**
 * BulkImport Component
 *
 * CSV import wizard for bulk customer creation:
 * - File upload and parsing
 * - Field mapping
 * - Validation and preview
 * - Import with progress
 */
import { useState, useCallback } from 'react'
import {
  Upload,
  FileText,
  Check,
  AlertTriangle,
  Download,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface ParsedRow {
  rowNumber: number
  data: Record<string, string>
  errors: string[]
  warnings: string[]
}

interface FieldMapping {
  csvColumn: string
  systemField: string | null
}

interface ImportResult {
  total: number
  created: number
  skipped: number
  errors: Array<{ row: number; error: string }>
}

interface BulkImportProps {
  onImport: (data: Record<string, string>[]) => Promise<ImportResult>
  onCancel: () => void
  className?: string
}

// ============================================================================
// SYSTEM FIELDS
// ============================================================================

const SYSTEM_FIELDS = [
  { key: 'name', label: 'Company Name', required: true },
  { key: 'customerCode', label: 'Customer Code', required: false },
  { key: 'legalName', label: 'Legal Name', required: false },
  { key: 'type', label: 'Type', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'industry', label: 'Industry', required: false },
  { key: 'size', label: 'Size', required: false },
  { key: 'website', label: 'Website', required: false },
  { key: 'taxId', label: 'Tax ID / ABN', required: false },
  { key: 'contactFirstName', label: 'Primary Contact First Name', required: false },
  { key: 'contactLastName', label: 'Primary Contact Last Name', required: false },
  { key: 'contactEmail', label: 'Primary Contact Email', required: false },
  { key: 'contactPhone', label: 'Primary Contact Phone', required: false },
  { key: 'addressStreet', label: 'Address Street', required: false },
  { key: 'addressCity', label: 'Address City', required: false },
  { key: 'addressState', label: 'Address State', required: false },
  { key: 'addressPostcode', label: 'Address Postcode', required: false },
]

// ============================================================================
// STEP 1: FILE UPLOAD
// ============================================================================

interface FileUploadStepProps {
  onFileSelected: (file: File) => void
}

function FileUploadStep({ onFileSelected }: FileUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file?.name.endsWith('.csv')) {
        onFileSelected(file)
      }
    },
    [onFileSelected]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelected(file)
    }
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-12 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
        <p className="text-muted-foreground mb-4">
          Drag and drop your CSV file here, or click to browse
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload">
          <Button variant="outline" asChild>
            <span>Choose File</span>
          </Button>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <a href="/templates/customer-import-template.csv" download>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </a>
        </Button>
        <span className="text-sm text-muted-foreground">
          Use our template to ensure correct formatting
        </span>
      </div>

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertTitle>CSV Requirements</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>File must be comma-separated (CSV format)</li>
            <li>First row should contain column headers</li>
            <li>Maximum 1,000 rows per import</li>
            <li>Company Name is required for each row</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}

// ============================================================================
// STEP 2: FIELD MAPPING
// ============================================================================

interface FieldMappingStepProps {
  csvColumns: string[]
  mappings: FieldMapping[]
  onMappingChange: (index: number, systemField: string | null) => void
  sampleData: string[][]
}

function FieldMappingStep({
  csvColumns,
  mappings,
  onMappingChange,
  sampleData,
}: FieldMappingStepProps) {
  const getMappedSystemField = (csvColumn: string) => {
    const mapping = mappings.find((m) => m.csvColumn === csvColumn)
    return mapping?.systemField ?? null
  }

  const handleMappingChange = (csvColumn: string, systemField: string) => {
    const index = mappings.findIndex((m) => m.csvColumn === csvColumn)
    onMappingChange(index, systemField === 'skip' ? null : systemField)
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Map Your Columns</AlertTitle>
        <AlertDescription>
          Match each CSV column to a system field. Unmapped columns will be skipped.
        </AlertDescription>
      </Alert>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CSV Column</TableHead>
              <TableHead>Sample Data</TableHead>
              <TableHead>System Field</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {csvColumns.map((column, i) => (
              <TableRow key={column}>
                <TableCell className="font-medium">{column}</TableCell>
                <TableCell className="text-muted-foreground">
                  {sampleData[0]?.[i] ?? '-'}
                </TableCell>
                <TableCell>
                  <Select
                    value={getMappedSystemField(column) ?? 'skip'}
                    onValueChange={(v) => handleMappingChange(column, v)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Skip this column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip this column</SelectItem>
                      {SYSTEM_FIELDS.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                          {field.required && ' *'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Required fields check */}
      {!mappings.some((m) => m.systemField === 'name') && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing Required Field</AlertTitle>
          <AlertDescription>
            You must map a column to &quot;Company Name&quot; to continue.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// ============================================================================
// STEP 3: VALIDATION & PREVIEW
// ============================================================================

interface ValidationStepProps {
  parsedRows: ParsedRow[]
  totalRows: number
}

function ValidationStep({ parsedRows, totalRows }: ValidationStepProps) {
  const validRows = parsedRows.filter((r) => r.errors.length === 0)
  const errorRows = parsedRows.filter((r) => r.errors.length > 0)
  const warningRows = parsedRows.filter((r) => r.warnings.length > 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{totalRows}</p>
            <p className="text-sm text-muted-foreground">Total Rows</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">{validRows.length}</p>
            <p className="text-sm text-muted-foreground">Ready to Import</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-yellow-600">{warningRows.length}</p>
            <p className="text-sm text-muted-foreground">Warnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-red-600">{errorRows.length}</p>
            <p className="text-sm text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Error List */}
      {errorRows.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ScrollArea className="h-[150px] mt-2">
              {errorRows.slice(0, 10).map((row) => (
                <div key={row.rowNumber} className="text-sm mb-1">
                  Row {row.rowNumber}: {row.errors.join(', ')}
                </div>
              ))}
              {errorRows.length > 10 && (
                <p className="text-sm">…and {errorRows.length - 10} more errors</p>
              )}
            </ScrollArea>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preview (first 5 rows)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.slice(0, 5).map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>
                      {row.errors.length > 0 ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : row.warnings.length > 0 ? (
                        <Badge variant="secondary">Warning</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">Valid</Badge>
                      )}
                    </TableCell>
                    <TableCell>{row.data.name ?? '-'}</TableCell>
                    <TableCell>{row.data.type ?? 'business'}</TableCell>
                    <TableCell>
                      {row.data.contactEmail ?? row.data.contactPhone ?? '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// STEP 4: IMPORT PROGRESS
// ============================================================================

interface ImportProgressStepProps {
  progress?: number
  result: ImportResult | null
  isComplete: boolean
}

function ImportProgressStep({ progress, result, isComplete }: ImportProgressStepProps) {
  return (
    <div className="space-y-6">
      {!isComplete ? (
        <div className="text-center py-8">
          <RefreshCw className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Importing Customers…</h3>
          <p className="text-muted-foreground mb-4">
            Please don&apos;t close this window
          </p>
          {progress !== undefined && (
            <>
              <Progress value={progress} className="max-w-md mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">{progress}% complete</p>
            </>
          )}
        </div>
      ) : result ? (
        <div className="text-center py-8">
          <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-4">Import Complete!</h3>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
            <div className="p-4 rounded-lg bg-green-50">
              <p className="text-2xl font-bold text-green-600">{result.created}</p>
              <p className="text-sm text-muted-foreground">Created</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50">
              <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
              <p className="text-sm text-muted-foreground">Skipped</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50">
              <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
              <p className="text-sm text-muted-foreground">Errors</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <Alert variant="destructive" className="text-left max-w-md mx-auto">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Some rows failed to import</AlertTitle>
              <AlertDescription>
                <ScrollArea className="h-[100px] mt-2">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-sm">
                      Row {err.row}: {err.error}
                    </p>
                  ))}
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : null}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BulkImport({ onImport, onCancel, className }: BulkImportProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [csvColumns, setCsvColumns] = useState<string[]>([])
  const [sampleData, setSampleData] = useState<string[][]>([])
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Parse CSV file
  const parseCSV = async (file: File) => {
    const text = await file.text()
    const lines = text.split('\n').filter((l) => l.trim())
    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
    const dataRows = lines.slice(1).map((l) => l.split(',').map((c) => c.trim().replace(/"/g, '')))

    setCsvColumns(headers)
    setSampleData(dataRows.slice(0, 3))

    // Auto-map columns based on header names
    const autoMappings: FieldMapping[] = headers.map((header) => {
      const lowerHeader = header.toLowerCase()
      let systemField: string | null = null

      if (lowerHeader.includes('name') && !lowerHeader.includes('first') && !lowerHeader.includes('last')) {
        systemField = 'name'
      } else if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
        systemField = 'contactFirstName'
      } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
        systemField = 'contactLastName'
      } else if (lowerHeader.includes('email')) {
        systemField = 'contactEmail'
      } else if (lowerHeader.includes('phone')) {
        systemField = 'contactPhone'
      } else if (lowerHeader.includes('website')) {
        systemField = 'website'
      } else if (lowerHeader.includes('abn') || lowerHeader.includes('tax')) {
        systemField = 'taxId'
      }

      return { csvColumn: header, systemField }
    })

    setMappings(autoMappings)

    // Parse all rows
    const parsed: ParsedRow[] = dataRows.map((row, i) => {
      const data: Record<string, string> = {}
      const errors: string[] = []
      const warnings: string[] = []

      autoMappings.forEach((mapping, j) => {
        if (mapping.systemField && row[j]) {
          data[mapping.systemField] = row[j]
        }
      })

      if (!data.name) {
        errors.push('Missing company name')
      }

      return { rowNumber: i + 2, data, errors, warnings }
    })

    setParsedRows(parsed)
    setCurrentStep(2)
  }

  // Handle file selection
  const handleFileSelected = (selectedFile: File) => {
    parseCSV(selectedFile)
  }

  // Handle mapping change
  const handleMappingChange = (index: number, systemField: string | null) => {
    setMappings((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], systemField }
      return updated
    })
  }

  // Start import
  const handleImport = async () => {
    setIsImporting(true)
    setCurrentStep(4)

    const validRows = parsedRows.filter((r) => r.errors.length === 0)

    // No fake progress - use isImporting state only
    const result = await onImport(validRows.map((r) => r.data))
    setImportResult(result)
    setIsImporting(false)
  }

  // Check if can proceed
  const canProceed = () => {
    if (currentStep === 2) {
      return mappings.some((m) => m.systemField === 'name')
    }
    if (currentStep === 3) {
      return parsedRows.some((r) => r.errors.length === 0)
    }
    return true
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Import Customers</h2>
          <p className="text-muted-foreground">
            Bulk import customers from a CSV file
          </p>
        </div>
        {currentStep < 4 && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {['Upload', 'Map Fields', 'Validate', 'Import'].map((step, i) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                currentStep > i + 1
                  ? 'bg-primary text-primary-foreground'
                  : currentStep === i + 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {currentStep > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="ml-2 text-sm hidden sm:inline">{step}</span>
            {i < 3 && <ChevronRight className="h-4 w-4 mx-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 1 && <FileUploadStep onFileSelected={handleFileSelected} />}
          {currentStep === 2 && (
            <FieldMappingStep
              csvColumns={csvColumns}
              mappings={mappings}
              onMappingChange={handleMappingChange}
              sampleData={sampleData}
            />
          )}
          {currentStep === 3 && (
            <ValidationStep parsedRows={parsedRows} totalRows={parsedRows.length} />
          )}
          {currentStep === 4 && (
            <ImportProgressStep
              result={importResult}
              isComplete={!isImporting}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {currentStep < 4 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {currentStep < 3 && (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {currentStep === 3 && (
            <Button onClick={handleImport} disabled={!canProceed()}>
              <Upload className="h-4 w-4 mr-2" />
              Start Import
            </Button>
          )}
        </div>
      )}

      {currentStep === 4 && importResult && (
        <div className="flex justify-center">
          <Button onClick={onCancel}>Done</Button>
        </div>
      )}
    </div>
  )
}
