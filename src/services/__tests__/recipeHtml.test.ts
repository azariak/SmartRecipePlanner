import { describe, it, expect } from '@jest/globals';
import { buildRecipeHtml, esc } from '../recipeHtml';
import type { Recipe } from '../../types';

const recipe: Recipe = {
  id: '1',
  name: 'Garlic <Eggs>',
  tagline: 'so good & quick',
  time: '10 min',
  serves: '1',
  difficulty: 'Easy',
  match: 88,
  ingredients: [
    { name: 'Eggs', have: true },
    { name: 'Bread', have: false },
  ],
  steps: ['Crack "eggs".', 'Toast bread.'],
};

describe('esc', () => {
  it('escapes html-sensitive characters', () => {
    expect(esc('<a> & "b"')).toBe('&lt;a&gt; &amp; &quot;b&quot;');
  });
});

describe('buildRecipeHtml', () => {
  const html = buildRecipeHtml(recipe);

  it('escapes the name so tags cannot be injected', () => {
    expect(html).toContain('Garlic &lt;Eggs&gt;');
    expect(html).not.toContain('Garlic <Eggs>');
  });

  it('includes tagline, match, pantry count, ingredient markers and steps', () => {
    expect(html).toContain('so good &amp; quick');
    expect(html).toContain('88%');
    expect(html).toContain('uses 1/2 on hand');
    expect(html).toContain('in fridge');
    expect(html).toContain('pantry / buy');
    expect(html).toContain('Toast bread.');
  });

  it('numbers the method steps', () => {
    expect(html).toContain('>01<');
    expect(html).toContain('>02<');
  });
});
