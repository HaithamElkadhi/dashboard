import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sendProposalEmail } from './api/_lib/sendEmail.js';

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

  // Vercel's /api/*.js functions aren't served by plain `vite dev` — only by
  // `vercel dev` or an actual deployment. This middleware runs the same
  // send-email logic locally so "Send email" works under `npm run dev` too.
  const sendEmailDevMiddleware = () => ({
    name: 'dev-send-email',
    configureServer(server) {
      server.middlewares.use('/api/send-email', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Allow', 'POST');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }
        let raw = '';
        for await (const chunk of req) raw += chunk;
        let payload = {};
        try {
          payload = raw ? JSON.parse(raw) : {};
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }
        const { status, body } = await sendProposalEmail(payload, env);
        res.statusCode = status;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(body));
      });
    },
  });

  return {
    plugins: [react(), sendEmailDevMiddleware()],
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
