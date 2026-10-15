// Entry point for dropping the support service into the KarmaVerse backend:
//
//   const { createSupportService } = require('./backend-support-service');
//   app.use('/api/v1/support', createSupportService({ authenticate: verifyJwt }));
//
// `authenticate` is the backend's existing JWT middleware (it must set req.user.id).

'use strict';

const { loadConfig } = require('./src/config');
const { createSupportRouter } = require('./src/router');
const { createAnswerProvider } = require('./src/answerProviders');
const { createAvatarProvider } = require('./src/avatarProviders');
const { createVideoJobs } = require('./src/videoJobs');
const defaultFaqs = require('./faq/faqs.json');

function createSupportService({ authenticate, logger, env = process.env, faqs = defaultFaqs, answerProvider, avatarProvider } = {}) {
  const config = loadConfig(env);
  const avatar = avatarProvider || createAvatarProvider(config);
  const videoJobs = createVideoJobs({ provider: avatar, timeoutMs: config.videoTimeoutMs, minPollMs: config.videoMinPollMs });
  return createSupportRouter({ faqs, answerProvider: answerProvider || createAnswerProvider(config), videoJobs, config, authenticate, logger });
}

module.exports = { createSupportService };
