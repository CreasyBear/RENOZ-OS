import { defineConfig } from '@tanstack/react-start/config'

export default defineConfig({
  server: {
    preset: 'vercel',
  },
  router: {
    // Exclude page/layout/nav/tab/type files from route tree (they're imported by route files, not routes)
    routeFileIgnorePattern: '-(page|layout|nav|tab|types|container)\\.(tsx|ts)$',
  },
})