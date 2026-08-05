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
| `templates/templates.js` | The **10 email templates**. Each is a function `(data) => ({ subject, html })`. |
| `preview.html` | Open in a browser to **see all 10 emails rendered** with sample data. Regenerate with `node build-preview.js`. |

There are **10 templates** (agent-side emails were removed — user app only).

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

## 3. Assets you must make sure are live

The emails reference **hosted images on `https://karmaverse.earth`** (email clients
strip inline SVG/icon fonts, so these must be real HTTPS PNGs):

- `https://karmaverse.earth/email-logo.png` — header logo
- `https://karmaverse.earth/email/social/{instagram,facebook,linkedin,x,youtube}.png` — footer social icons

These files live in the frontend `public/` folder and ship with the normal
Netlify deploy — **just confirm the site is deployed** and these URLs resolve.

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
- [ ] Confirm `karmaverse.earth/email-logo.png` + `/email/social/*.png` resolve (site deployed)
- [ ] Set `GMAIL_USER` / `GMAIL_APP_PASSWORD` / `EMAIL_FROM_NAME` env vars
- [ ] Send yourself one of each and compare against `preview.html`
