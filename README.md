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
| `npm run test:notifications` | Runs the notification scenario tests (needs Node 22 or newer) |

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
Everything is pixel art, in five groups:
- **Hats** (20): beanie, bow, cat ears, flower, party hat, antennae, bunny ears, cap, pirate bandana, graduation cap, chef hat, headphones, top hat, captain's cap, Einstein, cowboy hat, viking helmet, wizard hat, halo, crown. 150 to 4000 coins.
- **Extras** (10): freckles, band-aid, mustache, shades, round glasses, eyepatch, star sticker, bow tie, monocle, scarf. 80 to 700 coins.
- **Scenes** (12): pixel backgrounds behind Rilo, from graph paper and a picnic blanket to a beach, a pine forest, city lights, a starry night, outer space and "orange pop". 200 to 3000 coins.
- **Titles** (21): a name shown under Rilo. Fifteen cost 150 to 3000 coins. Rookie is free, and five more unlock for free at 1 hour, 5 hours, about 16 hours, about 41 hours and 100 hours of total breaks.
- **Streak**: the streak freeze (see below), 250 coins each, at most 2 at a time.

Prices are high on purpose. At the default 30 minute goal a day earns about 36 coins, so a cheap item takes a few days and the crown takes months.

Rilo can wear one hat, one extra and one scene at the same time. Tap an item to preview it on Rilo at the top, then buy it, wear it, or take it off.

### 4. You (profile)
- Your Rilo in front of his scene, with your name and title.
- **This week**: seven circles, one per day. A flame means that day counted for your streak, a snowflake means a freeze covered it. Tap the card to open the streak screen.
- Stats: total time off-screen, current streak, longest streak, breaks finished, longest break, and how many shop items you own.
- **My goal**: change your phone limit and your daily break goal at any time. New goals start tomorrow: today and every past day keep the goals they started with.
- **Achievements**: 12 badges, for example "First break", "Month strong" (30 day streak), "Cool save" (a freeze saved your streak) and "Collector" (own 5 shop items).
- **Reminders**: a row that opens the notification settings (see below).
- **Start over** deletes everything on this phone and goes back to the onboarding.

### 5. Notifications
Rilo sends short, friendly messages. Never guilt, never more than 3 a day. They show up as a banner at the top of the app, in the **bell** next to the greeting on Today (an orange dot means something is unread), and as a system notification when GoReal is in the background and you allowed it.

The **Reminders** screen (You, then Reminders) has: a preview of how a notification looks, the master switch and the permission, the **next 48 hours** as two 24 hour bars (orange dots are planned notifications, the grey band is quiet hours) with a list underneath, one switch per category with an example of its text, the daily reminder time, quiet hours and a **Send a test notification** button.

| Kind | Category | When | Example |
| --- | --- | --- | --- |
| Nudge | Daily reminder | At your reminder time (15:00 to 19:00, default 17:00) if today does not count yet | "Rilo is getting sleepy" |
| Comeback | Daily reminder | Replaces the nudge after 2, 4, 7 and 14 days without a break, then stays quiet | "Come back when you are ready" |
| Streak at risk | Streak alerts | 20:00, streak of 1 or more, today not done and phone time not already under the limit | "Your 4-day streak is at risk" |
| Last call | Streak alerts | 21:45, streak of 2 or more, same conditions | "Last call for your streak" |
| Freeze used | Streak alerts | Right when a freeze saves your streak (quiet, goes to the bell only) | "A freeze saved your streak" |
| Streak ended | Streak alerts | The day after a streak was lost | "Your 4-day streak ended" |
| Milestone | Streak alerts | Streak of 3, 7, 14, 30, 50 or 100 and today counts | "A full week" |
| Break finished | Break finished | When a running break ends | "Break done" |
| Freeze tip | Shop tips | 18:30, no freezes, streak of 5 or more and 250 coins | "Protect your streak" |
| Shop tip | Shop tips | 18:30, when you can afford something (it names the priciest thing you can afford) | "You can afford something new" |
| Limit 80% / 100%, blocked app | Phone limit | Need Android phone tracking. The text and settings are ready, nothing sends them yet | "Almost at your limit" |

**How the text is written** (`lib/notifications/copy.ts`): every kind has several variants and one is picked by the day number, so the same message does not repeat day after day. Some variants only apply in some situations (for example, when you own a freeze the streak warning says the freeze is your backup, and the comeback text depends on how long you were away). Fill-ins like `{name}`, `{streak}` or `{remaining}` come from your data. Rules: friendly and short, titles up to about 40 characters, no emoji, no guilt.

