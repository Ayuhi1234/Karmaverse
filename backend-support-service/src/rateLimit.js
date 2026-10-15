// Fixed-window rate limiter keyed by user id (or IP when logged out).
// In-memory reference; use the backend's shared limiter (e.g. Redis) when the
// service runs on more than one instance.

'use strict';

function createRateLimiter({ perMinute = 20, now = () => Date.now() } = {}) {
  const windows = new Map(); // key -> { start, count }
  return function allow(key) {
    const t = now();
    const w = windows.get(key);
    if (!w || t - w.start >= 60000) {
      windows.set(key, { start: t, count: 1 });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (w.count >= perMinute) return { allowed: false, retryAfterSeconds: Math.ceil((60000 - (t - w.start)) / 1000) };
    w.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

module.exports = { createRateLimiter };
