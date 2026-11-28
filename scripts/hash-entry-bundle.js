// Expo names the web entry bundle (index-<hash>.js) from a hash that ignores the
// lazy-chunk file names written into it. A deploy that only changes lazy screens or
// shared code can ship new contents under the old name, and because /_expo/static/*
// is cached for a year as immutable, returning visitors keep the old file, load
// chunks that no longer match the new __common bundle and crash with
// "Requiring unknown module". Rename the entry bundle by its real contents and point
// every HTML page at the new name.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dist = path.resolve(__dirname, '..', 'dist');
const jsDir = path.join(dist, '_expo', 'static', 'js', 'web');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(p);
    return e.name.endsWith('.html') ? [p] : [];
  });
}

const entries = fs.existsSync(jsDir) ? fs.readdirSync(jsDir).filter((f) => /^index-[a-f0-9]+\.js$/.test(f)) : [];
if (entries.length !== 1) {
  console.error(`hash-entry-bundle: expected one index-*.js in ${jsDir}, found ${entries.length}`);
  process.exit(1);
}

const oldName = entries[0];
const contents = fs.readFileSync(path.join(jsDir, oldName));
const newName = `index-${crypto.createHash('md5').update(contents).digest('hex')}.js`;
fs.renameSync(path.join(jsDir, oldName), path.join(jsDir, newName));

let pages = 0;
for (const file of htmlFiles(dist)) {
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes(oldName)) continue;
  fs.writeFileSync(file, html.split(oldName).join(newName));
  pages++;
}
if (!pages) {
  console.error('hash-entry-bundle: no HTML page referenced the entry bundle');
  process.exit(1);
}
console.log(`hash-entry-bundle: ${oldName} -> ${newName} (${pages} pages)`);
