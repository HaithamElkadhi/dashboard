import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The Airtable Personal Access Token is read from the environment (.env) and
// injected server-side by the dev proxy. This keeps the key OUT of the client
// bundle and sidesteps browser CORS restrictions.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const token = env.AIRTABLE_API_KEY || '';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/airtable': {
          target: 'https://api.airtable.com/v0',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/airtable/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (token) proxyReq.setHeader('Authorization', `Bearer ${token}`);
            });
          },
        },
      },
    },
  };
});
