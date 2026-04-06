import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Expose on LAN so phones/tablets on same WiFi can access it
    port: 3000,
    strictPort: true,
  },
})
