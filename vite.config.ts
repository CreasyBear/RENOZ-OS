// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import { fileURLToPath, URL } from 'node:url'

const VIRTUAL_ID = '\0tanstack-start-injected-head-scripts:v'

/**
 * Provides the tanstack-start-injected-head-scripts virtual module.
 * TanStack Start's built-in plugin only applies when env.config.consumer === 'server',
 * which can fail during import analysis. This plugin ensures the module always resolves
 * and provides the real scripts from Vite's transformIndexHtml (same as TanStack).
 */
function virtualTanstackHeadScripts() {
  let injectedHeadScripts: string | undefined
  return {
    name: 'virtual-tanstack-head-scripts',
    async configureServer(viteDevServer: import('vite').ViteDevServer) {
      const templateHtml = `<html><head></head><body></body></html>`
      const transformedHtml = await viteDevServer.transformIndexHtml(
        '/',
        templateHtml,
      )
      const scripts: string[] = []
      const regex = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi
      let match
      while ((match = regex.exec(transformedHtml)) !== null) {
        const content = match[1]?.trim()
        if (content) scripts.push(content)
      }
      injectedHeadScripts = scripts.join(';') || undefined
    },
    resolveId(id: string) {
      if (id === 'tanstack-start-injected-head-scripts:v') return VIRTUAL_ID
    },
    load(id: string) {
      if (id === VIRTUAL_ID) {
        const value =
          injectedHeadScripts !== undefined
            ? JSON.stringify(injectedHeadScripts)
            : 'undefined'
        return `export const injectedHeadScripts = ${value};`
      }
    },
  }
}

/**
 * Server-only module stub - prevents Node.js packages from being bundled to client
 *
 * The 'use server' directive prevents execution but NOT bundling.
 * This replaces server-only modules with stubs that throw helpful errors.
 */
function serverOnlyModulesStub() {
  const stubs: Record<string, string> = {
    postgres: `
function throwServerOnly() { throw new Error('[postgres] Server-only module'); }
export default function postgres() { throwServerOnly(); }
export const PostgresError = class extends Error {};
`,
    '@trigger.dev/sdk': `
function throwServerOnly() { throw new Error('[@trigger.dev/sdk] Server-only module'); }
export const task = () => throwServerOnly();
export const tasks = { trigger: () => throwServerOnly() };
export const logger = { info: () => {}, error: () => {} };
export const schedules = { create: () => throwServerOnly() };
export const cronTrigger = () => throwServerOnly();
export const eventTrigger = () => throwServerOnly();
export const TriggerClient = class { constructor() { throwServerOnly(); } };
`,
    '@trigger.dev/sdk/v3': `
function throwServerOnly() { throw new Error('[@trigger.dev/sdk/v3] Server-only module'); }
export const task = () => () => throwServerOnly();
export const tasks = { trigger: () => throwServerOnly() };
export const logger = { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} };
export const schedules = { create: () => throwServerOnly() };
export const cronTrigger = () => throwServerOnly();
export const eventTrigger = () => throwServerOnly();
export const wait = { for: () => throwServerOnly() };
`,
    // Trigger.dev client (src/trigger/client.ts) - should not be in client
    '@trigger/client': `
function throwServerOnly() { throw new Error('[@trigger/client] Server-only module'); }
export const client = { defineJob: () => throwServerOnly(), sendEvent: () => throwServerOnly() };
export const TriggerClient = class { constructor() { throwServerOnly(); } };
export const orderEvents = {};
export const inventoryEvents = {};
export const warrantyEvents = {};
export const userEvents = {};
export const documentEvents = {};
`,
    // TanStack Router SSR stream utils - should not be in client
    '@tanstack/router-core/dist/esm/ssr/transformStreamWithRouter.js': `
export function transformStreamWithRouter() { throw new Error('SSR only'); }
export function transformReadableStreamWithRouter() { throw new Error('SSR only'); }
export function transformPipeableStreamWithRouter() { throw new Error('SSR only'); }
`,
    // Node.js stream polyfill for browser
    'node:stream': `
export const Readable = class { static fromWeb() { throw new Error('Node stream in browser'); } static toWeb() { throw new Error('Node stream in browser'); } pipe() { throw new Error('Node stream in browser'); } };
export const PassThrough = class extends Readable {};
export const ReadableStream = globalThis.ReadableStream;
`,
    'node:stream/web': `
export const ReadableStream = globalThis.ReadableStream;
`,
    // AsyncLocalStorage stub for browser
    'node:async_hooks': `
export class AsyncLocalStorage {
  getStore() { return undefined; }
  run(store, callback, ...args) { return callback(...args); }
  enterWith(store) {}
}
`,
    // bcrypt is a native Node.js module - cannot run in browser
    bcrypt: `
function throwServerOnly() { throw new Error('[bcrypt] Server-only module'); }
export default { hash: () => throwServerOnly(), compare: () => throwServerOnly() };
`,
  }

  return {
    name: 'server-only-modules-stub',
    enforce: 'pre' as const,
    resolveId(id: string, _importer: string | undefined, options: { ssr?: boolean }) {
      if (options?.ssr) return null

      // Handle @/trigger/client alias
      if (id === '@/trigger/client' || id.includes('/trigger/client')) {
        return '\0stub:@trigger/client'
      }

      // Check for exact match first
      if (stubs[id]) return `\0stub:${id}`
      // Handle node: protocol and subpaths
      for (const key of Object.keys(stubs)) {
        if (id.startsWith(key)) return `\0stub:${key}`
      }
      return null
    },
    load(id: string) {
      if (id.startsWith('\0stub:')) {
        const moduleId = id.slice('\0stub:'.length)
        return stubs[moduleId] || `export default () => { throw new Error('[${moduleId}] Server-only'); };`
      }
      return null
    }
  }
}

export default defineConfig({
  logLevel: 'warn',
  server: { port: 3000 },
  plugins: [
    serverOnlyModulesStub(),
    tanstackStart(),
    nitro(),
    react(),
    virtualTanstackHeadScripts(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      'react-dom/server': fileURLToPath(
        new URL('./src/lib/shims/react-dom-server.ts', import.meta.url)
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      drizzle: fileURLToPath(new URL('./drizzle', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ['lucide-react'],
    exclude: ['postgres', '@trigger.dev/sdk', '@trigger.dev/sdk/v3'],
  },
  ssr: {
    external: ['postgres', '@trigger.dev/sdk', '@trigger.dev/sdk/v3'],
  },
  build: {
    rollupOptions: {
      // Reduce parallelism to lower peak memory (mitigates OOM with Nitro + TanStack Start)
      maxParallelFileOps: 2,
      onwarn(warning, warn) {
        // Suppress "use client" directive warnings from node_modules (framer-motion, radix, etc.)
        // - harmless: Rollup strips them during SSR bundle; apps work correctly
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message?.includes('use client')) {
          return
        }
        warn(warning)
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'recharts';
            if (id.includes('@tanstack')) return 'tanstack';
            if (id.includes('@radix-ui')) return 'radix';
            if (id.includes('framer-motion')) return 'framer-motion';
          }
        },
      },
    },
  },
})
