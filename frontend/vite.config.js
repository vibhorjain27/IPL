import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/IPL/',   // GitHub Pages repo name
  server: {
    port: 5173,
  },
})
