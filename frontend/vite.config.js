import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* Defaults are the development ports; the browser suite overrides both so it
   runs on its own pair and can never write into a real local database. */
const CLIENT_PORT = Number(process.env.CLIENT_PORT) || 5273;
const API_PORT = Number(process.env.API_PORT) || 5055;
const API = `http://localhost:${API_PORT}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: CLIENT_PORT,
    // Fail loudly on a port clash instead of silently hopping to another port.
    strictPort: true,
    // Keeps the browser on one origin in development, so cookies and CORS
    // behave the same locally as they do in production.
    proxy: {
      '/api': { target: API, changeOrigin: true },
      '/uploads': { target: API, changeOrigin: true },
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
