import { describe, it, expect } from '@jest/globals';
import { recipeMeta, type Recipe } from '../types';

const base: Recipe = {
  id: 'x',
  name: 'Shakshuka',
  tagline: 'eggs, drowning in tomato.',
  time: '25 min',
  serves: '2',
  difficulty: 'Easy',
  match: 90,
  ingredients: [
    { name: 'Eggs', have: true },
    { name: 'Tomato', have: true },
    { name: 'Cumin', have: false },
  ],
  steps: ['a', 'b'],
};

describe('recipeMeta', () => {
  it('uppercases time/difficulty and counts have/total', () => {
    expect(recipeMeta(base)).toBe('25 MIN · EASY · USES 2/3');
  });

  it('handles all-missing ingredients', () => {
    expect(recipeMeta({ ...base, ingredients: [{ name: 'x', have: false }] })).toBe(
      '25 MIN · EASY · USES 0/1'
    );
  });

  it('handles an empty ingredient list', () => {
    expect(recipeMeta({ ...base, ingredients: [] })).toBe('25 MIN · EASY · USES 0/0');
  });
});
