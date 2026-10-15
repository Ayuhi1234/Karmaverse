// Local development server for the support API. NOT for production: the real
// backend mounts createSupportService() with its own JWT middleware.
//
//   cd backend-support-service && npm install && npm run dev
//   → http://localhost:4100/api/v1/support/ask
//
// Dev auth (NOT secure — local testing only): "Bearer dev-<name>" is user <name>;
// any other bearer token (e.g. the app's real login token) becomes a user id
// derived from a hash of the token, so the app on localhost can request videos.
// The real backend replaces this with its JWT verification.

'use strict';

const express = require('express');
const { createSupportService } = require('./index');

const app = express();
app.set('trust proxy', false);

// Allow the app on localhost to call this server during development.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && /^http:\/\/localhost:\d+$/.test(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('access-control-allow-headers', 'content-type, authorization, x-request-id');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const crypto = require('crypto');
const devAuthenticate = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const m = /^Bearer dev-([\w-]{1,40})$/.exec(auth);
  if (m) req.user = { id: m[1] };
  else if (/^Bearer \S{10,}$/.test(auth)) req.user = { id: `dev-${crypto.createHash('sha256').update(auth).digest('hex').slice(0, 12)}` };
  next();
};

app.use('/api/v1/support', createSupportService({ authenticate: devAuthenticate }));

if (require.main === module) {
  const port = parseInt(process.env.PORT, 10) || 4100;
  app.listen(port, () => console.log(`Support API (dev) on http://localhost:${port}/api/v1/support`));
}

module.exports = { app, devAuthenticate };
