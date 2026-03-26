import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true, // allows describe/it without imports
    include: ['tests/**/*.test.ts'],
    coverage: {
      enabled: true, // Explicitly enable coverage
      provider: 'v8', // Specify the provider (optional, v8 is default)
      include: ['src/**/*.{ts,tsx}'], // Include source files for coverage
      reporter: ['text', 'json', 'html'], // Output reporters
      reportsDirectory: './coverage', // Change output folder
    },
  },
  resolve: {
    alias: {
      '#': path.resolve(__dirname, './src'),
    },
  },
});