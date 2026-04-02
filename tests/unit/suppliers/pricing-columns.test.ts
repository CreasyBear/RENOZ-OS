import { describe, expect, it, vi } from 'vitest'
import { createPricingColumns } from '@/components/domain/pricing/pricing-columns'

describe('pricing column truthfulness', () => {
  const columns = createPricingColumns({
    onSelect: vi.fn(),
    onShiftClickRange: vi.fn(),
    isAllSelected: false,
    isPartiallySelected: false,
    onSelectAll: vi.fn(),
    isSelected: vi.fn().mockReturnValue(false),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onSetPreferred: vi.fn(),
  })

  it('disables unsupported sortable headers', () => {
    const columnsById = new Map(columns.map((column) => [column.id, column]))

    expect(columnsById.get('productName')?.enableSorting).toBe(true)
    expect(columnsById.get('effectivePrice')?.enableSorting).toBe(true)
    expect(columnsById.get('effectiveDate')?.enableSorting).toBe(true)
    expect(columnsById.get('supplierName')?.enableSorting).toBe(false)
    expect(columnsById.get('minQuantity')?.enableSorting).toBe(false)
    expect(columnsById.get('discountPercent')?.enableSorting).toBe(false)
    expect(columnsById.get('status')?.enableSorting).toBe(false)
  })
})
