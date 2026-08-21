import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/doctors': 'http://localhost:3000',
      '/specialties': 'http://localhost:3000',
      '/appointments': 'http://localhost:3000',
      '/availability': 'http://localhost:3000',
      '/pharmacies': 'http://localhost:3000',
      '/orders': 'http://localhost:3000',
      '/reviews': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
      '/favorites': 'http://localhost:3000',
      '/payments': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'lucide-react', 'react-hot-toast'],
          maps: ['leaflet', 'react-leaflet'],
          query: ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});

