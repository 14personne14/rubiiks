import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // Parser les ALLOWED_ORIGINS depuis le .env
  const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : []
  const allowedHosts = allowedOrigins.map(origin => {
    try {
      return new URL(origin).hostname
    } catch {
      return origin
    }
  }).filter(Boolean)

  return {
    plugins: [react()],
    server: {
      host: true,
      allowedHosts: allowedHosts.length > 0 ? allowedHosts : 'auto',
      proxy: {
        // Proxy des appels API vers le serveur Express
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        },
        // Proxy pour les fichiers cubes (images, PDFs)
        '/cubes': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        },
        // Proxy pour les assets
        '/assets': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})
