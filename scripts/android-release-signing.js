// Injects a release signingConfig into the Expo-generated android/app/build.gradle
// so `assembleRelease` signs with the KarmaVerse upload keystore instead of the
// default debug key. Runs in CI AFTER `expo prebuild` and BEFORE gradle.
//
// Credentials are NEVER written into the gradle file — the injected config reads
// them from environment variables at build time:
//   KV_KEYSTORE_FILE  absolute path to the .keystore (decoded from a secret in CI)
//   KV_KEYSTORE_PASSWORD / KV_KEY_ALIAS / KV_KEY_PASSWORD
//
// Robust to the real Expo/RN template variations and idempotent (safe to re-run).

const fs = require('fs');
const path = require('path');

const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (!fs.existsSync(gradlePath)) {
  console.error('[signing] android/app/build.gradle not found — run `expo prebuild` first.');
  process.exit(1);
}

let src = fs.readFileSync(gradlePath, 'utf8');
const before = src;

// Print the sections we care about so CI logs show exactly what we're working with.
const dump = (label, s) => {
  const sc = s.match(/signingConfigs\s*\{[\s\S]*?\n {4}\}/);
  const bt = s.match(/buildTypes\s*\{[\s\S]*?\n {4}\}/);
  console.log(`[signing] ---- ${label}: signingConfigs ----\n${sc ? sc[0] : '(not found)'}`);
  console.log(`[signing] ---- ${label}: buildTypes ----\n${bt ? bt[0] : '(not found)'}`);
};

if (src.includes('signingConfigs.release')) {
  console.log('[signing] release signing already injected — nothing to do.');
  process.exit(0);
}

dump('before', src);

const releaseSigningBlock =
`        release {
            storeFile file(System.getenv("KV_KEYSTORE_FILE"))
            storePassword System.getenv("KV_KEYSTORE_PASSWORD")
            keyAlias System.getenv("KV_KEY_ALIAS")
            keyPassword System.getenv("KV_KEY_PASSWORD")
        }`;

// 1) Add the release signingConfig into the existing `signingConfigs { ... }`.
if (/signingConfigs\s*\{/.test(src)) {
  src = src.replace(/signingConfigs\s*\{/, `signingConfigs {\n${releaseSigningBlock}`);
} else {
  // No signingConfigs block at all — create one at the top of the android { } block.
  if (!/android\s*\{/.test(src)) {
    console.error('[signing] no `android {` block found in build.gradle.');
    process.exit(1);
  }
  src = src.replace(/android\s*\{/, `android {\n    signingConfigs {\n${releaseSigningBlock}\n    }`);
}

// 2) Point the release build type at signingConfigs.release. Handle three shapes:
//    (a) it already references signingConfigs.debug  -> repoint it
//    (b) it has no signingConfig line at all         -> insert one
// Isolate the release buildType block first so we never touch the debug one.
const relBlockRe = /(buildTypes\s*\{[\s\S]*?\brelease\s*\{)([\s\S]*?)(\n {8}\})/;
const m = src.match(relBlockRe);
if (!m) {
  console.error('[signing] could not locate buildTypes.release block.');
  dump('current', src);
  process.exit(1);
}
let relBody = m[2];
if (/signingConfig\s+signingConfigs\.debug/.test(relBody)) {
  relBody = relBody.replace(/signingConfig\s+signingConfigs\.debug/, 'signingConfig signingConfigs.release');
} else if (/signingConfig\s+signingConfigs\.release/.test(relBody)) {
  // already correct — leave it
} else {
  // no signingConfig line — add one right after `release {`
  relBody = `\n            signingConfig signingConfigs.release` + relBody;
}
src = src.slice(0, m.index) + m[1] + relBody + m[3] + src.slice(m.index + m[0].length);

if (src === before) {
  console.error('[signing] nothing changed — refusing to continue (release would be unsigned).');
  process.exit(1);
}

fs.writeFileSync(gradlePath, src);
dump('after', src);
console.log('[signing] release signingConfig injected successfully.');
