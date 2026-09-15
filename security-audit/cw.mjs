const CUSTOM_WORDS_KEY = "kotoba-custom-words";
const CUSTOM_LEVELS = ["N5", "N4", "N3", "N2", "N1"];
function uid() {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function parseLevel(value) {
  return CUSTOM_LEVELS.includes(String(value)) ? value : "N5";
}
function normalize(draft) {
  return {
    expression: draft.expression.trim(),
    reading: draft.reading.trim(),
    meaning: draft.meaning.trim(),
    level: parseLevel(draft.level)
  };
}
function readStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_WORDS_KEY) || "null");
    if (!Array.isArray(raw)) return [];
    return raw.filter((item) => item && typeof item.id === "string" && typeof item.expression === "string" && item.expression.trim() !== "").map((item) => ({
      id: String(item.id),
      expression: String(item.expression),
      reading: typeof item.reading === "string" ? item.reading : "",
      meaning: typeof item.meaning === "string" ? item.meaning : "",
      level: parseLevel(item.level),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : (/* @__PURE__ */ new Date()).toISOString()
    }));
  } catch {
  }
  return [];
}
function persistCustomWords(words) {
  localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(words));
}
function loadCustomWords() {
  return readStored();
}
function addCustomWord(words, draft) {
  const word = { id: uid(), ...normalize(draft), createdAt: (/* @__PURE__ */ new Date()).toISOString() };
  return { words: [word, ...words], id: word.id };
}
function updateCustomWord(words, id, draft) {
  const next = normalize(draft);
  return words.map((word) => word.id === id ? { ...word, ...next } : word);
}
function deleteCustomWord(words, id) {
  return words.filter((word) => word.id !== id);
}
function customWordsToWords(words) {
  return words.map((word) => ({ id: word.id, expression: word.expression, reading: word.reading, meaning: word.meaning, level: word.level, tags: [] }));
}
export {
  CUSTOM_LEVELS,
  addCustomWord,
  customWordsToWords,
  deleteCustomWord,
  loadCustomWords,
  persistCustomWords,
  updateCustomWord
};
