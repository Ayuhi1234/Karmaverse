# KarmaVer$e — Email System Audit

> Read-only audit of the existing transactional-email system, prepared before a redesign.
> **Goal:** redesign the email HTML/design without breaking any backend trigger or contract.

## 0. Critical context
`KarmaCredits-RN` is a **pure REST + Socket.io client — it has no backend of its own.** The email
system lives entirely in `backend-email-service/` as a **self-contained, ready-to-integrate
reference package**. Nothing in `src/` imports or calls it. It is meant to be dropped into the
**external backend** (`https://karmacoin-backend-productionn.onrender.com`), whose source is **not in
this repo**. Therefore the actual trigger call-sites, DB schema, and "is it live in prod" status
live in the backend repo and cannot be verified here.

**Redesign rule:** keep `sendTemplatedEmail(to, templateKey, data)` and every template **key** and
its **variable set** unchanged. Only the generated HTML/design changes.

---

## 1. Email system
- **Sender:** `emailService.js` → `sendTemplatedEmail(to, templateKey, data)`.
- **Templates:** `templates/templates.js` — one arrow-function per template returning `{ subject, html }`.
- **Shared layout:** `templates/layout.js` → `wrapEmail({ preheader, bodyHtml, ctaLabel, ctaUrl })`.
- **Format:** HTML strings (JS template literals, inline styles). Not components, not `.html` files.
- **Provider:** **Nodemailer over Gmail/Workspace SMTP** (`smtp.gmail.com:465`, secure, App Password). Not SendGrid/SES/Brevo.
- **Config:** env only — `GMAIL_USER=ceo@0waste.co.in`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME=KarmaVerse`.
- Every send is **multipart** (HTML + auto plain-text via `htmlToText`).

## 2. Email types (12; all in `templates.js`, all via `sendTemplatedEmail`)
| Email | Key | Intended trigger (backend) |
|---|---|---|
| Welcome | `WELCOME` | signup / Google sign-in |
| OTP | `OTP` | forgot-password OTP |
| Password changed | `PASSWORD_RESET_CONFIRM` | reset confirm |
| Booking placed | `BOOKING_PLACED` | `POST /api/v1/bookings` |
| Agent assigned | `BOOKING_ACCEPTED` | emit `BOOKING_ACCEPTED` |
| Coins credited | `BOOKING_PICKED_UP` | emit `BOOKING_PICKED_UP` |
| Pickup completed | `BOOKING_COMPLETED` | emit `BOOKING_COMPLETED` |
| Booking cancelled | `BOOKING_CANCELLED` | cancel endpoint |
| Quiz streak reminder | `QUIZ_STREAK_REMINDER` | daily cron (not built) |
| Referral reward | `REFERRAL_REWARD` | referral credit |
| Agent welcome | `AGENT_WELCOME` | agent activation |
| Agent weekly summary | `AGENT_WEEKLY_SUMMARY` | weekly cron (not built) |

## 3. Variables available per template (design ONLY with these)
| Template | Variables |
|---|---|
| WELCOME | `name` |
| OTP | `otp` |
| PASSWORD_RESET_CONFIRM | `name` |
| BOOKING_PLACED | `name, bookingId, date, timeSlot, address` |
| BOOKING_ACCEPTED | `name, agentName, bookingId, eta` |
| BOOKING_PICKED_UP | `name, coins, walletBalance` |
| BOOKING_COMPLETED | `name, bookingId` |
| BOOKING_CANCELLED | `name, bookingId, date` |
| QUIZ_STREAK_REMINDER | `name, streak` |
| REFERRAL_REWARD | `name, friendName, coins` |
| AGENT_WELCOME | `name` |
| AGENT_WEEKLY_SUMMARY | `name, totalPickups, rating, currentStreak` |

**Exist in app data but NOT passed to email (would need backend work):** address parts
(`houseNo, apartment, landmark, receiverName, receiverPhone, coordinates`), item list & quantities,
category, `estimatedCoins`, agent `phone`/`vehicleNumber`, `longestStreak`, `newAvgRating`,
`totalRatings`, `totalCoinsEarned`, `referralCode`, `email`, `phone`.

## 4. Pickup email flow
placed ✅ → accepted ✅ → **agent reached ❌ (push only)** → started ❌ → **coins credited ✅
(`BOOKING_PICKED_UP`)** → completed ✅. `BOOKING_IN_POOL` ❌ push only.
= 4 lifecycle emails. Coins credit fires at PICKED_UP (verification), before COMPLETED.

## 5. Subjects (exact) + issues
- WELCOME: `Welcome to KarmaCoins XP, ${name}!`
- OTP: `Your KarmaCoins XP verification code`
- PASSWORD_RESET_CONFIRM: `Your password has been changed`
- BOOKING_PLACED: `Pickup request received — #${bookingId}`
- BOOKING_ACCEPTED: `An agent is on the way!`
- BOOKING_PICKED_UP: `You earned ${coins} KarmaCoins XP!`
- BOOKING_COMPLETED: `Pickup #${bookingId} completed — thank you!`
- BOOKING_CANCELLED: `Your pickup #${bookingId} was cancelled`
- QUIZ_STREAK_REMINDER: `Don't lose your ${streak}-day quiz streak!`
- REFERRAL_REWARD: `You earned ${coins} KarmaCoins XP for referring ${friendName}!`
- AGENT_WELCOME: `Welcome to the KarmaCoins XP Agent team, ${name}!`
- AGENT_WEEKLY_SUMMARY: `Your week on KarmaCoins XP — ${totalPickups} pickups completed`

