import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : undefined,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (!normalizedId.includes('/node_modules/')) return;

          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/') ||
            normalizedId.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
          if (
            normalizedId.includes('/node_modules/react-router/') ||
            normalizedId.includes('/node_modules/react-router-dom/')
          ) {
            return 'vendor-router';
          }
          if (normalizedId.includes('/node_modules/@mui/icons-material/')) {
            return 'vendor-mui-icons';
          }
          if (normalizedId.includes('/node_modules/@mui/x-date-pickers/')) {
            return 'vendor-mui-pickers';
          }
          if (normalizedId.includes('/node_modules/@toolpad/')) {
            return 'vendor-toolpad';
          }
          if (
            normalizedId.includes('/node_modules/@mui/') ||
            normalizedId.includes('/node_modules/@emotion/') ||
            normalizedId.includes('/node_modules/@popperjs/')
          ) {
            return 'vendor-mui';
          }
          if (normalizedId.includes('/node_modules/react-icons/')) {
            return 'vendor-react-icons';
          }
          if (
            normalizedId.includes('/node_modules/recharts/') ||
            normalizedId.includes('/node_modules/d3-') ||
            normalizedId.includes('/node_modules/victory-vendor/')
          ) {
            return 'vendor-charts';
          }
          if (normalizedId.includes('/node_modules/xlsx/')) {
            return 'vendor-xlsx';
          }
          if (normalizedId.includes('/node_modules/papaparse/')) {
            return 'vendor-papaparse';
          }
          if (
            normalizedId.includes('/node_modules/axios/') ||
            normalizedId.includes('/node_modules/dayjs/') ||
            normalizedId.includes('/node_modules/react-helmet-async/')
          ) {
            return 'vendor-utils';
          }
        },
      },
    },
  },
  preview: {
    // Production hosting must send these headers too; vite preview is not a production server.
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self'",
        "img-src 'self' data: blob: https://images.unsplash.com http://localhost:5000 http://127.0.0.1:5000 https://i.pravatar.cc https://picsum.photos https://via.placeholder.com",
        "connect-src 'self' http://localhost:5000 http://127.0.0.1:5000",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/uploads': 'http://127.0.0.1:5000',
    },
  },
}))
