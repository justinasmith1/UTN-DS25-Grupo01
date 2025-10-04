import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthProvider';
import { visibleModulesForUser, MODULES } from '../lib/auth/rbac.ui';

// Meta UI local para rótulos y rutas (independiente de cómo exporte rbac.ui MODULES)
const MODULES_META = {
  lotes:        { label: 'Dashboard',      path: '/dashboard' },
  ventas:       { label: 'Ventas',         path: '/ventas' },
  inmobiliarias:{ label: 'Inmobiliarias',  path: '/inmobiliarias' },
  reservas:     { label: 'Reservas',       path: '/reservas' },
  reportes:     { label: 'Reportes',       path: '/reportes' },
  personas:     { label: 'Personas',       path: '/personas' },
  // usuarios:  { label: 'Usuarios',       path: '/usuarios' },
};

export default function ModulePills() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Visibilidad por RBAC (si auth no cargó, fallback a todos)
  let modules = visibleModulesForUser(user);
  const moduleKeys = (modules && modules.length)
    ? modules.map(([key]) => key)         // nos quedamos con la clave
    : Object.keys(MODULES);               // fallback: todas las claves definidas en rbac.ui

  // Contenido del menú por módulo (acciones del panel)
  const MENU = useMemo(() => ({
    ventas: [
      { label: 'Ver Ventas', to: '/ventas', disabled: false },
      { label: 'Registrar Ventas', to: null, disabled: true },
    ],
    inmobiliarias: [
      { label: 'Ver Inmobiliarias', to: '/inmobiliarias', disabled: false },
      { label: 'Registrar Inmobiliaria', to: null, disabled: true },
    ],
    reservas: [
      { label: 'Ver Reservas', to: '/reservas', disabled: false },
      { label: 'Registrar Reserva', to: null, disabled: true },
    ],
    reportes: [
      { label: 'Ver Reportes', to: '/reportes', disabled: false },
      { label: 'Descargar Reporte', to: null, disabled: true },
    ],
    personas: [
      { label: 'Ver Propietarios', to: '/personas?tipo=propietario', disabled: false },
      { label: 'Ver Inquilinos', to: '/personas?tipo=inquilino', disabled: false },
    ],
    lotes: [
      { label: 'Ver Lotes', to: '/dashboard', disabled: false },
    ],
  }), []);

  // UI: panel abierto
  const [openKey, setOpenKey] = useState(null);
  const wrapperRef = useRef(null);

  // Cerrar con click afuera / ESC
  useEffect(() => {
    const onClick = (e) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) setOpenKey(null);
    };
    const onKey = (e) => e.key === 'Escape' && setOpenKey(null);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  /* ======== CONTROLES RÁPIDOS ======== */
  const BAR_HEIGHT   = 64; // altura de la barra
  const OVERLAP_PX   = 10; // pega la barra al header (cubre sombra)
  const SEP_ALPHA    = 0.18; // opacidad separadores verticales
  const HOVER_TINT   = 'rgba(255,255,255,0.05)'; // hover suave del módulo
  const LINE_COLOR   = 'rgba(255,255,255,0.14)'; // línea entre header y barra
  const PADDING_X    = 34;  // padding horizontal de cada modulo
  const PANEL_SHADOW = '0 10px 24px rgba(0,0,0,.20)'; // sombra del panel desplegable
  const YELLOW       = '#EBB648'; // amarillo de los botones
  const DIVIDER_COLOR = 'rgba(255, 255, 255, 0.15)'; // color de los divisores del panel
  /* =================================== */

  return (
    <>
      <style>{`
        /* Full width real y pegado al header */
        .mods-wrapper {
          width: 100vw;
          position: relative;
          left: 50%; right: 50%;
          margin-left: -50vw; margin-right: -50vw;
          margin-top: 0;
          top: -${OVERLAP_PX}px;
          z-index: 20;
        }
        .mods-bar {
          position: relative;
          display: flex;
          align-items: stretch;
          justify-content: stretch;
          height: ${BAR_HEIGHT}px;
          background: var(--color-header-bg);
          border-radius: 0;
          overflow: visible;
          box-shadow: var(--elev-1);
        }
        /* Única línea fina de separación con el header */
        .mods-bar::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 1px;
          background: ${LINE_COLOR};
        }

        .mods-item {
          flex: 1 1 0;
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;        
          color: var(--color-text-light);
          text-decoration: none;
          font-weight: 600;
          letter-spacing: .2px;
          padding: 0 ${PADDING_X}px;
          background: transparent;
          transition: background .12s ease, color .12s ease;
          user-select: none;
        }
        
        /*Linea divisora*/
        .mods-panel__btn + .mods-panel__btn {
          border-top: 0.1px solid ${DIVIDER_COLOR};
        }

        /* Hover del módulo (cerrado): tinte sutil */
        .mods-item:hover { background: ${HOVER_TINT}; }

        /* MÓDULO ABIERTO: fondo amarillo y texto negro */
        .mods-item.is-open .mods-caret { color: #ffffffff; opacity: .9; }
        
        /* que el hover no cambie cuando está abierto */
        .mods-item.is-open:hover { background: ${HOVER_TINT}; color: #FFF; }

        /* separadores a TODO el alto */
        .mods-item:not(:last-child)::after {
          content: "";
          position: absolute;
          top: 0; bottom: 0; right: 0;
          width: 1px;
          background: rgba(255,255,255,${SEP_ALPHA});
        }

        /* caret fijo a la derecha */
        .mods-caret {
          position: absolute; right: 12px;
          opacity: .9; font-size: .9em; transform: translateY(-1px);
          color: var(--color-text-light);
        }

        /* ===== Panel desplegable ===== */
        .mods-panel {
          position: absolute;
          left: 0; right: 0;               
          top: ${BAR_HEIGHT}px;             
          background: var(--color-header-bg);
          border: px solid rgba(0,0,0,0.06);            
          border-top: 0.1px solid ${DIVIDER_COLOR};                 
          box-shadow: ${PANEL_SHADOW};
          border-radius: 0 0 3px 3px;       
          overflow: hidden;
        }
        .mods-panel__btn {
          display: flex; align-items: center;
          width: 100%;
          padding: 16px 18px;
          color: var(--color-text-light);
          text-decoration: none;
          font-weight: 600;
          letter-spacing: .2px;
          background: transparent;
          border: none; cursor: pointer;
          transition: color .12s ease;      
        }
        /* HOVER de opciones: sólo texto amarillo, sin fondo */
        .mods-panel__btn:hover:not(.mods-panel__btn--disabled) {
          color: ${YELLOW};
        }
        .mods-panel__btn--disabled {
          opacity: .55; cursor: not-allowed;
        }
      `}</style>

      <div className="mods-wrapper" ref={wrapperRef}>
        <nav className="mods-bar" role="menubar" aria-label="Barra de módulos">
          {moduleKeys.map((key) => {
            const meta = MODULES_META[key] || { label: key, path: '/' };
            const active = pathname.startsWith(meta.path);
            const open = openKey === key;
            const items = MENU[key] || [];

            return (
              <div
                key={key}
                className={`mods-item ${open ? 'is-open' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {/* Botón que abre/cierra el panel (nombre centrado + caret derecha) */}
                <button
                  type="button"
                  onClick={() => setOpenKey(open ? null : key)}
                  aria-haspopup="true"
                  aria-expanded={open}
                  title={meta.label}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    padding: `0 ${PADDING_X}px`,
                    color: 'inherit',
                  }}
                >
                  <span>{meta.label}</span>
                  <span className="mods-caret" aria-hidden>▾</span>
                </button>

                {/* Panel desplegable (100% del ancho del módulo) */}
                {open && (
                  <div className="mods-panel" role="menu" aria-label={`Acciones de ${meta.label}`}>
                    {items.map((it, idx) =>
                      it.disabled ? (
                        <div key={idx} className="mods-panel__btn mods-panel__btn--disabled" role="menuitem" aria-disabled="true">
                          {it.label}
                        </div>
                      ) : it.to ? (
                        <Link key={idx} to={it.to} className="mods-panel__btn" role="menuitem" onClick={() => setOpenKey(null)}>
                          {it.label}
                        </Link>
                      ) : (
                        <button key={idx} className="mods-panel__btn mods-panel__btn--disabled" disabled>
                          {it.label}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}
