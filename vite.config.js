// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],

  // ── Path aliases ──
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@api': resolve(__dirname, 'src/services'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@store': resolve(__dirname, 'src/store'),
      '@utils': resolve(__dirname, 'src/utils'),
    }
  },

  // ── Dev server ──
  server: {
    port: 5173,
    host: true,
    // Proxy ke Vercel API functions saat dev lokal
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },

  // ── Build output ──
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Code splitting per chunk
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/database', 'firebase/storage'],
          'gemini-vendor': ['@google/generative-ai'],
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },

  // ── Env variables — semua VITE_ prefix ──
  envPrefix: 'VITE_',

  // ── Optimasi dependencies ──
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/database',
      'firebase/storage',
      '@google/generative-ai',
      'zustand',
      'react-markdown',
      'react-syntax-highlighter'
    ]
  }
});
