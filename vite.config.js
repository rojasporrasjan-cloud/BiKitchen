import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate vendor chunks for better caching
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('firebase/auth')) {
              return 'vendor-firebase-auth';
            }
            if (id.includes('firebase/firestore')) {
              return 'vendor-firebase-firestore';
            }
            if (id.includes('firebase/storage')) {
              return 'vendor-firebase-storage';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase-core';
            }
            if (id.includes('lucide')) {
              return 'vendor-icons';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs')) {
              return 'vendor-charts';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('heic2any')) {
              return 'vendor-heic';
            }
          }
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
    // Minify for production (esbuild is faster and built-in)
    minify: 'esbuild',
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // Enable source maps for debugging (optional, can disable for smaller build)
    sourcemap: false
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion']
  }
})
