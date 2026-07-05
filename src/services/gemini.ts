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

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash';
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function hasApiKey(): boolean {
  return API_KEY.trim().length > 0;
}

class GeminiError extends Error {}

async function callGemini(body: unknown): Promise<string> {
  if (!hasApiKey()) {
    throw new GeminiError(
      'No Gemini API key. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env and restart the dev server.'
    );
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}/${MODEL}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new GeminiError('Network error reaching Gemini. Check your connection.');
  }

  const json: any = await res.json().catch(() => null);
  if (!res.ok) {
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

function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Structured output usually returns clean JSON; strip fences defensively.
    const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    return JSON.parse(cleaned) as T;
  }
}

/** Identify the distinct food ingredients visible in a photo. */
export async function detectIngredients(base64: string, mimeType: string): Promise<string[]> {
  const text = await callGemini({
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
      responseSchema: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  });

  const list = parseJson<string[]>(text);
  // Normalise, de-dupe, cap.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const name = String(raw).trim().toUpperCase();
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

/**
 * Generate exactly 5 recipes from a list of detected ingredients.
 * `exclude` is the set of recipe names already shown, so refresh never repeats.
 */
export async function generateRecipes(
  ingredients: string[],
  exclude: string[] = []
): Promise<Recipe[]> {
  const excludeLine =
    exclude.length > 0
      ? `Do NOT suggest any of these already-seen recipes (pick genuinely different dishes): ${exclude.join(
          '; '
        )}.`
      : '';

  const text = await callGemini({
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
  });

  type Raw = Omit<Recipe, 'id'>;
  const raw = parseJson<Raw[]>(text);

  return raw.slice(0, 5).map((r, i) => ({
    id: slugify(r.name ?? `recipe-${i}`, Date.now() + i),
    name: r.name,
    tagline: r.tagline ?? '',
    time: r.time ?? '',
    serves: String(r.serves ?? ''),
    difficulty: r.difficulty ?? 'Easy',
    match: typeof r.match === 'number' ? Math.max(0, Math.min(100, Math.round(r.match))) : 0,
    ingredients: Array.isArray(r.ingredients)
      ? r.ingredients.map((ing) => ({ name: ing.name, have: !!ing.have }))
      : [],
    steps: Array.isArray(r.steps) ? r.steps.filter((s) => typeof s === 'string') : [],
  }));
}
