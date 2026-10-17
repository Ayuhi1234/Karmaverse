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
| `templates/templates.js` | The **19 email templates** (9 transactional + 10 engagement). Each is a function `(data) => ({ subject, html })`. |
| `templates/pushTemplates.js` | The **6 engagement push templates** (FCM). Each is `(data) => ({ title, body, data })` — see §8. |
| `assets/` | The **6 brand images** (`email-logo.png` + `social/*.png`) embedded inline in every email — see §3. |
| `preview.html` | Open in a browser to **see the emails rendered** with sample data. Regenerate with `node build-preview.js`. |

**19 email templates** — 9 transactional (§2) + 10 engagement/non-transactional (§7) — plus 6 engagement push (§8). Agent-side emails were removed — user app only.

---

## 2. The 9 transactional templates — variables + when to send

Each template is `templates.NAME(data)` → returns `{ subject, html }`.
`name` is always the **user's full name**; the template auto-greets with the **first name only**.
These are **always sent** (no consent gate, no unsubscribe).

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
| `REFERRAL_REWARD` | Referral bonus credited | `{ name, friendName, coins }` |

> `QUIZ_STREAK_REMINDER` used to be here — it's now an **engagement** send (needs
> consent + unsubscribe). See §7.

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

- [ ] Wire each of the 9 transactional triggers (§2) + the engagement sends (§7/§8)
- [ ] Pass the exact `data` fields listed per template (incl. the new ones in §10)
- [ ] Implement the notification endpoints in §9 + include `notificationId` in pushes
- [ ] Add the marketing opt-in flag + tokenised unsubscribe; gate all §7/§8 sends on it
- [ ] **Attach the 6 `assets/` images as inline attachments with the matching `content_id`s (see §3)** — this is what makes the logo + icons show
- [ ] Set `GMAIL_USER` / `GMAIL_APP_PASSWORD` / `EMAIL_FROM_NAME` env vars
- [ ] Send yourself one of each and compare against `preview.html`

---

## 7. Non-transactional mailers (engagement / marketing)

Same `templates.NAME(data)` shape, but these are **NOT** triggered by a single
transaction — you send them on a **schedule** or to a **targeted segment**.
**Every one accepts `unsubscribeUrl`** and renders the unsubscribe footer.

| Template | Send when | `data` |
|----------|-----------|--------|
| `IMPACT_REPORT` | Monthly recap (cron), first week of the month | `{ name, month, kg, pickups, coins, coinsSpent, balance, xp, joinedThisMonth, unsubscribeUrl }` |
| `NEWSLETTER` | Monthly sustainability digest | `{ name, month, articles: [{ title, excerpt, image, url }], unsubscribeUrl }` |
| `REDEMPTION_LIVE` | Rewards/redemption campaign (3 auto states) | `{ name, balance, xp, eligible, minRedeem, unsubscribeUrl }` |
| `FEATURE_ANNOUNCEMENT` | Per feature launch, segment = active last 6 mo | `{ name, title, image, body, benefits: [str], ctaLabel, ctaUrl, unsubscribeUrl }` |
| `WIN_BACK` | Lapsed users (define window, e.g. inactive 14d+) | `{ name, unsubscribeUrl }` |
| `SEASONAL_GREETING` | Festivals (occasion auto title-cased) | `{ name, occasion, message, unsubscribeUrl }` |
| `DAILY_QUIZ` | Daily, if today's quiz not played | `{ name, streak, unsubscribeUrl }` |
| `QUIZ_STREAK_REMINDER` | Daily, streak at risk (alt of DAILY_QUIZ) | `{ name, streak, unsubscribeUrl }` |
| `TIER_UPGRADE` | User moves up a streak tier | `{ name, tier, unsubscribeUrl }` |
| `BIRTHDAY` | User's birthday (bonus optional) | `{ name, bonus, unsubscribeUrl }` |

**Field notes / behaviour (important — these drive the edge cases):**
- `IMPACT_REPORT`: pass **`coins` (earned this month)**, **`coinsSpent` (redeemed)** and
  **`balance` (current)** as three separate numbers — the email shows them distinctly.
  Set **`joinedThisMonth: true`** for users who registered mid/late-month → it renders a
  "partial snapshot" welcome instead of a full recap. All-zero / inactive is handled.
- `REDEMPTION_LIVE`: the template picks one of **three** versions from the data —
  has balance (`eligible !== false`, `balance > 0`) → "Redeem now"; **zero balance** →
  "Schedule a pickup"; **has balance but `eligible: false`** → "almost there" (pass
  `minRedeem` to show the threshold). Never tells a zero-balance user to redeem.
