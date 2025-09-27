// src/utils/filterViews.js
// Utilidad para persistir vistas de filtros en localStorage.
// Diseño: API mínima y estable para poder migrar a backend sin tocar la UI (esto en un futurin cercano).

const STORAGE_KEY = 'filterViews:v1';

export function listFilterViews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveFilterView(name, filters) {
  const all = listFilterViews();
  const view = {
    id: crypto.randomUUID(),
    name: String(name || '').trim(),
    filters: JSON.parse(JSON.stringify(filters || {})), // solo serializables
    createdAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([view, ...all]));
  return view;
}

export function deleteFilterView(id) {
  const filtered = listFilterViews().filter(v => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function getFiltersFromView(id) {
  const v = listFilterViews().find(v => v.id === id);
  return v ? v.filters : null;
}
