import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

export default defineConfig({
  root: path.join(here, 'fixture'),
  envPrefix: 'E2E_NO_INHERITED_APP_ENV_',
  envDir: path.join(here, 'fixture'), // Never load the application's real environment.
  plugins: [{
    name: 'synthetic-auth-only', enforce: 'pre',
    resolveId(source, importer) {
      if (!importer) return;
      const resolved = source.startsWith('.') ? path.resolve(path.dirname(importer.split('?')[0]), source) : source;
      if (/\/frontend\/src\/lib\/supabase(?:\.ts)?$/.test(resolved)) return path.join(here, 'support/supabase.ts');
    },
  }, react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_NOTIFICATIONS_REPLIES_ENABLED': JSON.stringify('true'),
    'import.meta.env.VITE_AI_RETENTION_ENABLED': JSON.stringify('true'),
    'import.meta.env.VITE_GA4_ID': JSON.stringify(''),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(''),
  },
  build: { rollupOptions: { input: { components:path.join(here,'fixture/index.html'), app:path.join(here,'fixture/app.html'), ui:path.join(here,'fixture/ui.html') } } },
  server: { hmr: false, host: '127.0.0.1', port: 4178, strictPort: true, fs: { allow: [root] } },
});