- `FEATURE_ANNOUNCEMENT`: `image` = a hosted screenshot URL; `benefits` = array of short
  strings (rendered as a checklist); `ctaUrl` must deep-link to the feature, not the home.
- `BIRTHDAY`: if `bonus > 0`, shows the gifted coins + wallet CTA; else a plain wish.

> ⚠️ **These require consent + unsubscribe.** Send **only** to users opted in to
> marketing emails, and apply a **frequency cap** (engagement email cap per month;
> ≤ 1 marketing push/day). Respect **quiet hours** (no overnight push, user TZ / IST).
>
> Pass a **per-recipient, tokenised** `unsubscribeUrl`
> (e.g. `https://karmaverse.earth/unsubscribe?token=…`) so one click unsubscribes that
> exact user. Also set the **`List-Unsubscribe`** + **`List-Unsubscribe-Post`** headers
> at send time. **One opt-out must silence every engagement email AND push.**
> **Transactional emails must NOT include unsubscribe** — they don't accept the field.
> Send transactional and marketing over **separate streams/domains** so a marketing
> spam complaint never hurts OTP/booking deliverability.

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

**Open-rate reporting:** the app reports a tap back via
`PATCH /api/v1/notifications/:id/opened`. For that to work, include a stable
**`notificationId`** in every push's `data` payload (alongside `route`/`type`):
```js
data: { ...tpl.data, notificationId: "<the id you stored for this send>" }
```
Store each send so the id resolves; the PATCH is idempotent and fire-and-forget.

### Transactional pushes — `txPushTemplates` (always sent)

Exported alongside `pushTemplates` from the same file. These fire on a real
booking event (the same socket events the app listens for), so — unlike the 6
engagement pushes above — they are **always sent**: no consent gate, no cap, no
quiet hours. `data.bookingId` deep-links the app to that booking.

| Template | Fire on (socket event) | `data` | opens |
|----------|------------------------|--------|-------|
| `BOOKING_ACCEPTED` | Agent assigned | `{ agentName, bookingId }` | OrderTracking |
| `AGENT_REACHED` | Agent at location | `{ bookingId }` | OrderTracking |
| `BOOKING_PICKED_UP` | Items verified + coins credited | `{ coins, bookingId }` | Wallet |
| `BOOKING_COMPLETED` | Pickup complete | `{ bookingId }` | OrderTracking |
| `BOOKING_CANCEL_SUCCESS` | Booking cancelled | `{ bookingId }` | SchedulePickup |
| `BOOKING_IN_POOL` | High demand → priority pool | `{ bookingId }` | OrderTracking |

```js
const { txPushTemplates } = require('./templates/pushTemplates');
const { title, body, data } = txPushTemplates.BOOKING_ACCEPTED({ agentName: 'Ravi', bookingId });
// send via FCM to the user's device token: { notification: { title, body }, data }
```

> **12 push templates total** — 6 engagement (`pushTemplates`, consent + cap) +
> 6 transactional (`txPushTemplates`, always sent).

---

## 9. Notification plumbing (endpoints the app already calls)

The frontend is wired to these — **backend must implement them**:

| Method & path | When the app calls it | Body |
|---------------|----------------------|------|
| `POST /api/v1/notifications/device-token` | On login / app open (permission granted) | `{ token, platform: "ANDROID" \| "IOS" }` |
| `DELETE /api/v1/notifications/device-token` | On logout | `{ token }` |
| `PATCH /api/v1/notifications/:id/opened` | User taps a push | — (mark opened) |

- Store one or more device tokens per user; a user can have several devices, and
  tokens rotate (reinstall / restore) — the app re-registers automatically.
- Send FCM to a user's stored token(s) using the `{ title, body, data }` from a push
  template. Expire tokens that FCM reports as unregistered.
- The app also has an in-app "turn notifications back on" flow — no backend work needed
  there beyond accepting a freshly re-registered token.

---

## 10. New fields to make sure you supply (added this round)

These are **new** since the last handover — templates fall back safely if missing,
but you must pass them for the feature to actually work:

- `IMPACT_REPORT` → `coinsSpent`, `balance`, `joinedThisMonth`
- `REDEMPTION_LIVE` → `balance`, `xp`, `eligible`, `minRedeem`
- `FEATURE_ANNOUNCEMENT` → `image`, `benefits[]`
- `BIRTHDAY` → `bonus` (new template)
- **`unsubscribeUrl`** on every §7 email
- **`notificationId`** in every §8 push's `data`

Also needed on the backend (not template fields):
- A **marketing opt-in** flag per user + a **tokenised unsubscribe** endpoint.
- Confirm the **sender "From" name** reads `KarmaVerse`.
