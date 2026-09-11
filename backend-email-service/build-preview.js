// Renders every template with realistic sample data into a single preview page,
// so you see EXACTLY what the real email / notification looks like.
const fs = require('fs');
const { setAssetMode } = require('./templates/layout.js');
// Inline the logo + social PNGs as base64 so they render in a browser preview
// (real sends use cid: inline attachments; a browser can't resolve cid:).
setAssetMode('datauri');
const { templates } = require('./templates/templates.js');
const { pushTemplates, txPushTemplates, agentPushTemplates } = require('./templates/pushTemplates.js');

const sample = {
  name: 'Priya', coins: 4055, streak: 7, tier: 'Gold', amount: 1200, date: '12 Oct 2025',
  agentName: 'Rahul', bookingId: '66a9566f0b2c05b90d2b6f9d1', area: 'DLF Cyber City',
  category: 'Laptop', distance: '1.2 km', rating: 5, count: 42, timeSlot: '10 – 11 AM',
  device: 'Redmi Note 12', balance: 6170, walletBalance: 6170, friendName: 'Aman',
  month: 'September', occasion: 'happy diwali', otp: '482915', xp: 320, minRedeem: 1000,
  eligible: true, bonus: 500, coinsSpent: 1500, pickups: 6, kg: 12, joinedThisMonth: false,
  articles: [
    { title: 'Why segregation matters', excerpt: 'A quick guide to sorting recyclables at home so more gets a second life.', image: '', url: '#' },
    { title: 'The journey of your plastic', excerpt: 'Where a PET bottle goes after the agent rides away.', image: '', url: '#' },
  ],
  benefits: ['Live pickup tracking', 'Instant coin credit'],
  title: 'Live pickup tracking', body: 'Follow your pickup partner on the map in real time.', ctaLabel: 'Try it now', ctaUrl: '#',
};

const attrEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const htmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const pushCard = (key, fn) => {
  const r = fn(sample);
  return `<div class="notif">
    <div class="nhead"><span class="nicon">K</span><span class="napp">KarmaVer$e</span><span class="ndot">•</span><span class="ntime">now</span></div>
    <div class="ntitle">${htmlEsc(r.title)}</div>
    <div class="nbody">${htmlEsc(r.body)}</div>
    <div class="nmeta"><span class="nk">${htmlEsc(key)}</span> → ${htmlEsc(r.data.route)}</div>
  </div>`;
};

const mailCard = (key, fn) => {
  const r = fn(sample);
  return `<div class="mail">
    <div class="msubj"><span class="mk">${htmlEsc(key)}</span><span class="mst">${htmlEsc(r.subject)}</span></div>
    <div class="mframe-wrap"><iframe class="mframe" sandbox="allow-same-origin" srcdoc="${attrEsc(r.html)}" loading="lazy"></iframe></div>
  </div>`;
};

const grid = (obj, fn) => Object.keys(obj).map((k) => fn(k, obj[k])).join('\n');

