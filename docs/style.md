# GoReal visual style

Use this when drawing a simple landing page (or any other screen) that should feel like GoReal. Everything here is taken from the running app, not invented for marketing.

GoReal is a small focus app for people aged 12 to 20. The mascot is **Rilo**, a round orange pixel blob. The whole product is phone-first, black/white with **one** accent colour, and no emoji in copy.

## Do and don't

Do:

- White field, black type, one orange accent (unless the visitor has picked another colour in the shop).
- Pixel Rilo as the only illustration. Pixel icons on a 12×12 grid.
- Newsreader for titles, Geist Mono for everything else.
- Pill buttons, inset 1px card borders, big type, lots of air.
- Short, plain sentences. No slang that dates, no all-caps shouting.

Don't:

- Gradients, glows, drop shadows, glass, neon, or blur.
- Extra accent colours on the chrome (no second brand colour next to orange).
- Rounded "app illustration" Rilo, 3D, or hand-drawn line art.
- Emoji in product copy.
- Full-bleed desktop layouts. The app is a 440px column; a landing page can be wider, but the **product shot** should still look like a phone.

## Colour

CSS variables live on `:root` in `app/globals.css`. The accent set is swapped in `components/AccentTheme.tsx`.

### Always the same

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` / `--card` | `#ffffff` | Page and cards |
| `--ink` | `#111111` | Type, icons, outlines, primary buttons |
| `--ink-2` | `#333333` | Body copy that is not the headline |
| `--muted` | `#6e6e6e` | Secondary labels, hints |
| `--faint` | `#a8a8a8` | Inactive tab icons |
| `--line` | `#ebebeb` | Hairline borders |
| `--soft` | `#f4f4f4` | Segmented controls, empty wells |
| `--soft-2` | `#ebebeb` | Progress track, switch off |
| `--night` | `#111111` | Break-mode background |
| `--night-2` | `#1e1e1e` | Break-mode raised surfaces |
| Page behind the phone column | `#f2f2f2` | Desktop gutter only |

Selection highlight is `--accent-soft`. Hairlines are **inset** `box-shadow: inset 0 0 0 1px var(--line)`, not `border`, so radius stays clean.

### The accent (default orange)

Rilo, buttons marked "accent", the timer ring, streak flame, coins and switches use this set. Black, white and the app icon never change.

| Token | Orange | Use |
| --- | --- | --- |
| `--accent` | `#fc4c02` | Fills |
| `--accent-deep` | `#e03e00` | Pressed fill, small accent type on white |
| `--accent-soft` | `#fff0e8` | Pale wash behind accent type |
| `--on-accent` | `#ffffff` | Type/icons on an accent fill |
| `--accent-text` | `#fc4c02` | Big accent type on white |
| `--accent-blush` | `#ffb08a` | Rilo's cheeks |

Shop colours, rainbow order, if a landing page wants to show that Rilo can change colour:

| Name | accent | deep | soft | on-accent | text | blush |
| --- | --- | --- | --- | --- | --- | --- |
| red | `#dc2626` | `#b91c1c` | `#fdecec` | `#ffffff` | `#dc2626` | `#ef9d9d` |
| orange | `#fc4c02` | `#e03e00` | `#fff0e8` | `#ffffff` | `#fc4c02` | `#ffb08a` |
| yellow | `#facc15` | `#a16207` | `#fef9c3` | `#111111` | `#a16207` | `#fde896` |
| green | `#16a34a` | `#15803d` | `#e3f6e9` | `#ffffff` | `#16a34a` | `#96d6ae` |
| blue | `#2563eb` | `#1d4ed8` | `#e3ecfd` | `#ffffff` | `#2563eb` | `#9db9f6` |
| indigo | `#4f46e5` | `#4338ca` | `#e8e8fd` | `#ffffff` | `#4f46e5` | `#b0acf3` |
| violet | `#9333ea` | `#7e22ce` | `#f2e8fd` | `#ffffff` | `#9333ea` | `#cea3f6` |

Yellow is the exception: type on the fill is ink (`#111111`), and accent type on white is the deep gold, because white-on-yellow fails. Do not invent a new yellow.

### Pixel extras (Rilo's clothes only)

Hats and auras may use gold, mint, khaki, cyan, purple and so on. Those colours are **on Rilo**, not on buttons, type, or the page chrome. A landing page can show a dressed Rilo; it should not pick a gold or purple theme from his crown.

## Type

Loaded in `app/layout.tsx`:

- **Newsreader** (Google, 400 and 500, roman + italic) → `--font-serif`. Headlines, section titles, the big minute number.
- **Geist Mono** (400, 500, 600, 700) → `--font-text`. Body, buttons, labels, numbers in chrome.

Fallback: `"Iowan Old Style", Georgia, serif` and `ui-monospace, "SF Mono", Menlo, monospace`.

Root size is **16px**. Headlines: `letter-spacing: -0.02em`, weight 400 or 500, never 700. Body: line-height about **1.55**, colour `--ink-2`. Buttons: weight 600, tracking `-0.005em`.

