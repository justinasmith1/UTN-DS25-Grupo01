import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./FilterBar.css";
import RangeControl from "./controls/RangeControl";

/*Barra de filtros aplicada a Dashboard y Map*/
export default function FilterBar({
  variant = "dashboard",
  topOffset,                   
  onParamsChange,
}) {

  // Offsets por defecto según variante (ajustables)
  const effectiveTop =
    typeof topOffset === "number" ? topOffset : variant === "map" ? 120 : 200;

  // Catálogos
  const ESTADOS = ["DISPONIBLE", "NO_DISPONIBLE", "RESERVADO", "VENDIDO", "ALQUILADO",];
  const SUBESTADOS = ["CONSTRUIDO", "EN_CONSTRUCCION", "NO_CONSTRUIDO"];
  const CALLES = ["REINAMORA", "MACA","ZORZAL", "CAUQUEN", "ALONDRA", "JACANA", "TACUARITO", "JILGUERO", "GOLONDRINA", "CALANDRIA", "AGUILAMORA", "LORCA", "MILANO" ];

  // UI
  const [open, setOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Estado local (borrador)
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState([]);
  const [subestado, setSubestado] = useState([]);
  const [calle, setCalle] = useState([]);
  const [frente, setFrente] = useState({ min: 0, max: 100 });
  const [fondo, setFondo] = useState({ min: 0, max: 100 });
  const [sup, setSup] = useState({ min: 0, max: 5000 });
  const [precio, setPrecio] = useState({ min: 0, max: 300000 });
  const [deudor, setDeudor] = useState(null);

  // Refs para medir alto real del bloque TOP
  const bodyRef = useRef(null);
  const topRef = useRef(null);

  const toggle = (setFn, v) =>
    setFn((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const nice = (s) =>
    s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  // Contador visual de filtros activos
  const activeCount = useMemo(
    () =>
      (q ? 1 : 0) +
      estado.length +
      subestado.length +
      calle.length +
      (frente.min !== 0 || frente.max !== 100 ? 1 : 0) +
      (fondo.min !== 0 || fondo.max !== 100 ? 1 : 0) +
      (sup.min !== 0 || sup.max !== 5000 ? 1 : 0) +
      (precio.min !== 0 || precio.max !== 300000 ? 1 : 0) +
      (deudor === null ? 0 : 1),
    [q, estado, subestado, calle, frente, fondo, sup, precio, deudor]
  );

  // Al abrir: bloquear scroll de página y mostrar solo TOP (Estado/Sub-estado/Calle)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const applyTopHeight = () => {
      const topEl = topRef.current;
      const bodyEl = bodyRef.current;
      if (!topEl || !bodyEl) return;
      const h = Math.ceil(topEl.getBoundingClientRect().height) + 20; // colchón
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

  // Aplica filtros al padre (solo cuando se toca el botón)
  const applyFilters = () => {
    onParamsChange?.({
      q,
      estado,
      subestado,
      calle,
      frenteMin: frente.min,
      frenteMax: frente.max,
      fondoMin: fondo.min,
      fondoMax: fondo.max,
      supMin: sup.min,
      supMax: sup.max,
      priceMin: precio.min,
      priceMax: precio.max,
      deudor,
    });
    setOpen(false);
  };

  // Resetea todo y aplica vacío
  const clear = () => {
    setQ("");
    setEstado([]);
    setSubestado([]);
    setCalle([]);
    setFrente({ min: 0, max: 100 });
    setFondo({ min: 0, max: 100 });
    setSup({ min: 0, max: 5000 });
    setPrecio({ min: 0, max: 300000 });
    setDeudor(null);
    onParamsChange?.({});
  };

  // Modal (portal a body)
  const modal =
    open &&
    createPortal(
      <div
        className="fb-modal"
        style={{ ["--fb-safe-top"]: `${Math.max(0, effectiveTop)}px` }}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
        onClick={() => setOpen(false)}
      >
        <div className="fb-sheet" onClick={(e) => e.stopPropagation()}>
          {/* HEADER */}
          <div className="fb-sheet-header">
            <h3>Filtros</h3>
            <button className="fb-close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
          </div>

          {/* BODY (scrolleable). Visible inicialmente = alto del TOP */}
          <div className="fb-sheet-body" ref={bodyRef}>
            {/* TOP: Estado / Sub-estado / Calle */}
            <div className="fb-body-top" ref={topRef}>
              <section className="fb-section">
                <h4>Estado</h4>
                <div className="fb-options">
                  {ESTADOS.map((v) => (
                    <button
                      key={v}
                      className={`fb-pill ${estado.includes(v) ? "is-checked" : ""}`}
                      onClick={() => toggle(setEstado, v)}
                    >
                      {nice(v)}
                    </button>
                  ))}
                </div>
              </section>

              <section className="fb-section">
                <h4>Sub-estado</h4>
                <div className="fb-options">
                  {SUBESTADOS.map((v) => (
                    <button
                      key={v}
                      className={`fb-pill ${subestado.includes(v) ? "is-checked" : ""}`}
                      onClick={() => toggle(setSubestado, v)}
                    >
                      {nice(v)}
                    </button>
                  ))}
                </div>
              </section>

              <section className="fb-section">
                <h4>Calle</h4>
                <div className="fb-options fb-grid">
                  {CALLES.map((v) => (
                    <button
                      key={v}
                      className={`fb-pill ${calle.includes(v) ? "is-checked" : ""}`}
                      onClick={() => toggle(setCalle, v)}
                    >
                      {nice(v)}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* RESTO: aparece recién al scrollear */}
            <div className="fb-body-rest">
              <RangeControl
                label="Frente (m)"
                unit="m"
                minLimit={0}
                maxLimit={100}
                step={1}
                value={frente}
                onChange={setFrente}
              />
              <RangeControl
                label="Fondo (m)"
                unit="m"
                minLimit={0}
                maxLimit={100}
                step={1}
                value={fondo}
                onChange={setFondo}
              />
              <RangeControl
                label="Superficie (m²)"
                unit="m²"
                minLimit={0}
                maxLimit={5000}
                step={10}
                value={sup}
                onChange={setSup}
              />
              <RangeControl
                label="Precio (USD)"
                unit="USD"
                minLimit={0}
                maxLimit={300000}
                step={100}
                value={precio}
                onChange={setPrecio}
              />

              <section className="fb-section">
                <h4>Deudor</h4>
                <div className="fb-options">
                  <button
                    type="button"
                    className={`fb-pill ${deudor === null ? "is-checked" : ""}`}
                    onClick={() => setDeudor(null)}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className={`fb-pill ${deudor === true ? "is-checked" : ""}`}
                    onClick={() => setDeudor(true)}
                  >
                    Solo deudor
                  </button>
                  <button
                    type="button"
                    className={`fb-pill ${deudor === false ? "is-checked" : ""}`}
                    onClick={() => setDeudor(false)}
                  >
                    Sin deuda
                  </button>
                </div>
              </section>
            </div>
          </div>

          {/* FOOTER */}
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

        {/* Limpiar global: resetea y aplica vacío */}
        <button className="fb-filters fb-filters--clear" onClick={clear}>
          <i className="bi bi-trash" />
          <span>Limpiar</span>
        </button>
      </div>

      {modal}
    </div>
  );
}
