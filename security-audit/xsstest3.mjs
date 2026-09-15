const { addCustomWord } = await import('./cw.mjs');
const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');

const PAYLOADS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(document.cookie)>',
  "'; DROP TABLE users; --",
  '<svg/onload=alert(1)>',
  'javascript:alert(1)',
  '  padded   <b>bold</b>  ',
  'あ<script>x</script>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '</p><p onclick="alert(1)">click</p>',
];

// The 4 elements this component tree creates. Nothing else may appear.
const EXPECTED = ['div','p','p','span'].sort().join(',');

console.log('=== Definitive check: which REAL elements does the payload create? ===');
console.log('(an event handler inside escaped text like &lt;img onerror=&gt; is inert)\n');

let vulnerable = 0;
for (const p of PAYLOADS) {
  const { words: next } = addCustomWord([], { expression: p, reading: p, meaning: p, level: 'N5' });
  const w = next[0];
  const html = renderToStaticMarkup(
    React.createElement('div', null,
      React.createElement('span', { className: 'kanji-display' }, w.expression),
      React.createElement('p', null, w.reading || w.expression),
      React.createElement('p', { className: 'truncate' }, w.meaning))
  );

  // Only count opening tags of real elements.
  const tags = [...html.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)/g)].map(m => m[1]);
  const actual = tags.slice().sort().join(',');

  // A payload-injected element must be one of these; check the TAG LIST, not text.
  const injected = tags.filter(t => !['div','span','p'].includes(t));
  const bad = actual !== EXPECTED || injected.length > 0;
  if (bad) vulnerable++;

  console.log(`payload : ${p}`);
  console.log(`  real elements : [${tags.join(', ')}]  expected [div, p, p, span]`);
  console.log(`  injected tags : ${injected.length ? injected.join(',') : 'none'}`);
  console.log(`  => ${bad ? 'VULNERABLE' : 'SAFE — fully escaped to inert text'}\n`);
}
console.log(vulnerable === 0
  ? `VERDICT: 0/${PAYLOADS.length} payloads created any element. No DOM XSS on this path.`
  : `VERDICT: ${vulnerable}/${PAYLOADS.length} payloads injected elements. DOM XSS PRESENT.`);

// Control: prove the detector CAN catch a real vulnerability.
console.log('\n=== CONTROL: same detector against a deliberately unsafe sink ===');
const evil = renderToStaticMarkup(
  React.createElement('div', { dangerouslySetInnerHTML: { __html: '<img src=x onerror=alert(1)>' } })
);
const evilTags = [...evil.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)/g)].map(m => m[1]);
const evilInjected = evilTags.filter(t => !['div','span','p'].includes(t));
console.log(`  html: ${evil}`);
console.log(`  injected tags: ${evilInjected.join(',') || 'none'}  => detector ${evilInjected.length ? 'CORRECTLY FLAGGED it' : 'FAILED to flag it'}`);
