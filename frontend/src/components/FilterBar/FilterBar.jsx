// components/FilterBar/FilterBar.jsx
// -----------------------------------------------------------------------------
// FilterBar de Lotes - Contiene todos los posibles filtros a aplicar y todas
// las divisiones por roles.
// -----------------------------------------------------------------------------
import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./FilterBar.css";
import RangeControl from "./controls/RangeControl";

// Driver de vistas guardadas (frontend-only, en utils)
import {
  listFilterViews,
  saveFilterView,
  getFiltersFromView,
  deleteFilterView,
} from "../../utils/filterViews";

// Icono Lucide para "Vistas"
import { PanelsTopLeft } from "lucide-react";

/* ============================================================================
   Componente compacto de Vistas (popover)
============================================================================ */
function FilterViewsMenu({ isInmo, onApply, currentDraft, variant = "match-filters" }) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState(() => listFilterViews());
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");

  const ref = useRef(null);

  // Cerrar popover si se hace click fuera
  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Sanitiza por rol (INMOBILIARIA sin NO_DISPONIBLE ni deudor)
  const sanitizeForRole = (f) => {
    const clone = JSON.parse(JSON.stringify(f || {}));
    if (isInmo) {
      clone.estado = Array.isArray(clone.estado)
        ? clone.estado.filter((e) => e !== "NO_DISPONIBLE")
        : [];
      clone.deudor = null;
    }
    return clone;
  };

  const handleApply = () => {
    if (!selectedId) return;
    const vf = getFiltersFromView(selectedId);
    if (!vf) return;
    onApply(sanitizeForRole(vf));
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
    const payload = sanitizeForRole(currentDraft);
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
                <li
                  className={`fv-dd-opt ${!selectedId ? "is-selected": ""}`}
                  onClick={() => (setSelectedId(""), (document.activeElement?.blur?.()))}
                  role="option"
                  aria-selected={!selectedId}
                >
                  Seleccionar…
                </li>
                {views.map(v => (
                  <li
                    key={v.id}
                    className={`fv-dd-opt ${selectedId === v.id ? "is-selected": ""}`}
                    onClick={() => (setSelectedId(v.id), (document.activeElement?.blur?.()))}
                    role="option"
                    title={v.name}
                    aria-selected={selectedId === v.id}
                  >
                    {v.name}
                  </li>
                ))}
              </ul>
            </details>
          </label>

          <div className="fv-actions">
            <button
              className="fv-btn fv-btn--apply"
              onClick={handleApply}
              disabled={!selectedId}
            >
              Aplicar
            </button>
            <button
              className="fv-btn fv-btn--danger"
              onClick={handleDelete}
              disabled={!selectedId}
            >
              Eliminar
            </button>
          </div>

          <div className="fv-divider" />

          <label className="fv-row">
            <span className="fv-label">Guardar como</span>
            <input
              className="fv-input"
              placeholder="Ej.: Promoción 200–300 m²"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <button className="fv-btn fv-btn--primary" onClick={handleSave}>
            Guardar vista
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   FilterBar principal
============================================================================ */
const DEBOUNCE_MS = 250;

export default function FilterBar({
  variant = "dashboard",
  userRole = "GENERAL",
  onParamsChange,
}) {
  /* === Rol === */
  const isInmo = String(userRole).toUpperCase() === "INMOBILIARIA";

  /* === Catálogos base === */
  const ESTADOS = useMemo(() => {
    const ALL_ESTADOS = [
      "DISPONIBLE",
      "NO_DISPONIBLE",
      "RESERVADO",
      "VENDIDO",
      "ALQUILADO",
    ];
    return isInmo ? ALL_ESTADOS.filter((e) => e !== "NO_DISPONIBLE") : ALL_ESTADOS;
  }, [isInmo]);
  const SUBESTADOS = ["CONSTRUIDO", "EN_CONSTRUCCION", "NO_CONSTRUIDO"];
  const CALLES = [
    "REINAMORA",
    "MACA",
    "ZORZAL",
    "CAUQUEN",
    "ALONDRA",
    "JACANA",
    "TACUARITO",
    "JILGUERO",
    "GOLONDRINA",
    "CALANDRIA",
    "AGUILAMORA",
    "LORCA",
    "MILANO",
  ];

  /* === Estado UI === */
  const [open, setOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  /* === Estado de filtros (draft local) === */
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState([]);
  const [subestado, setSubestado] = useState([]);
  const [calle, setCalle] = useState([]);
  const [frente, setFrente] = useState({ min: 0, max: 100 });
  const [fondo, setFondo] = useState({ min: 0, max: 100 });
  const [sup, setSup] = useState({ min: 0, max: 5000 });
  const [precio, setPrecio] = useState({ min: 0, max: 300000 });
  const [deudor, setDeudor] = useState(null);

  /* === Estado de filtros aplicados (chips) === */
  const [appliedFilters, setAppliedFilters] = useState({
    q: "",
    estado: [],
    subestado: [],
    calle: [],
    frente: { min: 0, max: 100 },
    fondo: { min: 0, max: 100 },
    sup: { min: 0, max: 5000 },
    precio: { min: 0, max: 300000 },
    deudor: null,
  });

  /* Refs modal */
  const bodyRef = useRef(null);
  const topRef = useRef(null);

  /* Helpers */
  const nice = (s) =>
    (s ?? "")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  const toggle = (setFn, v) =>
    setFn((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  /* Regla INMOBILIARIA */
  useEffect(() => {
    if (!isInmo) return;
    setEstado((prev) => prev.filter((v) => v !== "NO_DISPONIBLE"));
    setDeudor(null);
  }, [isInmo]);

  /* Contador de activos */
  const activeCount = useMemo(
    () =>
      (appliedFilters.q ? 1 : 0) +
      appliedFilters.estado.length +
      appliedFilters.subestado.length +
      appliedFilters.calle.length +
      (appliedFilters.frente.min !== 0 || appliedFilters.frente.max !== 100 ? 1 : 0) +
      (appliedFilters.fondo.min !== 0 || appliedFilters.fondo.max !== 100 ? 1 : 0) +
      (appliedFilters.sup.min !== 0 || appliedFilters.sup.max !== 5000 ? 1 : 0) +
      (appliedFilters.precio.min !== 0 || appliedFilters.precio.max !== 300000 ? 1 : 0) +
      (isInmo ? 0 : appliedFilters.deudor === null ? 0 : 1),
    [appliedFilters, isInmo]
  );

  /* Chips */
  const chips = useMemo(() => {
    const arr = [];
    if (appliedFilters.q) arr.push({ k: "q", label: `Buscar: ${appliedFilters.q}` });
    appliedFilters.estado
      .filter((v) => (isInmo ? v !== "NO_DISPONIBLE" : true))
      .forEach((v) => arr.push({ k: "estado", v, label: nice(v) }));
    appliedFilters.subestado.forEach((v) =>
      arr.push({ k: "subestado", v, label: nice(v) })
    );
    appliedFilters.calle.forEach((v) => arr.push({ k: "calle", v, label: nice(v) }));
    if (appliedFilters.frente.min !== 0 || appliedFilters.frente.max !== 100)
      arr.push({
        k: "frente",
        label: `Frente ${appliedFilters.frente.min}–${appliedFilters.frente.max} m`,
      });
    if (appliedFilters.fondo.min !== 0 || appliedFilters.fondo.max !== 100)
      arr.push({
        k: "fondo",
        label: `Fondo ${appliedFilters.fondo.min}–${appliedFilters.fondo.max} m`,
      });
    if (appliedFilters.sup.min !== 0 || appliedFilters.sup.max !== 5000)
      arr.push({
        k: "sup",
        label: `Sup ${appliedFilters.sup.min}–${appliedFilters.sup.max} m²`,
      });
    if (appliedFilters.precio.min !== 0 || appliedFilters.precio.max !== 300000)
      arr.push({
        k: "precio",
        label: `Precio ${appliedFilters.precio.min}–${appliedFilters.precio.max} USD`,
      });
    if (!isInmo && appliedFilters.deudor !== null)
      arr.push({ k: "deudor", label: appliedFilters.deudor ? "Solo deudor" : "Sin deuda" });
    return arr;
  }, [appliedFilters, isInmo]);

  const removeChip = (chip) => {
    switch (chip.k) {
      case "q":
        setQ("");
        setAppliedFilters((prev) => ({ ...prev, q: "" }));
        onParamsChange?.({ q: "" });
        break;
      case "estado":
        setEstado((prev) => prev.filter((v) => v !== chip.v));
        setAppliedFilters((prev) => ({
          ...prev,
          estado: prev.estado.filter((v) => v !== chip.v),
        }));
        onParamsChange?.({ estado: appliedFilters.estado.filter((v) => v !== chip.v) });
        break;
      case "subestado":
        setSubestado((prev) => prev.filter((v) => v !== chip.v));
        setAppliedFilters((prev) => ({
          ...prev,
          subestado: prev.subestado.filter((v) => v !== chip.v),
        }));
        onParamsChange?.({
          subestado: appliedFilters.subestado.filter((v) => v !== chip.v),
        });
        break;
      case "calle":
        setCalle((prev) => prev.filter((v) => v !== chip.v));
        setAppliedFilters((prev) => ({
          ...prev,
          calle: prev.calle.filter((v) => v !== chip.v),
        }));
        onParamsChange?.({ calle: appliedFilters.calle.filter((v) => v !== chip.v) });
        break;
      case "frente":
        setFrente({ min: 0, max: 100 });
        setAppliedFilters((prev) => ({ ...prev, frente: { min: 0, max: 100 } }));
        onParamsChange?.({ frenteMin: undefined, frenteMax: undefined });
        break;
      case "fondo":
        setFondo({ min: 0, max: 100 });
        setAppliedFilters((prev) => ({ ...prev, fondo: { min: 0, max: 100 } }));
        onParamsChange?.({ fondoMin: undefined, fondoMax: undefined });
        break;
      case "sup":
        setSup({ min: 0, max: 5000 });
        setAppliedFilters((prev) => ({ ...prev, sup: { min: 0, max: 5000 } }));
        onParamsChange?.({ supMin: undefined, supMax: undefined });
        break;
      case "precio":
        setPrecio({ min: 0, max: 300000 });
        setAppliedFilters((prev) => ({ ...prev, precio: { min: 0, max: 300000 } }));
        onParamsChange?.({ priceMin: undefined, priceMax: undefined });
        break;
      case "deudor":
        setDeudor(null);
        setAppliedFilters((prev) => ({ ...prev, deudor: null }));
        onParamsChange?.({ deudor: null });
        break;
      default:
        break;
    }
  };

  /* Atajos de teclado */
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (!open && !typing && e.key.toLowerCase() === "f") setOpen(true);
      if (open && e.key === "Escape") setOpen(false);
      if (open && e.key === "Enter" && !typing) applyFilters();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
        e.preventDefault();
        clear();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line

  /* Al abrir modal: ajustar alto visible al bloque superior */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const applyTopHeight = () => {
      const topEl = topRef.current,
        bodyEl = bodyRef.current;
      if (!topEl || !bodyEl) return;
      const h = Math.ceil(topEl.getBoundingClientRect().height) + 20;
      bodyEl.style.setProperty("--fb-body-max", `${h}px`);
      bodyEl.scrollTo({ top: 0, behavior: "auto" });
    };
    requestAnimationFrame(applyTopHeight);
    const ro = new ResizeObserver(applyTopHeight);
    if (topRef.current) ro.observe(topRef.current);
    window.addEventListener("resize", applyTopHeight);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("resize", applyTopHeight);
      ro.disconnect();
    };
  }, [open]);

  // Búsqueda en vivo (solo q)
  useEffect(() => {
    const id = setTimeout(() => {
      setAppliedFilters((prev) => ({ ...prev, q }));
      onParamsChange?.({ q });
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [q, onParamsChange]);

  /* Construcción de payload para el padre */
  const buildParams = (F) => {
    const params = {
      q: F.q || "",
      estado: F.estado || [],
      subestado: F.subestado || [],
      calle: F.calle || [],
      deudor: isInmo ? null : F.deudor ?? null,
    };
    if (F.frente?.min !== 0 || F.frente?.max !== 100) {
      params.frenteMin = F.frente.min;
      params.frenteMax = F.frente.max;
    }
    if (F.fondo?.min !== 0 || F.fondo?.max !== 100) {
      params.fondoMin = F.fondo.min;
      params.fondoMax = F.fondo.max;
    }
    if (F.sup?.min !== 0 || F.sup?.max !== 5000) {
      params.supMin = F.sup.min;
      params.supMax = F.sup.max;
    }
    if (F.precio?.min !== 0 || F.precio?.max !== 300000) {
      params.priceMin = F.precio.min;
      params.priceMax = F.precio.max;
    }
    return params;
  };

  /* Aplicar / Limpiar — ÚNICOS lugares donde notificamos al padre */
  const applyFilters = () => {
    const safeDeudor = isInmo ? null : deudor;
    const newAppliedFilters = {
      q,
      estado,
      subestado,
      calle,
      frente,
      fondo,
      sup,
      precio,
      deudor: safeDeudor,
    };
    setAppliedFilters(() => newAppliedFilters);
    onParamsChange?.(buildParams(newAppliedFilters));
    setOpen(false);
  };

  const clear = () => {
    const cleared = {
      q: "",
      estado: [],
      subestado: [],
      calle: [],
      frente: { min: 0, max: 100 },
      fondo: { min: 0, max: 100 },
      sup: { min: 0, max: 5000 },
      precio: { min: 0, max: 300000 },
      deudor: null,
    };
    setQ("");
    setEstado([]);
    setSubestado([]);
    setCalle([]);
    setFrente(cleared.frente);
    setFondo(cleared.fondo);
    setSup(cleared.sup);
    setPrecio(cleared.precio);
    setDeudor(null);
    setAppliedFilters(cleared);
    onParamsChange?.({});
  };

  /* ===== Modal ===== */
  const modal =
    open &&
    createPortal(
      <div
        className={`fb-modal fb-modal-${variant}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
        onClick={() => setOpen(false)}
      >
        <div className="fb-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="fb-sheet-header">
            <h3>Filtros</h3>
            <button className="fb-close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
          </div>

          <div className="fb-sheet-body" ref={bodyRef}>
            {/* ===== BLOQUE SUPERIOR ===== */}
            <div className="fb-body-top" ref={topRef}>
              <section className="fb-section">
                <div className="fb-sec-head">
                  <h4>Estado</h4>
                  {estado.length > 0 && (
                    <button className="fb-reset" onClick={() => setEstado([])}>
                      Restablecer
                    </button>
                  )}
                </div>
                <div className="fb-options">
                  {ESTADOS.map((v) => (
                    <button
                      key={v}
                      className={`fb-pill ${estado.includes(v) ? "is-checked" : ""}`}
                      aria-pressed={estado.includes(v)}
                      onClick={() => toggle(setEstado, v)}
                    >
                      {nice(v)}
                    </button>
                  ))}
                </div>
              </section>

              <section className="fb-section">
                <div className="fb-sec-head">
                  <h4>Sub-estado</h4>
                  {subestado.length > 0 && (
                    <button className="fb-reset" onClick={() => setSubestado([])}>
                      Restablecer
                    </button>
                  )}
                </div>
                <div className="fb-options">
                  {SUBESTADOS.map((v) => (
                    <button
                      key={v}
                      className={`fb-pill ${subestado.includes(v) ? "is-checked" : ""}`}
                      aria-pressed={subestado.includes(v)}
                      onClick={() => toggle(setSubestado, v)}
                    >
                      {nice(v)}
                    </button>
                  ))}
                </div>
              </section>

              <section className="fb-section">
                <div className="fb-sec-head">
                  <h4>Calle</h4>
                  {calle.length > 0 && (
                    <button className="fb-reset" onClick={() => setCalle([])}>
                      Restablecer
                    </button>
                  )}
                </div>
                <div className="fb-options fb-grid">
                  {CALLES.map((v) => (
                    <button
                      key={v}
                      className={`fb-pill ${calle.includes(v) ? "is-checked" : ""}`}
                      aria-pressed={calle.includes(v)}
                      onClick={() => toggle(setCalle, v)}
                    >
                      {nice(v)}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* ===== RESTO ===== */}
            <div className="fb-body-rest">
              <div className="fb-range-block">
                <RangeControl
                  label="Frente (m)"
                  unit="m"
                  minLimit={0}
                  maxLimit={100}
                  step={0.1}
                  value={frente}
                  onChange={setFrente}
                />
              </div>
              {(frente.min !== 0 || frente.max !== 100) && (
                <div className="fb-sec-head" style={{ marginTop: -6 }}>
                  <button className="fb-reset" onClick={() => setFrente({ min: 0, max: 100 })}>
                    Restablecer
                  </button>
                </div>
              )}

              <div className="fb-range-block">
                <RangeControl
                  label="Fondo (m)"
                  unit="m"
                  minLimit={0}
                  maxLimit={100}
                  step={0.1}
                  value={fondo}
                  onChange={setFondo}
                />
              </div>
              {(fondo.min !== 0 || fondo.max !== 100) && (
                <div className="fb-sec-head" style={{ marginTop: -6 }}>
                  <button className="fb-reset" onClick={() => setFondo({ min: 0, max: 100 })}>
                    Restablecer
                  </button>
                </div>
              )}

              <div className="fb-range-block">
                <RangeControl
                  label="Superficie (m²)"
                  unit="m²"
                  minLimit={0}
                  maxLimit={5000}
                  step={1}
                  value={sup}
                  onChange={setSup}
                />
              </div>
              {(sup.min !== 0 || sup.max !== 5000) && (
                <div className="fb-sec-head" style={{ marginTop: -6 }}>
                  <button className="fb-reset" onClick={() => setSup({ min: 0, max: 5000 })}>
                    Restablecer
                  </button>
                </div>
              )}

              <div className="fb-range-block">
                <RangeControl
                  label="Precio (USD)"
                  unit="USD"
                  minLimit={0}
                  maxLimit={300000}
                  step={100}
                  value={precio}
                  onChange={setPrecio}
                />
              </div>
              {(precio.min !== 0 || precio.max !== 300000) && (
                <div className="fb-sec-head" style={{ marginTop: -6 }}>
                  <button
                    className="fb-reset"
                    onClick={() => setPrecio({ min: 0, max: 300000 })}
                  >
                    Restablecer
                  </button>
                </div>
              )}

              {!isInmo && (
                <section className="fb-section">
                  <div className="fb-sec-head">
                    <h4>Deudor</h4>
                    {deudor !== null && (
                      <button className="fb-reset" onClick={() => setDeudor(null)}>
                        Restablecer
                      </button>
                    )}
                  </div>
                  <div className="fb-options">
                    <button
                      type="button"
                      className={`fb-pill ${deudor === null ? "is-checked" : ""}`}
                      aria-pressed={deudor === null}
                      onClick={() => setDeudor(null)}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      className={`fb-pill ${deudor === true ? "is-checked" : ""}`}
                      aria-pressed={deudor === true}
                      onClick={() => setDeudor(true)}
                    >
                      Solo deudor
                    </button>
                    <button
                      type="button"
                      className={`fb-pill ${deudor === false ? "is-checked" : ""}`}
                      aria-pressed={deudor === false}
                      onClick={() => setDeudor(false)}
                    >
                      Sin deuda
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>

          <div className="fb-sheet-footer is-green">
            <div className="fb-btn-group">
              <button className="fb-btn fb-btn--danger" onClick={clear}>
                Borrar todo
              </button>
              <button className="fb-btn fb-btn--primary" onClick={applyFilters}>
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );

  /* ===== Barra + chips + Vistas ===== */
  return (
    <div className={`fb fb-${variant}`}>
      <div className="fb-row">
        <div className={`fb-search ${searchFocused || q ? "is-active" : ""}`}>
          <i className="bi bi-search" aria-hidden />
          <input
            placeholder="ID, propietario o calle…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
            aria-label="Buscar"
          />
        </div>

        <button className="fb-filters" onClick={() => setOpen(true)}>
          <i className="bi bi-sliders" />
          <span>Filtros</span>
          {activeCount > 0 && <span className="fb-badge">{activeCount}</span>}
        </button>

        <button className="fb-filters fb-filters--clear" onClick={clear}>
          <i className="bi bi-trash" />
          <span>Limpiar</span>
        </button>

        {/* Vistas (popover) */}
        <FilterViewsMenu
          isInmo={isInmo}
          currentDraft={{
            q,
            estado,
            subestado,
            calle,
            frente,
            fondo,
            sup,
            precio,
            deudor: isInmo ? null : deudor,
          }}
          onApply={(vf) => {
            // Relleno controles + chips + notifico al padre (mismo flujo que “Aplicar filtros”)
            setQ(vf.q || "");
            setEstado(vf.estado || []);
            setSubestado(vf.subestado || []);
            setCalle(vf.calle || []);
            setFrente(vf.frente || { min: 0, max: 100 });
            setFondo(vf.fondo || { min: 0, max: 100 });
            setSup(vf.sup || { min: 0, max: 5000 });
            setPrecio(vf.precio || { min: 0, max: 300000 });
            setDeudor(isInmo ? null : vf.deudor ?? null);
            setAppliedFilters({
              q: vf.q || "",
              estado: vf.estado || [],
              subestado: vf.subestado || [],
              calle: vf.calle || [],
              frente: vf.frente || { min: 0, max: 100 },
              fondo: vf.fondo || { min: 0, max: 100 },
              sup: vf.sup || { min: 0, max: 5000 },
              precio: vf.precio || { min: 0, max: 300000 },
              deudor: isInmo ? null : vf.deudor ?? null,
            });
            onParamsChange?.(buildParams(vf));
          }}
          // Cambia a "blue" si querés el botón Vistas en azul suave
          variant="match-filters"
        />
      </div>

      {chips.length > 0 && (
        <div className="fb-chips">
          {chips.map((c, i) => (
            <button
              key={`${c.k}-${i}`}
              className="fb-chip"
              onClick={() => removeChip(c)}
            >
              {c.label} <span className="x" aria-hidden>
                ✕
              </span>
            </button>
          ))}
        </div>
      )}

      {modal}
    </div>
  );
}
