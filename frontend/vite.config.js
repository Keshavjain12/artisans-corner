import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    // Fail loudly on a port clash instead of silently hopping to another port.
    strictPort: true,
    // Keeps the browser on one origin in development, so cookies and CORS
    // behave the same locally as they do in production.
    proxy: {
      '/api': { target: 'http://localhost:5055', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5055', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
        },
      },
    },
  },
});
