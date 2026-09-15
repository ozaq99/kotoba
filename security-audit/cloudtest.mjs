// The Firestore onSnapshot path does: if (Array.isArray(data.lists)) setLists(data.lists)
// NO per-item validation. Simulate a hostile/corrupt cloud document.
globalThis.localStorage = { _d:{}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=v;}, removeItem(k){delete this._d[k];} };
const wl = await import('./wl.mjs');
const { renderToStaticMarkup } = await import('react-dom/server');
const React = (await import('react')).default;

const HOSTILE = [
  { label: 'normal doc',           lists: [{ id:'list-1', name:'My Saved Words', wordIds:['a'], createdAt:'x' }] },
  { label: 'name is an object',    lists: [{ id:'list-1', name:{toString(){return '<img src=x onerror=alert(1)>';}, evil:true}, wordIds:[] }] },
  { label: 'wordIds not an array', lists: [{ id:'list-1', name:'ok', wordIds:'DROP' }] },
  { label: 'list with no id',      lists: [{ name:'no id', wordIds:[] }] },
  { label: 'empty array',          lists: [] },
  { label: 'array of nulls',       lists: [null, undefined, 42] },
];

console.log('=== Hostile Firestore "lists" payload -> React render ===\n');
for (const { label, lists } of HOSTILE) {
  const passesGuard = Array.isArray(lists);          // App.tsx:131 gate — the ONLY check
  let outcome;
  try {
    const html = renderToStaticMarkup(
      React.createElement('div', null, lists.map((l, i) =>
        React.createElement('span', { key: i }, l?.name ?? '')))
    );
    const tags = [...html.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)/g)].map(m=>m[1]);
    const injected = tags.filter(t => !['div','span'].includes(t));
    outcome = `${injected.length ? 'ELEMENT INJECTED: '+injected.join(',') : 'escaped, no injection'}`;
  } catch (e) { outcome = 'RENDER THREW: ' + e.constructor.name + ': ' + e.message.slice(0,90); }
  console.log(`${label.padEnd(22)} | passes Array.isArray guard: ${String(passesGuard).padEnd(5)} | ${outcome}`);
}

console.log('\n=== Does the app guard wordIds.length / .includes on non-arrays? ===');
for (const [label, lists] of [['wordIds is a string', [{id:'l1',name:'ok',wordIds:'DROP'}]], ['wordIds missing',[{id:'l1',name:'ok'}]]]) {
  try { const r = wl.toggleWordInList(lists, 'l1', 'w1'); console.log(`${label}: OK ->`, JSON.stringify(r[0].wordIds)); }
  catch (e) { console.log(`${label}: THREW ${e.constructor.name}: ${e.message}`); }
}
