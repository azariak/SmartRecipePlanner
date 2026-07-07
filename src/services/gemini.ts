import type { Recipe } from '../types';

/**
 * Gemini service — the recipe "engine".
 *
 * Two calls back the flow:
 *   1. detectIngredients(photo)  -> what's in the picture (fast, cheap)
 *   2. generateRecipes(list)     -> 5 structured recipes (re-run with `exclude` on refresh)
 *
 * The key is read from EXPO_PUBLIC_GEMINI_API_KEY. Because EXPO_PUBLIC_* is inlined
 * into the client bundle, ship a backend proxy instead for real production use.
 */

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DETECT_TIMEOUT_MS = 30_000;
const GENERATE_TIMEOUT_MS = 45_000;

/**
 * Config resolved from EXPO_PUBLIC_* env. Expo inlines these as string literals
 * at build time (that's how the key reaches the client bundle), so this is read
 * once here. It's an exported mutable object purely so tests can inject values;
 * production code never mutates it.
 */
export const config = {
  apiKey: (process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '').trim(),
  model: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash',
};

export function hasApiKey(): boolean {
  return config.apiKey.trim().length > 0;
}

/** Thrown for every failure path so callers can surface `error.message` directly. */
export class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiError';
  }
}

async function callGemini(body: unknown, timeoutMs: number): Promise<string> {
  const key = config.apiKey.trim();
  if (!key) {
    throw new GeminiError(
      'No Gemini API key. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env and restart the dev server.'
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BASE}/${config.model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new GeminiError('Gemini timed out. Check your connection and try again.');
    }
    throw new GeminiError('Network error reaching Gemini. Check your connection.');
  } finally {
    clearTimeout(timer);
  }

  const json: any = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new GeminiError('Gemini rejected the API key. Check EXPO_PUBLIC_GEMINI_API_KEY.');
    }
    if (res.status === 429) {
      throw new GeminiError('Gemini rate limit hit. Wait a moment and try again.');
    }
    const msg = json?.error?.message ?? `Gemini request failed (${res.status}).`;
    throw new GeminiError(msg);
  }

  const text: string | undefined = json?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p?.text)
    .filter(Boolean)
    .join('');

  if (!text) {
    const blocked = json?.promptFeedback?.blockReason;
    throw new GeminiError(
      blocked ? `Gemini blocked the request (${blocked}).` : 'Gemini returned an empty response.'
    );
  }
  return text;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Structured output usually returns clean JSON; strip fences defensively.
    const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      throw new GeminiError('Gemini returned malformed data. Please try again.');
    }
  }
}

/** Identify the distinct food ingredients visible in a photo. */
export async function detectIngredients(base64: string, mimeType: string): Promise<string[]> {
  if (!base64) throw new GeminiError('No image data to scan.');

  const text = await callGemini(
    {
      contents: [
        {
          parts: [
            {
              text:
                'Look at this photo of food ingredients. List the distinct, edible ingredients ' +
                'you can actually see. Use short UPPERCASE names (1–2 words each, e.g. "EGGS", ' +
                '"CHERRY TOMATOES"). Do not invent ingredients that are not visible. Return 3–10 items.',
            },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: { type: 'array', items: { type: 'string' } },
      },
    },
    DETECT_TIMEOUT_MS
  );

  const list = parseJson(text);
  if (!Array.isArray(list)) throw new GeminiError('Gemini returned an unexpected shape.');

  // Normalise, de-dupe, cap.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const name = String(raw ?? '').trim().toUpperCase();
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out.slice(0, 10);
}

const RECIPE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      tagline: { type: 'string' },
      time: { type: 'string' },
      serves: { type: 'string' },
      difficulty: { type: 'string', enum: ['Easy', 'Medium', 'Hard'] },
      match: { type: 'integer' },
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            have: { type: 'boolean' },
          },
          required: ['name', 'have'],
          propertyOrdering: ['name', 'have'],
        },
      },
      steps: { type: 'array', items: { type: 'string' } },
    },
    required: ['name', 'tagline', 'time', 'serves', 'difficulty', 'match', 'ingredients', 'steps'],
    propertyOrdering: [
      'name',
      'tagline',
      'time',
      'serves',
      'difficulty',
      'match',
      'ingredients',
      'steps',
    ],
  },
} as const;

function slugify(name: string, salt: number): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    salt
  );
}

/** Shape a raw model object into a safe Recipe, tolerating missing/garbage fields. */
export function normalizeRecipe(raw: any, index: number, salt = Date.now()): Recipe {
  const name = typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : `Recipe ${index + 1}`;
  const matchNum = Number(raw?.match);
  return {
    id: slugify(name, salt + index),
    name,
    tagline: typeof raw?.tagline === 'string' ? raw.tagline : '',
    time: typeof raw?.time === 'string' ? raw.time : '',
    serves: raw?.serves != null ? String(raw.serves) : '',
    difficulty: typeof raw?.difficulty === 'string' ? raw.difficulty : 'Easy',
    match: Number.isFinite(matchNum) ? Math.max(0, Math.min(100, Math.round(matchNum))) : 0,
    ingredients: Array.isArray(raw?.ingredients)
      ? raw.ingredients
          .filter((ing: any) => ing && typeof ing.name === 'string')
          .map((ing: any) => ({ name: ing.name, have: !!ing.have }))
      : [],
    steps: Array.isArray(raw?.steps) ? raw.steps.filter((s: any) => typeof s === 'string') : [],
  };
}

/**
 * Generate up to 5 recipes from a list of detected ingredients.
 * `exclude` is the set of recipe names already shown, so refresh never repeats.
 */
export async function generateRecipes(
  ingredients: string[],
  exclude: string[] = []
): Promise<Recipe[]> {
  if (!ingredients || ingredients.length === 0) {
    throw new GeminiError('No ingredients to build recipes from.');
  }

  const excludeLine =
    exclude.length > 0
      ? `Do NOT suggest any of these already-seen recipes (pick genuinely different dishes): ${exclude.join(
          '; '
        )}.`
      : '';

  const text = await callGemini(
    {
      contents: [
        {
          parts: [
            {
              text:
                'You are a resourceful home cook. Someone has these ingredients on hand: ' +
                `${ingredients.join(', ')}.\n\n` +
                'Propose EXACTLY 5 distinct, genuinely cookable recipes that lean on those ingredients ' +
                '(a few common pantry staples like oil, salt, flour, bread are fine to add).\n' +
                excludeLine +
                '\n\nFor each recipe:\n' +
                '- name: short and appetising.\n' +
                '- tagline: a short, lowercase, evocative half-sentence (e.g. "eggs, drowning in tomato.").\n' +
                '- time: like "25 min".\n' +
                '- serves: a number as a string, e.g. "2".\n' +
                '- difficulty: exactly one of Easy, Medium, Hard.\n' +
                '- match: integer 0–100, how well the recipe uses what they already have (higher = uses more of it).\n' +
                '- ingredients: every ingredient with have=true if it is among the ingredients they have ' +
                '(or an obvious staple), have=false if they likely need to buy it.\n' +
                '- steps: 3–6 concise imperative steps.\n' +
                'Order the 5 recipes by match, highest first.',
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RECIPE_SCHEMA,
        temperature: 1.0,
      },
    },
    GENERATE_TIMEOUT_MS
  );

  const raw = parseJson(text);
  if (!Array.isArray(raw)) throw new GeminiError('Gemini returned an unexpected shape.');

  const salt = Date.now();
  return raw.slice(0, 5).map((r, i) => normalizeRecipe(r, i, salt));
}
