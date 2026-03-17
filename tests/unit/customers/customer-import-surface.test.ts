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
})
