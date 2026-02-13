/**
 * DuplicateDetection Component
 *
 * Detect and manage duplicate customer records:
 * - Scan for potential duplicates
 * - Review duplicate pairs
 * - Quick merge actions
 * - Duplicate prevention settings
 *
 * ARCHITECTURE: Presentational component - receives data via props from route.
 */
import { useState } from 'react'
import {
  Users,
  Check,
  X,
  RefreshCw,
  Settings,
  Merge,
  Eye,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface DuplicatePair {
  id: string
  customer1: {
    id: string
    customerCode: string
    name: string
    email: string | null
    phone: string | null
    status?: string
    lifetimeValue?: number
    createdAt: string
  }
  customer2: {
    id: string
    customerCode: string
    name: string
    email: string | null
    phone: string | null
    status?: string
    lifetimeValue?: number
    createdAt: string
  }
  matchScore: number
  matchReasons: string[]
  status: 'pending' | 'merged' | 'dismissed'
}

interface ScanStats {
  totalScanned: number
  duplicatesFound: number
  lastScanAt: string
}

interface DuplicateDetectionProps {
  /** Duplicate pairs from server */
  duplicates?: DuplicatePair[]
  /** Scan statistics */
  scanStats?: ScanStats
  /** Loading state */
  isLoading?: boolean
  /** Scanning in progress */
  isScanning?: boolean
  /** Current threshold (0-100) */
  threshold?: number
  /** Threshold change handler */
  onThresholdChange?: (threshold: number) => void
  /** Trigger new scan */
  onScan?: () => void
  /** Merge handler */
  onMerge?: (pair: DuplicatePair) => void
  /** Dismiss handler */
  onDismiss?: (customer1Id: string, customer2Id: string) => void
  /** View customer handler */
  onView?: (customerId: string) => void
  className?: string
}

// ============================================================================
// SETTINGS DIALOG
// ============================================================================

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threshold: number
  onThresholdChange: (threshold: number) => void
}

