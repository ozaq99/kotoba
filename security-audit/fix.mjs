const MAX_NAME = 120;
const MAX_WORD_IDS = 5e3;
const FALLBACK_NAME = "My Saved Words";
function sanitizeLists(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => typeof item === "object" && item !== null).filter((item) => typeof item.id === "string" && item.id !== "").map((item) => ({
    id: String(item.id),
    // name must be a string. An object/number/missing -> fallback name.
    // This is the exact line that stops the React crash.
    name: typeof item.name === "string" && item.name.trim() !== "" ? item.name.slice(0, MAX_NAME) : FALLBACK_NAME,
    // wordIds must be an array OF STRINGS. A bare string like "DROP" must
    // NOT be spread into ["D","R","O","P"], so check Array.isArray first.
    wordIds: Array.isArray(item.wordIds) ? item.wordIds.filter((w) => typeof w === "string").slice(0, MAX_WORD_IDS) : [],
    createdAt: typeof item.createdAt === "string" ? item.createdAt : (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function sanitizeCustomWords(raw) {
  const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
  if (!Array.isArray(raw)) return [];
  return raw.filter((w) => typeof w === "object" && w !== null).filter((w) => typeof w.id === "string" && typeof w.expression === "string" && w.expression.trim() !== "").map((w) => ({
    id: String(w.id),
    expression: String(w.expression).slice(0, 200),
    reading: typeof w.reading === "string" ? w.reading.slice(0, 200) : "",
    meaning: typeof w.meaning === "string" ? w.meaning.slice(0, 500) : "",
    level: typeof w.level === "string" && LEVELS.includes(w.level) ? w.level : "N5",
    createdAt: typeof w.createdAt === "string" ? w.createdAt : (/* @__PURE__ */ new Date()).toISOString()
  }));
}
export {
  sanitizeCustomWords,
  sanitizeLists
};
