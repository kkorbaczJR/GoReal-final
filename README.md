# GoReal

GoReal is a small, friendly focus app for people aged 12 to 20. It helps you spend less time on your phone by turning breaks into a game. You start a break, put the phone down, and a little mascot called **Rilo** falls asleep. When you finish the break you earn coins, keep your daily streak going, and dress Rilo up in pixel hats, extras and scenes.

This is the first working version (an MVP). It runs in the phone's web browser and can be added to the home screen so it feels like a normal app. It is made for phones only. On a computer it shows up as a phone-sized column in the middle of the screen.

**Try it:** <https://kkorbaczjr.github.io/GoReal-final/> (open it on a phone, or on a computer for a phone-sized view).

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
| `npm run android:sync` | Builds the app as static files and copies them into the Android project |
| `npm run android:apk` | The same, then builds an installable Android file (APK). Needs the Android SDK, see below |

In development mode the break-length picker also has a **1 minute** option, so you can try a whole break without waiting. The published version does not have it.

## The website

The link at the top is the real app, published automatically with GitHub Pages. Every time something is merged into `main`, `.github/workflows/pages.yml` builds the app as plain files and publishes them, so the site is always the newest version. Nothing is saved on a server: each visitor's progress stays in their own browser, so everyone starts fresh. On a phone, "Add to Home Screen" turns it into an app icon.

The site lives under `/GoReal-final/` instead of the root of a domain, so its build uses `GOREAL_TARGET=pages` and `NEXT_PUBLIC_BASE_PATH=/GoReal-final` (see `next.config.ts` and `lib/base.ts`). To try that build yourself, run `npx next build` with those two set and serve the `out` folder under that path. GitHub Pages must be set to **GitHub Actions** under Settings, Pages (it already is).

## The Android app

