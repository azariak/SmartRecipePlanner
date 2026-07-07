# Forage

Cook what you already have. Take a photo of your ingredients and Forage suggests
**5 recipes** you can make right now. Don't like them? Refresh for 5 new ones — it
never repeats. Tap any recipe for the full, structured method.

Built with **Expo / React Native** (TypeScript). Vision + recipe generation is powered by
**Google Gemini**. Runs on iOS, Android, and the web from one codebase.

## Features
 
- 📷 **Live camera viewfinder** — point at your ingredients (`expo-camera`, works on
  the web webcam too), or upload a photo instead.
- 🔍 **Ingredient detection** — Gemini vision reads the photo and lists what it sees.
- 🍳 **5 structured recipes** — each with time, serves, difficulty, a pantry-match %,
  ingredients split into *in-fridge* vs *pantry/buy*, and numbered method steps.
- 🔄 **Never-repeating refresh** — "5 new recipes" excludes everything already shown.
- 📄 **PDF export** — download any recipe as a clean, print-friendly card.
- ⭐ **Save recipes** — star any recipe to keep it; saved recipes persist locally
  (AsyncStorage) and live under a **Saved** screen reachable from the home header.
- ⚡ **Instant loads** — the first batch is prefetched while you review the detected
ingredients, and the *next* refresh batch is preloaded in the background, so both
the list and refresh feel immediate.

## Screens

1. **Capture** — live camera viewfinder (or upload); Gemini detects what's in the shot.
2. **Recipe list** — 5 structured recipes (time · difficulty · pantry match), with a
   "5 new recipes" refresh that excludes everything you've already seen.
3. **Recipe detail** — a dedicated screen with TIME / SERVES / LEVEL, pantry match,
   ingredients (in-fridge vs pantry/buy), numbered method steps, and a **Download PDF** button.

The UI implements the `Forage.dc.html` Claude Design — a dark editorial look
(near-black canvas, off-white ink, one loud yellow).

## Setup

```bash
npm install
cp .env.example .env       # then paste your key into .env
npm start                  # press i for iOS, a for Android, or scan the QR in Expo Go
```

Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) and put it in `.env`:

```
EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
```

> **Note:** `EXPO_PUBLIC_*` variables are inlined into the client bundle, so the key
> ships with the app. That's fine for local/demo use; for production, proxy Gemini
> through a small backend and keep the key server-side.

## How it works

- `src/services/gemini.ts` — two Gemini calls: ingredient detection from the photo, and
  structured JSON recipe generation (with an `exclude` list so refresh never repeats).
- `src/services/recipePdf.ts` — builds the print-friendly recipe HTML and exports a PDF.
- `src/state/RecipeStore.tsx` — shared context: photo, detected ingredients, current
  batch, and the `seenNames` set. Prefetches the first batch after detection and
  preloads the next refresh batch in the background (with a generation token that
  discards stale results after a retake).
- `src/screens/` — `CaptureScreen`, `RecipeListScreen`, `RecipeDetailScreen`.
- `src/theme.ts` — the design tokens (palette + fonts).

## Testing & quality

```bash
npm test          # run the Jest suite (jest-expo)
npm run typecheck # tsc --noEmit
```

The suite (28 tests) covers the pure, high-value logic:

- **`gemini`** — response normalisation, de-dupe/cap of detected ingredients, match
  clamping, and every error branch (missing key, 403/429, network, timeout/abort,
  empty response, malformed JSON) with a mocked `fetch`.
- **`recipeHtml`** — HTML escaping (XSS-safe) and PDF content.
- **`savedLogic`** — save/unsave/parse behaviour of the saved-recipes store.
- **`recipeMeta`** — the list metadata formatting.

**Error handling** is centralised: all Gemini failures throw a typed `GeminiError`
with a user-readable message (surfaced in the scan/list UI), requests are bounded by
an `AbortController` timeout, and a top-level **`ErrorBoundary`** catches any render
crash and offers a "Try again" instead of a blank screen.

## Deploy the web build to Cloudflare Pages

The app exports to a static site, so it hosts on Cloudflare Pages for free.

**Build settings** (Cloudflare Pages → *Create project* → connect this repo):

| Setting | Value |
| --- | --- |
| Framework preset | `None` |
| Build command | `npx expo export --platform web` |
| Build output directory | `dist` |

**Environment variables** (Settings → *Environment variables*, for Production **and** Preview):

```
EXPO_PUBLIC_GEMINI_API_KEY = your_key_here
NODE_VERSION = 20
```

`.env` is gitignored, so the key **must** be set here or every scan will fail. The
`NODE_VERSION` var avoids Cloudflare's older default Node.

Then push to `main` and Cloudflare builds and deploys automatically. Prefer the CLI?

```bash
npx expo export --platform web            # outputs ./dist
npx wrangler pages deploy dist            # or: npx wrangler pages deploy dist --project-name forage
```

**Notes**
- **HTTPS is automatic** on `*.pages.dev`, which the live camera requires
  (`getUserMedia` is blocked on plain HTTP). The webcam won't work over a raw-IP dev URL.
- **The key is public** in the client bundle (see the note above). At minimum, restrict
  the key in Google AI Studio to the *Generative Language API* and an HTTP-referrer
  allowlist for your `*.pages.dev` domain. The proper fix is a server-side proxy
  (e.g. a Cloudflare Pages Function / Worker) — a natural next step.
- Deep-link SPA fallback isn't needed (navigation is in-app), but if you add URL routes
  later, drop a `public/_redirects` with `/*  /index.html  200`.

## Requirements

- Node 18+
- The [Expo Go](https://expo.dev/go) app on a phone, or an iOS Simulator / Android emulator.
