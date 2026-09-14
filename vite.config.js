import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The Airtable Personal Access Token is read from the environment (.env) and
// injected server-side by the dev proxy. This keeps the key OUT of the client
// bundle and sidesteps browser CORS restrictions.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const token = env.AIRTABLE_API_KEY || '';

  const withAuth = (proxy) => {
    proxy.on('proxyReq', (proxyReq) => {
      if (token) proxyReq.setHeader('Authorization', `Bearer ${token}`);
    });
  };

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Attachment uploads (content.airtable.com). Must NOT share the
        // `/api/airtable` prefix — Vite matches proxies by startsWith.
        '/api/at-content': {
          target: 'https://content.airtable.com/v0',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/at-content/, ''),
          configure: withAuth,
        },
        '/api/airtable': {
          target: 'https://api.airtable.com/v0',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/airtable/, ''),
          configure: withAuth,
        },
      },
    },
  };
});
