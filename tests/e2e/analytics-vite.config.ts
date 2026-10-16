import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
export default defineConfig({
  root: path.join(root, 'frontend'),
  envPrefix: 'E2E_NO_INHERITED_APP_ENV_', envDir: path.join(here, 'fixture'),
  plugins: [{ name: 'synthetic-analytics-auth', enforce: 'pre', resolveId(source, importer) {
    if (!importer) return;
    const resolved = source.startsWith('.') ? path.resolve(path.dirname(importer.split('?')[0]), source) : source;
    if (/\/frontend\/src\/lib\/supabase(?:\.ts)?$/.test(resolved)) return path.join(here, 'support/analyticsSupabase.ts');
  } }, react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_GA4_ID': JSON.stringify('G-ANALYTICSTEST'),
    'import.meta.env.VITE_RELEASE_ID': JSON.stringify('synthetic-analytics'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(''),
    'import.meta.env.VITE_EMAIL_CHECK_ENABLED': JSON.stringify('false'),
    'import.meta.env.VITE_ADULT_ELIGIBILITY_ENABLED': JSON.stringify('false'),
  },
  server: { hmr: false, host: '127.0.0.1', port: 4186, strictPort: true, fs: { allow: [root] } },
});
