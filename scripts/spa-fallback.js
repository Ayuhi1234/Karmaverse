// SPA deep-link fallback for static hosts that don't rewrite unknown paths to
// index.html (e.g. Render without a rewrite rule). Render serves 404.html for any
// request that doesn't match a file, so copying the app shell there makes every
// deep route (/register?ref=..., /Wallet, refreshes) load the SPA instead of a bare
// "Not Found". Netlify uses its own catch-all redirect, so this is just a harmless
// extra file there.
const fs = require('fs');
const path = require('path');

const dist = path.resolve(__dirname, '..', 'dist');
const index = path.join(dist, 'index.html');
const notFound = path.join(dist, '404.html');

if (fs.existsSync(index)) {
  fs.copyFileSync(index, notFound);
  console.log('Wrote dist/404.html (SPA deep-link fallback)');
} else {
  console.warn('spa-fallback: dist/index.html not found — skipped');
}
