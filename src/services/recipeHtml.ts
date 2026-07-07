import type { Recipe } from '../types';

/** Escape user/model text before interpolating into the PDF HTML. */
export function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * A nice, print-friendly recipe card. Warm paper, Forage yellow accents,
 * serif-italic tagline, mono labels — the light-mode cousin of the app UI.
 *
 * Pure (no native imports) so it can be unit-tested directly.
 */
export function buildRecipeHtml(recipe: Recipe): string {
  const have = recipe.ingredients.filter((i) => i.have).length;
  const total = recipe.ingredients.length;

  const ingredients = recipe.ingredients
    .map(
      (ing) => `
      <li class="ing">
        <span class="ing-name">${esc(ing.name)}</span>
        <span class="ing-tag ${ing.have ? 'have' : 'need'}">${
          ing.have ? '● in fridge' : '○ pantry / buy'
        }</span>
      </li>`
    )
    .join('');

  const steps = recipe.steps
    .map(
      (st, i) => `
      <li class="step">
        <span class="step-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="step-text">${esc(st)}</span>
      </li>`
    )
    .join('');

  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { margin: 40px; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: #17150F; background: #FAF9F4;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .wrap { max-width: 720px; margin: 0 auto; padding: 8px 4px 24px; }
  .brand { display: flex; align-items: center; gap: 9px; padding-bottom: 22px; }
  .mark { display: grid; grid-template-columns: 8px 8px; grid-template-rows: 8px 8px; gap: 2px; }
  .mark i { background: #F2DA0E; display: block; }
  .mark i.d { opacity: 0.35; }
  .brand b { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; }
  h1 { font-size: 34px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; margin: 0; }
  .tagline { font-family: Georgia, 'Times New Roman', serif; font-style: italic;
    font-size: 20px; color: #8A7400; margin: 8px 0 20px; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #D9D7CC; }
  .meta div { padding: 12px 14px; border-right: 1px solid #D9D7CC; }
  .meta div:last-child { border-right: 0; }
  .meta .lbl { font-family: ui-monospace, Menlo, monospace; font-size: 9px;
    letter-spacing: 0.14em; color: #6E6D66; text-transform: uppercase; }
  .meta .val { font-size: 16px; font-weight: 700; margin-top: 5px; }
  .match { display: flex; align-items: center; justify-content: space-between;
    background: #F2DA0E; color: #17150F; padding: 11px 14px; margin-top: 10px;
    font-family: ui-monospace, Menlo, monospace; font-size: 12px; letter-spacing: 0.08em; font-weight: 700; }
  h2 { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; margin: 30px 0 6px; }
  h2 .count { font-family: ui-monospace, Menlo, monospace; font-size: 10px;
    font-weight: 400; letter-spacing: 0.12em; color: #6E6D66; margin-left: 8px; }
  ul { list-style: none; margin: 0; padding: 0; }
  .ing { display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid #E4E2D8; padding: 9px 0; }
  .ing:last-child { border-bottom: 1px solid #E4E2D8; }
  .ing-name { font-size: 14px; }
  .ing-tag { font-family: ui-monospace, Menlo, monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; }
  .ing-tag.have { color: #8A7400; }
  .ing-tag.need { color: #9C9A90; }
  .step { display: grid; grid-template-columns: 32px 1fr; gap: 10px;
    border-top: 1px solid #E4E2D8; padding: 12px 0; page-break-inside: avoid; }
  .step:last-child { border-bottom: 1px solid #E4E2D8; }
  .step-num { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: #B89B00; }
  .step-text { font-size: 14px; line-height: 1.55; }
  .foot { margin-top: 26px; font-family: ui-monospace, Menlo, monospace;
    font-size: 10px; letter-spacing: 0.1em; color: #9C9A90; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <span class="mark"><i></i><i class="d"></i><i class="d"></i><i></i></span>
      <b>Forage</b>
    </div>

    <h1>${esc(recipe.name)}</h1>
    ${recipe.tagline ? `<div class="tagline">${esc(recipe.tagline)}</div>` : '<div style="height:12px"></div>'}

    <div class="meta">
      <div><div class="lbl">Time</div><div class="val">${esc(recipe.time)}</div></div>
      <div><div class="lbl">Serves</div><div class="val">${esc(recipe.serves)}</div></div>
      <div><div class="lbl">Level</div><div class="val">${esc(recipe.difficulty)}</div></div>
      <div><div class="lbl">Match</div><div class="val">${recipe.match}%</div></div>
    </div>
    <div class="match"><span>PANTRY MATCH</span><span>uses ${have}/${total} on hand</span></div>

    <h2>Ingredients<span class="count">${total} ITEMS</span></h2>
    <ul>${ingredients}</ul>

    <h2>Method</h2>
    <ul>${steps}</ul>

    <div class="foot">FORAGE · COOK WHAT YOU ALREADY HAVE · ${esc(today)}</div>
  </div>
</body>
</html>`;
}
