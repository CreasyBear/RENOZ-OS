import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { stockTransferFormSchema } from '@/lib/schemas/inventory/stock-transfer-form'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function compact(source: string): string {
  return source.replace(/\s+/g, '')
}

describe('stock transfer reason contract', () => {
  it('requires a reason in the operator transfer dialog schema', () => {
    expect(() =>
      stockTransferFormSchema.parse({
        toLocationId: 'location-1',
        quantity: 1,
        reason: '   ',
      })
    ).toThrow('Transfer reason is required')

    expect(
      stockTransferFormSchema.parse({
        toLocationId: 'location-1',
        quantity: 1,
        reason: '  Move to dispatch shelf  ',
      })
    ).toMatchObject({ reason: 'Move to dispatch shelf' })
  })

  it('renders transfer reason as required instead of optional', () => {
    const dialog = read('src/components/domain/inventory/stock-transfer-dialog.tsx')

    expect(dialog).toContain('label="Reason"')
    expect(dialog).toContain('required')
    expect(dialog).not.toContain('Reason (Optional)')
  })

  it('requires and forwards transfer reason from generic movement recording', () => {
    const source = compact(read('src/server/functions/products/product-inventory.ts'))

    expect(source).toContain('consttransferReason=')
    expect(source).toContain("thrownewValidationError('Transfermovementrequiresareason'")
    expect(source).toContain("reason:['Provideatransferreasonwhenrecordingtransfermovements']")
    expect(source).toContain('reason:transferReason')
  })
})