**Issues:** brand spelling drift (KarmaVer$e / KarmaCoins XP / Karma Coins / KarmaVerse / 3R Zero
Waste); raw Mongo `_id` in subjects; hardcoded CTA URLs; subject↔spec-doc currency mismatch.

## 6. Customer name
`data.name` rendered raw as `${name}` — no formatting → lowercase DB names show lowercase. App
title-cases client-side only (does not affect email). **Fix once at the email boundary**
(`emailService.js` or a `layout.js` helper) to Proper-Case `name` for all templates.

## 7. Booking ID
`bookingId` = raw Mongo `_id`. App already shows a short form (e.g. `#6A685805`) but email doesn't.
No dedicated customer-facing number. **Display `KC-` + last 5 of `_id` (upper) at render** — no DB/API
change. A true sequential `bookingNumber` = backend change.

## 8. CTAs (only 3 templates have one)
| Template | Text | URL | Hardcoded |
|---|---|---|---|
| WELCOME | Get started | `https://karmaverse.earth/` | yes |
| BOOKING_CANCELLED | Schedule a new pickup | `https://karmaverse.earth/` | yes |
| QUIZ_STREAK_REMINDER | Play today's quiz | `https://karmaverse.earth/` | yes |
| footer | 0waste.co.in | `https://0waste.co.in/` | yes |

No Track/Wallet/Support CTAs. All point to web root, no deep-links, no env.

## 9. Frontend deployment
Netlify (`netlify.toml`: `build:web` → publish `dist`, SPA catch-all). Prod: `https://karmaverse.earth/`.
Backend base `https://karmacoin-backend-productionn.onrender.com` (`src/services/api.ts`). CTAs
hardcode the prod URL; no `FRONTEND_URL` env.

## 10. Logo / assets
`assets/`: `logo.png` (1280×853, transparent), `logo-nav.png` (1213×571), `logo-icon.png` (546×567),
`logo-wordmark.png`, `logo.jpeg` (opaque). `public/`: `apple-touch-icon.png`, `og-image.png` (public
at `https://karmaverse.earth/og-image.png`). PNGs are transparent, **white-on-dark** (no light/dark
variants). **Emails use a text wordmark, no image.** To embed a logo: add `public/email-logo.png` →
served at `https://karmaverse.earth/email-logo.png`.

## 11. HTML/CSS (`layout.js`)
Max width **480px**; single-column **table** layout; **100% inline CSS**; hidden preheader; fluid but
no media queries. Gmail: good. Outlook: `border-radius` degrades to square (no VML). No **dark-mode**
handling. Multipart HTML+text. **Low duplication** — all templates share `wrapEmail`.

## 12. Reusability
Reusable: Header ✅, Footer ✅, Button ✅ (all in `layout.js`). Missing: Pickup Details, Status card,
Timeline, Rewards card. Greeting `Hi ${name},` is repeated per body (not a partial).

## 13. Problems (code-based)
Brand inconsistency; raw `_id` exposed; unformatted name; **no undefined fallbacks** (renders
`undefined`); hardcoded root CTAs; thin pickup info; unused variables; subject↔doc mismatch; Outlook
+ dark-mode gaps; duplicated greeting; integration unverifiable here.

## 14. Recommended architecture (no trigger changes)
Keep `sendTemplatedEmail(to, key, data)` + keys + variable sets. Add under `templates/`: `brand.js`
(name, colors, `FRONTEND_URL`, `SUPPORT_EMAIL`, logo URL); partials `Header/Footer/Button/
PickupDetails/StatusBadge/Timeline/RewardsCard/Greeting`; helpers `formatName()`,
`displayBookingId()`, `safe()`.
- **A. Templates-only (safe):** brand unification, Proper-Case name, `KC-` id, undefined fallbacks,
  componentize, dark-mode meta, Outlook VML button, logo image, real deep-link CTAs.
- **B. Backend:** pass richer data, guarantee fields at emit time, optional sequential booking number,
  wire triggers if not already.
- **C. Frontend/Netlify:** add `public/email-logo.png`; deep-link routes already resolve.
- **D. Env/config:** `FRONTEND_URL`, `SUPPORT_EMAIL`, brand env; keep `GMAIL_*`; SendGrid swap later.

---
See `EMERGENT_PROMPT.md` for the ready-to-paste redesign brief.
