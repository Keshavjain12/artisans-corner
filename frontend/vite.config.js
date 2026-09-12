import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const CLIENT_PORT = Number(process.env.CLIENT_PORT) || 5273;
const API_PORT = Number(process.env.API_PORT) || 5055;
const API = `http://localhost:${API_PORT}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: CLIENT_PORT,
    strictPort: true,
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
