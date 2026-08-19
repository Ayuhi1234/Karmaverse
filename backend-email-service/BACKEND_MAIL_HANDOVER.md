# KarmaVerse — Transactional Email Handover (for Backend)

This folder is the **source of truth for all transactional email content + design**.
Frontend owns the HTML/copy; **backend owns triggering + sending**. Nothing here runs
in production as-is — the backend (FastAPI/Python) plugs its own data into these
templates and sends via its own mailer.

---

## 1. What you're getting

| File | What it is |
|------|-----------|
| `templates/layout.js` | Brand tokens (name, colours, logo, address, socials) + shared HTML shell (`wrapEmail`, buttons, detail tables, social icon row, footer). Every email is built through this. |
| `templates/templates.js` | The **16 email templates** (10 transactional + 6 non-transactional). Each is a function `(data) => ({ subject, html })`. |
| `templates/pushTemplates.js` | The **6 non-transactional push templates** (FCM). Each is `(data) => ({ title, body, data })` — see §8. |
| `assets/` | The **6 brand images** (`email-logo.png` + `social/*.png`) embedded inline in every email — see §3. |
| `preview.html` | Open in a browser to **see all 10 emails rendered** with sample data. Regenerate with `node build-preview.js`. |

There are **16 templates** — 10 transactional (below) + 6 non-transactional (§7). Agent-side emails were removed — user app only.

---

## 2. The 10 templates — variables + when to send

Each template is `templates.NAME(data)` → returns `{ subject, html }`.
`name` is always the **user's full name**; the template auto-greets with the **first name only**.

| Template | Send when (trigger) | Required `data` |
|----------|--------------------|-----------------|
| `WELCOME` | User finishes registration | `{ name }` |
| `OTP` | Email/registration OTP requested | `{ otp }` |
| `PASSWORD_RESET_CONFIRM` | Password successfully reset | `{ name }` |
| `BOOKING_PLACED` | Pickup booking created | `{ name, bookingId, date, timeSlot, address }` |
| `BOOKING_ACCEPTED` | Agent assigned to the booking | `{ name, agentName, bookingId }` |
| `BOOKING_PICKED_UP` | Items picked up + coins credited | `{ name, coins, walletBalance }` |
| `BOOKING_COMPLETED` | Booking marked complete | `{ name, bookingId }` |
| `BOOKING_CANCELLED` | Booking cancelled (user/admin) | `{ name, bookingId, date }` |
| `QUIZ_STREAK_REMINDER` | Daily cron — user's streak at risk | `{ name, streak }` |
| `REFERRAL_REWARD` | Referral bonus credited | `{ name, friendName, coins }` |

- Missing/undefined fields are handled safely (fall back to neutral copy), but pass
  what you have for the best result.
- `bookingId` may be a raw id — the template shortens it for display, and the
  "Track pickup" CTA deep-links to `…/OrderTracking?bookingId=<id>`.

---

## 3. Brand images — now embedded INLINE (cid), not hosted URLs

**Important change.** Emails no longer depend on `karmaverse.earth` for the logo /
social icons. The images (logo was breaking in real inboxes because the URL wasn't
reachable / was blocked as an external image) are now **embedded as CID inline
attachments** — the bytes ride inside the message, so they render:

- even when the client **blocks external images** (very common), and
- **regardless of whether the website is deployed / reachable.**

The 6 image files are bundled here in **`assets/`** (`email-logo.png` +
`assets/social/*.png`) — self-contained, nothing to host.

**When you send, attach these 6 files as inline attachments with the exact content IDs
the HTML references.** `templates/layout.js` → `inlineAttachments()` returns the list;
the HTML uses these `cid:` values:

| Content ID (`cid`) | File |
|--------------------|------|
| `kv-logo` | `assets/email-logo.png` |
| `kv-social-instagram` | `assets/social/instagram.png` |
| `kv-social-facebook` | `assets/social/facebook.png` |
| `kv-social-linkedin` | `assets/social/linkedin.png` |
| `kv-social-x` | `assets/social/x.png` |
| `kv-social-youtube` | `assets/social/youtube.png` |

**Node / nodemailer** (already wired in `emailService.js`):
```js
const { inlineAttachments } = require('./templates/layout');
transporter.sendMail({ to, from, subject, html, text, attachments: inlineAttachments() });
```

**Python / Resend** (production sender) — attach each file with a matching `content_id`:
```python
import base64, pathlib
ASSETS = {
  "kv-logo": "assets/email-logo.png",
  "kv-social-instagram": "assets/social/instagram.png",
  "kv-social-facebook":  "assets/social/facebook.png",
  "kv-social-linkedin":  "assets/social/linkedin.png",
  "kv-social-x":         "assets/social/x.png",
  "kv-social-youtube":   "assets/social/youtube.png",
}
attachments = [{
  "filename": pathlib.Path(p).name,
  "content": base64.b64encode(pathlib.Path(p).read_bytes()).decode(),
  "content_id": cid,          # must match the cid: in the HTML
  "content_type": "image/png",
} for cid, p in ASSETS.items()]
resend.Emails.send({ "from": ..., "to": ..., "subject": subject, "html": html, "attachments": attachments })
```
> The HTML already contains `src="cid:kv-logo"` etc. — do **not** rewrite those to URLs.

