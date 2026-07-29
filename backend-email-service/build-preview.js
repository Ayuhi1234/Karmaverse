// Dev-only: renders all 12 templates with sample data into preview.html so you can
// eyeball the emails in a browser. Not used in production. Run: node build-preview.js
const fs = require('fs');
const path = require('path');
const { templates } = require('./templates/templates');

const N = 'shashi shekhar';
const bid = '6a6873bffedd2c05ac2de281';
const samples = {
  WELCOME: { name: N },
  OTP: { otp: '482913' },
  PASSWORD_RESET_CONFIRM: { name: N },
  BOOKING_PLACED: { name: N, bookingId: bid, date: '12 Aug 2026', timeSlot: '12:00 PM - 3:00 PM', address: 'Shaheed Hawaldar Padam Singh Dhama Marg, Mamura, Noida, Uttar Pradesh 201301' },
  BOOKING_ACCEPTED: { name: N, agentName: 'Ravi Kumar', bookingId: bid, eta: '3:20 PM' },
  BOOKING_PICKED_UP: { name: N, coins: 45, walletBalance: 4055 },
  BOOKING_COMPLETED: { name: N, bookingId: bid },
  BOOKING_CANCELLED: { name: N, bookingId: bid, date: '12 Aug 2026' },
  QUIZ_STREAK_REMINDER: { name: N, streak: 2 },
  REFERRAL_REWARD: { name: N, friendName: 'Amit', coins: 1000 },
  AGENT_WELCOME: { name: 'ravi kumar' },
  AGENT_WEEKLY_SUMMARY: { name: 'ravi kumar', totalPickups: 14, rating: 4.8, currentStreak: 5 },
};

// For LOCAL preview only, point the logo at the committed public file so it renders
// without a Netlify deploy. The real templates keep the absolute HTTPS URL.
const localLogo = 'file:///' + path.resolve(__dirname, '../public/email-logo.png').split(path.sep).join('/');

let out = '<!doctype html><html><head><meta charset="utf-8"><title>KarmaVerse email preview</title>'
  + '<style>body{font-family:system-ui,Arial;background:#0f172a;margin:0;padding:24px;color:#e2e8f0}'
  + 'h1{font-size:18px}h2{font-size:14px;margin:26px 0 4px}.sub{color:#94a3b8;font-size:12px;margin:0 0 8px}'
  + 'iframe{width:100%;max-width:640px;height:560px;border:0;border-radius:12px;background:#fff;display:block}</style>'
  + '</head><body><h1>KarmaVer$e — transactional email preview (12 templates)</h1>';

const missing = [];
for (const key of Object.keys(samples)) {
  let { subject, html } = templates[key](samples[key]);
  html = html.split('https://karmaverse.earth/email-logo.png').join(localLogo);
  if (/undefined/.test(html) || /undefined/.test(String(subject))) missing.push(key);
  out += '<h2>' + key + '</h2><p class="sub">Subject: ' + String(subject).replace(/</g, '&lt;') + '</p>'
    + '<iframe srcdoc="' + html.replace(/"/g, '&quot;') + '"></iframe>';
}
out += '</body></html>';
fs.writeFileSync(path.join(__dirname, 'preview.html'), out);
console.log('preview.html written with', Object.keys(samples).length, 'templates');
console.log('"undefined" found in:', missing.length ? missing.join(', ') : 'NONE (all fallbacks clean)');
