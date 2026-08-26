const { wrapEmail, detailTable, rewardsCard, shortId, safe, escapeHtml, properCase, BRAND } = require('./layout');

// One function per template. Keys and their variable sets are a FIXED contract with
// the backend — do not rename or add variables. Every value is run through a
// fallback so a missing field never renders "undefined". Booking ids are shown as
// KC-XXXXX (never the raw Mongo _id); names are Proper-Cased in the greeting.
const SITE = BRAND.site;

// Unsubscribe link for NON-TRANSACTIONAL (marketing) emails only. The backend should
// pass a per-recipient tokenised URL; falls back to a generic preferences page.
// Transactional emails (OTP, booking, password) must NOT include this — they're exempt.
const unsub = (u) => u || `${SITE}/unsubscribe`;
// Thousands separator for big numbers (4055 -> 4,055) — falls back to the raw value.
const comma = (v) => { const n = Number(String(v).replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n.toLocaleString('en-US') : String(v); };
// True when a value is present and non-empty (used to conditionally render optional fields).
const has0 = (v) => v != null && String(v).trim() !== '';

const templates = {
  WELCOME: ({ name }) => ({
    subject: `Welcome to ${BRAND.namePlain} — start earning ${BRAND.currency}`,
    html: wrapEmail({
      preheader: 'Where everyday actions create measurable environmental impact.',
      heading: `Welcome to ${BRAND.name}`,
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;font-weight:700;color:${BRAND.colors.text};">Where everyday actions create measurable environmental impact.</p>
        <p style="margin:0 0 12px;">Book a verified resource recovery service, engage with sustainability initiatives, and earn <strong>${BRAND.currency}</strong> as you contribute to a more circular and resource-efficient future.</p>
        <p style="margin:0;color:${BRAND.colors.muted};font-style:italic;">Sustainability begins with action. Impact follows.</p>`,
      ctaLabel: 'Get started',
      ctaUrl: `${SITE}/`,
    }),
  }),

  OTP: ({ otp }) => ({
    subject: `Your ${BRAND.namePlain} verification code`,
    html: wrapEmail({
      preheader: `Your verification code${otp ? ` is ${escapeHtml(otp)}` : ''}`,
      heading: 'Verify your email address',
      bodyHtml: `<p style="margin:0 0 4px;">Enter this 6-digit code in the ${BRAND.name} app to verify your email and continue:</p>
        <p style="font-size:34px;font-weight:800;letter-spacing:10px;color:${BRAND.colors.deep};margin:18px 0;text-align:center;">${safe(otp, '------')}</p>
        <p style="margin:0;color:${BRAND.colors.muted};">This code is valid for 10 minutes. Never share it with anyone — our team will never ask for it.</p>`,
    }),
  }),

  PASSWORD_RESET_CONFIRM: ({ name }) => ({
    subject: `Your ${BRAND.namePlain} password was changed`,
    html: wrapEmail({
      preheader: `Your ${BRAND.namePlain} password was updated.`,
      heading: 'Password updated',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">Your ${BRAND.name} password was successfully updated.</p>
        <p style="margin:0;">If you didn't make this change, please <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.colors.green};font-weight:700;">contact support</a> immediately.</p>`,
    }),
  }),

  BOOKING_PLACED: ({ name, bookingId, date, timeSlot, address }) => ({
    subject: `Your ${BRAND.namePlain} pickup is booked — ${shortId(bookingId) || 'confirmed'}`,
    html: wrapEmail({
      preheader: `Your pickup for ${safe(date, 'your selected date')} has been received.`,
      heading: 'Pickup request received',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 4px;">Thanks — we've received your pickup request. Here are the details:</p>
        ${detailTable([
          ['Booking ID', shortId(bookingId) || '—'],
          ['Date', safe(date, 'To be confirmed')],
          ['Time slot', safe(timeSlot, 'To be confirmed')],
          ['Pickup address', safe(address, '—')],
        ])}
        <p style="margin:14px 0 0;">We'll notify you as soon as a pickup partner is assigned.</p>`,
      ctaLabel: 'Track pickup',
      ctaUrl: `${SITE}/OrderTracking${bookingId ? `?bookingId=${encodeURIComponent(bookingId)}` : ''}`,
    }),
  }),

  BOOKING_ACCEPTED: ({ name, agentName, bookingId }) => ({
    subject: `Your ${BRAND.namePlain} pickup partner is on the way`,
    html: wrapEmail({
      preheader: `${safe(agentName, 'Your pickup partner')} has been assigned to your pickup.`,
      heading: 'A partner is on the way',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 6px;"><strong>${safe(agentName, 'Your pickup partner')}</strong> has been assigned to your pickup${shortId(bookingId) ? ` <strong>${shortId(bookingId)}</strong>` : ''}.</p>
        <p style="margin:0;">They're on their way to your location now. Tap <strong>Track pickup</strong> below to see their live location and estimated arrival time.</p>`,
      ctaLabel: 'Track pickup',
      ctaUrl: `${SITE}/OrderTracking${bookingId ? `?bookingId=${encodeURIComponent(bookingId)}` : ''}`,
    }),
  }),

  BOOKING_PICKED_UP: ({ name, coins, walletBalance }) => ({
    subject: `You earned ${safe(coins, 'your')} ${BRAND.currency} on ${BRAND.namePlain}!`,
    html: wrapEmail({
      preheader: `${safe(coins, 'Your')} ${BRAND.currency} credited to your ${BRAND.namePlain} wallet.`,
      heading: 'Coins credited',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 2px;">Your items have been verified and your reward is in.</p>
        ${rewardsCard(safe(coins, '0'), walletBalance == null ? null : safe(walletBalance, ''))}`,
      ctaLabel: 'View wallet',
      ctaUrl: `${SITE}/Wallet`,
    }),
  }),

  BOOKING_COMPLETED: ({ name, bookingId }) => ({
    subject: `Your ${BRAND.namePlain} pickup is complete — thank you!`,
    html: wrapEmail({
      preheader: `Thanks for keeping resources in the loop with ${BRAND.namePlain}.`,
      heading: 'Pickup complete',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">Your pickup${shortId(bookingId) ? ` <strong>${shortId(bookingId)}</strong>` : ''} is complete. Thank you for keeping valuable resources in the loop with ${BRAND.name} and making a real impact.</p>
        <p style="margin:0;">Loved your experience? Don't forget to rate your pickup partner in the app.</p>`,
    }),
  }),

  BOOKING_CANCELLED: ({ name, bookingId, date }) => ({
    subject: `Your ${BRAND.namePlain} pickup was cancelled`,
    html: wrapEmail({
      preheader: `Your pickup scheduled for ${safe(date, 'your selected date')} was cancelled.`,
      heading: 'Booking cancelled',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">Your pickup${shortId(bookingId) ? ` <strong>${shortId(bookingId)}</strong>` : ''} scheduled for <strong>${safe(date, 'your selected date')}</strong> has been cancelled.</p>
        <p style="margin:0;">Changed your mind? You can schedule a new pickup anytime.</p>`,
      ctaLabel: 'Schedule a new pickup',
      ctaUrl: `${SITE}/SchedulePickup`,
    }),
  }),

  // ENGAGEMENT (scheduled nudge) — requires marketing opt-in + unsubscribe, same as
  // DAILY_QUIZ below. Sent daily to opted-in users who haven't played yet.
  QUIZ_STREAK_REMINDER: ({ name, streak, unsubscribeUrl }) => {
    const s = streak == null || String(streak).trim() === '' ? null : escapeHtml(streak);
    return {
      subject: s ? `Don't lose your ${s}-day quiz streak on ${BRAND.namePlain}!` : `Play today's quiz on ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: "Play today's quiz before it resets.",
        heading: 'Your quiz is waiting',
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 8px;">You haven't played today's ${BRAND.currency} quiz yet.</p>
          ${s ? `<p style="margin:0 0 8px;">You're on a <strong>${s}-day</strong> streak — keep it alive!</p>` : ''}
          <p style="margin:0;">Play now before it resets tonight.</p>`,
        ctaLabel: "Play today's quiz",
        ctaUrl: `${SITE}/Quiz`,
      }),
    };
  },

  REFERRAL_REWARD: ({ name, friendName, coins }) => ({
    subject: `You earned ${safe(coins, '')} ${BRAND.currency} on ${BRAND.namePlain} — referral bonus!`,
    html: wrapEmail({
      preheader: `${safe(friendName, 'A friend')} joined using your referral code.`,
      heading: 'Referral reward credited',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 2px;">Your friend <strong>${safe(friendName, 'a friend')}</strong> just joined ${BRAND.name} using your referral code.</p>
        ${rewardsCard(safe(coins, '0'), null)}
        <p style="margin:0;">Invite more friends and you both keep earning.</p>`,
      ctaLabel: 'Invite more friends',
      ctaUrl: `${SITE}/Referral`,
    }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // NON-TRANSACTIONAL (engagement / marketing)
  // These are NOT triggered by a single transaction — the backend sends them on a
  // schedule or to a targeted segment. They REQUIRE the user to be opted in to
  // marketing emails and must honour unsubscribe (footer "Manage preferences").
  // Send only to opted-in users, and respect a frequency cap.
  // ─────────────────────────────────────────────────────────────────────────

  // Monthly recap of the user's recycling impact. Send once a month to actives.
  // `coins` = coins earned THIS month, `coinsSpent` = coins redeemed this month,
  // `balance` = current available balance. `joinedThisMonth` flags a user who
  // registered mid/late-month so the recap reads as a partial snapshot, not a full one.
  IMPACT_REPORT: ({ name, month, kg, pickups, coins, coinsSpent, balance, xp, joinedThisMonth, unsubscribeUrl }) => {
    const num = (v) => (v != null && String(v).trim() !== '' ? Number(v) || 0 : 0);
    const has = (v) => v != null && String(v).trim() !== '';
    const hasKg = num(kg) > 0;
    const didNothing = !hasKg && num(pickups) === 0 && num(coins) === 0; // registered but inactive this month
    const newThisMonth = joinedThisMonth === true || String(joinedThisMonth) === 'true';
    return {
      subject: `Your ${safe(month, 'monthly')} impact with ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: didNothing
          ? `Your everyday materials are waiting — turn them into ${BRAND.currency}.`
          : `See the impact you made${hasKg ? ` — ${escapeHtml(String(kg))} kg recovered` : ''} this month.`,
        heading: `Your ${safe(month, 'monthly')} impact`,
        greetingName: name,
        bodyHtml: didNothing
          ? `<p style="margin:0 0 12px;">${newThisMonth ? `Welcome to ${BRAND.name}! You joined partway through ${safe(month, 'this month')}, so there's nothing to report just yet — but your first pickup is all it takes to change that.` : `No pickups this month — but it's never too late to start. Your everyday materials can still become ${BRAND.currency} — and a healthier planet.`}</p>
             <p style="margin:0;">Book a free pickup and make next month count.</p>`
          : `<p style="margin:0 0 4px;">${newThisMonth ? `Welcome aboard! Since you joined partway through ${safe(month, 'this month')}, here's your partial snapshot so far:` : `Here's the difference your everyday green gestures made this month:`}</p>
             ${detailTable([
               ['Resources given a second life', hasKg ? `${escapeHtml(String(kg))} kg` : '—'],
               ['Green pickups completed', safe(pickups, '0')],
               [`${BRAND.currency} earned this month`, safe(coins, '0')],
               ...(has(coinsSpent) ? [[`${BRAND.currency} redeemed this month`, safe(coinsSpent, '0')]] : []),
               ...(has(balance) ? [[`Available balance`, `${escapeHtml(comma(balance))} ${BRAND.currency}`]] : []),
               ...(has(xp) ? [['XP earned', safe(xp)]] : []),
             ])}
             <p style="margin:14px 0 0;">Every kilogram keeps our shared ecosystem lighter. Keep the momentum going!</p>`,
        ctaLabel: didNothing ? 'Book a free pickup' : 'Schedule your next pickup',
        ctaUrl: `${SITE}/SchedulePickup`,
      }),
    };
  },

  // Monthly sustainability NEWSLETTER (replaces the weekly eco-tip). `articles` is an
  // array of { title, excerpt, image, url }. Only previews are included — never the
  // full article — and each card links out to the app/site. Keeps the HTML light.
  NEWSLETTER: ({ name, month, articles, unsubscribeUrl }) => {
    const list = Array.isArray(articles) ? articles.slice(0, 5) : [];
    const cards = list.map((a) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:1px solid ${BRAND.colors.line};border-radius:14px;overflow:hidden;">
        ${a && a.image ? `<tr><td><a href="${(a && a.url) || `${SITE}/KnowledgeHub`}" target="_blank"><img src="${a.image}" width="536" alt="${safe(a.title, 'Article')}" style="display:block;width:100%;max-width:536px;height:auto;border:0;" /></a></td></tr>` : ''}
        <tr><td style="padding:16px 18px;">
          <h3 style="margin:0 0 6px;font-size:16px;line-height:1.3;color:${BRAND.colors.text};font-weight:800;">${safe(a && a.title, 'Untitled')}</h3>
          <p style="margin:0 0 12px;font-size:13.5px;line-height:1.55;color:${BRAND.colors.body};">${safe(a && a.excerpt, '')}</p>
          <a href="${(a && a.url) || `${SITE}/KnowledgeHub`}" style="font-size:13px;font-weight:800;color:${BRAND.colors.green};text-decoration:none;">Read more &rarr;</a>
        </td></tr>
      </table>`).join('');
    return {
      subject: `Your ${safe(month, 'monthly')} sustainability update from ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: `Sustainability tips and stories from ${BRAND.namePlain}.`,
        heading: `${safe(month, 'This month')}'s sustainability update`,
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 14px;">A few things worth knowing this month, straight from the ${BRAND.name} Knowledge Hub:</p>
          ${cards || `<p style="margin:0 0 12px;color:${BRAND.colors.muted};">Fresh sustainability stories are on the way — explore the Knowledge Hub in the meantime.</p>`}`,
        ctaLabel: 'Explore the Knowledge Hub',
        ctaUrl: `${SITE}/KnowledgeHub`,
      }),
    };
  },

  // Rewards / redemption email — three states driven by the recipient's data so we
  // never tell a zero-balance user to "redeem now":
  //   A) has a redeemable balance (eligible)     → "ready to redeem", CTA Redeem now
  //   B) zero balance                             → "start earning", CTA Schedule a pickup
  //   C) has balance but not yet eligible         → "almost there", CTA View rewards
  // `balance` = redeemable coins, `xp` optional, `eligible` (default true) gates C,
  // `minRedeem` optional threshold shown in state C.
  REDEMPTION_LIVE: ({ name, balance, xp, eligible, minRedeem, unsubscribeUrl }) => {
    const num = (v) => (v != null && String(v).trim() !== '' ? Number(String(v).replace(/[^\d.]/g, '')) || 0 : 0);
    const has = (v) => v != null && String(v).trim() !== '';
    const hasBalance = num(balance) > 0;
    const notEligible = eligible === false || String(eligible) === 'false';
    const state = !hasBalance ? 'earn' : (notEligible ? 'soon' : 'ready');

    const balanceCard = (labelText) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;"><tr><td align="center" style="padding:18px;">
        <div style="font-size:34px;line-height:1.1;font-weight:900;color:${BRAND.colors.green};">${escapeHtml(comma(balance))}</div>
        <div style="font-size:13px;font-weight:700;color:${BRAND.colors.muted};margin-top:2px;">${labelText}</div>
        ${has(xp) ? `<div style="font-size:13px;font-weight:700;color:${BRAND.colors.muted};margin-top:6px;">${escapeHtml(comma(xp))} XP earned</div>` : ''}
      </td></tr></table>`;

    const copy = {
      ready: {
        subject: `Your ${BRAND.currency} are ready to redeem on ${BRAND.namePlain}`,
        preheader: `Turn your ${BRAND.currency} into real rewards.`,
        heading: 'Your rewards are ready',
        body: `<p style="margin:0 0 12px;">Good news — your ${BRAND.currency} can now be redeemed for real rewards.</p>
          ${balanceCard(`${BRAND.currency} ready to redeem`)}
          <p style="margin:0;">Every gesture you've made for the ecosystem brought you here. Keep going, and keep earning.</p>`,
        ctaLabel: 'Redeem now',
        ctaUrl: `${SITE}/Wallet`,
      },
      soon: {
        subject: `Your ${BRAND.namePlain} rewards are almost ready`,
        preheader: `You're close — a little more and your ${BRAND.currency} unlock.`,
        heading: 'Almost there',
        body: `<p style="margin:0 0 12px;">You're building a great balance${has(minRedeem) ? ` — you need <strong>${escapeHtml(comma(minRedeem))} ${BRAND.currency}</strong> to start redeeming` : ''}. Keep it going and your rewards will unlock soon.</p>
          ${balanceCard(`${BRAND.currency} so far`)}
          <p style="margin:0;">A pickup, quiz, or referral gets you there faster.</p>`,
        ctaLabel: 'View rewards',
        ctaUrl: `${SITE}/Wallet`,
      },
      earn: {
        subject: `Start earning redeemable ${BRAND.currency} with ${BRAND.namePlain}`,
        preheader: `Your everyday materials can become real rewards.`,
        heading: 'Start earning rewards',
        body: `<p style="margin:0 0 12px;">You can now redeem ${BRAND.currency} for real rewards — you just need a balance to begin. Your everyday materials are the easiest way to start.</p>
          <p style="margin:0;">Book a free pickup and watch your rewards grow.</p>`,
        ctaLabel: 'Schedule a pickup',
        ctaUrl: `${SITE}/SchedulePickup`,
      },
    }[state];

    return {
      subject: copy.subject,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: copy.preheader,
        heading: copy.heading,
        greetingName: name,
        bodyHtml: copy.body,
        ctaLabel: copy.ctaLabel,
        ctaUrl: copy.ctaUrl,
      }),
    };
  },

  // Generic product/feature announcement. Flexible per campaign:
  //   `title`   — feature name (subject always carries the brand)
  //   `image`   — screenshot/hero URL (optional)
  //   `body`    — short description
  //   `benefits`— array of key user benefits (optional; rendered as a checklist)
  //   `ctaLabel`/`ctaUrl` — link straight to the feature, not the homepage
  FEATURE_ANNOUNCEMENT: ({ name, title, image, body, benefits, ctaLabel, ctaUrl, unsubscribeUrl }) => {
    const list = Array.isArray(benefits) ? benefits.filter((b) => has0(b)) : [];
    const benefitsHtml = list.length
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 14px;">${list.map((b) => `<tr><td style="padding:4px 0;font-size:14px;color:${BRAND.colors.body};"><span style="color:${BRAND.colors.green};font-weight:800;">&#10003;</span>&nbsp;&nbsp;${safe(b, '')}</td></tr>`).join('')}</table>`
      : '';
    const imgHtml = has0(image)
      ? `<img src="${image}" width="536" alt="${safe(title, 'New feature')}" style="display:block;width:100%;max-width:536px;height:auto;border:1px solid ${BRAND.colors.line};border-radius:14px;margin:0 0 16px;" />`
      : '';
    return {
      subject: has0(title) ? `${safe(title)} — ${BRAND.namePlain}` : `What's new on ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: safe(title, `A new update just landed on ${BRAND.namePlain}.`),
        heading: safe(title, "What's new"),
        greetingName: name,
        bodyHtml: `${imgHtml}<p style="margin:0 0 12px;">${safe(body, `We've just rolled out an update to make ${BRAND.name} even better. Open the app to check it out.`)}</p>${benefitsHtml}`,
        ctaLabel: safe(ctaLabel, 'Open the app'),
        ctaUrl: safe(ctaUrl, `${SITE}/`),
      }),
    };
  },

  // Re-engagement / win-back for lapsed users.
  WIN_BACK: ({ name, unsubscribeUrl }) => ({
    subject: `We miss you at ${BRAND.namePlain}`,
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: 'Your next green gesture is just one pickup away.',
      heading: 'We miss you',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">It's been a while! Your everyday materials can still become ${BRAND.currency} — and real impact for the ecosystem.</p>
        <p style="margin:0;">Book a free pickup whenever you're ready and keep valuable resources moving in the loop.</p>`,
      ctaLabel: 'Book a free pickup',
      ctaUrl: `${SITE}/SchedulePickup`,
    }),
  }),

  // Seasonal / festival greeting. `occasion` e.g. "happy diwali" (auto title-cased so
  // festival names always render correctly: "Happy Diwali", "Eid Mubarak"); `message` optional.
  SEASONAL_GREETING: ({ name, occasion, message, unsubscribeUrl }) => {
    const occ = has0(occasion) ? escapeHtml(properCase(occasion)) : '';
    return {
      subject: occ ? `${occ} from ${BRAND.namePlain}` : `Warm wishes from ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: occ || `Season's greetings from the ${BRAND.namePlain} team.`,
        heading: occ || 'Warm wishes',
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 12px;">${safe(message, `Wishing you and your family a bright, joyful and sustainable ${occ || 'celebration'}. Thank you for keeping resources in the loop with us and making a real difference.`)}</p>`,
        ctaLabel: 'Open the app',
        ctaUrl: `${SITE}/`,
      }),
    };
  },

  // Daily eco-quiz nudge (email version of the push). Play to earn coins; resets nightly.
  DAILY_QUIZ: ({ name, streak, unsubscribeUrl }) => {
    const st = streak != null && String(streak).trim() !== '' && Number(streak) > 0 ? escapeHtml(String(streak)) : null;
    return {
      subject: `Today's eco quiz is live on ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: `5 quick questions, instant ${BRAND.currency}.`,
        heading: "Today's eco quiz is live",
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 8px;">Answer 5 quick questions on sustainability and earn ${BRAND.currency} — it resets tonight.</p>
          ${st ? `<p style="margin:0 0 8px;">You're on a <strong>${st}-day</strong> streak — keep it alive!</p>` : ''}
          <p style="margin:0;">A few minutes, a little knowledge, real rewards.</p>`,
        ctaLabel: "Play today's quiz",
        ctaUrl: `${SITE}/Quiz`,
      }),
    };
  },

  // Birthday greeting (reusable). Optional `bonus` = birthday KarmaCoins XP the backend
  // credited — when present the CTA points at the wallet, otherwise a soft app nudge.
  BIRTHDAY: ({ name, bonus, unsubscribeUrl }) => {
    const gift = has0(bonus) && Number(String(bonus).replace(/[^\d.]/g, '')) > 0;
    return {
      subject: `Happy birthday from ${BRAND.namePlain}!`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: gift ? `A little birthday gift is waiting in your wallet.` : `Wishing you a wonderful day from all of us.`,
        heading: 'Happy birthday!',
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 12px;">From everyone at ${BRAND.name}, we hope your day is bright, joyful and kind to the planet.</p>
          ${gift ? `${rewardsCard(escapeHtml(comma(bonus)), null)}<p style="margin:0;">Consider it our way of saying thanks for being part of a more sustainable future. Enjoy!</p>` : `<p style="margin:0;">Here's to another year of small gestures that keep our shared ecosystem lighter.</p>`}`,
        ctaLabel: gift ? 'See my wallet' : 'Open the app',
        ctaUrl: gift ? `${SITE}/Wallet` : `${SITE}/`,
      }),
    };
  },

  // Streak-tier upgrade celebration (email version of the push). `tier` = tier name.
  TIER_UPGRADE: ({ name, tier, unsubscribeUrl }) => ({
    subject: `You've reached ${safe(tier, 'a new')} tier on ${BRAND.namePlain}`,
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: 'Each reward coin is now worth more.',
      heading: `You've reached ${safe(tier, 'a new tier')}!`,
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">Your consistency is paying off — you've reached <strong>${safe(tier, 'a new')} tier</strong>. Each of your reward coins is now worth more than it was at your previous tier.</p>
        <p style="margin:0;">Keep the streak alive with a pickup, quiz, or referral to hold your tier — and climb higher for even more value.</p>`,
      ctaLabel: 'See my wallet',
      ctaUrl: `${SITE}/Wallet`,
    }),
  }),
};

module.exports = { templates };