const page = `<title>Notifications &amp; Mailers Preview</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>
  :root{--bg:#f3f7f4;--surface:#fff;--surface-2:#eef3ee;--ink:#122019;--muted:#566b5f;--faint:#7c8f84;--accent:#16a34a;--accent-deep:#15803d;--tx:#2563eb;--tx-soft:#e5edfb;--nt:#b45309;--nt-soft:#fbe7d2;--ag:#7c3aed;--ag-soft:#efe7fb;--line:#e0e7e1;--shadow:0 1px 2px rgba(18,32,25,.05),0 10px 26px rgba(18,32,25,.07);}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0c130f;--surface:#131c17;--surface-2:#182219;--ink:#e7f0ea;--muted:#9baba0;--faint:#7b8c81;--accent:#37c46e;--accent-deep:#2fae61;--tx:#7aa2f7;--tx-soft:#16233e;--nt:#e0a45a;--nt-soft:#2a2013;--ag:#b794f6;--ag-soft:#241a3a;--line:#233029;--shadow:0 1px 2px rgba(0,0,0,.3),0 14px 30px rgba(0,0,0,.32);}}
  :root[data-theme="dark"]{--bg:#0c130f;--surface:#131c17;--surface-2:#182219;--ink:#e7f0ea;--muted:#9baba0;--faint:#7b8c81;--accent:#37c46e;--accent-deep:#2fae61;--tx:#7aa2f7;--tx-soft:#16233e;--nt:#e0a45a;--nt-soft:#2a2013;--ag:#b794f6;--ag-soft:#241a3a;--line:#233029;--shadow:0 1px 2px rgba(0,0,0,.3),0 14px 30px rgba(0,0,0,.32);}
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:"IBM Plex Sans",system-ui,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:1000px;margin:0 auto;padding:clamp(24px,5vw,54px) clamp(16px,4vw,36px) 90px;}
  .eyebrow{font-family:"IBM Plex Mono",monospace;font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:var(--accent-deep);}
  h1{font-family:"Sora",sans-serif;font-weight:800;font-size:clamp(27px,5.5vw,40px);letter-spacing:-.02em;margin:10px 0 10px;}
  .lede{color:var(--muted);max-width:70ch;margin:0;font-size:16px;}
  h2{font-family:"Sora",sans-serif;font-weight:700;font-size:20px;margin:44px 0 4px;display:flex;align-items:center;gap:10px;}
  .pill{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:500;padding:2px 9px;border-radius:999px;}
  .p-tx{background:var(--tx-soft);color:var(--tx);}.p-nt{background:var(--nt-soft);color:var(--nt);}.p-ag{background:var(--ag-soft);color:var(--ag);}
  .sub{color:var(--faint);font-size:13.5px;margin:0 0 14px;}

  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}
  .notif{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:13px 15px;box-shadow:var(--shadow);}
  .nhead{display:flex;align-items:center;gap:7px;margin-bottom:7px;font-size:12px;color:var(--faint);}
  .nicon{width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#fde68a,#fbbf24 46%,#f59e0b);color:#3b2a00;font-weight:800;font-size:12px;display:grid;place-items:center;font-family:"Sora",sans-serif;}
  .napp{font-weight:700;color:var(--muted);}.ndot{color:var(--faint);}.ntime{margin-left:auto;}
  .ntitle{font-weight:700;font-size:15px;color:var(--ink);}
  .nbody{font-size:13.5px;color:var(--muted);margin-top:2px;}
  .nmeta{font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--faint);margin-top:9px;padding-top:8px;border-top:1px solid var(--line);}
  .nk{color:var(--accent-deep);font-weight:600;}

  .mails{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:18px;}
  .mail{background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:var(--shadow);}
  .msubj{padding:12px 15px;border-bottom:1px solid var(--line);background:var(--surface-2);}
  .mk{display:block;font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--accent-deep);font-weight:600;margin-bottom:3px;}
  .mst{font-weight:700;font-size:14px;color:var(--ink);}
  .mframe-wrap{background:#f4f6f8;}
  .mframe{width:100%;border:0;display:block;background:#fff;}
  footer{margin-top:50px;padding-top:20px;border-top:1px solid var(--line);font-size:12.5px;color:var(--faint);font-family:"IBM Plex Mono",monospace;}
</style>
<div class="wrap">
  <div class="eyebrow">KarmaVer$e · Rendered preview</div>
  <h1>Notifications &amp; Mailers — Live Preview</h1>
  <p class="lede">Every template rendered with real sample data, exactly as it appears in the sent email or the phone notification. Emails are the actual HTML output; push cards mirror the OS notification.</p>

  <h2>Push · transactional <span class="pill p-tx">${Object.keys(txPushTemplates).length}</span></h2>
  <p class="sub">Fired by a real booking / account event · sent any hour.</p>
  <div class="cards">${grid(txPushTemplates, pushCard)}</div>

  <h2>Push · non-transactional <span class="pill p-nt">${Object.keys(pushTemplates).length}</span></h2>
  <p class="sub">Scheduled / segment · opt-in + dark-hours rules apply.</p>
  <div class="cards">${grid(pushTemplates, pushCard)}</div>

  <h2>Push · agent <span class="pill p-ag">${Object.keys(agentPushTemplates).length}</span></h2>
  <p class="sub">Sent to the pickup partner.</p>
  <div class="cards">${grid(agentPushTemplates, pushCard)}</div>

  <h2>Email <span class="pill p-tx">${Object.keys(templates).length}</span></h2>
  <p class="sub">The real rendered HTML — same as what lands in the inbox.</p>
  <div class="mails">${grid(templates, mailCard)}</div>

  <footer>KarmaVer$e · ${Object.keys(templates).length} email + ${Object.keys(txPushTemplates).length + Object.keys(pushTemplates).length + Object.keys(agentPushTemplates).length} push · rendered with sample data</footer>
</div>
<script>
  // Size each email iframe to its content so the whole email shows without an inner scrollbar.
  function fit(f){ try{ var h=f.contentWindow.document.body.scrollHeight; f.style.height=(h+24)+'px'; }catch(e){ f.style.height='520px'; } }
  document.querySelectorAll('iframe.mframe').forEach(function(f){ f.addEventListener('load',function(){fit(f);}); setTimeout(function(){fit(f);},300); });
  window.addEventListener('resize', function(){ document.querySelectorAll('iframe.mframe').forEach(fit); });
</script>`;

fs.writeFileSync(process.argv[2], page);
console.log('wrote', process.argv[2], '(' + page.length + ' chars)');
