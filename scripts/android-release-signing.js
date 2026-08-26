// Injects a release signingConfig into the Expo-generated android/app/build.gradle
// so `assembleRelease` signs with the KarmaVerse upload keystore instead of the
// default debug key. Runs in CI AFTER `expo prebuild` and BEFORE gradle.
//
// Credentials are NEVER written into the gradle file — the injected config reads
// them from environment variables at build time:
//   KV_KEYSTORE_FILE  absolute path to the .keystore (decoded from a secret in CI)
//   KV_KEYSTORE_PASSWORD / KV_KEY_ALIAS / KV_KEY_PASSWORD
//
// Idempotent: running twice is a no-op.

const fs = require('fs');
const path = require('path');

const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (!fs.existsSync(gradlePath)) {
  console.error('[signing] android/app/build.gradle not found — run `expo prebuild` first.');
  process.exit(1);
}

let src = fs.readFileSync(gradlePath, 'utf8');

if (src.includes('signingConfigs.release')) {
  console.log('[signing] release signing already injected — skipping.');
  process.exit(0);
}

// 1) Point the release build type at signingConfigs.release. At this stage the
//    only `release {` block is in buildTypes, so the first match is the right one.
const buildTypeRe = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.)debug/;
if (!buildTypeRe.test(src)) {
  console.error('[signing] could not find buildTypes.release signingConfig to repoint.');
  process.exit(1);
}
src = src.replace(buildTypeRe, '$1release');

// 2) Add the release signingConfig (env-driven) right after `signingConfigs {`.
const releaseBlock = `signingConfigs {
        release {
            storeFile file(System.getenv("KV_KEYSTORE_FILE"))
            storePassword System.getenv("KV_KEYSTORE_PASSWORD")
            keyAlias System.getenv("KV_KEY_ALIAS")
            keyPassword System.getenv("KV_KEY_PASSWORD")
        }`;
const anchorRe = /signingConfigs\s*\{/;
if (!anchorRe.test(src)) {
  console.error('[signing] could not find signingConfigs block to extend.');
  process.exit(1);
}
src = src.replace(anchorRe, releaseBlock);

fs.writeFileSync(gradlePath, src);
console.log('[signing] release signingConfig injected into android/app/build.gradle');
