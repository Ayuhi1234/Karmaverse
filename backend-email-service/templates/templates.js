const { wrapEmail, detailTable, rewardsCard, shortId, safe, escapeHtml, BRAND } = require('./layout');

// One function per template. Keys and their variable sets are a FIXED contract with
// the backend — do not rename or add variables. Every value is run through a
// fallback so a missing field never renders "undefined". Booking ids are shown as
// KC-XXXXX (never the raw Mongo _id); names are Proper-Cased in the greeting.
const SITE = BRAND.site;

// Unsubscribe link for NON-TRANSACTIONAL (marketing) emails only. The backend should
// pass a per-recipient tokenised URL; falls back to a generic preferences page.
// Transactional emails (OTP, booking, password) must NOT include this — they're exempt.
const unsub = (u) => u || `${SITE}/unsubscribe`;

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
    subject: `You earned ${safe(coins, 'your')} ${BRAND.currency}!`,
    html: wrapEmail({
      preheader: `${safe(coins, 'Your')} ${BRAND.currency} credited to your wallet.`,
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

  QUIZ_STREAK_REMINDER: ({ name, streak }) => {
    const s = streak == null || String(streak).trim() === '' ? null : escapeHtml(streak);
    return {
      subject: s ? `Don't lose your ${s}-day quiz streak!` : `Play today's quiz on ${BRAND.namePlain}`,
      html: wrapEmail({
        preheader: "Play today's quiz before it resets.",
        heading: 'Your quiz is waiting',
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 8px;">You haven't played today's ${BRAND.currency} quiz yet.</p>
          ${s ? `<p style="margin:0 0 8px;">You're on a <strong>${s}-day</strong> streak — keep it alive!</p>` : ''}
          <p style="margin:0;">Play now before it resets at 5:30 AM IST.</p>`,
        ctaLabel: "Play today's quiz",
        ctaUrl: `${SITE}/Quiz`,
      }),
    };
  },

  REFERRAL_REWARD: ({ name, friendName, coins }) => ({
    subject: `You earned ${safe(coins, '')} ${BRAND.currency} for referring ${safe(friendName, 'a friend')}!`,
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
  IMPACT_REPORT: ({ name, month, kg, pickups, coins, xp, unsubscribeUrl }) => {
    const num = (v) => (v != null && String(v).trim() !== '' ? Number(v) || 0 : 0);
    const hasKg = num(kg) > 0;
    const didNothing = !hasKg && num(pickups) === 0 && num(coins) === 0; // registered but inactive this month
    return {
      subject: `Your ${safe(month, 'monthly')} Impact with ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: didNothing
          ? `Your everyday materials are waiting — turn them into ${BRAND.currency}.`
          : `See the impact you made${hasKg ? ` — ${escapeHtml(String(kg))} kg recovered` : ''} this month.`,
        heading: `Your ${safe(month, 'monthly')} Impact`,
        greetingName: name,
        bodyHtml: didNothing
          ? `<p style="margin:0 0 12px;">No pickups this month — but it's never too late to start. Your everyday materials can still become ${BRAND.currency} — and a healthier planet.</p>
             <p style="margin:0;">Book a free pickup and make next month count.</p>`
          : `<p style="margin:0 0 4px;">Here's what your sustainable gestures achieved this month.</p>
             ${detailTable([
               ['Resources recovered', hasKg ? `${escapeHtml(String(kg))} kg` : '—'],
               ['Pickups completed', safe(pickups, '0')],
               [`${BRAND.currency} earned`, safe(coins, '0')],
               ...(xp != null && String(xp).trim() !== '' ? [['XP earned', safe(xp)]] : []),
             ])}
             <p style="margin:14px 0 0;">Every kg counts. Keep the momentum going!</p>`,
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
          <a href="${(a && a.url) || `${SITE}/KnowledgeHub`}" style="font-size:13px;font-weight:800;color:${BRAND.colors.green};text-decoration:none;">Read the full article &rarr;</a>
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

  // One-time campaign: announce that redemption/cash-out is live.
  REDEMPTION_LIVE: ({ name, balance, unsubscribeUrl }) => ({
    subject: `Your ${BRAND.namePlain} rewards are ready to redeem`,
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: `Turn your ${BRAND.currency} into real rewards.`,
      heading: 'Your Rewards Are Ready',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">Good news — you can now redeem your ${BRAND.currency} for real rewards.</p>
        ${balance != null && String(balance).trim() !== '' ? `<p style="margin:0 0 12px;">You have <strong>${escapeHtml(String(balance))} ${BRAND.currency}</strong> ready to redeem.</p>` : ''}
        <p style="margin:0;">Keep up your sustainable gestures and earn even more.</p>`,
      ctaLabel: 'Open my wallet',
      ctaUrl: `${SITE}/Wallet`,
    }),
  }),

  // Generic product/feature announcement. `title`/`body`/`ctaLabel`/`ctaUrl` are
  // filled per campaign; all fall back so the shell always renders.
  FEATURE_ANNOUNCEMENT: ({ name, title, body, ctaLabel, ctaUrl, unsubscribeUrl }) => ({
    subject: safe(title, `What's new on ${BRAND.namePlain}`),
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: safe(title, `A new update just landed on ${BRAND.namePlain}.`),
      heading: safe(title, "What's new"),
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">${safe(body, `We've just rolled out an update to make ${BRAND.name} even better. Open the app to check it out.`)}</p>`,
      ctaLabel: safe(ctaLabel, 'Open the app'),
      ctaUrl: safe(ctaUrl, `${SITE}/`),
    }),
  }),

  // Re-engagement / win-back for lapsed users.
  WIN_BACK: ({ name, unsubscribeUrl }) => ({
    subject: `Ready for your next ${BRAND.namePlain} pickup?`,
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: `Your next ${BRAND.namePlain} pickup is one tap away.`,
      heading: 'Ready for Your Next Pickup?',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">It's been a while! Your everyday materials can still become ${BRAND.currency} — and positive environmental impact.</p>
        <p style="margin:0;">Book a free pickup whenever you're ready and keep valuable resources in the loop.</p>`,
      ctaLabel: 'Book a free pickup',
      ctaUrl: `${SITE}/SchedulePickup`,
    }),
  }),

  // Seasonal / festival greeting. `occasion` e.g. "Happy Diwali"; `message` optional.
  SEASONAL_GREETING: ({ name, occasion, message, unsubscribeUrl }) => ({
    subject: occasion ? `${safe(occasion)} from ${BRAND.namePlain}` : `Warm wishes from ${BRAND.namePlain}`,
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: safe(occasion, `Season's greetings from the ${BRAND.namePlain} team.`),
      heading: safe(occasion, 'Warm wishes'),
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">${safe(message, `Wishing you and your family a bright, joyful and sustainable ${safe(occasion, 'celebration')}. Thank you for keeping resources in the loop with us and making a real difference.`)}</p>`,
      ctaLabel: 'Open the app',
      ctaUrl: `${SITE}/`,
    }),
  }),
};

module.exports = { templates };
