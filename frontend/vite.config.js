import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In local dev, forward /api/* to the Express server (on Vercel they share one domain)
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
