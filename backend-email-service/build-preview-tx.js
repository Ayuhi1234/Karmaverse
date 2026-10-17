// Renders every TRANSACTIONAL use-case as a PAIR - the push notification and the
// email side by side - with realistic sample data, exactly as each one lands.
// Transactional = fired by a real account/booking event, ALWAYS sent (no consent
// gate, no unsubscribe). Non-transactional lives in build-preview-nontx.js.
const fs = require('fs');
const { setAssetMode } = require('./templates/layout.js');
setAssetMode('datauri'); // inline logo + social so they render in a browser preview
const { templates } = require('./templates/templates.js');
const { txPushTemplates } = require('./templates/pushTemplates.js');

// [ label, note, emailKey|null, pushKey|null ] - grouped by lifecycle stage.
const GROUPS = [
  ['Account & access', [
    ['Welcome', 'Sent right after signup.', 'WELCOME', null],
    ['Email verification', 'The 6-digit code to verify the email.', 'OTP', null],
    ['Password reset code', 'OTP to reset a forgotten password.', 'FORGOT_PASSWORD_OTP', null],
    ['Password changed', 'Confirmation after the password is updated.', 'PASSWORD_RESET_CONFIRM', null],
    ['New sign-in alert', 'Security alert on a new-device login.', null, 'LOGIN_ALERT'],
  ]],
  ['Booking lifecycle', [
    ['Pickup booked', 'Booking request received.', 'BOOKING_PLACED', null],
    ['Partner assigned', 'An agent accepted and is on the way.', 'BOOKING_ACCEPTED', 'BOOKING_ACCEPTED'],
    ['Agent arrived', 'Agent reached the location.', null, 'AGENT_REACHED'],
    ['Coins credited', 'Items verified, coins in the wallet.', 'BOOKING_PICKED_UP', 'BOOKING_PICKED_UP'],
    ['Pickup complete', 'Pickup finished.', 'BOOKING_COMPLETED', 'BOOKING_COMPLETED'],
    ['Booking cancelled', 'The pickup was cancelled.', 'BOOKING_CANCELLED', 'BOOKING_CANCEL_SUCCESS'],
    ['Priority queue', 'High demand - booking added to the pool.', null, 'BOOKING_IN_POOL'],
    ['Pickup reminder', 'Day-before reminder for a scheduled pickup.', null, 'PICKUP_REMINDER'],
    ['Rate your pickup', 'Ask the user to rate the partner.', null, 'RATING_REQUEST'],
  ]],
  ['Rewards & money', [
    ['Referral reward', 'A friend joined using the referral code.', 'REFERRAL_REWARD', null],
    ['Redemption confirmed', 'Coins redeemed.', 'REDEMPTION_CONFIRMED', 'REDEMPTION_CONFIRMED'],
    ['Payout sent', 'Cash payout succeeded.', 'PAYOUT_SUCCESS', 'PAYOUT_SUCCESS'],
    ['Payout failed', "Payout couldn't be processed.", 'PAYOUT_FAILED', 'PAYOUT_FAILED'],
  ]],
];

const sample = {
  name: 'Priya', otp: '482915', bookingId: '66a9566f0b2c05b90d2b6f9d1',
  date: '12 Oct 2025', timeSlot: '10 - 11 AM', address: 'DLF Cyber City, Gurugram',
  agentName: 'Rahul', coins: 4055, walletBalance: 6170, amount: 1200,
  device: 'Redmi Note 12', friendName: 'Aman',
};

const attrEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const htmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const pushCard = (key) => {
  if (!key) return `<div class="empty">Not sent as a push &mdash; this event is email-only.</div>`;
  const r = txPushTemplates[key](sample);
  return `<div class="notif">
    <div class="nhead"><span class="nicon">K</span><span class="napp">KarmaVer$e</span><span class="ndot">&bull;</span><span class="ntime">now</span></div>
    <div class="ntitle">${htmlEsc(r.title)}</div>
    <div class="nbody">${htmlEsc(r.body)}</div>
    <div class="nmeta"><span class="nk">${htmlEsc(key)}</span> &rarr; ${htmlEsc(r.data.route)}</div>
  </div>`;
};

const emailFrame = (key) => {
  if (!key) return `<div class="empty">Not sent as an email &mdash; this event is push-only.</div>`;
  const r = templates[key](sample);
  return `<div class="mailwrap">
    <div class="msubj"><span class="mk">${htmlEsc(key)}</span><span class="mst">${htmlEsc(r.subject)}</span></div>
    <iframe class="mframe" sandbox="allow-same-origin" srcdoc="${attrEsc(r.html)}" loading="lazy"></iframe>
  </div>`;
};

const caseBlock = ([label, note, emailKey, pushKey]) => `<div class="case">
  <div class="chead"><span class="cname">${htmlEsc(label)}</span><span class="cnote">${htmlEsc(note)}</span></div>
  <div class="pair">
    <div class="col"><div class="collabel">Push notification</div>${pushCard(pushKey)}</div>
    <div class="col"><div class="collabel">Email</div>${emailFrame(emailKey)}</div>
  </div>
</div>`;

const groupBlock = ([name, cases]) => `<section class="group">
  <h2>${htmlEsc(name)} <span class="pill">${cases.length}</span></h2>
  ${cases.map(caseBlock).join('\n')}
</section>`;

const total = GROUPS.reduce((n, [, c]) => n + c.length, 0);

