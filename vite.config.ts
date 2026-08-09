import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {},
  build: {
    rollupOptions: {
      output: {
        // F43-b (Auditoria F42, Médio#1): split de vendors pesados — o entry
        // desce de ~3,17 MB (815 KB gzip) e cada chunk faz cache paralela.
        // @tensorflow fica FORA de propósito: já tem os seus chunks lazy (blazeface).
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('@tensorflow') || id.includes('blazeface')) return;
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('motion') || id.includes('framer')) return 'motion';
            if (id.includes('lucide-react')) return 'icons';
            return 'vendor';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    hmr: process.env.DISABLE_HMR !== 'true',
    // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
