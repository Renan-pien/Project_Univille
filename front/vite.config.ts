import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Keep the same local address for development and production previews.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT || 8443),
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT || 8443),
  },
})
