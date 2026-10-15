// Avatar (video) providers: turn an approved answer into a mascot video.
//
// Same shape for every provider, so HeyGen can be swapped for another vendor
// without touching the support logic:
//   start({ text, language, title })  -> Promise<{ providerJobId }>
//   status(providerJobId)             -> Promise<{ status: 'processing'|'completed'|'failed', videoUrl?, error? }>
//
//   none   (default) — no video; the text answer + Earth Buddy voice is the experience.
//   mock             — local development and tests: "renders" after a short delay.
//   heygen           — HeyGen photo-avatar video (needs API credits + a tested avatar).

'use strict';

const crypto = require('crypto');

class AvatarProviderError extends Error {
  constructor(code, message) { super(message); this.name = 'AvatarProviderError'; this.code = code; }
}

function createNoneProvider() {
  return {
    name: 'none',
    enabled: false,
    async start() { throw new AvatarProviderError('disabled', 'Video is not enabled'); },
    async status() { return { status: 'failed', error: 'disabled' }; },
  };
}

// Pretends to render: "processing" until renderMs has passed, then a mock URL.
// The mock:// scheme makes it obvious this is not a real video.
function createMockProvider({ renderMs = 1500, fail = false } = {}) {
  const jobs = new Map();
  let n = 0;
  return {
    name: 'mock',
    enabled: true,
    async start({ text }) {
      if (!text) throw new AvatarProviderError('invalid', 'No text');
      const providerJobId = `mock-${++n}`;
      jobs.set(providerJobId, { startedAt: Date.now() });
      return { providerJobId };
    },
    async status(providerJobId) {
      const job = jobs.get(providerJobId);
      if (!job) return { status: 'failed', error: 'not_found' };
      if (Date.now() - job.startedAt < renderMs) return { status: 'processing' };
      if (fail) return { status: 'failed', error: 'mock_failure' };
      return { status: 'completed', videoUrl: `mock://video/${providerJobId}.mp4` };
    },
  };
}

/**
 * HeyGen, per the official docs at developers.heygen.com (checked 2026-10-15):
 *   POST https://api.heygen.com/v3/videos      (header x-api-key)
 *        { type: "avatar", avatar_id, script, voice_id, title, resolution, aspect_ratio, callback_url? }
 *   GET  https://api.heygen.com/v3/videos/{video_id}
 *        status: pending | processing | completed | failed; video_url when completed; failure_message on failure
 * The avatar comes from POST /v3/avatars (type "photo") with the Earth Buddy PNG, done once, by hand.
 *
 * NOT yet verified with a real key: the exact response wrapper and the id field
 * name on create, and whether video_url expires. The parsing below accepts the
 * likely shapes and fails safely; confirm against a real response before launch.
 */
function createHeyGenProvider({ apiKey, avatarId, voiceId, callbackUrl, fetchImpl = globalThis.fetch, timeoutMs = 20000 } = {}) {
  const missing = !apiKey ? 'HEYGEN_API_KEY' : !avatarId ? 'HEYGEN_AVATAR_ID' : !voiceId ? 'HEYGEN_VOICE_ID' : null;
  const call = async (method, path, body, extraHeaders = {}) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`https://api.heygen.com${path}`, {
        method,
        headers: { 'x-api-key': apiKey, 'content-type': 'application/json', accept: 'application/json', ...extraHeaders },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) throw new AvatarProviderError('unauthorized', 'HeyGen rejected the API key or the account has no API access');
      if (res.status === 402) throw new AvatarProviderError('no_credits', 'HeyGen API credits are exhausted');
      if (res.status === 429) throw new AvatarProviderError('rate_limited', 'HeyGen rate limit reached');
      if (!res.ok) throw new AvatarProviderError('provider_error', `HeyGen returned ${res.status}`);
      return json.data ?? json;
    } catch (e) {
      if (e instanceof AvatarProviderError) throw e;
      throw new AvatarProviderError(e.name === 'AbortError' ? 'timeout' : 'network', 'Could not reach HeyGen');
    } finally {
      clearTimeout(t);
    }
  };
  return {
    name: 'heygen',
    enabled: !missing,
    async start({ text, title }) {
      if (missing) throw new AvatarProviderError('missing_credentials', `${missing} is not set`);
      // HeyGen returns the original response for a repeated Idempotency-Key
      // (within 24 h), so a retried request can't be billed twice.
      const idempotencyKey = crypto.createHash('sha256').update(`${avatarId}:${voiceId}:${text}`).digest('hex').slice(0, 64);
      const data = await call('POST', '/v3/videos', {
        type: 'avatar', avatar_id: avatarId, voice_id: voiceId, script: text,
        title: title || 'KarmaVerse support answer', resolution: '720p', aspect_ratio: '1:1',
        ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      }, { 'Idempotency-Key': idempotencyKey });
      const providerJobId = data.video_id || data.id;
      if (!providerJobId) throw new AvatarProviderError('provider_error', 'HeyGen did not return a video id');
      return { providerJobId };
    },
    async status(providerJobId) {
      if (missing) return { status: 'failed', error: 'missing_credentials' };
      const data = await call('GET', `/v3/videos/${encodeURIComponent(providerJobId)}`);
      const s = String(data.status || '').toLowerCase();
      if (s === 'completed' && data.video_url) return { status: 'completed', videoUrl: data.video_url };
      if (s === 'failed') return { status: 'failed', error: data.failure_message ? 'provider_failed' : 'failed' };
      return { status: 'processing' };
    },
  };
}

function createAvatarProvider(config) {
  if (config.avatarProvider === 'mock') return createMockProvider({ renderMs: config.mockRenderMs, fail: config.mockFail });
  if (config.avatarProvider === 'heygen') {
    return createHeyGenProvider({ apiKey: config.heygenApiKey, avatarId: config.heygenAvatarId, voiceId: config.heygenVoiceId, callbackUrl: config.heygenCallbackUrl });
  }
  return createNoneProvider();
}

module.exports = { createAvatarProvider, createNoneProvider, createMockProvider, createHeyGenProvider, AvatarProviderError };
