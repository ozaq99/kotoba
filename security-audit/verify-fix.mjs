// Prove the fix survives every payload that broke the app.
const { sanitizeLists } = await import('./fix.mjs');
const wl = await import('./wl.mjs');
const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};

// The real render expression from App.tsx:560 (save-slot dropdown).
const renderDropdown = (lists) => renderToStaticMarkup(
  React.createElement('span', null, lists.map((l, i) =>
    React.createElement('span', { key: i, className: 'truncate text-sm' }, l.name))));

const CASES = [
  ['the original crash (name is object)', [{ id: 'l1', name: { evil: true }, wordIds: ['w1'], createdAt: 'x' }]],
  ['wordIds is the string "DROP"',        [{ id: 'l1', name: 'ok', wordIds: 'DROP' }]],
  ['wordIds missing entirely',            [{ id: 'l1', name: 'ok' }]],
  ['name missing entirely',               [{ id: 'l1', wordIds: [] }]],
  ['name is a number',                    [{ id: 'l1', name: 42, wordIds: [] }]],
  ['item is null',                        [null, { id: 'l2', name: 'good', wordIds: [] }]],
  ['wordIds contains non-strings',        [{ id: 'l1', name: 'ok', wordIds: ['a', 99, null, 'b'] }]],
  ['not an array at all',                 { nope: true }],
  ['a 5000-char name',                    [{ id: 'l1', name: 'x'.repeat(5000), wordIds: [] }]],
  ['healthy list (must survive intact)',  [{ id: 'l1', name: 'My Saved Words', wordIds: ['w1','w2'], createdAt: '2026-09-15' }]],
];

console.log('=== BEFORE the fix vs AFTER the fix ===\n');
let beforeCrashes = 0, afterCrashes = 0;

for (const [label, input] of CASES) {
  // BEFORE: App.tsx does setLists(data.lists) then renders
  let before;
  try { renderDropdown(Array.isArray(input) ? input : [input]); before = 'ok'; }
  catch (e) { before = 'CRASH: ' + e.message.split('\n')[0].slice(0, 58); beforeCrashes++; }

  // AFTER: sanitize first
  let after;
  try {
    const clean = sanitizeLists(input);
    renderDropdown(clean);
    // and confirm the app's own helpers no longer throw on it either
    wl.toggleWordInList(clean, clean[0]?.id ?? '', 'w9');
    after = `ok -> name=${JSON.stringify((clean[0]?.name ?? '(empty)').slice(0, 24))} wordIds=${JSON.stringify(clean[0]?.wordIds)}`;
  } catch (e) { after = 'CRASH: ' + e.message.slice(0, 58); afterCrashes++; }

  console.log(label);
  console.log(`  BEFORE: ${before}`);
  console.log(`  AFTER : ${after}\n`);
}

console.log(`RESULT: before the fix ${beforeCrashes}/${CASES.length} cases crashed.`);
console.log(`        after the fix  ${afterCrashes}/${CASES.length} cases crashed.`);

console.log('\n=== Data preservation check: healthy data must NOT be lost ===');
const healthy = [{ id: 'l1', name: 'My Saved Words', wordIds: ['w1','w2','w3'], createdAt: '2026-09-15' }];
console.log('in :', JSON.stringify(healthy));
console.log('out:', JSON.stringify(sanitizeLists(healthy)));
console.log(JSON.stringify(healthy) === JSON.stringify(sanitizeLists(healthy))
  ? 'IDENTICAL — no data loss on good data.'
  : 'CHANGED — investigate!');