**Rules the planner follows** (`lib/notifications/planner.ts`):
- At most **3 scheduled notifications a day**, at least **90 minutes apart**. If there are too many, the most important win: last call, streak at risk, daily reminder, then tips. A finished break always gets through.
- **Quiet hours** (default 22:00 to 8:00, or off): streak warnings are dropped (a late warning is useless), the other ones wait until the quiet time is over.
- **Never twice**: each notification has an id like `nudge:2026-11-09`. Delivered ids are remembered, so reopening the app or changing a setting never repeats one.
- A shop or freeze tip is sent **at most once every 4 days**.
- Tomorrow is planned as if today ends the way it is now: the streak only carries over if today already counts, and the daily reminder is always planned.
- Switching off the master switch or a category removes those notifications from the plan.

**What works today and what does not.** In the web app a notification can only be delivered while GoReal is open or in the background (a page timer checks every 15 seconds; ones missed by more than a minute because the app was closed are skipped, not sent late). Real delivery while the app is fully closed needs a push server or a native app, so it arrives with the Expo phone app. The planner is plain TypeScript with no browser code, so the phone app can run the same `planNotifications` and schedule every item with `expo-notifications`. `lib/notifications/delivery.ts` documents how each function maps.

## The rules

| Rule | Detail |
| --- | --- |
| Coins | Each minute of a **finished** break gives 1 coin, plus a 20% finish bonus (a 25 minute break pays 30). Short and long breaks pay the same per minute. |
| Quitting | A break that ends early gives nothing. |
| Streak | A day counts if you **stayed under your phone limit** (the time you logged) **or** reached your **daily break goal** (30 minutes unless you change it). Phone time counts once the day is over (it only goes up during a day), the break goal counts the moment you reach it. Today shows "On track" while you are under the limit. |
| Goals | Every day keeps the goals it started with. Changing your goals only affects tomorrow and later. |
| Streak freeze | Miss a whole day and a freeze covers it, so the streak survives (the frozen day keeps the streak but does not add to the count). You can buy freezes in the shop and hold at most 2. A freeze is used on its own when you open the app, but only if you have enough for every missed day and you had a real streak. Otherwise nothing is spent and the streak goes back to 0. |

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
    reminders/          notification settings, preview and the 48 hour plan
  manifest.ts, icon.svg, apple-icon.tsx   settings for "Add to Home Screen"
public/sw.js            service worker: shows notifications and opens the app when you tap one
scripts/notifications/  scenario tests for the planner (`npm run test:notifications`)
components/
  Mascot.tsx            Rilo, a pixel-art mochi drawn in code, with moods (happy, wave, tired, sleeping, proud, sad), pixel hats and extras
  BreakOverlay.tsx      the black break mode, plus the "You did it!" and "Break ended early" screens
  StreakScreen.tsx      the full-screen "day streak!" view
  PixelIcon.tsx         every icon in the app, drawn as 12×12 pixel art
  PixelScene.tsx        the pixel backgrounds (scenes) from the shop
  RiloStage.tsx         Rilo standing in a rounded card in front of his scene
  TimerRing.tsx         the animated circular ring
  CountUp.tsx           numbers that tick up when a screen opens
  NotificationCard.tsx  a notification drawn like a phone notification (banner, inbox and previews)
  NotificationHost.tsx  checks what is due, fills the inbox, shows banners and system notifications
  NotificationBell.tsx  the bell with the unread dot and the inbox pop-up
  Switch.tsx            on/off switch
  TabBar.tsx, Button.tsx, Sheet.tsx (bottom pop-up), StatPills.tsx (streak and coins)
lib/
  store.ts              everything the app remembers, and the actions that change it
  notifications/
    types.ts            kinds, categories, settings, limits (3 a day, 90 minutes apart) and small helpers
    copy.ts             all the notification text and how a variant is picked
    planner.ts          decides what to send and when (pure, no browser code)
    delivery.ts         the only browser-specific part: permission and system notifications
  intents.ts            one-shot requests between screens (open the streak screen from a notification)
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
- **Notifications only arrive while GoReal is open or in the background** (see Notifications above). Closed-app reminders come with the phone app. No accounts or syncing between devices yet.

## Ideas for later
Real app blocking through a native app (Expo / React Native), friends and challenges, breaks together with a friend, and a weekly "real life" quest (go outside, read 10 pages).
