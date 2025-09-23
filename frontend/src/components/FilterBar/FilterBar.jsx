import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./FilterBar.css";
import RangeControl from "./controls/RangeControl";

export default function FilterBar({ variant = "dashboard", onParamsChange }) {
  /* Catálogos */
  const ESTADOS = ["DISPONIBLE","NO_DISPONIBLE","RESERVADO","VENDIDO","ALQUILADO"];
  const SUBESTADOS = ["CONSTRUIDO","EN_CONSTRUCCION","NO_CONSTRUIDO"];
  const CALLES = ["REINAMORA","MACA","ZORZAL","CAUQUEN","ALONDRA","JACANA","TACUARITO","JILGUERO","GOLONDRINA","CALANDRIA","AGUILAMORA","LORCA","MILANO"];

  /* UI */
  const [open, setOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  /* Draft local: NO se emite al padre hasta “Aplicar filtros” */
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState([]);
  const [subestado, setSubestado] = useState([]);
  const [calle, setCalle] = useState([]);
  const [frente, setFrente] = useState({ min: 0, max: 100 });
  const [fondo,  setFondo]  = useState({ min: 0, max: 100 });
  const [sup,    setSup]    = useState({ min: 0, max: 5000 });
  const [precio, setPrecio] = useState({ min: 0, max: 300000 });
  const [deudor, setDeudor] = useState(null);

  const bodyRef = useRef(null);
  const topRef  = useRef(null);

  const nice = (s) => (s ?? "").replace(/_/g," ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
  const toggle = (setFn, v) => setFn(prev => prev.includes(v) ? prev.filter(x => x!==v) : [...prev, v]);

  /* Badge de cantidad activa */
  const activeCount = useMemo(() =>
    (q?1:0) + estado.length + subestado.length + calle.length +
    (frente.min!==0||frente.max!==100?1:0) +
    (fondo .min!==0||fondo .max!==100?1:0) +
    (sup   .min!==0||sup   .max!==5000?1:0) +
    (precio.min!==0||precio.max!==300000?1:0) +
    (deudor===null?0:1),
  [q,estado,subestado,calle,frente,fondo,sup,precio,deudor]);

  /* Chips activos (locales) */
  const chips = useMemo(() => {
    const arr = [];
    if (q) arr.push({k:'q', label:`Buscar: ${q}`});
    estado.forEach(v => arr.push({k:'estado', v, label:nice(v)}));
    subestado.forEach(v => arr.push({k:'subestado', v, label:nice(v)}));
    calle.forEach(v => arr.push({k:'calle', v, label:nice(v)}));
    if (frente.min!==0 || frente.max!==100) arr.push({k:'frente', label:`Frente ${frente.min}–${frente.max} m`});
    if (fondo.min !==0 || fondo.max !==100) arr.push({k:'fondo',  label:`Fondo ${fondo.min}–${fondo.max} m`});
    if (sup.min   !==0 || sup.max   !==5000) arr.push({k:'sup',    label:`Sup ${sup.min}–${sup.max} m²`});
    if (precio.min!==0 || precio.max!==300000) arr.push({k:'precio', label:`Precio ${precio.min}–${precio.max} USD`});
    if (deudor !== null) arr.push({k:'deudor', label: deudor ? 'Solo deudor' : 'Sin deuda'});
    return arr;
  }, [q,estado,subestado,calle,frente,fondo,sup,precio,deudor]);

  const removeChip = (chip) => {
    switch (chip.k) {
      case 'q': setQ(''); break;
      case 'estado': setEstado(prev => prev.filter(v => v!==chip.v)); break;
      case 'subestado': setSubestado(prev => prev.filter(v => v!==chip.v)); break;
      case 'calle': setCalle(prev => prev.filter(v => v!==chip.v)); break;
      case 'frente': setFrente({min:0,max:100}); break;
      case 'fondo':  setFondo({min:0,max:100}); break;
      case 'sup':    setSup({min:0,max:5000}); break;
      case 'precio': setPrecio({min:0,max:300000}); break;
      case 'deudor': setDeudor(null); break;
      default: break;
    }
  };

  /* Atajos */
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if (!open && !typing && e.key.toLowerCase() === 'f') setOpen(true);
      if (open && e.key === 'Escape') setOpen(false);
      if (open && e.key === 'Enter' && !typing) applyFilters();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') { e.preventDefault(); clear(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]); // eslint-disable-line

  /* Al abrir: alto visible = alto del bloque TOP */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const applyTopHeight = () => {
      const topEl = topRef.current, bodyEl = bodyRef.current;
      if (!topEl || !bodyEl) return;
      const h = Math.ceil(topEl.getBoundingClientRect().height) + 20;
      bodyEl.style.setProperty("--fb-body-max", `${h}px`);
      bodyEl.scrollTo({ top: 0, behavior: "auto" });
    };
    requestAnimationFrame(applyTopHeight);
    const ro = new ResizeObserver(applyTopHeight);
    if (topRef.current) ro.observe(topRef.current);
    window.addEventListener("resize", applyTopHeight);
    return () => { document.body.style.overflow = prev; window.removeEventListener("resize", applyTopHeight); ro.disconnect(); };
  }, [open]);

  /* Aplicar / Limpiar (ÚNICOS lugares donde se emite) */
  const applyFilters = () => {
    onParamsChange?.({
      q, estado, subestado, calle,
      frenteMin: frente.min, frenteMax: frente.max,
      fondoMin:  fondo.min,  fondoMax:  fondo.max,
      supMin:    sup.min,    supMax:    sup.max,
      priceMin:  precio.min, priceMax:  precio.max,
      deudor,
    });
    setOpen(false);
  };

  const clear = () => {
    setQ(""); setEstado([]); setSubestado([]); setCalle([]);
    setFrente({min:0,max:100}); setFondo({min:0,max:100});
    setSup({min:0,max:5000});   setPrecio({min:0,max:300000});
    setDeudor(null);
    onParamsChange?.({});
  };

  /* Resets por sección */
  const resetEstado    = () => setEstado([]);
  const resetSubestado = () => setSubestado([]);
  const resetCalle     = () => setCalle([]);
  const resetFrente    = () => setFrente({min:0,max:100});
  const resetFondo     = () => setFondo({min:0,max:100});
  const resetSup       = () => setSup({min:0,max:5000});
  const resetPrecio    = () => setPrecio({min:0,max:300000});
  const resetDeudor    = () => setDeudor(null);

  /* Modal */
  const modal = open && createPortal(
    <div className={`fb-modal fb-modal-${variant}`} role="dialog" aria-modal="true" aria-label="Filtros" onClick={() => setOpen(false)}>
      <div className="fb-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="fb-sheet-header">
          <h3>Filtros</h3>
          <button className="fb-close" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
        </div>

        <div className="fb-sheet-body" ref={bodyRef}>
          {/* TOP */}
          <div className="fb-body-top" ref={topRef}>
            <section className="fb-section">
              <div className="fb-sec-head">
                <h4>Estado</h4>
                {estado.length>0 && <button className="fb-reset" onClick={resetEstado}>Restablecer</button>}
              </div>
              <div className="fb-options">
                {ESTADOS.map(v => (
                  <button key={v} className={`fb-pill ${estado.includes(v) ? "is-checked" : ""}`} aria-pressed={estado.includes(v)} onClick={() => toggle(setEstado, v)}>{nice(v)}</button>
                ))}
              </div>
            </section>

            <section className="fb-section">
              <div className="fb-sec-head">
                <h4>Sub-estado</h4>
                {subestado.length>0 && <button className="fb-reset" onClick={resetSubestado}>Restablecer</button>}
              </div>
              <div className="fb-options">
                {SUBESTADOS.map(v => (
                  <button key={v} className={`fb-pill ${subestado.includes(v) ? "is-checked" : ""}`} aria-pressed={subestado.includes(v)} onClick={() => toggle(setSubestado, v)}>{nice(v)}</button>
                ))}
              </div>
            </section>

            <section className="fb-section">
              <div className="fb-sec-head">
                <h4>Calle</h4>
                {calle.length>0 && <button className="fb-reset" onClick={resetCalle}>Restablecer</button>}
              </div>
              <div className="fb-options fb-grid">
                {CALLES.map(v => (
                  <button key={v} className={`fb-pill ${calle.includes(v) ? "is-checked" : ""}`} aria-pressed={calle.includes(v)} onClick={() => toggle(setCalle, v)}>{nice(v)}</button>
                ))}
              </div>
            </section>
          </div>

          {/* RESTO */}
          <div className="fb-body-rest">
            <div className="fb-range-block">
              <RangeControl label="Frente (m)" unit="m" minLimit={0} maxLimit={100} step={0.1} value={frente} onChange={setFrente} />
            </div>
            {(frente.min!==0 || frente.max!==100) && <div className="fb-sec-head" style={{marginTop:-6}}><button className="fb-reset" onClick={resetFrente}>Restablecer</button></div>}

            <div className="fb-range-block">
              <RangeControl label="Fondo (m)" unit="m" minLimit={0} maxLimit={100} step={0.1} value={fondo} onChange={setFondo} />
            </div>
            {(fondo.min!==0 || fondo.max!==100) && <div className="fb-sec-head" style={{marginTop:-6}}><button className="fb-reset" onClick={resetFondo}>Restablecer</button></div>}

            <div className="fb-range-block">
              <RangeControl label="Superficie (m²)" unit="m²" minLimit={0} maxLimit={5000} step={1} value={sup} onChange={setSup} />
            </div>
            {(sup.min!==0 || sup.max!==5000) && <div className="fb-sec-head" style={{marginTop:-6}}><button className="fb-reset" onClick={resetSup}>Restablecer</button></div>}

            <div className="fb-range-block">
              <RangeControl label="Precio (USD)" unit="USD" minLimit={0} maxLimit={300000} step={100} value={precio} onChange={setPrecio} />
            </div>
            {(precio.min!==0 || precio.max!==300000) && <div className="fb-sec-head" style={{marginTop:-6}}><button className="fb-reset" onClick={resetPrecio}>Restablecer</button></div>}

            <section className="fb-section">
              <div className="fb-sec-head">
                <h4>Deudor</h4>
                {deudor!==null && <button className="fb-reset" onClick={resetDeudor}>Restablecer</button>}
              </div>
              <div className="fb-options">
                <button type="button" className={`fb-pill ${deudor===null  ? "is-checked":""}`} aria-pressed={deudor===null} onClick={()=>setDeudor(null)}>Todos</button>
                <button type="button" className={`fb-pill ${deudor===true  ? "is-checked":""}`} aria-pressed={deudor===true} onClick={()=>setDeudor(true)}>Solo deudor</button>
                <button type="button" className={`fb-pill ${deudor===false ? "is-checked":""}`} aria-pressed={deudor===false} onClick={()=>setDeudor(false)}>Sin deuda</button>
              </div>
            </section>
          </div>
        </div>

        <div className="fb-sheet-footer is-green">
          <div className="fb-btn-group">
            <button className="fb-btn fb-btn--danger"  onClick={clear}>Borrar todo</button>
            <button className="fb-btn fb-btn--primary" onClick={applyFilters}>Aplicar filtros</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  /* Barra + chips */
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
      </div>

      {chips.length>0 && (
        <div className="fb-chips">
          {chips.map((c,i)=>(
            <button key={`${c.k}-${i}`} className="fb-chip" onClick={()=>removeChip(c)}>
              {c.label} <span className="x" aria-hidden>✕</span>
            </button>
          ))}
        </div>
      )}

      {modal}
    </div>
  );
}
