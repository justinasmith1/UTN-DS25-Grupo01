import { useEffect, useRef, useState } from "react";
import { PanelsTopLeft } from "lucide-react";
import { listFilterViews, saveFilterView, getFiltersFromView, deleteFilterView } from "../../utils/filterViews";
import { sanitizeFiltersForRole } from "./utils/role";
// Este lo que hace es permitir guardar, aplicar y eliminar vistas de filtros (con persistencia en localStorage)

export default function FilterViewsMenu({ isInmo, onApply, currentDraft, variant = "match-filters" }) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState(() => listFilterViews());
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleApply = () => {
    if (!selectedId) return;
    const vf = getFiltersFromView(selectedId);
    if (!vf) return;
    onApply(sanitizeFiltersForRole(vf, isInmo));
    setOpen(false);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    deleteFilterView(selectedId);
    setViews(listFilterViews());
    setSelectedId("");
  };

  const handleSave = () => {
    const label = name.trim();
    if (!label) return;
    const payload = sanitizeFiltersForRole(currentDraft, isInmo);
    const v = saveFilterView(label, payload);
    setViews((prev) => [v, ...prev]);
    setSelectedId(v.id);
    setName("");
  };

  return (
    <div className="fv" ref={ref}>
      <button
        type="button"
        className={`fv-trigger ${variant === "blue" ? "fv-trigger--blue" : "fv-trigger--match"}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <PanelsTopLeft size={18} />
        <span>Vistas</span>
      </button>

      {open && (
        <div className="fv-pop" role="dialog" aria-label="Vistas guardadas">
          <label className="fv-row">
            <span className="fv-label">Vistas guardadas</span>
            <details className="fv-dd">
              <summary>
                <span>{selectedId ? (views.find(v => v.id === selectedId)?.name) : "Seleccionar…"}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="6 9 12 15 18 9"></polyline></svg>
              </summary>
              <ul className="fv-dd-list" role="listbox">
                <li className={`fv-dd-opt ${!selectedId ? "is-selected": ""}`} onClick={() => (setSelectedId(""), (document.activeElement?.blur?.()))} role="option" aria-selected={!selectedId}>
                  Seleccionar…
                </li>
                {views.map(v => (
                  <li key={v.id} className={`fv-dd-opt ${selectedId === v.id ? "is-selected": ""}`}
                      onClick={() => (setSelectedId(v.id), (document.activeElement?.blur?.()))}
                      role="option" title={v.name} aria-selected={selectedId === v.id}>
                    {v.name}
                  </li>
                ))}
              </ul>
            </details>
          </label>

          <div className="fv-actions">
            <button className="fv-btn fv-btn--apply" onClick={handleApply} disabled={!selectedId}>Aplicar</button>
            <button className="fv-btn fv-btn--danger" onClick={handleDelete} disabled={!selectedId}>Eliminar</button>
          </div>

          <div className="fv-divider" />

          <label className="fv-row">
            <span className="fv-label">Guardar como</span>
            <input className="fv-input" placeholder="Ej.: Promoción 200–300 m²" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <button className="fv-btn fv-btn--primary" onClick={handleSave}>Guardar vista</button>
        </div>
      )}
    </div>
  );
}
