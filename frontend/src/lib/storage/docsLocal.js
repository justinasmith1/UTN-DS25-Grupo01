const KEY_PREFIX = 'cclf_docs_local_lote_';

function key(loteId) {
  return `${KEY_PREFIX}${loteId}`;
}

export function loadLocalDocs(loteId) {
  if (!loteId || typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(key(loteId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalDocs(loteId, docs) {
  if (!loteId || typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key(loteId), JSON.stringify(docs || []));
  } catch {
    /* ignore */
  }
}

export function addLocalDoc(loteId, doc) {
  const current = loadLocalDocs(loteId);
  const next = [...current, doc];
  saveLocalDocs(loteId, next);
  return next;
}
