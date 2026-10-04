import ticketing from '../ticketing.js';
import studentDocuments from '../student-documents.js';
import login from '../auth/login.js';
import me from '../auth/me.js';
import logout from '../auth/logout.js';
import proxy from '../proxy.js';
import sendEmail from '../send-email.js';
import adminUsers from '../admin/users.js';

export function devApi(env) {
  return {
    name: 'local-authenticated-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        let handler = { '/api/student-documents': studentDocuments, '/api/ticketing': ticketing, '/api/auth/login': login, '/api/auth/me': me, '/api/auth/logout': logout, '/api/admin/users': adminUsers, '/api/send-email': sendEmail, '/api/proxy': proxy }[url.pathname];
        for (const [prefix, host] of [['/api/airtable/', null], ['/api/at-content/', 'content']]) {
          if (url.pathname.startsWith(prefix)) {
            const path = url.pathname.slice(prefix.length);
            url.pathname = '/api/proxy';
            url.searchParams.set('__p', path);
            if (host) url.searchParams.set('__host', host);
            req.url = url.pathname + url.search;
            handler = proxy;
          }
        }
        if (!handler) return next();
        res.status = (status) => { res.statusCode = status; return res; };
        res.json = (body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
        res.send = (body) => res.end(body);
        try {
          let raw = '';
          for await (const chunk of req) {
            raw += chunk;
            if (Buffer.byteLength(raw) > 5 * 1024 * 1024) return res.status(413).json({ error: 'Requête trop volumineuse.' });
          }
          if (raw) { try { req.body = JSON.parse(raw); } catch { return res.status(400).json({ error: 'JSON invalide.' }); } }
          await handler(req, res, env);
        } catch { res.status(503).json({ error: 'Service indisponible.' }); }
      });
    },
  };
}
