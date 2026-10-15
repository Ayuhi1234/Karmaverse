// KarmaVerse support API — mount under /api/v1/support in the backend.
//
//   GET  /suggestions   suggested questions by category (public)
//   POST /ask           { question, language?, responseMode?, history? } → answer now,
//                       plus a video job when responseMode is "video" and the user is logged in
//   GET  /video/:jobId  video status for the caller's own job (login required)
//
// Responses use the app-wide envelope { success, statusCode, message, data }.
// Logs carry a request id, FAQ ids and timings, never the question text.

'use strict';

const crypto = require('crypto');
const express = require('express');
const { matchWithHistory, suggestedQuestions, answerFromMatch } = require('./faqEngine');
const { createRateLimiter } = require('./rateLimit');

const MAX_QUESTION = 500;
const MAX_HISTORY = 6;
const MODES = ['text', 'voice', 'video'];

/**
 * @param {object} deps
 * @param {Array} deps.faqs             approved FAQ records
 * @param {object} deps.answerProvider  from answerProviders.js
 * @param {object} deps.videoJobs       from videoJobs.js
 * @param {object} deps.config          from config.js
 * @param {Function} [deps.authenticate] the backend's own JWT middleware (sets req.user).
 *        Used in "optional" mode: logged-out users can still read FAQ answers
 *        (they may need help logging in), but video needs a logged-in user.
 * @param {object} [deps.logger]        { info, warn, error } — defaults to console
 */
function createSupportRouter({ faqs, answerProvider, videoJobs, config, authenticate, logger = console }) {
  const router = express.Router();
  const allow = createRateLimiter({ perMinute: config.rateLimitPerMinute });

  router.use(express.json({ limit: '8kb' }));
  router.use((req, res, next) => {
    req.requestId = String(req.headers['x-request-id'] || crypto.randomUUID()).slice(0, 64);
    res.setHeader('x-request-id', req.requestId);
    next();
  });

  // Optional auth: run the backend's middleware, but don't reject logged-out users here.
  const optionalAuth = (req, res, next) => {
    if (!authenticate || !req.headers.authorization) return next();
    authenticate(req, res, (err) => { if (err) req.user = undefined; next(); });
  };
  const requireUser = (req, res, next) => (req.user && req.user.id ? next() : send(res, req, 401, 'Please log in to continue'));

  const send = (res, req, statusCode, message, data) => res.status(statusCode).json(
    statusCode < 400 ? { success: true, statusCode, message, data } : { success: false, statusCode, message, requestId: req.requestId },
  );

  const limit = (req, res, next) => {
    const key = req.user && req.user.id ? `u:${req.user.id}` : `ip:${req.ip}`;
    const r = allow(key);
    if (r.allowed) return next();
    res.setHeader('retry-after', String(r.retryAfterSeconds));
    return send(res, req, 429, 'Too many questions — please wait a moment and try again');
  };

  router.get('/suggestions', (req, res) => {
    const language = config.languages.includes(req.query.language) ? req.query.language : 'en';
    send(res, req, 200, 'Suggested questions', { language, categories: suggestedQuestions(faqs, language) });
  });

  router.post('/ask', optionalAuth, limit, async (req, res) => {
    const t0 = Date.now();
    const body = req.body || {};
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question) return send(res, req, 400, 'Please type a question');
    if (question.length > MAX_QUESTION) return send(res, req, 400, `Please keep your question under ${MAX_QUESTION} characters`);
    const language = body.language === undefined ? 'en' : body.language;
    if (!config.languages.includes(language)) return send(res, req, 400, `Language must be one of: ${config.languages.join(', ')}`);
    const responseMode = body.responseMode === undefined ? 'text' : body.responseMode;
    if (!MODES.includes(responseMode)) return send(res, req, 400, `responseMode must be one of: ${MODES.join(', ')}`);
    const history = Array.isArray(body.history) ? body.history : [];
    if (history.length > MAX_HISTORY || !history.every((h) => h && ['user', 'assistant'].includes(h.role) && typeof h.text === 'string' && h.text.length <= 1200)) {
      return send(res, req, 400, 'Invalid conversation history');
    }

    // Follow-ups like "and what about broken glass?" rarely match on their own,
    // so they're also tried together with the previous user question.
    const match = matchWithHistory(question, faqs, { language, history });

    let result;
    try {
      result = await answerProvider.generate({ question, language, match, history });
    } catch (e) {
      // AI provider down or misconfigured: fall back to the approved FAQ answer.
      logger.warn(JSON.stringify({ requestId: req.requestId, event: 'answer_provider_failed', provider: answerProvider.name, code: e && (e.status || e.code || e.name) }));
      result = answerFromMatch(match, language);
    }

    // Video: only for supported answers, only for logged-in users.
    let video = null;
    if (responseMode === 'video' && result.supported) {
      video = req.user && req.user.id
        ? await videoJobs.request({ userId: req.user.id, text: result.answer, language })
        : { jobId: null, status: 'unavailable', videoUrl: null, error: 'login_required' };
    }

    logger.info(JSON.stringify({
      requestId: req.requestId, event: 'support_answer', provider: answerProvider.name, supported: result.supported,
      faqIds: result.references.map((r) => r.id), responseMode, video: video && video.status, ms: Date.now() - t0,
    }));

    send(res, req, 200, result.supported ? 'Answer found' : 'No verified answer', {
      requestId: req.requestId,
      status: video && video.status === 'processing' ? 'processing' : 'answered',
      answer: result.answer,
      language,
      supported: result.supported,
      supportRecommended: result.supportRecommended,
      references: result.references,
      related: match.related.map((f) => ({ id: f.id, question: f.question })),
      video,
    });
  });

  router.get('/video/:jobId', optionalAuth, requireUser, async (req, res) => {
    const job = await videoJobs.get({ userId: req.user.id, jobId: req.params.jobId });
    if (!job) return send(res, req, 404, 'Video not found');
    send(res, req, 200, `Video ${job.status}`, job);
  });

  // Anything thrown above becomes a safe 500 without internals.
  router.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') return send(res, req, 413, 'Request is too large');
    if (err && err.type === 'entity.parse.failed') return send(res, req, 400, 'Request body must be valid JSON');
    logger.error(JSON.stringify({ requestId: req.requestId, event: 'support_error', name: err && err.name }));
    send(res, req, 500, 'Something went wrong — please try again');
  });

  return router;
}

module.exports = { createSupportRouter };
