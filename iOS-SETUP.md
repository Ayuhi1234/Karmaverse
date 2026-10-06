# iOS setup & release guide (KarmaVerse)

Owner: Shashi Shekhar · Reporter: Ayushi Singh · Epic: iOS launch (KAR-120…150)

Build machine: Windows can prepare config only. iOS builds run on Mac (Xcode) or
EAS Build cloud. Do local file copy via `git clone` — never USB.

Bundle identifier: `com.karmacredits.app` (permanent once App Store live)
EAS projectId: `d1a85489-5abc-4474-8cb6-97fc0827bd58`

---

## What is already done (Windows prep) ✅

- `eas.json` — iOS build profiles added (development/preview = simulator, production = store, autoIncrement).
- `app.json` iOS section:
  - `buildNumber: "1"`
  - `infoPlist.NSLocationWhenInUseUsageDescription` (KAR-143 — only foreground location is used)
  - `infoPlist.ITSAppUsesNonExemptEncryption: false` (KAR-148 export compliance — HTTPS only, no custom crypto)
  - `googleServicesFile: ./GoogleService-Info.plist` wired (file still to be added, see below)
- ATT/IDFA: **no tracking prompt needed.** Facebook SDK has `advertiserIDCollectionEnabled: false`
  and `autoLogAppEventsEnabled: false`, so no `NSUserTrackingUsageDescription`. Declare "no tracking"
  in App Privacy (KAR-143 / KAR-146).

## What YOU must arrange (not code) ⚠️

1. **Apple Developer Program** — $99/year, enrol now, approval takes 24–48h. **(KAR-140, due 29 Sep)**
2. **GoogleService-Info.plist** — Firebase console → add iOS app (bundle `com.karmacredits.app`)
   → download the plist → drop it in `KarmaCredits-RN/` root. Needed for push (FCM/APNs).
3. **APNs key** — Apple Developer → Keys → create APNs key → upload to Firebase → Cloud Messaging.
4. **Mappls iOS SDK key** — confirm the Mappls account has an iOS key for `com.karmacredits.app`
   (check `plugins/withMappls.js`).

---

## Mac first-time setup (~1–2 hrs, do once)

```bash
# 1. Xcode — install from Mac App Store first (large, ~7GB). Then:
xcode-select --install

# 2. Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 3. Tooling
brew install node watchman git
sudo gem install cocoapods
npm i -g eas-cli

# 4. Get the project (clone — NOT copy). Use team or testing remote, NOT ayushi (live).
git clone https://github.com/ctoteam-0waste/mrsnoopy14-3r_0.git karmaverse
cd karmaverse/KarmaCredits-RN
npm install

# 5. Drop GoogleService-Info.plist into this folder (KarmaCredits-RN/)

# 6. Login
eas login
```

Xcode → Settings → Accounts → add Apple ID (the Developer account). Signing becomes automatic.

## Run it on iOS

```bash
# Simulator (fastest, on the Mac itself):
npx expo run:ios

# Cloud build for a real iPhone / TestFlight:
eas build --platform ios --profile preview     # test build
eas build --platform ios --profile production   # store build
```

## Submit to App Store

```bash
eas submit --platform ios --profile production
```

---

## Ticket map

| Bucket | Tickets | Where done |
|--------|---------|------------|
| Apple setup + compliance | KAR-140,141,142,143,144,145,146,147,148,149,150 | Apple portal + this repo config |
| Feature/coding (streak→wallet→redeem→ledger→payout) | KAR-120,122,123,124,125,126 | `src/screens` (many already exist) |
| Build & release | KAR-134,135,137,138 | Mac / EAS + App Store Connect |

### Open decision — KAR-142 Sign in with Apple
App offers Google + Facebook login. **Apple guideline 4.8 makes "Sign in with Apple" mandatory**
when third-party social logins are present. Plan to add it, or Apple may reject at review.
