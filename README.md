# GoReal

GoReal is a small, friendly focus app for people aged 12 to 20. It helps you spend less time on your phone by turning breaks into a game. You start a break, put the phone down, and a little mascot called **Rilo** falls asleep. When you finish the break you earn coins and points, keep your daily streak going, and climb a weekly league.

This is the first working version (an MVP). It runs in the phone's web browser and can be added to the home screen so it feels like a normal app. It is made for phones only. On a computer it shows up as a phone-sized column in the middle of the screen.

## How to run it on your computer

You need [Node.js](https://nodejs.org) version 20 or newer.

```bash
npm install
npm run dev
```

Then open <http://localhost:4317> in your browser. To get the phone look on a computer, open your browser's developer tools and switch to a phone view. To try it on a real phone on the same Wi-Fi, open `http://<your-computer's-IP>:4317`.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Makes an optimized version for publishing |
| `npm start` | Runs that optimized version on port 4317 |
| `npm run lint` | Checks the code for common mistakes |

In development mode the break-length picker also has a **1 minute** option, so you can try a whole break without waiting. The published version does not have it.

## What you can do in the app

### 1. Onboarding (first launch, 4 steps)
1. Tell Rilo your name.
2. Pick your **daily phone-time limit**: 30 minutes, 1 hour, or 2 hours.
3. Pick the apps that pull you in the most (TikTok, Instagram, YouTube and others). These are "off limits" during a break.
4. Meet Rilo and learn the rules.

### 2. Break (home screen)
- A big ring shows how long the break will be. Pick 5, 10, 15, 25, 45 or 60 minutes and tap **Start break**.
- The screen turns black ("break mode"). Rilo sleeps, a countdown runs, and your off-limits apps are listed.
- **If you leave GoReal for more than 10 seconds, the break ends early** and gives no coins. To give up on purpose, you have to press and hold the button, so it never happens by accident.
- The app asks the phone to keep the screen on during a break, so the phone does not lock itself.
- When a finished break makes the day count, a full-screen "day streak" moment shows your streak number and the last 7 days.
- At the top you always see your streak (flame) and coins.
- The **Today** card shows your two ways to keep the streak: break minutes so far, and your phone time. Tap the phone-time row to type in today's total from your phone's Screen Time (iPhone) or Digital Wellbeing (Android).

### 3. League
- Every week you are in a group of 20 players. Your points (XP) for the week are your finished break minutes.
- At the end of the week (Monday), the top 5 move up a league and the bottom 5 move down.
- Leagues, from lowest to highest: **Pebble, Leaf, Flame, Moon, Star**.
- When a new week starts, a card tells you where you finished and whether you moved.

### 4. Shop
- Spend coins on outfits for Rilo (beanie, shades, flower, cap, headphones, crown) and on titles.
- Tap an item to preview it on Rilo, then buy it, wear it, or take it off.
- Some titles cannot be bought. They unlock for free when you reach 1 hour, 5 hours and about 16 hours of total breaks.

### 5. Me (profile)
- Your Rilo, name and title.
- **This week**: seven circles, one per day. A flame means that day counted for your streak.
- Stats: total time off-screen, current streak, longest streak, breaks finished, total XP, and your league.
- **My goal**: change your phone limit and your daily break goal at any time.
- **Achievements**: 9 badges, for example "First break", "7 day streak" and "Reach the Leaf league".
- **Start over** deletes everything on this phone and goes back to the onboarding.

## The rules

| Rule | Detail |
| --- | --- |
| Coins and XP | Each minute of a **finished** break gives 1 coin and 1 XP. Finishing gives 5 extra coins. |
| Quitting | A break that ends early gives nothing. |
| Streak | A day counts if you **stayed under your phone limit** (the time you logged) **or** reached your **daily break goal** (30 minutes unless you change it). Miss a whole day and the streak goes back to 0. |
| League | XP for the week = break minutes that week. Top 5 of 20 move up, bottom 5 move down. |

## How the code is organized

The app is built with [Next.js](https://nextjs.org) and TypeScript. Styles use CSS Modules: each screen has its own small `.module.css` file next to it. Animations use [Framer Motion](https://www.framer.com/motion/).

```
app/
  layout.tsx            fonts (Newsreader serif for headings, Schibsted Grotesk for text), warm paper colors, phone layout, home-screen settings
  page.tsx              decides where to go: onboarding (new user) or the Break screen
  onboarding/           the 4 onboarding steps
  (tabs)/               the four main screens, sharing the bottom tab bar
    home/               Break screen: timer ring, Today card, phone-time sheet
    league/             weekly table and league badges
    shop/               outfits and titles
    profile/            stats, goals, achievements
  manifest.ts, icon.svg, apple-icon.tsx   settings for "Add to Home Screen"
components/
  Mascot.tsx            Rilo, a pixel-art mochi drawn in code, with moods (happy, wave, tired, sleeping, proud, sad) and pixel outfits
  BreakOverlay.tsx      the black break mode, plus the "You did it!" and "Break ended early" screens
  TimerRing.tsx         the animated circular ring
  CountUp.tsx           numbers that tick up when a screen opens
  TabBar.tsx, Button.tsx, Sheet.tsx (bottom pop-up), StatPills.tsx (streak and coins), TierBadge.tsx
lib/
  store.ts              everything the app remembers, and the actions that change it
  rules.ts              coins, XP and streak rules
  league.ts             computer players, ranking, moving up and down each week
  shop.ts               the list of shop items
  achievements.ts       the list of badges and when they unlock
  date.ts               small helpers for days and weeks
```

### Where the data lives
There is no account and no server yet. Everything is saved in the phone's browser storage (`localStorage`). If you clear the browser data or switch phones, your progress starts again.

### How the league players work
The other 19 players are computer players. Each week gets its own set of names and targets. Their XP grows slowly through the week, so the table changes as the week goes on. Everyone in the same league and week sees the same players, so the results stay the same if you reload the page.

## What this version cannot do yet

- **It cannot really block other apps.** A web app is not allowed to do that on iPhone or Android. Only a native app can, using Apple's Screen Time tools or Android's accessibility and usage-access permissions, and Apple has to approve it. For now, break mode only lists the off-limits apps, and leaving GoReal ends the break.
- **Locking the phone also counts as leaving.** A website cannot tell the difference between locking the phone and opening another app. That is why GoReal keeps the screen on during a break. Lay the phone face down and leave GoReal open.
- **Phone time is typed in by hand.** A website cannot read Screen Time, so you enter your total yourself. You can log it at any time of day, and the last number you enter counts.
- **The league uses computer players**, not real people. Real players and friends need a server, for example Supabase.
- **No notifications, accounts or syncing** between devices yet.

## Ideas for later
Real app blocking through a native app (Expo / React Native), friends and challenges, breaks together with a friend, and a weekly "real life" quest (go outside, read 10 pages).
