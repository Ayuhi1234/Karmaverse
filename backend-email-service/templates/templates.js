const { wrapEmail, detailTable, rewardsCard, shortId, safe, escapeHtml, BRAND } = require('./layout');

// One function per template. Keys and their variable sets are a FIXED contract with
// the backend — do not rename or add variables. Every value is run through a
// fallback so a missing field never renders "undefined". Booking ids are shown as
// KC-XXXXX (never the raw Mongo _id); names are Proper-Cased in the greeting.
const SITE = BRAND.site;

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
      heading: 'Verify your email',
      bodyHtml: `<p style="margin:0 0 4px;">Use this code to continue:</p>
        <p style="font-size:34px;font-weight:800;letter-spacing:10px;color:${BRAND.colors.deep};margin:18px 0;text-align:center;">${safe(otp, '------')}</p>
        <p style="margin:0;color:${BRAND.colors.muted};">It's valid for 10 minutes. Never share this code with anyone — our team will never ask for it.</p>`,
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
    subject: `Pickup request received — ${shortId(bookingId) || 'confirmed'}`,
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
      ctaUrl: `${SITE}/OrderTracking`,
    }),
  }),

  BOOKING_ACCEPTED: ({ name, agentName, bookingId, eta }) => ({
    subject: 'Your pickup partner is on the way',
    html: wrapEmail({
      preheader: `${safe(agentName, 'Your pickup partner')} has been assigned to your pickup.`,
      heading: 'A partner is on the way',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 6px;"><strong>${safe(agentName, 'Your pickup partner')}</strong> has been assigned to your pickup${shortId(bookingId) ? ` <strong>${shortId(bookingId)}</strong>` : ''}.</p>
        <p style="margin:0;">They'll reach your location around <strong>${safe(eta, 'shortly')}</strong>. You can follow their progress live.</p>`,
      ctaLabel: 'Track pickup',
      ctaUrl: `${SITE}/OrderTracking`,
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
    subject: `Pickup ${shortId(bookingId) || ''} completed — thank you!`.replace('  ', ' '),
    html: wrapEmail({
      preheader: `Thanks for recycling with ${BRAND.namePlain}.`,
      heading: 'Pickup complete',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">Your pickup${shortId(bookingId) ? ` <strong>${shortId(bookingId)}</strong>` : ''} is complete. Thank you for recycling with ${BRAND.name} and making a real impact.</p>
        <p style="margin:0;">Loved your experience? Don't forget to rate your pickup partner in the app.</p>`,
    }),
  }),

  BOOKING_CANCELLED: ({ name, bookingId, date }) => ({
    subject: `Your pickup ${shortId(bookingId) || ''} was cancelled`.replace('  ', ' '),
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

  // ── Agent app ──
  AGENT_WELCOME: ({ name }) => ({
    subject: `Welcome to the ${BRAND.namePlain} partner team!`,
    html: wrapEmail({
      preheader: 'Your partner account is active.',
      heading: 'Welcome aboard',
      greetingName: name,
      bodyHtml: `<p style="margin:0;">Your pickup-partner account is active. Go online from the dashboard to start receiving pickup requests near you.</p>`,
    }),
  }),

  AGENT_WEEKLY_SUMMARY: ({ name, totalPickups, rating, currentStreak }) => ({
    subject: `Your week on ${BRAND.namePlain} — ${safe(totalPickups, '0')} pickups completed`,
    html: wrapEmail({
      preheader: `${safe(totalPickups, '0')} pickups this week.`,
      heading: 'Your weekly summary',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 4px;">Here's how your week went:</p>
        ${detailTable([
          ['Pickups completed', safe(totalPickups, '0')],
          ['Average rating', safe(rating, '—')],
          ['Current streak', `${safe(currentStreak, '0')} days`],
        ])}
        <p style="margin:14px 0 0;">Keep up the great work!</p>`,
    }),
  }),
};

module.exports = { templates };
