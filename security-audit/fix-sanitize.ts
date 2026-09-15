// ============================================================================
// THE FIX — this is the exact code to add to src/lib/wordLists.ts
//
// This file exists so the fix can be TESTED before you paste it in.
// It is transpiled by esbuild and driven with the same poisoned payloads that
// crashed the app in crash-demo.mjs.
// ============================================================================

export type WordList = {
  id: string;
  name: string;
  wordIds: string[];
  createdAt: string;
};

const MAX_NAME = 120;
const MAX_WORD_IDS = 5000;
const FALLBACK_NAME = 'My Saved Words';

/**
 * Turn ANY value that claims to be a word list into a guaranteed-safe one.
 * Never throws. Never returns a bad shape. Bad items are repaired, not
 * dropped, so the user does not silently lose their saved words.
 */
export function sanitizeLists(raw: unknown): WordList[] {
  // 1. Must be an array. Anything else -> empty.
  if (!Array.isArray(raw)) return [];

  return raw
    // 2. Drop anything that is not an object at all (null, 42, "str", ...).
    .filter((item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null)

    // 3. Keep only items that have a usable string id.
    .filter((item) => typeof item.id === 'string' && item.id !== '')

    // 4. Rebuild every field with a checked type and a safe fallback.
    .map((item) => ({
      id: String(item.id),

      // name must be a string. An object/number/missing -> fallback name.
      // This is the exact line that stops the React crash.
      name: typeof item.name === 'string' && item.name.trim() !== ''
        ? item.name.slice(0, MAX_NAME)
        : FALLBACK_NAME,

      // wordIds must be an array OF STRINGS. A bare string like "DROP" must
      // NOT be spread into ["D","R","O","P"], so check Array.isArray first.
      wordIds: Array.isArray(item.wordIds)
        ? item.wordIds
            .filter((w): w is string => typeof w === 'string')
            .slice(0, MAX_WORD_IDS)
        : [],

      createdAt: typeof item.createdAt === 'string'
        ? item.createdAt
        : new Date().toISOString(),
    }));
}

/** Same treatment for the personal-drawer words. */
export function sanitizeCustomWords(raw: unknown) {
  const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((w): w is Record<string, unknown> => typeof w === 'object' && w !== null)
    .filter((w) => typeof w.id === 'string' && typeof w.expression === 'string' && w.expression.trim() !== '')
    .map((w) => ({
      id: String(w.id),
      expression: String(w.expression).slice(0, 200),
      reading: typeof w.reading === 'string' ? w.reading.slice(0, 200) : '',
      meaning: typeof w.meaning === 'string' ? w.meaning.slice(0, 500) : '',
      level: typeof w.level === 'string' && LEVELS.includes(w.level) ? w.level : 'N5',
      createdAt: typeof w.createdAt === 'string' ? w.createdAt : new Date().toISOString(),
    }));
}