GoReal also comes as an Android app. It is the same app as the website, packed into a real Android app with [Capacitor](https://capacitorjs.com): every screen, Rilo and your progress work the same. Being a real app is what lets GoReal measure your phone time (Android's "usage access", see below), which a website is not allowed to do. It also has a proper app icon and handles the phone's back button.

**Why not Expo Go?** Expo Go can only run code that is already built into Expo Go. Reading phone usage needs our own native code, so it cannot run in Expo Go whichever tool we use. Expo would also mean rewriting every screen in React Native. Capacitor keeps the app we have and lets us add the Android parts in Java, like the rest of the Android project.

**Install it on your phone (no tools needed)**
1. On GitHub, open the repository, then **Actions**, then **Android APK**, and open the newest run with a green tick.
2. At the bottom, under **Artifacts**, download **goreal-debug-apk**. It is a zip file with `app-debug.apk` inside.
3. Copy `app-debug.apk` to your phone (or download it on the phone directly) and open it. Android asks to allow installing apps from this source once. Allow it, then tap **Install**.
4. A newer APK installs over the old one and keeps your progress.

This is a test version signed with a development key, so Android may show a warning. It is not in the Play Store yet.

**Build it yourself.** You need Node.js 22 or newer and either [Android Studio](https://developer.android.com/studio) or the Android command-line tools with Java 21. Then run `npm run android:apk`. The file ends up in `android/app/build/outputs/apk/debug/app-debug.apk`. With a phone connected over USB (developer mode on), `npx cap run android` installs and starts it. To work on the Android code, run `npm run android:sync` and open the `android` folder in Android Studio.

**How it works.** `GOREAL_TARGET=android` makes `next build` produce plain files in `out/` (see `next.config.ts`). `npx cap sync` copies them into the Android project, and the app shows them from inside the APK, so it works offline. On Today and during onboarding the back button sends GoReal to the background like other apps. Elsewhere it closes the open pop-up or goes back one screen. During a break it does nothing, so a break never ends by accident.

### Measured phone time (Android only)

In the Android app GoReal can measure your phone time instead of you typing it in. It only counts the apps you picked in onboarding.

**Turning it on.** Open **You → Phone time** (or tap the phone-time row on Today, then **Let GoReal measure it**). The screen explains what GoReal will see, then **Open settings** takes you straight to GoReal's switch under **Usage access**. Turn on **Permit usage access** and come back. GoReal notices on its own. To stop, turn the same switch off; GoReal goes back to typing it in by hand.

**What it sees, and what it does not.**
- Only when the picked apps were on screen, and for how long. Never what is inside them: no messages, videos, posts or anything typed.
- Nothing about other apps. The Android code (`PhoneUsagePlugin.java`) only reports the apps GoReal asks for.
- "Games" means every installed app that marks itself as a game.
- Nothing leaves the phone.

**What it does with it.**
- Today's phone time fills itself in, and the phone-time row on Today opens the Phone time screen.
- The Phone time screen shows today against your limit, the current session (time on those apps without a pause of more than 3 minutes), minutes per app, and yesterday and the day before. Apps you picked that are not installed say "Not on this phone".
- "Almost at your limit", "Over your limit" and the long-session nudges use the real numbers whenever GoReal is open. Nudges while GoReal is closed come in the next step, together with real Android notifications.

**How the numbers are made.**
- GoReal reads Android's usage events when it opens, when it comes back to the screen, and every minute while it is on screen.
- An app counts from the moment it comes to the front until something else does, or the screen turns off.
- Using two picked apps at once (split screen) counts once.
- Today follows the measurement. A finished day can only go up, never down: Android forgets old usage after a few days, and a forgotten day must not turn into "0 minutes, under the limit".
- Days before you finished onboarding never count.
- When GoReal opens it waits for the first reading (it shows the splash for a moment) before it spends a streak freeze or shows streak news. Otherwise a day you never opened GoReal on, but stayed under your limit, would look missed and waste a freeze.

**Testing it on the emulator.** Usage access can be switched with `adb shell appops set com.goreal.app GET_USAGE_STATS allow` (or `default` to turn it off). The emulator has no TikTok, so for testing we installed tiny stand-in apps with TikTok's and Instagram's real package names, plus one that marks itself as a game.

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
- The **Today** card shows your two ways to keep the streak: break minutes so far, and your phone time. On the website, tap the phone-time row to type in today's total from your phone's Screen Time (iPhone) or Digital Wellbeing (Android). In the Android app with measured phone time it fills itself in, and the row opens the Phone time screen.

### 3. Shop
Everything is pixel art, in six groups:
- **Hats** (20): beanie, bow, cat ears, flower, party hat, antennae, bunny ears, cap, pirate bandana, graduation cap, chef hat, headphones, top hat, captain's cap, Einstein, cowboy hat, viking helmet, wizard hat, halo, crown. 150 to 4000 coins.
- **Extras** (10): freckles, band-aid, mustache, shades, round glasses, eyepatch, star sticker, bow tie, monocle, scarf. 80 to 700 coins.
- **Scenes** (12): pixel backgrounds behind Rilo, from graph paper and a picnic blanket to a beach, a pine forest, city lights, a starry night, outer space and "orange pop". 200 to 3000 coins.
- **Titles** (21): a name shown under Rilo. Fifteen cost 150 to 3000 coins. Rookie is free, and five more unlock for free at 1 hour, 5 hours, about 16 hours, about 41 hours and 100 hours of total breaks.
- **Colors** (7): the orange of the app can be changed to any color of the rainbow: red, orange (free, the one you start with), yellow, green, blue, indigo and violet. Each of the other six costs 100 coins, and once you own a color you can switch between your colors for free. It changes the accent only (buttons, switches, the timer ring, progress bars, the streak flame, coins and highlights). Rilo, the black and white and the app icon stay as they are. Tapping a color in the shop shows it on the whole app first, and it goes back if you do not buy it. Yellow uses dark text on its buttons so they stay readable.
- **Streak**: the streak freeze (see below), 250 coins each, at most 2 at a time.

Prices are high on purpose. At the default 30 minute goal a day earns about 36 coins, so a cheap item takes a few days and the crown takes months.

Rilo can wear one hat, one extra and one scene at the same time. Tap an item to preview it on Rilo at the top, then buy it, wear it, or take it off.

### 4. You (profile)
- Your Rilo in front of his scene, with your name and title.
- **This week**: seven circles, one per day. A flame means that day counted for your streak, a snowflake means a freeze covered it. Tap the card to open the streak screen.
- Stats: total time off-screen, current streak, longest streak, breaks finished, longest break, and how many shop items you own.
- **My goal**: change your phone limit and your daily break goal at any time. Past days always keep their goals. Today follows a change right away while it has no progress yet (no break, no phone time logged), and a stricter goal (a longer break goal, a lower phone limit) also applies while today does not count yet. An easier goal after you already made progress waits until tomorrow, and the screen says so.
- **Achievements**: 12 badges, for example "First break", "Month strong" (30 day streak), "Cool save" (a freeze saved your streak) and "Collector" (own 5 shop items).
- **Reminders**: a row that opens the notification settings (see below).
- **Phone time** (Android app only): set up or check measured phone time.
- **Start over** deletes everything on this phone and goes back to the onboarding.

### 5. Notifications
Nothing is sent at a set time of day. Rilo only speaks up when something happens: you have been on your phone for a long time without a pause, you are close to your limit or over it, you are scrolling late and today does not count yet, or something changed in GoReal (a break ended, a freeze saved your streak, you can afford something new). Notifications show up as a banner at the top of the app, in the **bell** next to the greeting on Today (an orange dot means something is unread), and as a system notification when GoReal is in the background and you allowed it.

The **Reminders** screen (You, then Reminders) has:
- a preview of how a notification looks, the master switch and the permission
- **A day with Rilo**: an example day of phone use (black bars) played through the real rules, with numbered pins where each notification would go out and the notifications themselves underneath
- **Try it**: sliders for phone time today and how long you have been on your phone right now, plus an evening switch. It shows the notification Rilo would send at that moment, or why it stays quiet
- one switch per category with an example of its text, the **long session** length (30, 45 or 60 minutes) and quiet hours
- a **Send a test notification** button

| Kind | Category | When it goes out | Example |
| --- | --- | --- | --- |
| Long session | Long sessions | After 45 minutes (your choice: 30, 45 or 60) on your phone without a pause longer than 3 minutes, then at twice and three times as long | "45 minutes straight" |
| Near the limit | Phone limit | When today's phone time reaches 80% of your limit | "Almost at your limit" |
| Over the limit | Phone limit | When it reaches your limit. The text says whether a break can still save today | "You hit your limit" |
| Streak at risk | Streak alerts | After 20:00, when you have been on your phone for 15 minutes, have a streak and today does not count yet | "Still up, Ada?" |
| Off-limits app | Breaks | Right away when you open an off-limits app during a break. Ignores quiet hours and the daily cap | "TikTok is off limits right now" |
| Break finished | Breaks | When a running break ends. The only one with a time, because you started the timer | "Break done" |
| Freeze used | Streak alerts | When a freeze saves your streak. It goes straight to the bell, because Today already shows the freeze | "A freeze saved your streak" |
| Streak ended | Streak alerts | The first time you open the app after a streak was lost | "Your 4-day streak ended" |
| Milestone | Streak alerts | Streak of 3, 7, 14, 30, 50 or 100 and today counts | "A full week" |
| Shop tip | Shop tips | Right after you earn coins, when something new became affordable (or a freeze, if you have a streak of 5 or more and none in stock). At most once every 4 days | "You can afford something new" |

Phone use only counts the apps you picked in onboarding.

**How the text is written** (`lib/notifications/copy.ts`): every kind has several variants and one is picked by the day number, so the same message does not repeat day after day. Some variants only apply in some situations (the long session text changes the second time, the limit text knows whether today already counts, and the streak warning says so when a freeze is your backup). Fill-ins like `{name}`, `{streak}` or `{session}` come from your data. Rules: friendly and short, titles up to about 40 characters, no emoji, no guilt.

**Rules the trigger engine follows** (`lib/notifications/triggers.ts`):
- At most **4 nudges a day**, at least **30 minutes apart**, and only one at a time (the most important wins: streak at risk, over the limit, long session, near the limit). Breaks, streak news and an off-limits app always get through.
- **Quiet hours** (default 22:00 to 8:00, or off): no nudges at all, except an off-limits app during a break.
- **Never twice**: each notification has an id, like `limit80:2026-11-09` or `longSession:<session start>:1`. Delivered ids are remembered, so reopening the app or changing a setting never repeats one. The cap counts delivery times, so clearing the inbox does not reset it.
- Switching off the master switch or a category stops those notifications.

**Where the phone use comes from.** `lib/usage.ts` turns stretches of app use into today's total and the session going on right now (a pause of up to 3 minutes does not end a session). In the Android app with measured phone time, `lib/phone.ts` reads those stretches from Android and the notification host calls `usageTriggers` with them whenever GoReal is open (see "Measured phone time" above). With GoReal closed nothing runs yet; that is the next step. A website cannot see other apps, so the web app only knows the phone time you log by hand: logging 48 of 60 minutes gives you the "almost at your limit" heads up.

**What works today and what does not.** In the web app notifications can only appear while GoReal is open or in the background. The trigger engine is plain TypeScript with no browser code, so the phone app runs the same functions and shows the results with `expo-notifications`. `lib/notifications/delivery.ts` documents how each function maps.

## The rules

| Rule | Detail |
| --- | --- |
| Coins | Each minute of a **finished** break gives 1 coin, plus a 20% finish bonus (a 25 minute break pays 30). Short and long breaks pay the same per minute. |
| Welcome gift | Every new user gets **100 coins** once, when onboarding ends. It is given only when onboarding ends (never added on top of existing coins, and "Start over" wipes everything first). It does not trigger a shop tip. |
| Quitting | A break that ends early gives nothing. |
| Streak | A day counts if you **stayed under your phone limit** (the time you logged, or measured in the Android app) **or** reached your **daily break goal** (30 minutes unless you change it). Phone time counts once the day is over (it only goes up during a day), the break goal counts the moment you reach it. Today shows "On track" while you are under the limit. |
| Goals | Every day keeps the goals it started with. A change reaches today only while today is untouched, or when it is stricter and today does not count yet. Otherwise it starts tomorrow. |
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
    reminders/          notification settings, an example day and a simulator
    phone/              measured phone time (Android): set it up, or see today, the current session and each app
  manifest.ts, icon.svg, apple-icon.tsx   settings for "Add to Home Screen"
android/                the Android app project (Capacitor). Icons are in android/app/src/main/res
  .../PhoneUsagePlugin.java   reads Android's usage access for the picked apps only
capacitor.config.ts     the Android app's name, id and where the web files are
scripts/android/        builds the web files for the app and the APK (`npm run android:apk`)
.github/workflows/      builds the APK for every push, and publishes the website when `main` changes
public/sw.js            service worker: shows notifications and opens the app when you tap one
scripts/notifications/  scenario tests for the trigger engine and usage (`npm run test:notifications`)
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
  NotificationHost.tsx  asks the trigger engine what just happened, fills the inbox, shows banners and system notifications
  NotificationBell.tsx  the bell with the unread dot and the inbox pop-up
  Switch.tsx            on/off switch
  AndroidBack.tsx       the phone's back button in the Android app
  AccentTheme.tsx       applies the chosen accent color to the whole app (the layout also sets it before the first paint)
  PhoneTracker.tsx      reads measured phone time on open, on return and every minute (Android app)
  TabBar.tsx, Button.tsx, Sheet.tsx (bottom pop-up), StatPills.tsx (streak and coins)
lib/
  store.ts              everything the app remembers, and the actions that change it
  notifications/
    types.ts            kinds, categories, settings, limits (4 nudges a day, 30 minutes apart) and small helpers
    copy.ts             all the notification text and how a variant is picked
    triggers.ts         decides when to speak up, from phone use and from what just changed (pure, no browser code)
    delivery.ts         the only browser-specific part: permission and system notifications
  usage.ts              today's phone time, the current session, per-day and per-app minutes from stretches of app use (pure)
  apps.ts               the apps you can pick, and their Android package names
  phone.ts              talks to the Android plugin and keeps the latest reading
  back.ts               which open pop-up the back button closes first
  intents.ts            one-shot requests between screens (open the streak screen from a notification)
  rules.ts              coin and streak rules
  shop.ts               the list of shop items and the seven accent colors
  achievements.ts       the list of badges and when they unlock
  date.ts               small helpers for days
```

### Where the data lives
There is no account and no server yet. Everything is saved in the phone's browser storage (`localStorage`). If you clear the browser data or switch phones, your progress starts again.

## What this version cannot do yet

- **It cannot really block other apps.** A web app is not allowed to do that on iPhone or Android. Only a native app can, using Apple's Screen Time tools or Android's accessibility and usage-access permissions, and Apple has to approve it. For now, break mode only lists the off-limits apps, and leaving GoReal ends the break.
- **Locking the phone also counts as leaving.** A website cannot tell the difference between locking the phone and opening another app. That is why GoReal keeps the screen on during a break. Lay the phone face down and leave GoReal open.
- **On the website, phone time is typed in by hand.** A website cannot read Screen Time, so you enter your total yourself. You can log it at any time of day, and the last number you enter counts. The Android app can measure it (see above).
- **Notifications only arrive while GoReal is open or in the background.** On the website they can only react to the phone time you log. In the Android app they use measured phone time, but only while GoReal is open. Closed-app delivery and off-limits-app alerts during a break come next. No accounts or syncing between devices yet.

## Ideas for later
Real app blocking in the Android app, friends and challenges, breaks together with a friend, and a weekly "real life" quest (go outside, read 10 pages).
