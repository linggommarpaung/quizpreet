import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  root: './',
  plugins: [react()],
  build: {
    outDir: './dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-bundle': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'react-router-bundle': ['react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true,
    historyApiFallback: true, // <-- Tambahkan ini
  },
});
