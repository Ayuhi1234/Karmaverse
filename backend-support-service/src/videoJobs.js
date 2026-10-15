// Video job tracking for support answers.
//
// In-memory reference implementation — replace the two Maps with a database
// table (see docs/AI_VIDEO_FAQ_SUPPORT.md) when this is dropped into the backend.
//
//   - Reuse: answers come from approved, non-personal FAQs, so a finished video
//     for the same answer text is reused for every user instead of paying to
//     render it again. Personal answers must never be cached this way.
//   - Ownership: a job belongs to the user who asked; others get "not found".
//   - Polling is controlled: the provider is asked at most once per
//     minPollMs per job, and a job that runs past timeoutMs is marked failed.

'use strict';

const crypto = require('crypto');

function createVideoJobs({ provider, timeoutMs = 10 * 60 * 1000, minPollMs = 5000, now = () => Date.now() }) {
  const jobs = new Map();   // jobId -> job
  const byKey = new Map();  // cacheKey -> jobId (one render per distinct answer)

  const cacheKey = (text, language) => `${provider.name}:${language}:${crypto.createHash('sha256').update(text).digest('hex')}`;
  const view = (job) => ({ jobId: job.jobId, status: job.status, videoUrl: job.status === 'completed' ? job.videoUrl : null, error: job.status === 'failed' ? job.error : null });

  async function request({ userId, text, language }) {
    if (!provider.enabled) return { jobId: null, status: 'unavailable', videoUrl: null, error: 'video_disabled' };
    const key = cacheKey(text, language);
    const existingId = byKey.get(key);
    const existing = existingId && jobs.get(existingId);
    // Reuse a finished or in-flight render of the same approved answer.
    if (existing && existing.status !== 'failed') {
      const jobId = crypto.randomUUID();
      jobs.set(jobId, { ...existing, jobId, userId, createdAt: now(), sharedFrom: existing.jobId });
      return view(jobs.get(jobId));
    }
    const jobId = crypto.randomUUID();
    const job = { jobId, userId, key, status: 'processing', providerJobId: null, videoUrl: null, error: null, createdAt: now(), lastPolledAt: 0 };
    jobs.set(jobId, job);
    byKey.set(key, jobId);
    try {
      const { providerJobId } = await provider.start({ text, language, title: 'KarmaVerse support answer' });
      job.providerJobId = providerJobId;
    } catch (e) {
      job.status = 'failed';
      job.error = e.code || 'provider_error';
    }
    return view(job);
  }

  async function get({ userId, jobId }) {
    const job = jobs.get(jobId);
    if (!job || job.userId !== userId) return null; // never reveal other users' jobs
    // Shared jobs follow the original render.
    const source = job.sharedFrom ? jobs.get(job.sharedFrom) : job;
    if (source && source.status === 'processing') {
      if (now() - source.createdAt > timeoutMs) {
        source.status = 'failed';
        source.error = 'timeout';
      } else if (now() - source.lastPolledAt >= minPollMs) {
        source.lastPolledAt = now();
        try {
          const s = await provider.status(source.providerJobId);
          if (s.status === 'completed') { source.status = 'completed'; source.videoUrl = s.videoUrl; }
          else if (s.status === 'failed') { source.status = 'failed'; source.error = s.error || 'provider_failed'; }
        } catch (e) {
          // A failed status check is not a failed render; try again next poll.
        }
      }
    }
    if (source && job !== source) Object.assign(job, { status: source.status, videoUrl: source.videoUrl, error: source.error });
    return view(job);
  }

  return { request, get, _jobs: jobs };
}

module.exports = { createVideoJobs };
