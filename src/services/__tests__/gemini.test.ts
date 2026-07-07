import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  config,
  detectIngredients,
  generateRecipes,
  hasApiKey,
  normalizeRecipe,
  GeminiError,
} from '../gemini';

let fetchMock: ReturnType<typeof jest.fn>;

function mockResponse(payload: unknown, ok = true, status = 200) {
  fetchMock.mockResolvedValue({
    ok,
    status,
    json: async () => payload,
  });
}

/** Wrap model JSON the way the API nests it. */
function modelJson(obj: unknown) {
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] };
}

beforeEach(() => {
  config.apiKey = 'test-key';
  fetchMock = jest.fn();
  (globalThis as any).fetch = fetchMock;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('hasApiKey', () => {
  it('is true with a key and false without', () => {
    expect(hasApiKey()).toBe(true);
    config.apiKey = '   ';
    expect(hasApiKey()).toBe(false);
  });
});

describe('normalizeRecipe', () => {
  it('clamps match and fills defaults', () => {
    const r = normalizeRecipe({ name: 'X', match: 250 }, 0, 1000);
    expect(r.match).toBe(100);
    expect(normalizeRecipe({ name: 'X', match: -5 }, 0).match).toBe(0);
    expect(normalizeRecipe({ name: 'X', match: 'nope' }, 0).match).toBe(0);
    expect(normalizeRecipe({}, 2).name).toBe('Recipe 3');
    expect(r.difficulty).toBe('Easy');
  });

  it('drops malformed steps and ingredients', () => {
    const r = normalizeRecipe(
      { name: 'X', steps: ['ok', 5, null], ingredients: [{ name: 'Egg', have: 1 }, { bad: true }] },
      0
    );
    expect(r.steps).toEqual(['ok']);
    expect(r.ingredients).toEqual([{ name: 'Egg', have: true }]);
  });
});

describe('detectIngredients', () => {
  it('normalises, uppercases, de-dupes and caps at 10', async () => {
    mockResponse(modelJson(['eggs', 'Eggs', ' tomato ', '', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']));
    const out = await detectIngredients('BASE64', 'image/jpeg');
    expect(out).toContain('EGGS');
    expect(out.filter((x) => x === 'EGGS').length).toBe(1); // de-duped
    expect(out).toContain('TOMATO'); // trimmed + uppercased
    expect(out.length).toBeLessThanOrEqual(10);
  });

  it('throws when the response is not an array', async () => {
    mockResponse(modelJson({ not: 'an array' }));
    await expect(detectIngredients('B', 'image/jpeg')).rejects.toBeInstanceOf(GeminiError);
  });

  it('throws (without calling fetch) when there is no image data', async () => {
    await expect(detectIngredients('', 'image/jpeg')).rejects.toBeInstanceOf(GeminiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('generateRecipes', () => {
  const recipePayload = [
    {
      name: 'Shakshuka',
      tagline: 'eggs, drowning in tomato.',
      time: '25 min',
      serves: '2',
      difficulty: 'Easy',
      match: 96,
      ingredients: [{ name: 'Eggs', have: true }],
      steps: ['Simmer.', 'Crack eggs.'],
    },
  ];

  it('returns normalised recipes with generated ids', async () => {
    mockResponse(modelJson(recipePayload));
    const out = await generateRecipes(['EGGS', 'TOMATOES']);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Shakshuka');
    expect(out[0].match).toBe(96);
    expect(out[0].id).toMatch(/^shakshuka-/);
  });

  it('passes exclude names into the prompt body', async () => {
    mockResponse(modelJson(recipePayload));
    await generateRecipes(['EGGS'], ['Shakshuka', 'Frittata']);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const prompt = body.contents[0].parts[0].text as string;
    expect(prompt).toContain('Shakshuka');
    expect(prompt).toContain('Frittata');
  });

  it('throws (without fetching) when there are no ingredients', async () => {
    await expect(generateRecipes([])).rejects.toBeInstanceOf(GeminiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('error handling', () => {
  it('rejects when the API key is missing, before any request', async () => {
    config.apiKey = '';
    await expect(detectIngredients('B', 'image/jpeg')).rejects.toThrow(/API key/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps 403 to an API-key error', async () => {
    mockResponse({ error: { message: 'forbidden' } }, false, 403);
    await expect(generateRecipes(['EGGS'])).rejects.toThrow(/key/i);
  });

  it('maps 429 to a rate-limit error', async () => {
    mockResponse({ error: { message: 'slow down' } }, false, 429);
    await expect(generateRecipes(['EGGS'])).rejects.toThrow(/rate limit/i);
  });

  it('reports network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await expect(generateRecipes(['EGGS'])).rejects.toThrow(/network/i);
  });

  it('reports an aborted (timed-out) request', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    fetchMock.mockRejectedValue(abort);
    await expect(generateRecipes(['EGGS'])).rejects.toThrow(/timed out/i);
  });

  it('reports an empty model response', async () => {
    mockResponse({ candidates: [] });
    await expect(generateRecipes(['EGGS'])).rejects.toThrow(/empty/i);
  });

  it('reports malformed JSON from the model', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'not-json{' }] } }] }),
    });
    await expect(generateRecipes(['EGGS'])).rejects.toThrow(/malformed/i);
  });
});
