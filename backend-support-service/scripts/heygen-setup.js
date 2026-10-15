// One-time HeyGen setup for the KarmaVerse support assistant.
//
// Reads HEYGEN_API_KEY (and later HEYGEN_AVATAR_ID / HEYGEN_VOICE_ID) from
// backend-support-service/.env — the key is never printed.
//
//   npm run heygen:check            free   — checks the key works and lists English voices
//   npm run heygen:avatar           setup  — uploads the Earth Buddy image and creates a photo avatar
//   npm run heygen:test -- --yes    COSTS CREDITS — renders one short test video and prints its link
//
// API per developers.heygen.com (checked 2026-10-15): x-api-key header;
// POST /v3/assets (multipart "file") → data.asset_id; POST /v3/avatars
// { type: "photo", name, file: { type: "asset_id", asset_id } }; GET /v3/voices;
// POST /v3/videos → data.video_id; GET /v3/videos/{id} → status / video_url.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API = 'https://api.heygen.com';
const KEY = process.env.HEYGEN_API_KEY;
const step = process.argv[2];
const confirmed = process.argv.includes('--yes');
// The non-transparent mascot: HeyGen's photo avatars expect a PNG/JPEG photo.
const MASCOT = path.resolve(__dirname, '../../assets/mascot-earth-buddy.png');

function fail(msg) { console.error(`\n✖ ${msg}\n`); process.exit(1); }

async function call(method, urlPath, { json, form, headers = {} } = {}) {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: { 'x-api-key': KEY, accept: 'application/json', ...(json ? { 'content-type': 'application/json' } : {}), ...headers },
    body: json ? JSON.stringify(json) : form,
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 || res.status === 403) fail('HeyGen rejected the key, or this account has no API access. Check the key in HeyGen → Settings → API, and that API credits are bought (API billing is separate from the web plan).');
  if (res.status === 402) fail('No HeyGen API credits left. Top up the API wallet in HeyGen.');
  if (!res.ok) fail(`HeyGen returned ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body.data ?? body;
}

async function check() {
  const data = await call('GET', '/v3/voices?language=English&limit=20');
  const voices = Array.isArray(data) ? data : data.voices || data.list || [];
  console.log('\n✔ The HeyGen API key works.\n\nEnglish voices (put one voice_id into HEYGEN_VOICE_ID in .env):\n');
  for (const v of voices) console.log(`  ${String(v.voice_id).padEnd(36)} ${String(v.name || '').padEnd(24)} ${v.gender || ''} ${v.language || ''}`);
  if (!voices.length) console.log('  (no voices returned — try the HeyGen voice library in the web app)');
  console.log('\nTip: listen to a voice with its preview_audio_url in the HeyGen web app before choosing.\n');
}

async function avatar() {
  if (!fs.existsSync(MASCOT)) fail(`Mascot image not found at ${MASCOT}`);
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(MASCOT)], { type: 'image/png' }), 'earth-buddy.png');
  const asset = await call('POST', '/v3/assets', { form });
  const assetId = asset.asset_id || asset.id;
  if (!assetId) fail(`Upload worked but no asset id came back: ${JSON.stringify(asset).slice(0, 300)}`);
  console.log(`✔ Uploaded Earth Buddy (asset ${assetId})`);
  const created = await call('POST', '/v3/avatars', { json: { type: 'photo', name: 'Earth Buddy (KarmaVerse)', file: { type: 'asset_id', asset_id: assetId } } });
  const avatarId = (created.avatar_item && created.avatar_item.id) || created.avatar_id || created.id;
  if (!avatarId) fail(`Avatar request worked but no avatar id came back: ${JSON.stringify(created).slice(0, 300)}`);
  console.log(`✔ Photo avatar created${created.status ? ` (status: ${created.status})` : ''}\n\nPut this into .env:\n  HEYGEN_AVATAR_ID=${avatarId}\n`);
  if (created.status && created.status !== 'completed') console.log('HeyGen is still preparing the avatar. Wait a few minutes before the test video.\n');
}

async function test() {
  const avatarId = process.env.HEYGEN_AVATAR_ID;
  const voiceId = process.env.HEYGEN_VOICE_ID;
  if (!avatarId || !voiceId) fail('Set HEYGEN_AVATAR_ID and HEYGEN_VOICE_ID in .env first (run heygen:avatar and heygen:check).');
  if (!confirmed) fail('This renders a real video and spends HeyGen API credits (a few seconds of video). Run again with --yes to confirm:  npm run heygen:test -- --yes');
  const script = "Hi! I'm Earth Buddy, your KarmaVerse assistant. Ask me anything about pickups, KarmaCoins and your carbon footprint.";
  const created = await call('POST', '/v3/videos', {
    json: { type: 'avatar', avatar_id: avatarId, voice_id: voiceId, script, title: 'Earth Buddy test', resolution: '720p', aspect_ratio: '1:1' },
    headers: { 'Idempotency-Key': crypto.createHash('sha256').update(`test:${avatarId}:${voiceId}:${script}`).digest('hex').slice(0, 64) },
  });
  const videoId = created.video_id || created.id;
  if (!videoId) fail(`No video id came back: ${JSON.stringify(created).slice(0, 300)}`);
  console.log(`✔ Test video started (${videoId}). Checking every 10 seconds, up to 10 minutes…`);
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    const v = await call('GET', `/v3/videos/${encodeURIComponent(videoId)}`);
    process.stdout.write(`  ${v.status || 'unknown'}\n`);
    if (v.status === 'completed') { console.log(`\n✔ Done! Watch it here (link may expire):\n  ${v.video_url}\n`); return; }
    if (v.status === 'failed') fail(`HeyGen could not render the video: ${v.failure_message || 'no reason given'}`);
  }
  fail('Still rendering after 10 minutes. Check the video in the HeyGen web app.');
}

(async () => {
  if (!KEY) fail('HEYGEN_API_KEY is not set. Copy .env.example to .env and paste your HeyGen API key there (never into chat or code).');
  if (step === 'check') return check();
  if (step === 'avatar') return avatar();
  if (step === 'test') return test();
  fail('Usage: npm run heygen:check | npm run heygen:avatar | npm run heygen:test -- --yes');
})().catch((e) => fail(e.message));
