import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function collectFiles(root: string): string[] {
  const entries = readdirSync(root)
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(root, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      files.push(...collectFiles(fullPath))
      continue
    }

    if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath)
    }
  }

  return files
}

describe('customer import surface', () => {
  it('does not keep the legacy customer server module around', () => {
    expect(existsSync(join(process.cwd(), 'src/server/customers.ts'))).toBe(false)
  })

  it('does not keep retired customer directory/table surfaces around', () => {
    expect(existsSync(join(process.cwd(), 'src/components/domain/customers/customer-directory.tsx'))).toBe(false)
    expect(existsSync(join(process.cwd(), 'src/components/domain/customers/customer-table.tsx'))).toBe(false)

    const index = readFileSync(join(process.cwd(), 'src/components/domain/customers/index.ts'), 'utf8')
    expect(index).not.toContain('CustomerDirectory')
    expect(index).not.toContain("from './customer-table'")
  })

  it('does not keep the retired customer bulk export dialog surface around', () => {
    expect(existsSync(join(process.cwd(), 'src/components/domain/customers/bulk/bulk-export.tsx'))).toBe(false)

    const bulkIndex = readFileSync(join(process.cwd(), 'src/components/domain/customers/bulk/index.ts'), 'utf8')
    const domainIndex = readFileSync(join(process.cwd(), 'src/components/domain/customers/index.ts'), 'utf8')

    expect(bulkIndex).not.toContain('BulkExport')
    expect(domainIndex).not.toContain('BulkExport')
  })

  it('does not reference the legacy customer server import path anywhere in src or tests', () => {
    const currentTestFile = join(process.cwd(), 'tests/unit/customers/customer-import-surface.test.ts')
    const files = [
      ...collectFiles(join(process.cwd(), 'src')),
      ...collectFiles(join(process.cwd(), 'tests')),
    ].filter((file) => file !== currentTestFile)

    for (const file of files) {
      const contents = readFileSync(file, 'utf8')
      expect(contents).not.toContain("@/server/customers")
    }
  })

  it('does not reference retired customer directory/table import paths anywhere in src or tests', () => {
    const currentTestFile = join(process.cwd(), 'tests/unit/customers/customer-import-surface.test.ts')
    const files = [
      ...collectFiles(join(process.cwd(), 'src')),
      ...collectFiles(join(process.cwd(), 'tests')),
    ].filter((file) => file !== currentTestFile)

    for (const file of files) {
      const contents = readFileSync(file, 'utf8')
      expect(contents).not.toContain('CustomerDirectory')
      expect(contents).not.toContain('./customer-directory')
      expect(contents).not.toContain('./customer-table')
      expect(contents).not.toContain('@/components/domain/customers/customer-directory')
      expect(contents).not.toContain('@/components/domain/customers/customer-table')
    }
  })

  it('does not reference the retired customer bulk export dialog anywhere in src or tests', () => {
    const currentTestFile = join(process.cwd(), 'tests/unit/customers/customer-import-surface.test.ts')
    const files = [
      ...collectFiles(join(process.cwd(), 'src')),
      ...collectFiles(join(process.cwd(), 'tests')),
    ].filter((file) => file !== currentTestFile)

    for (const file of files) {
      const contents = readFileSync(file, 'utf8')
      expect(contents).not.toContain('./bulk-export')
      expect(contents).not.toContain('@/components/domain/customers/bulk/bulk-export')
    }
  })
})
