import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      'drizzle': fileURLToPath(new URL('./drizzle', import.meta.url)),
    },
  },
  // Mark server-only packages as external
  ssr: {
    external: ['postgres', 'drizzle-orm', 'drizzle-kit'],
    noExternal: [],
  },
  build: {
    rollupOptions: {
      external: [
        'postgres',
        'drizzle-orm',
        /^node:/,
      ],
    },
  },
})
