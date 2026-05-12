import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function compact(source: string): string {
  return source.replace(/\s+/g, '')
}

function sliceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe('inventory browser bulk status contract', () => {
  it('keeps bulk status as a reasoned disposition workflow, not allocation or sale control', () => {
    const source = read('src/components/domain/inventory/inventory-browser.tsx')
    const compactSource = compact(source)
    const statusOptions = sliceBetween(
      source,
      'const BULK_STATUS_OPTIONS',
      '// ============================================================================\n// COMPONENT'
    )

    expect(compactSource).toContain('onBulkStatusChange?:(')
    expect(compactSource).toContain('selectedIds.size>0')
    expect(compactSource).toContain('Inventorystatuschangesneedanauditreason.')
    expect(compactSource).toContain('Allocationandsoldstatesremaincontrolledbyfulfillmentworkflows.')
    expect(statusOptions).toContain('value: "available"')
    expect(statusOptions).toContain('value: "quarantined"')
    expect(statusOptions).toContain('value: "damaged"')
    expect(statusOptions).toContain('value: "returned"')
    expect(statusOptions).not.toContain('value: "allocated"')
    expect(statusOptions).not.toContain('value: "sold"')
  })
})