const page = `<title>Transactional Mailers</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>
  :root{--bg:#f3f7f4;--surface:#fff;--surface-2:#eef3ee;--ink:#122019;--muted:#566b5f;--faint:#7c8f84;--accent:#16a34a;--accent-deep:#15803d;--tx:#2563eb;--tx-soft:#e5edfb;--line:#e0e7e1;--shadow:0 1px 2px rgba(18,32,25,.05),0 10px 26px rgba(18,32,25,.07);}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0c130f;--surface:#131c17;--surface-2:#182219;--ink:#e7f0ea;--muted:#9baba0;--faint:#7b8c81;--accent:#37c46e;--accent-deep:#2fae61;--tx:#7aa2f7;--tx-soft:#16233e;--line:#233029;--shadow:0 1px 2px rgba(0,0,0,.3),0 14px 30px rgba(0,0,0,.32);}}
  :root[data-theme="dark"]{--bg:#0c130f;--surface:#131c17;--surface-2:#182219;--ink:#e7f0ea;--muted:#9baba0;--faint:#7b8c81;--accent:#37c46e;--accent-deep:#2fae61;--tx:#7aa2f7;--tx-soft:#16233e;--line:#233029;--shadow:0 1px 2px rgba(0,0,0,.3),0 14px 30px rgba(0,0,0,.32);}
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:"IBM Plex Sans",system-ui,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:1100px;margin:0 auto;padding:clamp(24px,5vw,54px) clamp(16px,4vw,36px) 90px;}
  .eyebrow{font-family:"IBM Plex Mono",monospace;font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:var(--tx);}
  h1{font-family:"Sora",sans-serif;font-weight:800;font-size:clamp(27px,5.5vw,40px);letter-spacing:-.02em;margin:10px 0 10px;}
  .lede{color:var(--muted);max-width:74ch;margin:0 0 8px;font-size:16px;}
  .note{display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:9px 14px;border-radius:12px;background:var(--tx-soft);color:var(--tx);font-size:13px;font-weight:600;}
  .group{margin-top:14px;}
  h2{font-family:"Sora",sans-serif;font-weight:700;font-size:20px;margin:44px 0 14px;display:flex;align-items:center;gap:10px;border-top:1px solid var(--line);padding-top:26px;}
  .group:first-of-type h2{border-top:0;padding-top:0;}
  .pill{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;background:var(--tx-soft);color:var(--tx);}
  .case{background:var(--surface);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);padding:16px 18px;margin:0 0 16px;}
  .chead{margin:0 0 12px;}
  .cname{font-family:"Sora",sans-serif;font-weight:700;font-size:16px;color:var(--ink);display:block;}
  .cnote{font-size:13px;color:var(--faint);}
  .pair{display:grid;grid-template-columns:320px 1fr;gap:16px;align-items:start;}
  @media (max-width:720px){.pair{grid-template-columns:1fr;}}
  .col{min-width:0;}
  .collabel{font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin:0 0 7px;}
  .empty{border:1px dashed var(--line);border-radius:14px;padding:18px 15px;font-size:12.5px;color:var(--faint);background:var(--surface-2);}
  .notif{background:var(--surface-2);border:1px solid var(--line);border-radius:16px;padding:13px 15px;}
  .nhead{display:flex;align-items:center;gap:7px;margin-bottom:7px;font-size:12px;color:var(--faint);}
  .nicon{width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#fde68a,#fbbf24 46%,#f59e0b);color:#3b2a00;font-weight:800;font-size:12px;display:grid;place-items:center;font-family:"Sora",sans-serif;}
  .napp{font-weight:700;color:var(--muted);}.ndot{color:var(--faint);}.ntime{margin-left:auto;}
  .ntitle{font-weight:700;font-size:15px;color:var(--ink);}
  .nbody{font-size:13.5px;color:var(--muted);margin-top:2px;}
  .nmeta{font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--faint);margin-top:9px;padding-top:8px;border-top:1px solid var(--line);}
  .nk{color:var(--accent-deep);font-weight:600;}
  .mailwrap{border:1px solid var(--line);border-radius:14px;overflow:hidden;}
  .msubj{padding:11px 14px;border-bottom:1px solid var(--line);background:var(--surface-2);}
  .mk{display:block;font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--accent-deep);font-weight:600;margin-bottom:3px;}
  .mst{font-weight:700;font-size:14px;color:var(--ink);}
  .mframe{width:100%;border:0;display:block;background:#fff;}
  footer{margin-top:50px;padding-top:20px;border-top:1px solid var(--line);font-family:"IBM Plex Mono",monospace;font-size:12px;color:var(--faint);}
</style>
<div class="wrap">
  <div class="eyebrow">KarmaVer$e &middot; Rendered preview</div>
  <h1>Transactional &mdash; Push + Email</h1>
  <p class="lede">Every event-driven message for the user persona, rendered with real sample data - the phone push and the inbox email side by side. These fire off a real account or booking event.</p>
  <div class="note">Transactional = always sent. No consent gate, no frequency cap, and no unsubscribe (required communication). Non-transactional / marketing is shown separately.</div>
  ${GROUPS.map(groupBlock).join('\n')}
  <footer>KarmaVer$e &middot; ${total} transactional use-cases &middot; push + email each &middot; rendered with sample data</footer>
</div>
<script>
  function fit(f){ try{ var h=f.contentWindow.document.body.scrollHeight; f.style.height=(h+24)+'px'; }catch(e){ f.style.height='560px'; } }
  document.querySelectorAll('iframe.mframe').forEach(function(f){ f.addEventListener('load',function(){fit(f);}); setTimeout(function(){fit(f);},350); });
  window.addEventListener('resize', function(){ document.querySelectorAll('iframe.mframe').forEach(fit); });
</script>`;

fs.writeFileSync(process.argv[2], page);
console.log('wrote', process.argv[2], '(' + page.length + ' chars,', total, 'use-cases)');
