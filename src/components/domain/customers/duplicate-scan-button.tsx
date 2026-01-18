/**
 * DuplicateScanButton Component
 *
 * Button that triggers a scan for duplicate customers across the database.
 * Shows progress and results count, then opens review queue.
 */
import { useState } from 'react'
import { Search, Users, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface DuplicateScanButtonProps {
  /** Called when scan completes with results count */
  onScanComplete?: (count: number) => void
  /** Called when user wants to review duplicates */
  onReviewDuplicates?: () => void
  /** Current count of pending duplicates (from previous scan) */
  pendingCount?: number
  /** Custom button variant */
  variant?: 'default' | 'outline' | 'ghost'
  /** Custom button size */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Additional CSS classes */
  className?: string
}

type ScanStatus = 'idle' | 'configuring' | 'scanning' | 'complete' | 'error'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DuplicateScanButton({
  onScanComplete,
  onReviewDuplicates,
  pendingCount = 0,
  variant = 'outline',
  size = 'default',
  className,
}: DuplicateScanButtonProps) {
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [threshold, setThreshold] = useState(0.4)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [foundCount, setFoundCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Start the scan
  const handleStartScan = async () => {
    setStatus('scanning')
    setProgress(0)
    setError(null)
    setFoundCount(0)

    try {
      // Simulate scanning progress
      // In production, this would call the server function
      const simulateProgress = () => {
        return new Promise<void>((resolve) => {
          let currentProgress = 0
          const interval = setInterval(() => {
            currentProgress += Math.random() * 20
            if (currentProgress >= 100) {
              currentProgress = 100
              clearInterval(interval)
              resolve()
            }
            setProgress(Math.min(currentProgress, 100))
          }, 300)
        })
      }

      await simulateProgress()

      // Simulate finding duplicates (in production, this comes from server)
      const mockCount = Math.floor(Math.random() * 20) + 5
      setFoundCount(mockCount)
      setStatus('complete')
      onScanComplete?.(mockCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
      setStatus('error')
    }
  }

  // Reset and close
  const handleClose = () => {
    if (status !== 'scanning') {
      setStatus('idle')
      setProgress(0)
      setDialogOpen(false)
    }
  }

  // Review duplicates
  const handleReview = () => {
    handleClose()
    onReviewDuplicates?.()
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('relative', className)}
          onClick={() => setDialogOpen(true)}
        >
          <Search className="h-4 w-4 mr-2" />
          Find Duplicates
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 text-xs"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Duplicate Customer Scan
          </DialogTitle>
          <DialogDescription>
            {status === 'idle' || status === 'configuring'
              ? 'Scan your customer database for potential duplicates'
              : status === 'scanning'
                ? 'Scanning for duplicate customers...'
                : status === 'complete'
                  ? `Scan complete - ${foundCount} potential duplicates found`
                  : 'An error occurred during the scan'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Configuration (idle state) */}
          {(status === 'idle' || status === 'configuring') && (
            <>
              {/* Threshold slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Match Threshold</Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(threshold * 100)}%
                  </span>
                </div>
                <Slider
                  value={[threshold]}
                  onValueChange={([v]) => setThreshold(v)}
                  min={0.2}
                  max={0.8}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower = more matches (may include false positives).
                  Higher = fewer, more accurate matches.
                </p>
              </div>

              {/* Include archived toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Archived</Label>
                  <p className="text-xs text-muted-foreground">
                    Scan inactive customers too
                  </p>
                </div>
                <Switch
                  checked={includeArchived}
                  onCheckedChange={setIncludeArchived}
                />
              </div>

              {/* Start button */}
              <Button onClick={handleStartScan} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Start Scan
              </Button>
            </>
          )}

          {/* Scanning progress */}
          {status === 'scanning' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                Analyzing customer records for similarities...
              </p>
            </div>
          )}

          {/* Complete state */}
          {status === 'complete' && (
            <div className="space-y-4 text-center">
              {foundCount > 0 ? (
                <>
                  <div className="flex items-center justify-center">
                    <AlertTriangle className="h-12 w-12 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">
                      {foundCount} Potential Duplicate{foundCount !== 1 ? 's' : ''} Found
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Review these matches to merge or dismiss them
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleClose} className="flex-1">
                      Close
                    </Button>
                    <Button onClick={handleReview} className="flex-1">
                      <Users className="h-4 w-4 mr-2" />
                      Review Duplicates
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">No Duplicates Found</p>
                    <p className="text-sm text-muted-foreground">
                      Your customer database looks clean!
                    </p>
                  </div>
                  <Button onClick={handleClose} className="w-full">
                    Done
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center">
                <AlertTriangle className="h-12 w-12 text-red-500" />
              </div>
              <div>
                <p className="text-lg font-medium text-red-600">Scan Failed</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Close
                </Button>
                <Button
                  onClick={() => setStatus('idle')}
                  variant="secondary"
                  className="flex-1"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
