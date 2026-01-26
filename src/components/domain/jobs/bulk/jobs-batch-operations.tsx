/**
 * Jobs Batch Operations Component
 *
 * UI for performing batch operations on multiple jobs.
 * Connects to the batch operation server functions with progress tracking.
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CheckSquare, RefreshCw, CheckCircle, XCircle, Calendar, User, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useProcessJobBatchOperations } from '@/hooks/jobs';

// ============================================================================
// TYPES
// ============================================================================

export interface JobBatchItem {
  id: string;
  jobNumber: string;
  customerName: string;
  status: string;
  installerName?: string;
  scheduledDate?: string;
}

export interface BatchOperation {
  type: 'status_update' | 'reschedule' | 'assign_installer' | 'start_jobs' | 'complete_jobs';
  label: string;
  icon: React.ReactNode;
  description: string;
}

export interface BatchOperationResult {
  success: boolean;
  jobId: string;
  jobNumber: string;
  error?: string;
}

type OperationParams = {
  newStatus?: string;
  newDate?: string;
  newTime?: string;
  installerId?: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const BATCH_OPERATIONS: BatchOperation[] = [
  {
    type: 'status_update',
    label: 'Update Status',
    icon: <RefreshCw className="h-4 w-4" />,
    description: 'Change status for selected jobs',
  },
  {
    type: 'reschedule',
    label: 'Reschedule',
    icon: <Calendar className="h-4 w-4" />,
    description: 'Change scheduled date/time',
  },
  {
    type: 'assign_installer',
    label: 'Assign Installer',
    icon: <User className="h-4 w-4" />,
    description: 'Assign jobs to an installer',
  },
  {
    type: 'start_jobs',
    label: 'Start Jobs',
    icon: <Play className="h-4 w-4" />,
    description: 'Mark jobs as in progress',
  },
  {
    type: 'complete_jobs',
    label: 'Complete Jobs',
    icon: <CheckCircle className="h-4 w-4" />,
    description: 'Mark jobs as completed',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface JobsBatchOperationsProps {
  jobs: JobBatchItem[];
  onOperationComplete?: (results: BatchOperationResult[]) => void;
  trigger?: React.ReactNode;
}

export function JobsBatchOperations({
  jobs,
  onOperationComplete,
  trigger,
}: JobsBatchOperationsProps) {
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [selectedOperation, setSelectedOperation] = useState<BatchOperation | null>(null);
  const [operationParams, setOperationParams] = useState<OperationParams>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchOperationResult[]>([]);

  const batchMutation = useProcessJobBatchOperations();

  // Toggle job selection
  const toggleJobSelection = useCallback((jobId: string) => {
    setSelectedJobs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  }, []);

  // Select/deselect all jobs
  const toggleSelectAll = useCallback(() => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobs.map((job) => job.id)));
    }
  }, [selectedJobs, jobs]);

  // Handle operation selection
  const handleOperationSelect = useCallback((operation: BatchOperation) => {
    setSelectedOperation(operation);
    setOperationParams({});
  }, []);

  // Execute batch operation
  const executeBatchOperation = useCallback(async () => {
    if (!selectedOperation || selectedJobs.size === 0) return;

    if (selectedOperation.type === 'status_update' && !operationParams.newStatus) {
      toast.error('Select a status before running the batch update.');
      return;
    }

    if (selectedOperation.type === 'reschedule' && !operationParams.newDate) {
      toast.error('Select a new date before rescheduling.');
      return;
    }

    if (selectedOperation.type === 'assign_installer' && !operationParams.installerId) {
      toast.error('Select an installer before assigning jobs.');
      return;
    }

    setIsExecuting(true);
    setProgress(0);
    setResults([]);

    try {
      // Prepare batch operations based on type
      const operations = Array.from(selectedJobs)
        .map((jobId) => {
          const job = jobs.find((j) => j.id === jobId);
          if (!job) return null;

          switch (selectedOperation.type) {
            case 'status_update':
              return {
                id: `status_${jobId}`,
                type: 'update' as const,
                data: {
                  id: jobId,
                  status: operationParams.newStatus,
                },
              };

            case 'reschedule':
              return {
                id: `reschedule_${jobId}`,
                type: 'reschedule' as const,
                data: {
                  jobId,
                  newScheduledDate: operationParams.newDate,
                  newScheduledTime: operationParams.newTime,
                },
              };

            case 'assign_installer':
              return {
                id: `assign_${jobId}`,
                type: 'assign' as const,
                data: {
                  jobId,
                  installerId: operationParams.installerId,
                },
              };

            case 'start_jobs':
              return {
                id: `start_${jobId}`,
                type: 'update' as const,
                data: {
                  id: jobId,
                  status: 'in_progress',
                },
              };

            case 'complete_jobs':
              return {
                id: `complete_${jobId}`,
                type: 'update' as const,
                data: {
                  id: jobId,
                  status: 'completed',
                },
              };

            default:
              return null;
          }
        })
        .filter((operation): operation is NonNullable<typeof operation> => operation !== null);

      // Execute batch operation with progress tracking
      const result = await batchMutation.mutateAsync({
        operations,
        options: {
          batchSize: 5,
          continueOnError: true,
          enableRollback: false,
        },
      });

      // Process results
      const processedResults: BatchOperationResult[] = result.results.map((res: any) => ({
        success: res.success,
        jobId: res.operationId.split('_')[1], // Extract job ID from operation ID
        jobNumber: jobs.find((j) => j.id === res.operationId.split('_')[1])?.jobNumber || '',
        error: res.error,
      }));

      setResults(processedResults);

      // Show summary toast
      const successCount = processedResults.filter((r) => r.success).length;
      const failureCount = processedResults.filter((r) => !r.success).length;

      if (failureCount === 0) {
        toast.success(`Successfully processed ${successCount} jobs`);
      } else if (successCount === 0) {
        toast.error(`Failed to process ${failureCount} jobs`);
      } else {
        toast.warning(`Processed ${successCount} jobs successfully, ${failureCount} failed`);
      }

      // Notify parent component
      onOperationComplete?.(processedResults);
    } catch (error) {
      console.error('Batch operation failed:', error);
      toast.error('Batch operation failed. Please try again.');
    } finally {
      setIsExecuting(false);
      setProgress(100);
    }
  }, [selectedOperation, selectedJobs, jobs, operationParams, batchMutation, onOperationComplete]);

  // Reset dialog state
  const resetDialog = useCallback(() => {
    setSelectedOperation(null);
    setOperationParams({});
    setIsExecuting(false);
    setProgress(0);
    setResults([]);
    setIsDialogOpen(false);
  }, []);

  // Get operation parameters UI
  const renderOperationParams = () => {
    if (!selectedOperation) return null;

    switch (selectedOperation.type) {
      case 'status_update':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">New Status</label>
            <Select
              value={operationParams.newStatus || ''}
              onValueChange={(value) =>
                setOperationParams((prev) => ({ ...prev, newStatus: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 'reschedule':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Date</label>
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={operationParams.newDate || ''}
                onChange={(e) =>
                  setOperationParams((prev) => ({ ...prev, newDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Time (optional)</label>
              <input
                type="time"
                className="w-full rounded-md border px-3 py-2"
                value={operationParams.newTime || ''}
                onChange={(e) =>
                  setOperationParams((prev) => ({ ...prev, newTime: e.target.value }))
                }
              />
            </div>
          </div>
        );

      case 'assign_installer':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Installer</label>
            {/* This would be populated with actual installer data */}
            <Select
              value={operationParams.installerId || ''}
              onValueChange={(value) =>
                setOperationParams((prev) => ({ ...prev, installerId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose installer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="installer_1">John Smith</SelectItem>
                <SelectItem value="installer_2">Sarah Johnson</SelectItem>
                <SelectItem value="installer_3">Mike Davis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  const selectedCount = selectedJobs.size;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" disabled={jobs.length === 0}>
            <CheckSquare className="mr-2 h-4 w-4" />
            Batch Operations
            {selectedCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedCount}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Operations</DialogTitle>
          <DialogDescription>
            Perform operations on multiple jobs at once. Select jobs and choose an operation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Select Jobs</span>
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {selectedJobs.size === jobs.length ? 'Deselect All' : 'Select All'}
                </Button>
              </CardTitle>
              <CardDescription>
                {selectedCount} of {jobs.length} jobs selected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {jobs.map((job) => (
                  <div key={job.id} className="flex items-center space-x-3 rounded border p-2">
                    <Checkbox
                      checked={selectedJobs.has(job.id)}
                      onCheckedChange={() => toggleJobSelection(job.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{job.jobNumber}</p>
                      <p className="text-muted-foreground truncate text-sm">{job.customerName}</p>
                    </div>
                    <Badge variant="outline">{job.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Operation Selection */}
          {selectedCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Choose Operation</CardTitle>
                <CardDescription>What would you like to do with the selected jobs?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {BATCH_OPERATIONS.map((operation) => (
                    <button
                      key={operation.type}
                      onClick={() => handleOperationSelect(operation)}
                      className={`hover:bg-muted rounded-lg border p-4 text-left transition-colors ${
                        selectedOperation?.type === operation.type
                          ? 'border-primary bg-primary/5'
                          : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">{operation.icon}</div>
                        <div>
                          <h4 className="font-medium">{operation.label}</h4>
                          <p className="text-muted-foreground text-sm">{operation.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Operation Parameters */}
          {selectedOperation && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedOperation.label} Parameters</CardTitle>
              </CardHeader>
              <CardContent>{renderOperationParams()}</CardContent>
            </Card>
          )}

          {/* Progress and Results */}
          {isExecuting && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="w-full" />
                <p className="text-muted-foreground mt-2 text-sm">
                  Processing {selectedCount} jobs...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Results Summary */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.slice(0, 10).map((result) => (
                    <div
                      key={result.jobId}
                      className="flex items-center space-x-3 rounded border p-2"
                    >
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">{result.jobNumber}</span>
                      {!result.success && result.error && (
                        <span className="truncate text-sm text-red-600">{result.error}</span>
                      )}
                    </div>
                  ))}
                  {results.length > 10 && (
                    <p className="text-muted-foreground text-sm">
                      ... and {results.length - 10} more results
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetDialog}>
            Cancel
          </Button>
          {selectedOperation && !isExecuting && (
            <Button onClick={executeBatchOperation} disabled={selectedCount === 0}>
              Execute Operation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
