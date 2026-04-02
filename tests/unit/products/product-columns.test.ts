import { describe, expect, it, vi } from 'vitest'
import { createProductColumns } from '@/components/domain/products/product-columns'

describe('product column truthfulness', () => {
  const columns = createProductColumns({
    onSelect: vi.fn(),
    onShiftClickRange: vi.fn(),
    isAllSelected: false,
    isPartiallySelected: false,
    onSelectAll: vi.fn(),
    isSelected: vi.fn().mockReturnValue(false),
    onViewProduct: vi.fn(),
    onEditProduct: vi.fn(),
    onDuplicateProduct: vi.fn(),
    onDeleteProduct: vi.fn(),
  })

  it('only advertises server-backed product sorts', () => {
    const columnsById = new Map(columns.map((column) => [column.id, column]))

    expect(columnsById.get('sku')?.enableSorting).toBe(true)
    expect(columnsById.get('name')?.enableSorting).toBe(true)
    expect(columnsById.get('basePrice')?.enableSorting).toBe(true)
    expect(columnsById.get('type')?.enableSorting).toBe(false)
    expect(columnsById.get('status')?.enableSorting).toBe(false)
  })
})
