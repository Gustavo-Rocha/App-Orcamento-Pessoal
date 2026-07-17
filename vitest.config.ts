import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 40,
        branches: 80,
        statements: 80,
      },
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        'src/middleware.ts',
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/app/(dashboard)/layout.tsx',
        'src/app/(dashboard)/dashboard/page.tsx',
        'src/app/(dashboard)/budgets/page.tsx',
        'src/app/(dashboard)/categories/page.tsx',
        'src/app/(dashboard)/transactions/page.tsx',
        'src/app/(auth)/register/page.tsx',
        'src/app/(auth)/login/page.tsx',
        'src/app/auth/callback/route.ts',
        'src/lib/supabase/server.ts',
        'temp-app/**',
      ],
    },
  },
})
