#!/usr/bin/env bun
/**
 * Buffer Issue Diagnostic Tool
 *
 * This script helps identify where Buffer is being used in the codebase
 * and which files might be leaking to the client.
 *
 * Usage: bun run scripts/diagnose-buffer-issues.ts
 */

import { readdir, readFile } from 'fs/promises'
import { join, relative } from 'path'

const ROOT_DIR = process.cwd()
const SRC_DIR = join(ROOT_DIR, 'src')

// Patterns that indicate server-only code
const SERVER_PATTERNS = [
  /import\s+.*\s+from\s+['"]postgres['"]/,
  /import\s+.*\s+from\s+['"]@\/lib\/db['"]/,
  /import\s+.*\s+from\s+['"]@\/lib\/storage['"]/,
  /process\.env\./,
  /Buffer\./,
  /createServerFn/,
]

// Patterns that indicate client-side code
const CLIENT_PATTERNS = [
  /['"]use client['"]/,
  /useState\s*\(/,
  /useEffect\s*\(/,
  /useCallback\s*\(/,
  /useQuery\s*\(/,
  /useMutation\s*\(/,
  /createFileRoute/,
]

interface FileAnalysis {
  path: string
  hasServerCode: boolean
  hasClientCode: boolean
  hasUseServerDirective: boolean
  hasUseClientDirective: boolean
  usesBuffer: boolean
  imports: string[]
}

async function* walkDir(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
      yield* walkDir(path)
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      yield path
    }
  }
}

async function analyzeFile(filePath: string): Promise<FileAnalysis | null> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n')
    
    const analysis: FileAnalysis = {
      path: relative(ROOT_DIR, filePath),
      hasServerCode: false,
      hasClientCode: false,
      hasUseServerDirective: false,
      hasUseClientDirective: false,
      usesBuffer: false,
      imports: [],
    }

    // Check first 20 lines for directives
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i]
      if (line.includes("'use server'") || line.includes('"use server"')) {
        analysis.hasUseServerDirective = true
      }
      if (line.includes("'use client'") || line.includes('"use client"')) {
        analysis.hasUseClientDirective = true
      }
    }

    // Analyze full content
    for (const line of lines) {
      // Check for imports
      const importMatch = line.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/)
      if (importMatch) {
        analysis.imports.push(importMatch[1])
      }

      // Check for server patterns
      if (SERVER_PATTERNS.some(p => p.test(line))) {
        analysis.hasServerCode = true
      }
      if (line.includes('Buffer.')) {
        analysis.usesBuffer = true
      }

      // Check for client patterns
      if (CLIENT_PATTERNS.some(p => p.test(line))) {
        analysis.hasClientCode = true
      }
    }

    return analysis
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    return null
  }
}

async function main() {
  console.log('🔍 Analyzing codebase for Buffer issues...\n')

  const files: FileAnalysis[] = []
  
  for await (const filePath of walkDir(SRC_DIR)) {
    const analysis = await analyzeFile(filePath)
    if (analysis) {
      files.push(analysis)
    }
  }

  // Find problematic files
  const serverFilesWithoutDirective = files.filter(f => 
    f.hasServerCode && !f.hasUseServerDirective && !f.hasUseClientDirective
  )

  const clientFilesUsingBuffer = files.filter(f =>
    f.hasClientCode && f.usesBuffer && !f.hasUseServerDirective
  )

  const filesUsingPostgresWithoutDirective = files.filter(f =>
    f.imports.some(i => i.includes('postgres')) && !f.hasUseServerDirective
  )

  console.log('📊 Summary:')
  console.log(`  Total files analyzed: ${files.length}`)
  console.log(`  Files with 'use server': ${files.filter(f => f.hasUseServerDirective).length}`)
  console.log(`  Files with 'use client': ${files.filter(f => f.hasUseClientDirective).length}`)
  console.log(`  Files using Buffer: ${files.filter(f => f.usesBuffer).length}`)
  console.log()

  if (serverFilesWithoutDirective.length > 0) {
    console.log('⚠️  Server files missing "use server" directive:')
    for (const file of serverFilesWithoutDirective) {
      console.log(`   - ${file.path}`)
    }
    console.log()
  }

  if (clientFilesUsingBuffer.length > 0) {
    console.log('🚨 CRITICAL: Client files using Buffer (will cause errors):')
    for (const file of clientFilesUsingBuffer) {
      console.log(`   - ${file.path}`)
    }
    console.log()
  }

  if (filesUsingPostgresWithoutDirective.length > 0) {
    console.log('🚨 CRITICAL: Files importing postgres without "use server":')
    for (const file of filesUsingPostgresWithoutDirective) {
      console.log(`   - ${file.path}`)
    }
    console.log()
  }

  // Find all files that import from problematic modules
  const filesImportingStorage = files.filter(f =>
    f.imports.some(i => i === '@/lib/storage' || i === '~/lib/storage')
  )
  
  if (filesImportingStorage.length > 0) {
    console.log('📦 Files importing from @/lib/storage:')
    for (const file of filesImportingStorage) {
      const hasDirective = file.hasUseServerDirective ? ' (use server)' : ''
      console.log(`   - ${file.path}${hasDirective}`)
    }
    console.log()
  }

  // List all Buffer usages
  const allBufferUsages = files.filter(f => f.usesBuffer)
  if (allBufferUsages.length > 0) {
    console.log('🔎 All files using Buffer:')
    for (const file of allBufferUsages) {
      const directive = file.hasUseServerDirective ? ' ✓ use server' : 
                       file.hasUseClientDirective ? ' ⚠️ use client' : ' ⚠️ NO DIRECTIVE'
      console.log(`   - ${file.path}${directive}`)
    }
  }
}

main().catch(console.error)
