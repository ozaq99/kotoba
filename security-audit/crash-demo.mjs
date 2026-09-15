// ============================================================================
// DEMO: how one bad document in Firestore permanently breaks the app.
//
// This uses the REAL shipped code from src/lib/wordLists.ts (transpiled to
// .sectest/wl.mjs by esbuild) and the REAL React renderer. Nothing here is a
// fake stand-in for the app's logic.
//
// Run it with:  node security-audit/crash-demo.mjs
// ============================================================================

const wl = await import('./wl.mjs');
const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');

// --- A tiny fake localStorage so we can watch what gets saved -------------
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};

const line = (t) => console.log(`\n${'='.repeat(72)}\n${t}\n${'='.repeat(72)}`);

// ---------------------------------------------------------------------------
line('STEP 1 — A healthy document lives in Firestore. Everything works.');
// ---------------------------------------------------------------------------
const healthy = [{ id: 'list-abc', name: 'My Saved Words', wordIds: ['w1', 'w2'], createdAt: '2026-09-15' }];
console.log('Firestore doc:', JSON.stringify(healthy));
console.log('Renders fine:', renderToStaticMarkup(
  React.createElement('span', null, healthy.map((l, i) => React.createElement('span', { key: i }, l.name)))
));

// ---------------------------------------------------------------------------
line('STEP 2 — Someone writes a bad document. (name is an OBJECT, not a string)');
// ---------------------------------------------------------------------------
// In a real attack this comes from anyone who can write to your Firestore
// (see CRITICAL-1). It can also happen by accident: a buggy older build, a
// manual edit in the Firebase console, or a half-finished feature.
const poisoned = [{ id: 'list-abc', name: { evil: true, text: 'boom' }, wordIds: ['w1'], createdAt: 'x' }];
console.log('Firestore doc:', JSON.stringify(poisoned));
console.log('Notice: the list STILL has a valid string id. Only "name" is wrong.');

// ---------------------------------------------------------------------------
line('STEP 3 — The ONLY guard in App.tsx:131 checks the array, not its contents');
// ---------------------------------------------------------------------------
// This is the exact condition from src/App.tsx line 131:
//     if (Array.isArray(data.lists)) {
const passes = Array.isArray(poisoned);
console.log(`Array.isArray(data.lists)  ->  ${passes}`);
console.log(passes
  ? '>>> Guard PASSES. App.tsx then runs setLists(data.lists) and persistWordLists(data.lists).'
  : '>>> Guard would have blocked it.');

// ---------------------------------------------------------------------------
line('STEP 4 — persistWordLists() saves the poison to localStorage');
// ---------------------------------------------------------------------------
wl.persistWordLists(poisoned);
console.log('localStorage["kotoba-word-lists"] is now:');
console.log('  ' + store['kotoba-word-lists']);
console.log('\nThis is the moment the damage becomes PERMANENT. The bad data is now');
console.log('on the user\'s disk, not just in Firestore.');

// ---------------------------------------------------------------------------
line('STEP 5 — User refreshes the page. loadWordLists() reads it back.');
// ---------------------------------------------------------------------------
// readStoredLists() filters with:  item && typeof item.id === 'string'
// The poisoned item HAS a valid string id, so it sails through.
const afterRefresh = wl.loadWordLists();
console.log('loadWordLists() returned:', JSON.stringify(afterRefresh));
const stillBad = afterRefresh.some((l) => typeof l.name !== 'string');
console.log(`\nBad data still present after refresh? ${stillBad}`);
console.log(stillBad
  ? '>>> YES. The filter only checked "id", never "name". The poison survived.'
  : '>>> No.');

// ---------------------------------------------------------------------------
line('STEP 6 — The app tries to render {list.name}  (App.tsx:546, 560, 695)');
// ---------------------------------------------------------------------------
// This is the real render expression from the save-slot dropdown, App.tsx:560
try {
  renderToStaticMarkup(
    React.createElement('span', { className: 'truncate text-sm' }, afterRefresh[0].name)
  );
  console.log('Rendered OK (unexpected).');
} catch (e) {
  console.log('React THREW:');
  console.log('  ' + e.constructor.name + ': ' + e.message.split('\n')[0]);
  console.log('\n>>> The ErrorBoundary catches this and shows "Something went wrong".');
  console.log('>>> The Cabinet never renders. Refresh again -> same crash, forever.');
}

// ---------------------------------------------------------------------------
line('STEP 7 — Why the user cannot escape it');
// ---------------------------------------------------------------------------
console.log(`
  The crash loop:

    refresh -> loadWordLists() reads poisoned localStorage
            -> React renders {list.name} -> THROWS
            -> ErrorBoundary -> "Something went wrong"
            -> user refreshes -> repeat

  The error boundary's reset button navigates to a new route, but every route
  is wrapped in the same DataProvider, so the crash returns immediately.

  Meanwhile Firestore still holds the bad document, so even clearing
  localStorage does not help: the onSnapshot listener re-downloads it and
  re-saves it within milliseconds.

  Escape routes for the user: clear localStorage AND have the Firestore
  document fixed. Neither is something a normal user can do.
`);

// ---------------------------------------------------------------------------
line('BONUS — a second, milder version of the same bug');
// ---------------------------------------------------------------------------
// If wordIds is missing or wrong, toggleWordInList crashes or corrupts.
for (const [label, lists] of [
  ['wordIds is a string "DROP"', [{ id: 'l1', name: 'ok', wordIds: 'DROP' }]],
  ['wordIds is missing entirely', [{ id: 'l1', name: 'ok' }]],
]) {
  try {
    const r = wl.toggleWordInList(lists, 'l1', 'w1');
    console.log(`${label.padEnd(26)} -> wordIds becomes ${JSON.stringify(r[0].wordIds)}`);
    console.log(`${''.padEnd(26)}    ^ "DROP" was spread into individual characters!`);
  } catch (e) {
    console.log(`${label.padEnd(26)} -> THREW ${e.constructor.name}: ${e.message}`);
  }
}
console.log('\nNo crash for the user, but their data is silently mangled.');
