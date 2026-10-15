// Settings for the support service, read from environment variables.
// Every value has a safe default: with nothing set, the service runs in
// zero-cost mode (approved FAQ answers, no AI calls, no video).

'use strict';

function int(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function loadConfig(env = process.env) {
  return {
    answerProvider: env.SUPPORT_ANSWER_PROVIDER === 'claude' ? 'claude' : 'faq',
    claudeModel: env.SUPPORT_CLAUDE_MODEL || 'claude-opus-5-5',
    avatarProvider: ['mock', 'heygen'].includes(env.SUPPORT_AVATAR_PROVIDER) ? env.SUPPORT_AVATAR_PROVIDER : 'none',
    heygenApiKey: env.HEYGEN_API_KEY || '',
    heygenAvatarId: env.HEYGEN_AVATAR_ID || '',
    heygenVoiceId: env.HEYGEN_VOICE_ID || '',
    heygenCallbackUrl: env.HEYGEN_CALLBACK_URL || '',
    mockRenderMs: int(env.SUPPORT_MOCK_RENDER_MS, 1500),
    mockFail: env.SUPPORT_MOCK_FAIL === 'true',
    rateLimitPerMinute: int(env.SUPPORT_RATE_LIMIT_PER_MIN, 20),
    videoTimeoutMs: int(env.SUPPORT_VIDEO_TIMEOUT_MS, 10 * 60 * 1000),
    videoMinPollMs: int(env.SUPPORT_VIDEO_MIN_POLL_MS, 5000),
    languages: (env.SUPPORT_LANGUAGES || 'en').split(',').map((s) => s.trim()).filter(Boolean),
  };
}

module.exports = { loadConfig };
