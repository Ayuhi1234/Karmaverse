// KarmaVerse support — FAQ matching engine (zero cost, no AI).
//
// Pure JavaScript with no Node or React Native APIs, so the backend module and
// the app share this one file: the same question gets the same answer
// everywhere. It scores each approved FAQ by the words a question shares with
// the FAQ's question and keywords, and only answers when the match is strong
// enough. Answers are returned word for word from the approved FAQ, so the
// engine can never invent a policy, price or feature.

'use strict';

// Words that carry no meaning for matching ("how do I …").
const STOPWORDS = new Set([
  'a', 'an', 'the', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'is', 'are', 'was', 'be', 'been',
  'do', 'does', 'did', 'can', 'could', 'should', 'would', 'will', 'to', 'of', 'in', 'on', 'at', 'for', 'with',
  'and', 'or', 'how', 'what', 'when', 'where', 'why', 'which', 'who', 'this', 'that', 'there', 'here', 'please',
  'hi', 'hello', 'hey', 'get', 'got', 'any', 'some', 'about', 'from', 'by', 'if', 'so', 'just', 'tell', 'know',
  'want', 'need', 'help', 'kya', 'hai', 'ka', 'ki', 'ke', 'se', 'mein', 'main', 'kaise', 'karna', 'karu', 'kare',
]);

// "Pickups" → "pickup", "earned" → "earn": just enough to match plurals and tenses.
function stem(word) {
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('es') && !word.endsWith('ses')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function normalize(text) {
  return ` ${String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9ऀ-ॿ]+/g, ' ').trim()} `;
}

function tokens(text) {
  return normalize(text).trim().split(' ').filter((w) => w && !STOPWORDS.has(w)).map(stem);
}

// Minimum score for an answer to count as "supported". Below it the caller
// says it can't verify an answer and offers human support.
const SUPPORTED_SCORE = 3;

function scoreFaq(faq, question) {
  const saidTokens = new Set(tokens(question));
  if (saidTokens.size === 0) return 0;
  let score = 0;
  // Keyword phrases are the strongest signal: a keyword counts when all of its
  // meaningful words appear in the question, in any order and with filler
  // words between ("cancel my booking" matches "cancel booking"). Longer
  // keywords count more, and only the best keyword match counts, so one FAQ
  // can't win just by listing many synonyms.
  let bestKeyword = 0;
  for (const kw of faq.keywords || []) {
    const kwTokens = tokens(kw);
    if (kwTokens.length && kwTokens.every((t) => saidTokens.has(t))) bestKeyword = Math.max(bestKeyword, 2 + kwTokens.length);
  }
  score += bestKeyword;
  // Shared meaningful words with the FAQ's own question.
  const qTokens = new Set(tokens(faq.question));
  for (const t of saidTokens) if (qTokens.has(t)) score += 2;
  return score;
}

/**
 * Rank approved FAQs for a question.
 * @param {string} question
 * @param {Array<object>} faqs  records from faq/faqs.json
 * @param {{ language?: string, limit?: number }} [opts]
 * @returns {{ supported: boolean, best: object|null, score: number, related: object[] }}
 */
function findAnswer(question, faqs, opts = {}) {
  const language = opts.language || 'en';
  const pool = faqs.filter((f) => f.status === 'published' && f.language === language);
  // Fall back to English when the language has no published FAQs yet.
  const usable = pool.length ? pool : faqs.filter((f) => f.status === 'published' && f.language === 'en');
  const ranked = usable
    .map((faq) => ({ faq, score: scoreFaq(faq, question) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const supported = !!top && top.score >= SUPPORTED_SCORE;
  return {
    supported,
    best: supported ? top.faq : null,
    score: top ? top.score : 0,
    // Other close matches, offered as "related questions".
    related: ranked.slice(supported ? 1 : 0, (supported ? 1 : 0) + (opts.limit || 3)).map((r) => r.faq),
  };
}

/** Published FAQs grouped by category, for the "suggested questions" list. */
function suggestedQuestions(faqs, language = 'en', perCategory = 2) {
  const out = {};
  for (const f of faqs) {
    if (f.status !== 'published' || f.language !== language) continue;
    (out[f.category] = out[f.category] || []);
    if (out[f.category].length < perCategory) out[f.category].push({ id: f.id, question: f.question });
  }
  return out;
}

const FALLBACK_ANSWER = {
  en: "Sorry, I couldn't find that in KarmaVerse help, so I can't give you a verified answer. Please contact our support team and they'll help you.",
};

// FAQs about problems the app can't fix by itself point the user to humans too.
const NEEDS_HUMAN = ['pickup-failed', 'pickup-delayed', 'tech-crash', 'account-cant-login', 'tech-contact'];

/**
 * The zero-cost answer for a match: the approved answer word for word, or the
 * safe "can't verify" fallback. Shared by the backend's faq provider and the app.
 */
function answerFromMatch(match, language = 'en') {
  if (!match || !match.supported || !match.best) {
    return { answer: FALLBACK_ANSWER[language] || FALLBACK_ANSWER.en, references: [], supported: false, supportRecommended: true };
  }
  const best = match.best;
  return {
    answer: best.answer,
    references: [{ id: best.id, question: best.question, category: best.category }],
    supported: true,
    supportRecommended: NEEDS_HUMAN.includes(best.id),
  };
}

// Only questions that read like follow-ups borrow the previous question's
// topic ("and what about…", "what if it…"). An unrelated new question must
// never be answered with the previous topic's answer.
const FOLLOW_UP = /^\s*(and|also|but|so|then|what about|how about|what if|and if|is it|does it|can it|it|that|this|those|they)\b/i;

/** Match a question; follow-ups are also tried together with the previous user question. */
function matchWithHistory(question, faqs, { language = 'en', history = [] } = {}) {
  let match = findAnswer(question, faqs, { language });
  const prevUser = [...history].reverse().find((h) => h && h.role === 'user');
  if (!match.supported && prevUser && FOLLOW_UP.test(question)) {
    const combined = findAnswer(`${prevUser.text} ${question}`, faqs, { language });
    if (combined.supported) match = combined;
  }
  return match;
}

module.exports = { findAnswer, suggestedQuestions, answerFromMatch, matchWithHistory, normalize, tokens, SUPPORTED_SCORE, FALLBACK_ANSWER };
