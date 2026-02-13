import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const commandPalettePath = resolve(__dirname, '../../../src/components/layout/command-palette.tsx')
const source = readFileSync(commandPalettePath, 'utf-8')

describe('command palette quick actions', () => {
  it('uses /pipeline/new for new opportunity action', () => {
    expect(source).toContain("id: 'create-quote'")
    expect(source).toContain("route: '/pipeline/new'")
  })

  it('does not include dynamic placeholder routes in quick actions', () => {
    expect(source).not.toContain("route: '/pipeline/$opportunityId'")
  })
})
