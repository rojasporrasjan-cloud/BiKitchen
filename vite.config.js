import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],

  // Eliminar console.log/warn/debug del build de producción.
  // console.error se mantiene (errores reales que hay que ver).
  // En dev (command === 'serve') se mantienen todos para depuración.
  esbuild: {
    pure: command === 'build'
      ? ['console.log', 'console.debug', 'console.info', 'console.warn']
      : [],
  },

  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Helpers internos de Vite/Rollup (preload-helper, commonjsHelpers).
          // Los necesita el entry para poder hacer lazy loading, asi que si Rollup
          // los mete dentro de un vendor grande, ese vendor entero pasa a ser import
          // ESTATICO del entry y se descarga en todas las paginas.
          // Asi es como vendor-pdf (608 KB, solo admin) terminaba cargando en el home.
          if (id.includes('preload-helper') || id.includes('commonjsHelpers')) {
            return 'vendor-shared';
          }

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
}))
