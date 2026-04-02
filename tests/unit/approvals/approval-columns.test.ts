import { describe, expect, it, vi } from 'vitest'
import { createApprovalColumns } from '@/components/domain/approvals/approval-columns'

describe('approval column truthfulness', () => {
  it('does not advertise unsupported purchase-order approval sorts', () => {
    const columns = createApprovalColumns({
      isPendingTab: true,
      onSelect: vi.fn(),
      onSelectAll: vi.fn(),
      onDecisionClick: vi.fn(),
      selectedItems: [],
      allItems: [],
    })

    const columnsById = new Map(columns.map((column) => [column.id, column]))

    expect(columnsById.get('poNumber')?.enableSorting).toBe(false)
    expect(columnsById.get('status')?.enableSorting).toBe(false)
    expect(columnsById.get('amount')?.enableSorting).toBe(false)
    expect(columnsById.get('priority')?.enableSorting).toBe(false)
    expect(columnsById.get('daysOverdue')?.enableSorting).toBe(false)
    expect(columnsById.get('submittedAt')?.enableSorting).toBe(false)
    expect(columnsById.get('dueDate')?.enableSorting).toBe(false)
  })
})