| Role | Size | Family | Weight | Notes |
| --- | --- | --- | --- | --- |
| App screen title | 32px / 1.15 | serif | 400 | `.heading` |
| Onboarding title | 30px / 1.18 | serif | 500 | |
| Section title | 21px | serif | 500 | |
| Title under Rilo | 18px | serif | 500 | |
| Body | 16–17px / 1.55 | mono | 400 | |
| Hint / muted | 13–15px | mono | 500 | `--muted` |
| Button large | 16px | mono | 600 | height 54px |
| Button medium | 15px | mono | 600 | height 44px |
| Button small | 14px | mono | 600 | height 34px |
| Tab label | 11px | mono | 500 | |
| Shop item name | 13px | mono | 500 | |
| Big timer | 42px | serif | 500 | tabular nums |

A landing page can go slightly larger on the hero (serif 40–48px) if the measure stays short. Do not switch the body to a proportional sans.

## Shape, space, motion

```
--radius-s: 12px;   /* small chips */
--radius-m: 16px;   /* shop tiles */
--radius-l: 22px;   /* cards, sheets, preview wells */
--radius-pill: 999px;
--ease: cubic-bezier(0.2, 0.8, 0.2, 1);
```

The app column is `max-width: 440px`, `min-height: 100dvh`, white, `overflow-x: hidden`. On viewports ≥ 480px it gets a 1px `--line` on left and right, sitting on `#f2f2f2`.

Page padding is 20–24px. Vertical gap between blocks is 20px. Cards pad 18px. Safe areas: `env(safe-area-inset-*)`.

Cards: white, radius L, **inset** hairline. Selected tile: inset 1.5px `--ink`. Segmented controls: `--soft` track, white pill with a 1px line plus `0 1px 2px rgba(17, 17, 17, 0.08)`.

Primary button: `--ink` fill, `--bg` type, pill, press to `#000`. Accent button: `--accent` fill, `--on-accent` type, press `--accent-deep`. Secondary: white + inset line. Disabled: opacity 0.4. Tap scale 0.96, spring stiffness 500 / damping 30.

Motion is small and springy (stiffness ~300–500). Pixel motion is **stepped** (Rilo bobs 1px, blinks, the UFO jumps from pixel to pixel). Nothing eases through subpixels on Rilo himself. Duration is short (0.2s fades, 1.6s idle bob).

Break mode is the one dark screen: `--night` field, light type, Rilo unchanged.

## Pixels

Rilo and the icons are SVG rectangles on a grid, `shape-rendering: crispEdges`. Each pixel is `1.02×1.02` so seams do not show. Every filled shape gets a 1px `#111111` outline (4-neighbour, not diagonal).

Rilo's body is a 16×13 rounded blob of the accent colour, eyes at (4,6) and (11,6), a 4-pixel smile, blush `--accent-blush`. Default viewBox is roughly `-10 -14 37 34` so hats, wings and the UFO fit. Idle: 1px vertical bob.

Pixel icons are **12×12 strings** in `components/PixelIcon.tsx`: `#` = current text colour, `o` = orange, `w` = white. Draw them at multiples of 12px (24, 36, 48).

Scenes behind Rilo (`components/PixelScene.tsx`) are a 40×24 map, same three colours (ink, white, accent) plus the scene's own fills. They clip to the card radius.

Rules for new pixel art:

1. Snap to the integer grid. No half pixels, no SVG circles for Rilo.
2. Outline in ink. Fill with at most a few colours.
3. Read at ~80px (shop thumb) as well as ~160px.
4. Do not steal the chrome's orange for a second UI accent; on Rilo it is his body.

The app icon (`app/icon.svg`) is Rilo on white with a ~5.7px corner radius, same orange and ink.

## Copy

- Audience: 12–20. Friendly, concrete, short.
- No emoji. No exclamation piles.
- Features are named in the app's words: break, streak, coins, shop, Rilo. Not "gamification" or "digital detox platform".
- One idea per sentence.

## A simple landing page

Keep it a white page with a phone-width story, even on desktop.

1. **Top bar.** Wordmark in Newsreader 21–24px. One pill button on the right, primary (black) or accent (orange): "Open GoReal". Max width ~960px, 20px side pad, hairline bottom `--line`.
2. **Hero.** Left (or stacked on phone): serif title ~40px, "Take real breaks from your phone." Lede in Geist 17px `--ink-2`. Two pills: accent "Open the app", ghost or secondary "What is a break?". Right: Rilo on a radius-L card with a `--soft` well, the same stage the shop uses. Let him idle; a UFO or a hat is enough extra.
3. **Three steps.** Three cards, inset line, radius L. Pixel icon 24px, serif 21px title, 16px body. Example: Start a break / Put the phone down / Dress Rilo.
4. **Product strip.** A 440px frame (the real app screenshot or an iframe), centred, 1px `--line`, radius L. Caption in muted 13px.
5. **Footer.** Geist 13px `--muted`. No social row of brand colours.

Spacing: 48–72px between sections on desktop, 32px on phone. Background stays `#ffffff` (or `#f2f2f2` with a white column). One accent, used on **one** hero button and Rilo, not on every heading.

Fonts: load Newsreader and Geist Mono the same way as `app/layout.tsx`, or use the CSS variables if the landing page lives in this repo.

If the landing page is a static file next to the app, reuse `components/Mascot.tsx` and `components/Button.tsx` instead of redrawing them.
