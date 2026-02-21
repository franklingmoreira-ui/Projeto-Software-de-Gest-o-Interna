import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // 🚨 É ESTA LINHA QUE FORÇA A ATUALIZAÇÃO NO WINDOWS
    },
    host: true,
    strictPort: true,
    port: 5173,
  }
})