# Earth Buddy FAQ videos: HeyGen scripts

Make these in the **HeyGen website** with your normal subscription. No API, no API credits, no code.
Each video answers one FAQ in Help & Support. The words match the approved FAQ answer in
`backend-support-service/faq/faqs.json`, rewritten to sound natural when spoken. **Don't add
promises, prices or features that aren't in the FAQ.** If an FAQ answer changes, remake its video.

> Videos use your HeyGen plan's credits. Check your balance before making all of them.
> Start with the **Top 10** below.

---

## 1. One-time setup in HeyGen (about 10 minutes)

1. **Create the avatar.** Avatars → Create avatar → **Photo avatar** → upload
   `assets/mascot-earth-buddy.png` (the version with the white background).
   Name it **Earth Buddy**.
2. **Test it first.** Make the "Welcome" video below. If Earth Buddy's face doesn't animate well
   (HeyGen's photo avatars are designed for human faces), stop here and tell the team. The app
   keeps working with the free talking Earth Buddy and voice.
3. **Pick one voice and keep it for every video.** A warm, friendly **English (India)** voice,
   normal speed (1.0×).

## 2. Settings for every video

| Setting | Value |
|---|---|
| Avatar | Earth Buddy (photo avatar) |
| Aspect ratio | **Square 1:1** (the app shows videos in a square) |
| Resolution | **720p** |
| Background | Solid light green **#E8F7EC**, or white |
| Expressiveness | Medium |
| Captions | Off (the app already shows the text answer) |
| Length | 10–35 seconds |

**Motion prompt** (paste into the motion / gesture box, same for every video):

```
A friendly cartoon Earth globe mascot wearing a green KarmaVerse hoodie talks warmly to the viewer.
Gentle head nods and small happy bounces, an occasional thumbs-up, cheerful facial expressions.
Stays centred and fully in frame. No camera movement. Background stays the same.
```

## 3. Save each video into the codebase

1. Download as **MP4, 720p**.
2. Name the file **exactly** with the FAQ id shown above each script, e.g. `pickup-schedule.mp4`.
3. Put it in **`public/support-videos/`**.
4. If a file is over **5 MB**, compress it (for example HandBrake, "Fast 720p30" preset) so it loads
   quickly on mobile data.
5. Run **`npm run support:videos`**. It checks the names and turns on "Watch video" for those answers.
6. Commit the videos. They're published with the website at `karmaverse.earth/support-videos/…`,
   so phones stream them and the app download doesn't get bigger.

---

## 4. Scripts

### Top 10 (make these first)

#### `welcome`: test video only (don't save into the app)
> Hi! I'm Earth Buddy, your KarmaVerse assistant. Ask me anything about pickups, KarmaCoins, rewards or your carbon footprint, and I'll help you out!

#### `pickup-schedule`: How do I schedule a pickup?
> Want to schedule a pickup? It's easy! Tap Schedule a pickup on Home. Choose the items you want to recycle and how many. Pick or add your address, then choose a pickup date and a time slot. Add any special instructions, and confirm. You'll see your estimated earnings before you confirm.

#### `pickup-materials`: What materials can I recycle?
> Here's what you can recycle with us: paper, plastic, glass, metal, e-waste, batteries, appliances, textiles and shoes. Just choose them when you schedule a pickup. One thing to remember: for safety, we can't accept broken or shattered glass, only bottles and jars that are in one piece.

#### `pickup-status`: How do I check my pickup status?
> To check on a pickup, open Orders. You'll see your active and past pickups. Tap one for its details, and while it's in progress, you can follow it live on the map.

#### `pickup-status-meaning`: What do the pickup statuses mean?
> Here's what each status means. Scheduled: your request is booked and waiting for an agent. In Transit: an agent has accepted it and is on the way. Completed: your pickup is done. And Cancelled means it was cancelled.

#### `coins-what`: What are KarmaCoins XP?
> KarmaCoins XP are the reward points you earn on KarmaVerse for sustainable actions. Your wallet shows two kinds: pickup coins, which you earn from completed pickups, and reward coins, which you earn from things like streaks and the daily eco-quiz.

#### `coins-earn`: How do I earn KarmaCoins XP?
> Want more KarmaCoins? Complete pickups, play the daily eco-quiz, and keep your streak going. You can also refer friends: when a friend you invite makes their first pickup, you both get one thousand bonus KarmaCoins XP!

#### `rewards-redeem`: How do I redeem my KarmaCoins for money?
> From the thirty-first of December, you can cash out your KarmaCoins XP. Ten XP equals one rupee. In Wallet, tap Redeem, enter how many coins you want to redeem, add your bank details, that's the account holder name, account number, IFSC code and branch, and submit your request. You can follow it under View my requests.

#### `rewards-referral`: How does Refer and earn work?
> Open Refer and earn to get your referral code, and share it with your friends. When a friend joins with your code and makes their first pickup, you both get one thousand bonus KarmaCoins XP!

#### `carbon-calculate`: How do I calculate my carbon footprint?
> Let's find your carbon footprint! On Home, open Carbon footprint and tap Calculate now. I'll ask you about six quick topics: travel, home energy, food, waste, water and flights. It takes about two minutes, and your answers save as you go, so you can carry on later.

#### `tech-contact`: How do I contact customer support?
> Need to talk to our team? Email us at c-t-o dot team at zero-waste dot co dot in, or call plus nine one, seven zero nine three one, nine eight eight two eight. Our address is Plot sixty-two, Sector eight, IMT Manesar, Gurugram, Haryana.

### Account

#### `account-login`: How do I log in or sign up?
> To log in, enter your email or mobile number, then continue with a one-time password, or your password. You can also continue with Google or Facebook. If you're new, the same screen signs you up!

#### `account-cant-login`: I can't log in. What should I do?
> Having trouble logging in? First, check your email or mobile number is correct. If you use a password, tap Forgot password on the login screen to reset it, or log in with a one-time password instead. If it still doesn't work, contact our support team and we'll help.

#### `account-manage`: How do I manage my account and profile?
> To manage your account, tap Profile in the menu. There you can view and edit your details, choose your avatar, manage email preferences, and find Help and support, the terms and the privacy policy.

#### `account-delete`: How do I delete my account?
> To delete your account, go to Profile and scroll down to Delete account. You'll be asked to confirm, because deleting your account is permanent.

### Pickups

#### `pickup-area`: Which areas do you serve?
> Right now, pickups are available within about twenty-five kilometres of central Gurugram. When you add your address, the app lets you know if it's outside our service area.

#### `pickup-delayed`: My pickup is delayed. What can I do?
> Sorry your pickup is running late! Open it from Orders to see its live status. Once an agent is assigned, you can contact the agent from the tracking screen. If you still need help, contact our support team with your booking ID.

#### `pickup-cancel`: How do I cancel a pickup?
> To cancel a pickup, open it from Orders, tap Cancel booking, and confirm. Its status will change to Cancelled.

#### `pickup-failed`: My pickup request failed. What should I do?
> If a pickup request fails, check your internet connection and that your address is inside our service area, then try scheduling again. If it keeps failing, please contact our support team.

### KarmaCoins and rewards

#### `coins-balance`: Where can I see my KarmaCoins balance?
> To see your coins, open Wallet. It shows your total KarmaCoins XP, your pickup coins and reward coins, your streak rewards, and your recent transactions.

#### `coins-streak`: How do streaks work?
> Your streak grows as you keep taking part regularly, and your reward coins improve as your streak grows. Wallet shows your streak rewards and warns you when your streak is at risk. You can even use reward coins for a streak freeze to protect it!

#### `rewards-transfer`: Can I send coins to someone else?
> Yes, you can! In Wallet, choose Send coins, enter the person's mobile number and the amount, review the transfer, and confirm. Reward coins convert by value, at each person's own tier rate.

#### `rewards-quiz`: What is the daily eco-quiz?
> The Daily Eco-Quiz is a short quiz on Home where you test your eco-knowledge and earn KarmaCoins XP. You can play once a day, and the next quiz unlocks at midnight.

### Carbon footprint

#### `carbon-what`: What is a carbon footprint?
> Your carbon footprint is an estimate of the greenhouse gases your everyday life causes. KarmaVerse shows it in kilograms of carbon dioxide equivalent per month, based on your travel, home electricity, food, waste, water use and flights.

#### `carbon-how-estimated`: How is my carbon footprint estimated?
> Your answers go to KarmaVerse's servers, which multiply each activity by a standard emission factor and add up the results. Each result records which version of the factors was used, and your past results never change.

#### `carbon-history`: How can I see my previous carbon results?
> To see your past results, open Carbon footprint and tap the history icon for My carbon journey. It lists every result you've had, and Insights shows the same history as charts.

#### `carbon-goal`: How do I set a carbon reduction goal?
> Once you've calculated your footprint, open Carbon footprint and tap Set goal. Choose to cut five, ten or twenty percent. Your latest result becomes your starting point, and you'll see your progress on the same screen. Choosing a new goal starts your progress again.

### Help

#### `tech-crash`: The app crashes or won't load. What should I do?
> If the app crashes or won't load, check your internet connection, then close and reopen the app. Make sure you have the latest version installed. If it keeps happening, contact our support team and tell us what you were doing when it happened.
