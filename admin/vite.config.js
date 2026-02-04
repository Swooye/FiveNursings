import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // This rule handles the special case for the login route
      '/api/login': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        // Rewrite the path from /api/login to /login to match the backend
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // This is the general rule for all other API requests
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        // No rewrite needed here, as other routes like /api/users exist on the backend
      },
    },
  },
})
