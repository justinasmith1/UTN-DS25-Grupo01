// components/FilterBar/FilterBar.jsx
import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./FilterBar.css";
import RangeControl from "./controls/RangeControl";

// RBAC UI existentes 
import { filterEstadoOptionsFor, canUseDeudorFilter } from "../../lib/auth/rbac.ui";

// Extractores y hooks chicos para aligerar el archivo
import { filterDefaultsFromPreset, buildParams } from "./utils/param";
import { chipsFrom, nice } from "./utils/chips";
import { sanitizeFiltersForRole } from "./utils/role";
import useDebouncedEffect from "./hooks/useDebouncedEffect";
import useModalSheet from "./hooks/useModalSheet";

// Menú de vistas extraído
import FilterViewsMenu from "./FilterViewsMenu";

const DEBOUNCE_MS = 250;

export default function FilterBar({
  preset,                 
  variant = "dashboard",
  userRole = "GENERAL",
  onParamsChange,
}) {
  const authUser = useMemo(() => ({ role: String(userRole).toUpperCase() }), [userRole]);

  // Catálogos desde preset, filtrados por RBAC
  const ALL_ESTADOS = useMemo(
    () => preset?.catalogs?.ESTADOS ?? ["DISPONIBLE", "NO_DISPONIBLE", "RESERVADO", "VENDIDO", "ALQUILADO"],
    [preset]
  );
  const ESTADOS = useMemo(
    () => filterEstadoOptionsFor(authUser, ALL_ESTADOS),
    [authUser, ALL_ESTADOS]
  );

  const canDeudor = canUseDeudorFilter(authUser);
  const isInmo = !canDeudor;

  const SUBESTADOS = useMemo(
    () => preset?.catalogs?.SUBESTADOS ?? ["CONSTRUIDO", "EN_CONSTRUCCION", "NO_CONSTRUIDO"],
    [preset]
  );
  const CALLES = useMemo(() => preset?.catalogs?.CALLES ?? ["REINAMORA", "MACA", "ZORZAL", "CAUQUEN", "ALONDRA", "JACANA", "TACUARITO", "JILGUERO", "GOLONDRINA", "CALANDRIA", "AGUILAMORA", "LORCA", "MILANO"], 
  [preset]
  );

  const RANGES = preset?.ranges ?? {
    frente: { minLimit: 0, maxLimit: 100, step: 0.1, unit: "m" },
    fondo:  { minLimit: 0, maxLimit: 100, step: 0.1, unit: "m" },
    sup:    { minLimit: 0, maxLimit: 5000, step: 1,   unit: "m²" },
    precio: { minLimit: 0, maxLimit: 300000, step: 100, unit: "USD" },
  };

  // Defaults desde preset (centralizado en util para usar el mismo objeto en chips/params)
  const D = useMemo(() => filterDefaultsFromPreset(preset), [preset]);

  // Estado UI
  const [open, setOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Estado de borrador (UI) inicializado con defaults del preset
  const [q, setQ] = useState(D.q);
  const [estado, setEstado] = useState(D.estado);
  const [subestado, setSubestado] = useState(D.subestado);
  const [calle, setCalle] = useState(D.calle);
  const [frente, setFrente] = useState(D.frente);
  const [fondo, setFondo] = useState(D.fondo);
  const [sup, setSup] = useState(D.sup);
  const [precio, setPrecio] = useState(D.precio);
  const [deudor, setDeudor] = useState(D.deudor);

  // Estado de filtros aplicados (chips)
  const [appliedFilters, setAppliedFilters] = useState({ ...D });

  // Si cambia el preset en caliente, re-inicializamos
  useEffect(() => {
    setQ(D.q); setEstado(D.estado); setSubestado(D.subestado); setCalle(D.calle);
    setFrente(D.frente); setFondo(D.fondo); setSup(D.sup); setPrecio(D.precio); setDeudor(D.deudor);
    setAppliedFilters({ ...D });
  }, [D]);

  // RBAC dinámico: INMOBILIARIA no puede “NO_DISPONIBLE” ni usar deudor
  useEffect(() => {
    if (!isInmo) return;
    setEstado((prev) => prev.filter((v) => v !== "NO_DISPONIBLE"));
    setDeudor(null);
  }, [isInmo]);

  // Debounce de búsqueda
  useDebouncedEffect(() => {
    setAppliedFilters((prev) => ({ ...prev, q }));
    onParamsChange?.({ q });
  }, [q], DEBOUNCE_MS);

  // Helpers UI
  const toggle = (setFn, v) =>
    setFn((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  // Contador de activos
  const activeCount = useMemo(() => {
    // chipsFrom devuelve el array de chips, solo contamos
    return chipsFrom(appliedFilters, D, isInmo).length;
  }, [appliedFilters, D, isInmo]);

  const removeChip = (chip) => {
    switch (chip.k) {
      case "q":
        setQ(""); setAppliedFilters((p) => ({ ...p, q: "" }));
        onParamsChange?.({ q: "" });
        break;
      case "estado":
        setEstado((prev) => prev.filter((v) => v !== chip.v));
        setAppliedFilters((prev) => ({ ...prev, estado: prev.estado.filter((v) => v !== chip.v) }));
        onParamsChange?.(buildParams({ ...appliedFilters, estado: appliedFilters.estado.filter((v) => v !== chip.v) }, D, isInmo));
        break;
      case "subestado":
        setSubestado((prev) => prev.filter((v) => v !== chip.v));
        setAppliedFilters((prev) => ({ ...prev, subestado: prev.subestado.filter((v) => v !== chip.v) }));
        onParamsChange?.(buildParams({ ...appliedFilters, subestado: appliedFilters.subestado.filter((v) => v !== chip.v) }, D, isInmo));
        break;
      case "calle":
        setCalle((prev) => prev.filter((v) => v !== chip.v));
        setAppliedFilters((prev) => ({ ...prev, calle: prev.calle.filter((v) => v !== chip.v) }));
        onParamsChange?.(buildParams({ ...appliedFilters, calle: appliedFilters.calle.filter((v) => v !== chip.v) }, D, isInmo));
        break;
      case "frente":
        setFrente({ ...D.frente });
        setAppliedFilters((prev) => ({ ...prev, frente: { ...D.frente } }));
        onParamsChange?.(buildParams({ ...appliedFilters, frente: { ...D.frente } }, D, isInmo));
        break;
      case "fondo":
        setFondo({ ...D.fondo });
        setAppliedFilters((prev) => ({ ...prev, fondo: { ...D.fondo } }));
        onParamsChange?.(buildParams({ ...appliedFilters, fondo: { ...D.fondo } }, D, isInmo));
        break;
      case "sup":
        setSup({ ...D.sup });
        setAppliedFilters((prev) => ({ ...prev, sup: { ...D.sup } }));
        onParamsChange?.(buildParams({ ...appliedFilters, sup: { ...D.sup } }, D, isInmo));
        break;
      case "precio":
        setPrecio({ ...D.precio });
        setAppliedFilters((prev) => ({ ...prev, precio: { ...D.precio } }));
        onParamsChange?.(buildParams({ ...appliedFilters, precio: { ...D.precio } }, D, isInmo));
        break;
      case "deudor":
        setDeudor(null);
        setAppliedFilters((prev) => ({ ...prev, deudor: null }));
        onParamsChange?.(buildParams({ ...appliedFilters, deudor: null }, D, isInmo));
        break;
      default:
        break;
    }
  };

  // Aplicar / Limpiar
  const applyFilters = () => {
    const safe = sanitizeFiltersForRole({
      q, estado, subestado, calle, frente, fondo, sup, precio, deudor
    }, isInmo);

    setAppliedFilters({ ...safe });
    onParamsChange?.(buildParams(safe, D, isInmo));
    setOpen(false);
  };

  const clear = () => {
    setQ(D.q); setEstado(D.estado); setSubestado(D.subestado); setCalle(D.calle);
    setFrente({ ...D.frente }); setFondo({ ...D.fondo }); setSup({ ...D.sup }); setPrecio({ ...D.precio });
    setDeudor(null);
    const cleared = { ...D, deudor: null };
    setAppliedFilters({ ...cleared });
    onParamsChange?.({}); 
  };

  // ===== Modal =====
  const bodyRef = useRef(null);
  const topRef = useRef(null);
  useModalSheet(open, bodyRef, topRef);

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
            <div className="fb-body-top" ref={topRef}>
              <section className="fb-section">
                <div className="fb-sec-head">
                  <h4>Estado</h4>
                  {estado.length > 0 && <button className="fb-reset" onClick={() => setEstado([])}>Restablecer</button>}
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
                  {subestado.length > 0 && <button className="fb-reset" onClick={() => setSubestado([])}>Restablecer</button>}
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
                  {calle.length > 0 && <button className="fb-reset" onClick={() => setCalle([])}>Restablecer</button>}
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

            <div className="fb-body-rest">
              <div className="fb-range-block">
                <RangeControl
                  label="Frente (m)"
                  unit={RANGES.frente.unit}
                  minLimit={RANGES.frente.minLimit}
                  maxLimit={RANGES.frente.maxLimit}
                  step={RANGES.frente.step}
                  value={frente}
                  onChange={setFrente}
                />
              </div>
              {(frente.min !== D.frente.min || frente.max !== D.frente.max) && (
                <div className="fb-sec-head" style={{ marginTop: -6 }}>
                  <button className="fb-reset" onClick={() => setFrente({ ...D.frente })}>Restablecer</button>
                </div>
              )}

              <div className="fb-range-block">
                <RangeControl
                  label="Fondo (m)"
                  unit={RANGES.fondo.unit}
                  minLimit={RANGES.fondo.minLimit}
                  maxLimit={RANGES.fondo.maxLimit}
                  step={RANGES.fondo.step}
                  value={fondo}
                  onChange={setFondo}
                />
              </div>
              {(fondo.min !== D.fondo.min || fondo.max !== D.fondo.max) && (
                <div className="fb-sec-head" style={{ marginTop: -6 }}>
                  <button className="fb-reset" onClick={() => setFondo({ ...D.fondo })}>Restablecer</button>
                </div>
              )}

              <div className="fb-range-block">
                <RangeControl
                  label="Superficie (m²)"
                  unit={RANGES.sup.unit}
                  minLimit={RANGES.sup.minLimit}
                  maxLimit={RANGES.sup.maxLimit}
                  step={RANGES.sup.step}
                  value={sup}
                  onChange={setSup}
                />
              </div>
              {(sup.min !== D.sup.min || sup.max !== D.sup.max) && (
                <div className="fb-sec-head" style={{ marginTop: -6 }}>
                  <button className="fb-reset" onClick={() => setSup({ ...D.sup })}>Restablecer</button>
                </div>
              )}

              <div className="fb-range-block">
                <RangeControl
                  label="Precio (USD)"
                  unit={RANGES.precio.unit}
                  minLimit={RANGES.precio.minLimit}
                  maxLimit={RANGES.precio.maxLimit}
                  step={RANGES.precio.step}
                  value={precio}
                  onChange={setPrecio}
                />
              </div>
              {(precio.min !== D.precio.min || precio.max !== D.precio.max) && (
                <div className="fb-sec-head" style={{ marginTop: -6 }}>
                  <button className="fb-reset" onClick={() => setPrecio({ ...D.precio })}>Restablecer</button>
                </div>
              )}

              {canDeudor && (
                <section className="fb-section">
                  <div className="fb-sec-head">
                    <h4>Deudor</h4>
                    {deudor !== null && <button className="fb-reset" onClick={() => setDeudor(null)}>Restablecer</button>}
                  </div>
                  <div className="fb-options">
                    <button type="button" className={`fb-pill ${deudor === null ? "is-checked" : ""}`} aria-pressed={deudor === null} onClick={() => setDeudor(null)}>Todos</button>
                    <button type="button" className={`fb-pill ${deudor === true ? "is-checked" : ""}`} aria-pressed={deudor === true} onClick={() => setDeudor(true)}>Solo deudor</button>
                    <button type="button" className={`fb-pill ${deudor === false ? "is-checked" : ""}`} aria-pressed={deudor === false} onClick={() => setDeudor(false)}>Sin deuda</button>
                  </div>
                </section>
              )}
            </div>
          </div>

          <div className="fb-sheet-footer is-green">
            <div className="fb-btn-group">
              <button className="fb-btn fb-btn--danger" onClick={clear}>Borrar todo</button>
              <button className="fb-btn fb-btn--primary" onClick={applyFilters}>Aplicar filtros</button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );

  // ===== Barra + chips + vistas =====
  const chips = useMemo(() => chipsFrom(appliedFilters, D, isInmo), [appliedFilters, D, isInmo]);

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

        <FilterViewsMenu
          isInmo={isInmo}
          currentDraft={{ q, estado, subestado, calle, frente, fondo, sup, precio, deudor: isInmo ? null : deudor }}
          onApply={(vf) => {
            const safe = sanitizeFiltersForRole({
              q: vf.q ?? D.q,
              estado: vf.estado ?? D.estado,
              subestado: vf.subestado ?? D.subestado,
              calle: vf.calle ?? D.calle,
              frente: vf.frente ?? { ...D.frente },
              fondo: vf.fondo ?? { ...D.fondo },
              sup: vf.sup ?? { ...D.sup },
              precio: vf.precio ?? { ...D.precio },
              deudor: vf.deudor ?? null,
            }, isInmo);

            setQ(safe.q); setEstado(safe.estado); setSubestado(safe.subestado); setCalle(safe.calle);
            setFrente(safe.frente); setFondo(safe.fondo); setSup(safe.sup); setPrecio(safe.precio); setDeudor(safe.deudor);
            setAppliedFilters({ ...safe });
            onParamsChange?.(buildParams(safe, D, isInmo));
          }}
          variant="match-filters"
        />
      </div>

      {chips.length > 0 && (
        <div className="fb-chips">
          {chips.map((c, i) => (
            <button key={`${c.k}-${i}`} className="fb-chip" onClick={() => removeChip(c)}>
              {c.label} <span className="x" aria-hidden>✕</span>
            </button>
          ))}
        </div>
      )}

      {modal}
    </div>
  );
}
