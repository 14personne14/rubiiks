import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy des appels API vers le serveur Express
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      // Proxy pour les fichiers statiques (images, PDFs)
      '/images': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/solutions': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