**Optional fallback:** if a mailer can't do inline attachments, call
`setAssetMode('url')` (exported from `layout.js`) before rendering to switch every image
back to the public `https://karmaverse.earth/...` URL. Only use this if inline is
impossible — inline is strictly more reliable.

---

## 4. How to actually use these from Python

The templates are JS. Two options:

**Option A (recommended) — port the rendered HTML to your mailer.**
Open `preview.html`, copy each template's final HTML, and turn the `${…}` spots into
your templating placeholders (Jinja2 `{{ }}` / f-strings). Keep the exact structure —
the inline styles are email-client-tested. Then send with your SMTP client.

**Option B — run this as a tiny Node render service.**
`emailService.js` shows the shape. You could expose `render(templateName, data)` over a
local endpoint your FastAPI app calls, then send the returned `{subject, html}`.

Either way: **subject + html come straight from the template — don't rewrite the copy.**

---

## 5. SMTP config (Gmail) — use placeholders only

Set these as backend **environment variables** (never hardcode real values in the repo,
and do not paste real credentials into any third-party tool):

```
GMAIL_USER=<the sending gmail address>
GMAIL_APP_PASSWORD=<gmail app password, 16 chars>
EMAIL_FROM_NAME=KarmaVerse
```

- Use a **Gmail App Password** (not the account password) — requires 2FA on the account.
- `From` should read `KarmaVerse <GMAIL_USER>`.
- See `.env.example` for the reference shape.

---

## 6. Checklist for backend

- [ ] Wire each of the 10 triggers above to send the matching template
- [ ] Pass the exact `data` fields listed per template
- [ ] **Attach the 6 `assets/` images as inline attachments with the matching `content_id`s (see §3)** — this is what makes the logo + icons show
- [ ] Set `GMAIL_USER` / `GMAIL_APP_PASSWORD` / `EMAIL_FROM_NAME` env vars
- [ ] Send yourself one of each and compare against `preview.html`

---

## 7. Non-transactional mailers (engagement / marketing)

Same `templates.NAME(data)` shape, but these are **NOT** triggered by a single
transaction — you send them on a **schedule** or to a **targeted segment**.

| Template | Send when | `data` |
|----------|-----------|--------|
| `IMPACT_REPORT` | Monthly recap (cron) to active users | `{ name, month, kg, pickups, coins }` |
| `ECO_TIP` | Weekly educational nudge | `{ name, tipTitle, tipBody, readUrl }` |
| `REDEMPTION_LIVE` | One-time campaign when cash-out opens | `{ name, balance }` |
| `FEATURE_ANNOUNCEMENT` | Ad-hoc product/feature launches | `{ name, title, body, ctaLabel, ctaUrl }` |
| `WIN_BACK` | Lapsed users (e.g. inactive 30d) | `{ name }` |
| `SEASONAL_GREETING` | Festivals / seasonal | `{ name, occasion, message }` |

> ⚠️ **These require consent + unsubscribe.** Send **only** to users opted in to
> marketing emails, and apply a **frequency cap** (≈ 1–2/week).
>
> Each of these 6 templates now accepts an **`unsubscribeUrl`** field — pass a
> **per-recipient, tokenised** URL (e.g. `https://karmaverse.earth/unsubscribe?token=…`)
> so a single click unsubscribes that exact user. It renders an "Unsubscribe" link +
> an opt-in line in the footer. If omitted, it falls back to `/unsubscribe` (generic).
> Also set the **`List-Unsubscribe`** and **`List-Unsubscribe-Post`** headers at send
> time so Gmail/Outlook show their own one-click unsubscribe. **Transactional emails
> must NOT include unsubscribe** — they don't accept the field (they're legally exempt).

---

## 8. Non-transactional push notifications — `templates/pushTemplates.js`

`pushTemplates.NAME(data)` → `{ title, body, data }`. Send the `title`/`body` as the
FCM notification; pass `data` through as the FCM `data` payload. `data.route` is the
in-app screen to open on tap (Wallet / Quiz / Referral / SchedulePickup) — the app
already deep-links these.

| Template | Send when | `data` |
|----------|-----------|--------|
| `STREAK_AT_RISK` | User's reward streak is in its at-risk window | `{ tier }` |
| `DAILY_QUIZ_REMINDER` | Daily, if today's quiz not played | `{}` |
| `REDEMPTION_READY` | User has a redeemable balance sitting idle | `{ balance }` |
| `TIER_UPGRADE` | User moves up a streak tier | `{ tier }` |
| `WIN_BACK` | Lapsed users (e.g. inactive 14d) | `{ name }` |
| `REFERRAL_NUDGE` | User who has never referred anyone | `{}` |

```js
const { pushTemplates } = require('./templates/pushTemplates');
const { title, body, data } = pushTemplates.STREAK_AT_RISK({ tier: 'Gold' });
// send via FCM: { notification: { title, body }, data }  → to the user's device token
```

> Same consent/frequency rules as §7 — these are marketing pushes. Send only to
> users opted in to non-transactional notifications, and cap frequency (e.g. ≤ 1/day).
> Transactional pushes (booking accepted, coins credited, etc.) are separate and
> always sent.
