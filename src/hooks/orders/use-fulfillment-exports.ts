/**
 * Fulfillment Kanban Export Hook
 *
 * Provides functionality for exporting fulfillment kanban data.
 * Uses the existing data export system for background processing.
 */

import { useMutation } from '@tanstack/react-query';
import { createDataExport } from '@/server/functions/settings/data-exports';
import { useServerFn } from '@tanstack/react-start';
import { logger } from '@/lib/logger';

export interface ExportFulfillmentKanbanOptions {
  filters: {
    priority?: string;
    status?: string;
    customerId?: string;
    dateRange?: string;
    searchQuery?: string;
  };
  format: 'csv' | 'json' | 'xlsx';
}

/**
 * Hook for exporting fulfillment kanban data
 */
export function useFulfillmentKanbanExport() {
  const createExportFn = useServerFn(createDataExport);

  const exportMutation = useMutation({
    mutationFn: async (options: ExportFulfillmentKanbanOptions) => {
      const { filters, format } = options;

      // Convert kanban filters to export filters
      const exportFilters: Record<string, unknown> = {};

      if (filters.priority && filters.priority !== 'all') {
        exportFilters.priority = filters.priority;
      }

      if (filters.status && filters.status !== 'all') {
        exportFilters.status = filters.status;
      }

      if (filters.customerId && filters.customerId !== 'all') {
        exportFilters.customerId = filters.customerId;
      }

      if (filters.searchQuery) {
        exportFilters.search = filters.searchQuery;
      }

      // Convert dateRange filter
      if (filters.dateRange && filters.dateRange !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filters.dateRange) {
          case 'today':
            exportFilters.dateFrom = today.toISOString().split('T')[0];
            exportFilters.dateTo = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
              .toISOString()
              .split('T')[0];
            break;
          case 'this_week': {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            exportFilters.dateFrom = startOfWeek.toISOString().split('T')[0];
            exportFilters.dateTo = endOfWeek.toISOString().split('T')[0];
            break;
          }
          case 'overdue':
            exportFilters.dateTo = new Date(today.getTime() - 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0];
            break;
          case 'upcoming': {
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            exportFilters.dateFrom = today.toISOString().split('T')[0];
            exportFilters.dateTo = nextWeek.toISOString().split('T')[0];
            break;
          }
        }
      }

      // Filter to only fulfillment workflow orders
      exportFilters.status = ['confirmed', 'picking', 'picked', 'shipped'];

      logger.info('Creating fulfillment kanban export', {
        filters: exportFilters,
        format,
        domain: 'fulfillment-kanban',
      });

      const result = await createExportFn({
        data: {
          entities: ['orders'],
          format,
          filters: exportFilters,
          includedFields: [
            'id',
            'orderNumber',
            'customerName',
            'status',
            'itemCount',
            'total',
            'requiredDate',
            'priority',
            'assignedTo',
            'createdAt',
            'metadata',
          ],
        },
      });

      return result;
    },
    onSuccess: (data) => {
      logger.info('Fulfillment kanban export created successfully', {
        exportId: data.id,
        domain: 'fulfillment-kanban',
      });
    },
    onError: (error) => {
      logger.error('Failed to create fulfillment kanban export', {
        error: error.message,
        domain: 'fulfillment-kanban',
      });
    },
  });

  return {
    exportData: exportMutation.mutateAsync,
    isExporting: exportMutation.isPending,
    error: exportMutation.error,
  };
}
