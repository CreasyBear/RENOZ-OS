// vite.config.ts
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { fileURLToPath, URL } from 'node:url'

// Temporary fix for TanStack Start virtual module issue
// This provides the missing virtual module that TanStack Start expects
function virtualTanstackHeadScripts() {
  return {
    name: 'virtual-tanstack-head-scripts',
    resolveId(id: string) {
      if (id === 'tanstack-start-injected-head-scripts:v') {
        return id
      }
    },
    load(id: string) {
      if (id === 'tanstack-start-injected-head-scripts:v') {
        // Return empty export to prevent the import error
        return 'export const injectedHeadScripts = null;'
      }
    },
  }
}

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    virtualTanstackHeadScripts(),
    tanstackStart(),
    react(),
    tailwindcss(),
    devtools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      drizzle: fileURLToPath(new URL('./drizzle', import.meta.url)),
    },
  },
  // Optimize large icon/component libraries to reduce bundle size
  // This enables tree-shaking for barrel imports from lucide-react
  optimizeDeps: {
    include: ['lucide-react'],
  },
  ssr: {
    external: ['postgres', 'drizzle-orm', 'drizzle-kit'],
    noExternal: [],
  },
  build: {
    rollupOptions: {
      external: ['postgres', 'drizzle-orm', 'chrono-node', /^node:/],
    },
  },
})
