# GoReal

GoReal is a small, friendly focus app for people aged 12 to 20. It helps you spend less time on your phone by turning breaks into a game. You start a break, put the phone down, and a little mascot called **Rilo** falls asleep. When you finish the break you earn coins, keep your daily streak going, and dress Rilo up in pixel hats, extras and scenes.

This is the first working version (an MVP). It runs in the phone's web browser and can be added to the home screen so it feels like a normal app. It is made for phones only. On a computer it shows up as a phone-sized column in the middle of the screen.

## How to run it on your computer

You need [Node.js](https://nodejs.org) version 20 or newer and [Git](https://git-scm.com).

1. Download the code (use your repository's address from the "Clone" button):

   ```bash
   git clone <your-repository-address> goreal
   cd goreal
   ```

2. Install what the app needs (only the first time):

   ```bash
   npm install
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open <http://localhost:3000> in your browser.

To get the phone look on a computer, open your browser's developer tools and switch to a phone view. To try it on a real phone on the same Wi-Fi, open `http://<your-computer's-IP>:3000`. To stop the app, press `Ctrl + C` in the terminal.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Makes an optimized version for publishing |
| `npm start` | Runs that optimized version on port 3000 |
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
- When a finished break makes the day count, a full-screen "day streak!" moment shows a pixel flame, your streak number and the last 7 days.
- At the top you always see your streak (flame) and coins. Tap the flame, or the **Streak** row in the Today card, to open the full streak screen: a big pixel flame, your streak number, the last 7 days, your best streak and your goal.
- The **Today** card shows your two ways to keep the streak: break minutes so far, and your phone time. Tap the phone-time row to type in today's total from your phone's Screen Time (iPhone) or Digital Wellbeing (Android).

### 3. Shop
Everything is pixel art, in four groups:
- **Hats** (15): beanie, bow, cat ears, flower, party hat, bunny ears, cap, pirate bandana, chef hat, headphones, Einstein, viking helmet, wizard hat, halo, crown. 40 to 400 coins.
- **Extras** (6): band-aid, mustache, shades, round glasses, bow tie, scarf. 30 to 120 coins.
- **Scenes** (8): pixel backgrounds behind Rilo, from graph paper and a picnic blanket to a sunset, a starry night and "orange pop". 40 to 300 coins.
- **Titles** (15): a name shown under Rilo. Ten cost 40 to 300 coins. Rookie is free, and four more unlock for free at 1 hour, 5 hours, about 16 hours and about 41 hours of total breaks.

Rilo can wear one hat, one extra and one scene at the same time. Tap an item to preview it on Rilo at the top, then buy it, wear it, or take it off.

### 4. You (profile)
- Your Rilo in front of his scene, with your name and title.
- **This week**: seven circles, one per day. A flame means that day counted for your streak. Tap the card to open the streak screen.
- Stats: total time off-screen, current streak, longest streak, breaks finished, longest break, and how many shop items you own.
- **My goal**: change your phone limit and your daily break goal at any time.
- **Achievements**: 9 badges, for example "First break", "7 day streak" and "Collector" (own 5 shop items).
- **Start over** deletes everything on this phone and goes back to the onboarding.

## The rules

| Rule | Detail |
| --- | --- |
| Coins | Each minute of a **finished** break gives 1 coin. Finishing gives 5 extra coins. |
| Quitting | A break that ends early gives nothing. |
| Streak | A day counts if you **stayed under your phone limit** (the time you logged) **or** reached your **daily break goal** (30 minutes unless you change it). Miss a whole day and the streak goes back to 0. |

## How the code is organized

The app is built with [Next.js](https://nextjs.org) and TypeScript. Styles use CSS Modules: each screen has its own small `.module.css` file next to it. Animations use [Framer Motion](https://www.framer.com/motion/).

```
app/
  layout.tsx            fonts (Newsreader serif for headings, Geist Mono for text), white and black with one orange accent, phone layout, home-screen settings
  page.tsx              decides where to go: onboarding (new user) or the Break screen
  onboarding/           the 4 onboarding steps
  (tabs)/               the three main screens (Today, Shop, You), sharing the bottom tab bar
    home/               Break screen: timer ring, Today card, phone-time sheet
    shop/               hats, extras, scenes and titles
    profile/            stats, goals, achievements
  manifest.ts, icon.svg, apple-icon.tsx   settings for "Add to Home Screen"
components/
  Mascot.tsx            Rilo, a pixel-art mochi drawn in code, with moods (happy, wave, tired, sleeping, proud, sad), pixel hats and extras
  BreakOverlay.tsx      the black break mode, plus the "You did it!" and "Break ended early" screens
  StreakScreen.tsx      the full-screen "day streak!" view
  PixelIcon.tsx         every icon in the app, drawn as 12×12 pixel art
  PixelScene.tsx        the pixel backgrounds (scenes) from the shop
  RiloStage.tsx         Rilo standing in a rounded card in front of his scene
  TimerRing.tsx         the animated circular ring
  CountUp.tsx           numbers that tick up when a screen opens
  TabBar.tsx, Button.tsx, Sheet.tsx (bottom pop-up), StatPills.tsx (streak and coins)
lib/
  store.ts              everything the app remembers, and the actions that change it
  rules.ts              coin and streak rules
  shop.ts               the list of shop items
  achievements.ts       the list of badges and when they unlock
  date.ts               small helpers for days
```

### Where the data lives
There is no account and no server yet. Everything is saved in the phone's browser storage (`localStorage`). If you clear the browser data or switch phones, your progress starts again.

## What this version cannot do yet

- **It cannot really block other apps.** A web app is not allowed to do that on iPhone or Android. Only a native app can, using Apple's Screen Time tools or Android's accessibility and usage-access permissions, and Apple has to approve it. For now, break mode only lists the off-limits apps, and leaving GoReal ends the break.
- **Locking the phone also counts as leaving.** A website cannot tell the difference between locking the phone and opening another app. That is why GoReal keeps the screen on during a break. Lay the phone face down and leave GoReal open.
- **Phone time is typed in by hand.** A website cannot read Screen Time, so you enter your total yourself. You can log it at any time of day, and the last number you enter counts.
- **No notifications, accounts or syncing** between devices yet.

## Ideas for later
Real app blocking through a native app (Expo / React Native), friends and challenges, breaks together with a friend, and a weekly "real life" quest (go outside, read 10 pages).
