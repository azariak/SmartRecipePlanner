# Forage

Cook what you already have. Take a photo of your ingredients and Forage suggests
**5 recipes** you can make right now. Don't like them? Refresh for 5 new ones — it
never repeats. Tap any recipe for the full, structured method.

Built with **Expo / React Native** (TypeScript). Vision + recipe generation is powered by
**Google Gemini**.

## Screens

1. **Capture** — photograph or upload your ingredients; Gemini detects what's in the shot.
2. **Recipe list** — 5 structured recipes (time · difficulty · pantry match), with a
   "5 new recipes" refresh that excludes everything you've already seen.
3. **Recipe detail** — a dedicated screen with TIME / SERVES / LEVEL, pantry match,
   ingredients (in-fridge vs pantry/buy), and numbered method steps.

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
- `src/state/RecipeStore.tsx` — shared context holding the photo, detected ingredients,
  the current 5-recipe batch, and the set of names already shown.
- `src/screens/` — `CaptureScreen`, `RecipeListScreen`, `RecipeDetailScreen`.
- `src/theme.ts` — the design tokens (palette + fonts).

## Requirements

- Node 18+
- The [Expo Go](https://expo.dev/go) app on a phone, or an iOS Simulator / Android emulator.
