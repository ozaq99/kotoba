const LISTS_KEY = "kotoba-word-lists";
const ACTIVE_KEY = "kotoba-active-list";
const LEGACY_FAVORITES_KEY = "kotoba-favorites";
const DEFAULT_LIST_NAME = "My Saved Words";
function uid() {
  return `list-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function makeList(name, wordIds = []) {
  return { id: uid(), name, wordIds, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
}
function readStoredLists() {
  try {
    const raw = JSON.parse(localStorage.getItem(LISTS_KEY) || "null");
    if (Array.isArray(raw)) return raw.filter((item) => item && typeof item.id === "string");
  } catch {
  }
  return [];
}
function migrateLegacyFavorites() {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_FAVORITES_KEY) || "null");
    localStorage.removeItem(LEGACY_FAVORITES_KEY);
    if (Array.isArray(legacy) && legacy.length > 0) {
      return makeList(DEFAULT_LIST_NAME, legacy);
    }
  } catch {
  }
  return null;
}
function persistWordLists(lists) {
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
}
function loadWordLists() {
  const existing = readStoredLists();
  if (existing.length > 0) return existing;
  const migrated = migrateLegacyFavorites();
  const seeded = migrated ? [migrated] : [makeList(DEFAULT_LIST_NAME)];
  persistWordLists(seeded);
  return seeded;
}
function persistActiveListId(id) {
  localStorage.setItem(ACTIVE_KEY, id);
}
function loadActiveListId(lists) {
  const stored = localStorage.getItem(ACTIVE_KEY);
  if (stored && lists.some((list) => list.id === stored)) return stored;
  return lists[0]?.id ?? "";
}
function createWordList(lists, name) {
  const list = makeList(name.trim() || "Untitled list");
  return { lists: [...lists, list], id: list.id };
}
function renameWordList(lists, id, name) {
  const trimmed = name.trim();
  if (!trimmed) return lists;
  return lists.map((list) => list.id === id ? { ...list, name: trimmed } : list);
}
function deleteWordList(lists, id) {
  const next = lists.filter((list) => list.id !== id);
  return next.length > 0 ? next : [makeList(DEFAULT_LIST_NAME)];
}
function toggleWordInList(lists, listId, wordId) {
  return lists.map((list) => {
    if (list.id !== listId) return list;
    const inList = list.wordIds.includes(wordId);
    return { ...list, wordIds: inList ? list.wordIds.filter((item) => item !== wordId) : [...list.wordIds, wordId] };
  });
}
export {
  createWordList,
  deleteWordList,
  loadActiveListId,
  loadWordLists,
  persistActiveListId,
  persistWordLists,
  renameWordList,
  toggleWordInList
};
