import { describe, it, expect } from '@jest/globals';
import { isRecipeSaved, parseSaved, removeFromSaved, toggleSaved } from '../savedLogic';
import type { Recipe } from '../../types';

const mk = (name: string): Recipe => ({
  id: name,
  name,
  tagline: '',
  time: '',
  serves: '',
  difficulty: 'Easy',
  match: 0,
  ingredients: [],
  steps: [],
});

describe('savedLogic', () => {
  it('toggles a recipe on, then off, by name', () => {
    let list = toggleSaved([], mk('A'));
    expect(list.map((r) => r.name)).toEqual(['A']);
    list = toggleSaved(list, mk('A')); // same name → removed
    expect(list).toEqual([]);
  });

  it('prepends newly saved recipes', () => {
    const list = toggleSaved([mk('A')], mk('B'));
    expect(list.map((r) => r.name)).toEqual(['B', 'A']);
  });

  it('isRecipeSaved matches by name', () => {
    expect(isRecipeSaved([mk('A')], 'A')).toBe(true);
    expect(isRecipeSaved([mk('A')], 'B')).toBe(false);
  });

  it('removeFromSaved drops the named recipe', () => {
    expect(removeFromSaved([mk('A'), mk('B')], 'A').map((r) => r.name)).toEqual(['B']);
  });

  it('parseSaved tolerates null, bad JSON, and non-arrays', () => {
    expect(parseSaved(null)).toEqual([]);
    expect(parseSaved('not json')).toEqual([]);
    expect(parseSaved('{"a":1}')).toEqual([]);
    expect(parseSaved(JSON.stringify([mk('A')])).map((r) => r.name)).toEqual(['A']);
  });
});