function SettingsDialog({
  open,
  onOpenChange,
  threshold,
  onThresholdChange,
}: SettingsDialogProps) {
  const [localThreshold, setLocalThreshold] = useState([threshold])
  const [autoDetect, setAutoDetect] = useState(true)
  const [checkEmail, setCheckEmail] = useState(true)
  const [checkPhone, setCheckPhone] = useState(true)
  const [checkName, setCheckName] = useState(true)
  const [checkABN, setCheckABN] = useState(true)

  const handleSave = () => {
    onThresholdChange(localThreshold[0])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Duplicate Detection Settings</DialogTitle>
          <DialogDescription>Configure how duplicates are detected</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Match Threshold</Label>
              <span className="text-sm font-medium">{localThreshold[0]}%</span>
            </div>
            <Slider
              value={localThreshold}
              onValueChange={setLocalThreshold}
              max={100}
              min={30}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Higher values require stronger matches (fewer false positives)
            </p>
          </div>

          {/* Auto-detect */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-detect on creation</Label>
              <p className="text-xs text-muted-foreground">
                Warn when creating potential duplicates
              </p>
            </div>
            <Switch checked={autoDetect} onCheckedChange={setAutoDetect} />
          </div>

          {/* Fields to check */}
          <div className="space-y-3">
            <Label>Fields to Compare</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Switch id="check-name" checked={checkName} onCheckedChange={setCheckName} />
                <Label htmlFor="check-name" className="text-sm">
                  Name
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="check-email" checked={checkEmail} onCheckedChange={setCheckEmail} />
                <Label htmlFor="check-email" className="text-sm">
                  Email
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="check-phone" checked={checkPhone} onCheckedChange={setCheckPhone} />
                <Label htmlFor="check-phone" className="text-sm">
                  Phone
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="check-abn" checked={checkABN} onCheckedChange={setCheckABN} />
                <Label htmlFor="check-abn" className="text-sm">
                  ABN/Tax ID
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// DUPLICATE PAIR CARD
// ============================================================================

interface DuplicatePairCardProps {
  pair: DuplicatePair
  onMerge: () => void
  onDismiss: () => void
  onView: (customerId: string) => void
}

function DuplicatePairCard({ pair, onMerge, onDismiss, onView }: DuplicatePairCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'bg-red-100 text-red-700'
    if (score >= 0.8) return 'bg-orange-100 text-orange-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  // Convert decimal score to percentage
  const scorePercent = Math.round(pair.matchScore * 100)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-6">
          {/* Customer 1 */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{pair.customer1.customerCode}</Badge>
              <span className="text-xs text-muted-foreground">
                Created {new Date(pair.customer1.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h4 className="font-medium">{pair.customer1.name}</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              {pair.customer1.email && <p>{pair.customer1.email}</p>}
              {pair.customer1.phone && <p>{pair.customer1.phone}</p>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => onView(pair.customer1.id)}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>

          {/* Match indicator */}
          <div className="flex flex-col items-center gap-2">
            <Badge className={cn('text-lg px-3 py-1', getScoreColor(pair.matchScore))}>
              {scorePercent}%
            </Badge>
            <div className="text-xs text-muted-foreground text-center">
              {pair.matchReasons.map((reason, i) => (
                <p key={i}>{reason}</p>
              ))}
            </div>
          </div>

          {/* Customer 2 */}
          <div className="flex-1 space-y-2 text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">
                Created {new Date(pair.customer2.createdAt).toLocaleDateString()}
              </span>
              <Badge variant="outline">{pair.customer2.customerCode}</Badge>
            </div>
            <h4 className="font-medium">{pair.customer2.name}</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              {pair.customer2.email && <p>{pair.customer2.email}</p>}
              {pair.customer2.phone && <p>{pair.customer2.phone}</p>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => onView(pair.customer2.id)}>
              View
              <Eye className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t">
          <Button onClick={onMerge}>
            <Merge className="h-4 w-4 mr-2" />
            Merge
          </Button>
          <Button variant="outline" onClick={onDismiss}>
            <X className="h-4 w-4 mr-2" />
            Not Duplicate
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function DuplicatesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pair cards skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-10 w-16 rounded-full" />
                <div className="flex-1 space-y-2 flex flex-col items-end">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DuplicateDetection({
  duplicates,
  scanStats,
  isLoading = false,
  isScanning = false,
  threshold = 40,
  onThresholdChange,
  onScan,
  onMerge,
  onDismiss,
  onView,
  className,
}: DuplicateDetectionProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [localDuplicates, setLocalDuplicates] = useState<string[]>([]) // Track dismissed locally

  // Filter to show only pending duplicates (not dismissed locally)
  const pendingDuplicates = (duplicates ?? []).filter(
    (d) => d.status === 'pending' && !localDuplicates.includes(d.id)
  )

  // Handle dismiss with local state update
  const handleDismiss = (pair: DuplicatePair) => {
    setLocalDuplicates((prev) => [...prev, pair.id])
    onDismiss?.(pair.customer1.id, pair.customer2.id)
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Duplicate Detection
            </h2>
            <p className="text-muted-foreground">Find and merge duplicate customer records</p>
          </div>
        </div>
        <DuplicatesSkeleton />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Duplicate Detection
          </h2>
          <p className="text-muted-foreground">Find and merge duplicate customer records</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={onScan} disabled={isScanning}>
            {isScanning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isScanning ? 'Scanning…' : 'Scan Now'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {scanStats?.totalScanned?.toLocaleString() ?? '-'}
            </div>
            <p className="text-sm text-muted-foreground">Customers Scanned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{pendingDuplicates.length}</div>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {(duplicates ?? []).filter((d) => d.status === 'merged').length}
            </div>
            <p className="text-sm text-muted-foreground">Merged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">
              {scanStats?.lastScanAt
                ? new Date(scanStats.lastScanAt).toLocaleDateString()
                : 'Never'}
            </div>
            <p className="text-sm text-muted-foreground">Last Scan</p>
          </CardContent>
        </Card>
      </div>

      {/* Duplicate Pairs */}
      {pendingDuplicates.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Duplicates Found</h3>
            <p className="text-muted-foreground">
              {duplicates?.length
                ? 'All potential duplicates have been reviewed'
                : 'Run a scan to check for duplicate records'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="font-medium">Potential Duplicates ({pendingDuplicates.length})</h3>
          {pendingDuplicates.map((pair) => (
            <DuplicatePairCard
              key={pair.id}
              pair={pair}
              onMerge={() => onMerge?.(pair)}
              onDismiss={() => handleDismiss(pair)}
              onView={(id) => onView?.(id)}
            />
          ))}
        </div>
      )}

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        threshold={threshold}
        onThresholdChange={(t) => onThresholdChange?.(t)}
      />
    </div>
  )
}
